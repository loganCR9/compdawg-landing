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

  /* ---- Placeholder demo form ---- */
  var form = doc.querySelector('form[data-placeholder="true"]');
  if (form) {
    var ok = doc.getElementById("form-ok");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (ok) {
        ok.classList.add("show");
        ok.setAttribute("role", "status");
      }
      form.reset();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Request received"; }
    });
  }

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
