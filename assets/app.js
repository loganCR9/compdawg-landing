/* Compdawg landing — small vanilla JS. No dependencies, no build step. */
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.add("js");

  /* ---- Sticky nav shadow on scroll ---- */
  var nav = doc.querySelector(".nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  var burger = doc.querySelector(".hamburger");
  var menu = doc.getElementById("mobile-menu");
  function setMenu(open) {
    if (!nav || !burger || !menu) return;
    nav.classList.toggle("menu-open", open);
    menu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    doc.body.style.overflow = open ? "hidden" : "";
  }
  if (burger) {
    burger.addEventListener("click", function () {
      setMenu(!nav.classList.contains("menu-open"));
    });
  }
  if (menu) {
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  // Close the sheet if we cross back to desktop width.
  var mq = window.matchMedia("(min-width: 861px)");
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function () {
    if (mq.matches) setMenu(false);
  });

  /* ---- Scroll reveal ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealables = Array.prototype.slice.call(doc.querySelectorAll("[data-reveal]"));
  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---- Placeholder forms (free teardown + demo). Nothing is sent anywhere. ---- */
  var forms = Array.prototype.slice.call(doc.querySelectorAll('form[data-placeholder="true"]'));
  var ok = doc.getElementById("form-ok");
  var okTitle = doc.getElementById("form-ok-title");
  var okText = doc.getElementById("form-ok-text");
  var tabs = Array.prototype.slice.call(doc.querySelectorAll(".form-tabs [role=tab]"));
  var messages = {
    free: ["Thanks, your teardown request is in.", "We'll email you when your report and free account are ready."],
    demo: ["Thanks, we'll reply with demo times", "so keep an eye on your inbox."]
  };

  function showKind(kind) {
    forms.forEach(function (f) { f.hidden = f.getAttribute("data-kind") !== kind; });
    tabs.forEach(function (t) {
      var on = t.id === "tab-" + kind;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    if (ok) { ok.classList.remove("show"); }
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { showKind(t.id.replace("tab-", "")); });
  });
  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var m = messages[form.getAttribute("data-kind")] || messages.free;
      if (ok) {
        okTitle.textContent = m[0];
        okText.textContent = m[1];
        ok.classList.add("show");
        ok.setAttribute("role", "status");
      }
      form.reset();
      form.hidden = true;
      var tabbar = doc.querySelector(".form-tabs");
      if (tabbar) { tabbar.hidden = true; }
    });
  });
  /* Links to #demo open the demo tab, links to #free open the free teardown tab. */
  function routeHash() {
    if (location.hash === "#demo") { showKind("demo"); }
    else if (location.hash === "#free") { showKind("free"); }
  }
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#demo"], a[href="#free"]');
    if (a) { showKind(a.getAttribute("href") === "#demo" ? "demo" : "free"); }
  });
  window.addEventListener("hashchange", routeHash);
  routeHash();

  /* ---- FAQ: keep one open at a time (progressive enhancement) ---- */
  var faqItems = Array.prototype.slice.call(doc.querySelectorAll(".faq details"));
  faqItems.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) {
        faqItems.forEach(function (o) { if (o !== d) o.open = false; });
      }
    });
  });
})();
