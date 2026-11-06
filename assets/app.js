/* Compdawg landing: small vanilla JS. No dependencies, no build step. */
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.add("js");

  /* Header geometry, band contrast, and mobile navigation */
  var nav = doc.querySelector(".nav");
  var burger = doc.querySelector(".hamburger");
  var menu = doc.getElementById("mobile-menu");
  var backdrop = doc.querySelector(".menu-backdrop");
  var darkBands = Array.prototype.slice.call(doc.querySelectorAll(".band-navy, .footer, .hero.dark, .hero.hero-dark"));
  var root = doc.documentElement;
  var menuOpen = false;
  var lockedY = 0;
  var oldOverflow, oldPadding;
  var frame = 0;

  function headerState() {
    frame = 0;
    if (!nav) return;
    var box = nav.getBoundingClientRect();
    root.style.setProperty("--header-bottom", box.bottom + "px");
    nav.classList.toggle("scrolled", window.scrollY > 8);
    // Use the center of the header, with a small hysteresis to avoid boundary flicker.
    var dark = nav.classList.contains("on-dark");
    var probe = box.top + box.height / 2;
    var tolerance = dark ? 2 : -2;
    nav.classList.toggle("on-dark", darkBands.some(function (band) {
      var rect = band.getBoundingClientRect();
      return rect.top - tolerance <= probe && rect.bottom + tolerance > probe;
    }));
  }
  function queueHeader() {
    if (!frame) frame = window.requestAnimationFrame(headerState);
  }
  headerState();
  window.addEventListener("scroll", queueHeader, { passive: true });
  window.addEventListener("resize", queueHeader);
  if ("ResizeObserver" in window) new ResizeObserver(queueHeader).observe(doc.body);

  function setMenu(open) {
    if (!nav || !burger || !menu || open === menuOpen) return;
    menuOpen = open;
    if (open) {
      lockedY = window.scrollY;
      oldOverflow = root.style.overflow;
      oldPadding = doc.body.style.paddingRight;
      var scrollbar = window.innerWidth - root.clientWidth;
      if (scrollbar) doc.body.style.paddingRight = (parseFloat(getComputedStyle(doc.body).paddingRight) + scrollbar) + "px";
      // Lock the root scroller. Body overflow would create a new sticky scroll ancestor.
      root.style.overflow = "hidden";
    } else {
      root.style.overflow = oldOverflow;
      doc.body.style.paddingRight = oldPadding;
      window.scrollTo({ top: lockedY, behavior: "instant" });
    }
    nav.classList.toggle("menu-open", open);
    menu.classList.toggle("open", open);
    menu.inert = !open;
    backdrop.hidden = !open;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (!open && menu.contains(doc.activeElement)) burger.focus({ preventScroll: true });
    headerState();
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!menuOpen); });
  if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
  if (menu) menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  // Keep touch gestures outside the sheet from moving the locked page on mobile browsers.
  doc.addEventListener("touchmove", function (e) {
    if (menuOpen && !menu.contains(e.target)) e.preventDefault();
  }, { passive: false });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
    if (menuOpen && e.key === "Tab") {
      var links = Array.prototype.slice.call(menu.querySelectorAll("a"));
      var focusables = [burger].concat(links);
      var current = focusables.indexOf(doc.activeElement);
      if (e.shiftKey && current <= 0) {
        e.preventDefault(); focusables[focusables.length - 1].focus({ preventScroll: true });
      } else if (!e.shiftKey && (current < 0 || current === focusables.length - 1)) {
        e.preventDefault(); burger.focus({ preventScroll: true });
      }
    }
  });
  window.addEventListener("hashchange", function () { setMenu(false); });
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

  /* Comparison cues and fades follow each wrapper's own scroll position. */
  doc.querySelectorAll(".compare-wrap").forEach(function (wrap) {
    var shell = wrap.parentElement;
    var cue = shell.previousElementSibling;
    function updateCompare() {
      shell.classList.toggle("is-at-end", wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2);
    }
    wrap.addEventListener("scroll", function () {
      if (wrap.scrollLeft > 0) cue.classList.add("is-used");
      updateCompare();
    }, { passive: true });
    window.addEventListener("resize", updateCompare);
    if ("ResizeObserver" in window) new ResizeObserver(updateCompare).observe(wrap);
    updateCompare();
  });

  /* ---- FAQ: keep one open at a time (progressive enhancement) ---- */
  var faqItems = Array.prototype.slice.call(doc.querySelectorAll(".faq details"));
  faqItems.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) {
        faqItems.forEach(function (o) { if (o !== d) o.open = false; });
      }
    });
  });

  /* Signup stays on this page until the app accepts the account. */
  var signupApi = window.CompdawgSignup;
  var signupDialog = doc.getElementById("signup-dialog");
  var signupForm = doc.getElementById("signup-form");
  var signupEmail = doc.getElementById("signup-email");
  var signupPassword = doc.getElementById("signup-password");
  var signupError = doc.getElementById("signup-error");
  var signupSubmit = doc.getElementById("signup-submit");
  var signupClose = doc.getElementById("signup-close");
  var signupLastFocus = null;
  var signupPending = false;
  var signupLocked = false;
  var signupOldOverflow = "";
  var signupOldPadding = "";
  var signupLockY = 0;

  function signupFields() {
    return {
      email: signupEmail,
      password: signupPassword
    };
  }

  function clearSignupError() {
    if (!signupError) return;
    signupError.hidden = true;
    signupError.textContent = "";
    Object.keys(signupFields()).forEach(function (key) {
      signupFields()[key].removeAttribute("aria-invalid");
      signupFields()[key].removeAttribute("aria-describedby");
    });
  }

  function showSignupError(message, fields) {
    signupError.hidden = false;
    signupError.textContent = message;
    var marked = {};
    (fields || []).forEach(function (name) { marked[name] = true; });
    Object.keys(signupFields()).forEach(function (key) {
      var input = signupFields()[key];
      var invalid = !!marked[key];
      input.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (invalid) input.setAttribute("aria-describedby", "signup-error");
      else input.removeAttribute("aria-describedby");
    });
    var first = (fields || [])[0];
    if (first && signupFields()[first]) signupFields()[first].focus({ preventScroll: true });
  }

  function lockSignupScroll() {
    if (signupLocked) return;
    signupLocked = true;
    signupLockY = window.scrollY;
    signupOldOverflow = root.style.overflow;
    signupOldPadding = doc.body.style.paddingRight;
    var scrollbar = window.innerWidth - root.clientWidth;
    if (scrollbar) doc.body.style.paddingRight = (parseFloat(getComputedStyle(doc.body).paddingRight) + scrollbar) + "px";
    root.style.overflow = "hidden";
  }

  function unlockSignupScroll() {
    if (!signupLocked) return;
    signupLocked = false;
    root.style.overflow = signupOldOverflow;
    doc.body.style.paddingRight = signupOldPadding;
    window.scrollTo({ top: signupLockY, behavior: "instant" });
  }

  function restoreSignupFocus() {
    var back = signupLastFocus;
    signupLastFocus = null;
    var inMenu = !!(back && menu && menu.contains(back));
    var target = !inMenu && back && typeof back.focus === "function" && doc.contains(back) ? back : burger;
    if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function closeSignup() {
    if (!signupDialog || !signupDialog.open) return;
    signupDialog.close();
  }

  function openSignup(trigger) {
    if (!signupApi || !signupDialog || typeof signupDialog.showModal !== "function") {
      if (trigger && trigger.href) window.location.assign(trigger.href);
      return;
    }
    setMenu(false);
    signupLastFocus = trigger && typeof trigger.focus === "function" ? trigger : doc.activeElement;
    if (!signupPending) {
      signupForm.reset();
      signupSubmit.disabled = false;
      signupSubmit.textContent = "Create account";
      clearSignupError();
    }
    if (!signupDialog.open) signupDialog.showModal();
    lockSignupScroll();
    if (!signupPending) signupEmail.focus({ preventScroll: true });
  }

  if (signupDialog && signupForm && signupApi) {
    signupDialog.addEventListener("close", function () {
      unlockSignupScroll();
      signupForm.reset();
      clearSignupError();
      if (!signupPending) {
        signupSubmit.disabled = false;
        signupSubmit.textContent = "Create account";
      }
      restoreSignupFocus();
    });
    signupDialog.addEventListener("click", function (e) {
      if (e.target !== signupDialog) return;
      var rect = signupDialog.getBoundingClientRect();
      var inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) closeSignup();
    });
    if (signupClose) signupClose.addEventListener("click", closeSignup);
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (signupPending) return;
      signupPending = true;
      signupSubmit.disabled = true;
      signupSubmit.textContent = "Creating account";
      clearSignupError();
      signupApi.submitSignup({
        email: signupEmail.value,
        password: signupPassword.value
      }, window.fetch.bind(window)).then(function (result) {
        signupPending = false;
        if (result.ok) {
          window.location.assign(result.welcomeUrl);
          return;
        }
        if (!signupDialog.open) return;
        signupSubmit.disabled = false;
        signupSubmit.textContent = "Create account";
        showSignupError(result.message, result.fields);
      });
    });
    doc.addEventListener("click", function (e) {
      var link = e.target && e.target.closest ? e.target.closest("a[data-signup-open]") : null;
      if (!link) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      openSignup(link);
    });
  }
})();
