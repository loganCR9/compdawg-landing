/* Compdawg landing: embedded sample Strategic report carousel.
   Ported from the designer's carousel-v3.js, namespaced ids/classes.
   Keyboard, aria, and reduced-motion friendly. No external deps. */
(function () {
  var track = document.getElementById('sr-track');
  if (!track) return;
  var cards = Array.prototype.slice.call(track.querySelectorAll(':scope > .sr-card'));
  if (!cards.length) return;
  var dots = document.getElementById('sr-dots');
  var nameEl = document.getElementById('sr-name');
  var prev = document.getElementById('sr-prev');
  var next = document.getElementById('sr-next');
  var names = cards.map(function (c) { var h = c.querySelector('h3'); return h ? h.textContent : ''; });
  var idx = 0;
  var cue = document.querySelector('.sr-read-cue');
  var counter = document.getElementById('sr-counter');
  function markUsed() { if (cue) cue.classList.add('is-used'); }
  if (counter) counter.hidden = cards.length < 2;

  cards.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sr-dot-btn';
    b.setAttribute('aria-label', names[i]);
    b.addEventListener('click', function () { go(i); });
    dots.appendChild(b);
  });
  var dotBtns = Array.prototype.slice.call(dots.children);

  function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function go(i) {
    markUsed();
    i = Math.max(0, Math.min(cards.length - 1, i));
    var pad = parseFloat(getComputedStyle(track).scrollPaddingLeft || 0) || 0;
    track.scrollTo({ left: cards[i].offsetLeft - pad, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  function fit() {
    if (window.matchMedia('(max-width: 680px)').matches) {
      var cs = getComputedStyle(track);
      track.style.height = (Math.max.apply(null, cards.map(function (card) { return card.offsetHeight; })) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + 'px';
    } else {
      track.style.height = '';
    }
  }

  function update() {
    var max = track.scrollWidth - track.clientWidth;
    var best = 0, bestD = Infinity;
    var pad = parseFloat(getComputedStyle(track).scrollPaddingLeft || 0) || 0;
    cards.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft - pad - track.scrollLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (track.scrollLeft >= max - 4) best = cards.length - 1;
    idx = best;
    if (counter) counter.textContent = (idx + 1) + ' of ' + cards.length;
    if (nameEl) nameEl.textContent = names[idx];
    dotBtns.forEach(function (b, i) { b.setAttribute('aria-current', i === idx ? 'true' : 'false'); b.classList.toggle('sr-on', i === idx); });
    if (prev) prev.disabled = idx === 0;
    if (next) next.disabled = idx === cards.length - 1;
  }

  if (prev) prev.addEventListener('click', function () { go(idx - 1); });
  if (next) next.addEventListener('click', function () { go(idx + 1); });
  window.addEventListener('resize', fit);
  track.addEventListener('scroll', function () {
    if (track.scrollLeft > 0) markUsed();
    window.requestAnimationFrame(update);
  }, { passive: true });
  track.addEventListener('pointerdown', markUsed, { passive: true });
  track.addEventListener('wheel', markUsed, { passive: true });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  // Reserve the tallest slide once, so slide changes cannot move the page anchor.
  fit();
  if (document.fonts) document.fonts.ready.then(fit);
  if ('ResizeObserver' in window) {
    var sizeObserver = new ResizeObserver(fit);
    cards.forEach(function (card) { sizeObserver.observe(card); });
  }
  update();
})();
