// Scroll motion below the hero. BaseLayout loads this file on the first scroll (or 3s after the page
// has loaded), and it loads motion.css (next to it). Neither is part of the page, which keeps them
// off the hero's first paint (as a module script, inline code or a deferred script it measurably
// delayed it in Lighthouse).
//
//   data-reveal            the element fades in and rises 12px once it's 18% visible
//   data-reveal-stagger    the same for each child, one after another
//   data-play              a mock's one-shot sequence (its timeline is in motion.css, plus the
//                          typing and count-up helpers below); data-play="manual" is left to its
//                          owner, which adds .is-playing itself (CSS only)
//   data-draw              sets --p as you scroll, which draws the How it works connector
//
// Every effect runs once. The hidden start states live in motion.css under html.motion, which is
// only added when the visitor hasn't asked for reduced motion. So with reduced motion, without
// JavaScript, or before this has started, the page is static and complete.
(function () {
  const root = document.documentElement;
  const motion =
    'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- typing and count-up (inside data-play) ----------

  // Splits the text into per-character spans (a .field chip counts as one unit) and hides them with
  // `visibility`, which keeps their space, so the bubble never changes size.
  function prepareType(el) {
    const units = [];
    for (const child of [...el.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const ch of child.textContent || '') {
          const span = document.createElement('span');
          span.textContent = ch;
          frag.append(span);
          if (ch.trim()) units.push(span);
        }
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement) {
        units.push(child);
      }
    }
    for (const u of units) u.style.visibility = 'hidden';
    return units;
  }

  function typeOut(units, delay, duration) {
    let start = 0;
    let shown = 0;
    const step = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const n = Math.round(t * units.length);
      for (; shown < n; shown++) units[shown].style.visibility = '';
      if (t < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  }

  // Counts a "$50"-style figure up from zero. The element keeps its final width, so nothing moves.
  function prepareCount(el) {
    const match = (el.textContent || '').match(/^(\D*)(\d+)(\D*)$/);
    return match ? { el, prefix: match[1], to: +match[2], suffix: match[3] } : null;
  }

  function countUp(c, delay, duration) {
    c.el.style.display = 'inline-block';
    c.el.style.minWidth = `${c.el.getBoundingClientRect().width}px`;
    c.el.style.textAlign = 'right';
    c.el.textContent = `${c.prefix}0${c.suffix}`;
    let start = 0;
    const step = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      c.el.textContent = `${c.prefix}${Math.round(c.to * eased)}${c.suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  }

  const players = new WeakMap();

  function preparePlay(el) {
    const typed = [...el.querySelectorAll('[data-type]')].map((t) => ({
      units: prepareType(t),
      delay: +(t.dataset.typeDelay || 300),
      duration: +(t.dataset.typeDuration || 1100),
    }));
    const counts = [...el.querySelectorAll('[data-count]')]
      .map((c) => ({ prepared: prepareCount(c), delay: +(c.dataset.countDelay || 700), duration: +(c.dataset.countDuration || 700) }))
      .filter((c) => c.prepared);
    players.set(el, () => {
      el.classList.add('is-playing');
      for (const t of typed) typeOut(t.units, t.delay, t.duration);
      for (const c of counts) countUp(c.prepared, c.delay, c.duration);
    });
  }

  function play(el) {
    const run = players.get(el);
    if (run) {
      players.delete(el);
      run();
    }
  }

  // ---------- reveals ----------
  // Grids and lists (data-reveal-stagger) reveal child by child: the children that come into view
  // together follow one another 80ms apart. A mock inside a card plays 150ms after its card has
  // started to appear, so it never plays while the card is still transparent.

  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  function revealChild(child) {
    child.classList.add('is-in');
    for (const mock of child.querySelectorAll('[data-play]')) setTimeout(() => play(mock), 150);
  }

  function startReveals() {
    const singles = [...document.querySelectorAll('[data-reveal], [data-play]:not([data-play="manual"])')].filter(
      (el) => !el.closest('[data-reveal-stagger] > *'),
    );
    const children = [...document.querySelectorAll('[data-reveal-stagger] > *')];
    // Anything already on screen (say, after a reload partway down the page) just stays as it is.
    for (const el of singles) {
      if (onScreen(el)) {
        el.removeAttribute('data-reveal');
        el.removeAttribute('data-play');
      }
    }
    for (const child of children) {
      if (onScreen(child)) {
        child.classList.add('is-in');
        child.style.animation = 'none';
        child.querySelectorAll('[data-play]').forEach((m) => m.removeAttribute('data-play'));
      }
    }
    for (const el of document.querySelectorAll('[data-play]')) preparePlay(el);
    root.classList.add('motion');

    const io = new IntersectionObserver(
      (entries) => {
        let k = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          io.unobserve(el);
          if (el.hasAttribute('data-play')) play(el);
          else if (el.hasAttribute('data-reveal')) el.classList.add('is-in');
          else setTimeout(() => revealChild(el), Math.min(k++ * 80, 400));
        }
      },
      { threshold: 0.18 },
    );
    singles.filter((el) => el.hasAttribute('data-reveal') || el.hasAttribute('data-play')).forEach((el) => io.observe(el));
    children.filter((c) => !c.classList.contains('is-in')).forEach((c) => io.observe(c));
    startDraw();
  }

  // ---------- scroll-drawn connector (How it works) ----------
  // The connector itself is CSS (in Steps), drawn in full by default. Here --p follows the scroll and
  // only grows; it reaches 1 just before the section's center gets to the middle of the screen, and
  // the numbers pop in as the line reaches them.

  function startDraw() {
    for (const section of document.querySelectorAll('[data-draw]')) {
      const markers = [...section.querySelectorAll('[data-draw-at]')];
      if (onScreen(section) || section.getBoundingClientRect().bottom < 0) continue;
      let progress = 0;
      let queued = false;
      const update = () => {
        queued = false;
        const r = section.getBoundingClientRect();
        const p = (window.innerHeight - r.top) / ((window.innerHeight / 2 + r.height / 2) * 0.92);
        progress = Math.max(progress, Math.min(1, Math.max(0, p)));
        section.style.setProperty('--p', String(progress));
        markers.forEach((m, i) => m.classList.toggle('reached', progress >= i / (markers.length - 1) - 0.001));
        if (progress >= 1) window.removeEventListener('scroll', onScroll);
      };
      const onScroll = () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      };
      section.classList.add('is-drawing');
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }
  }

  // ---------- start ----------
  // Only when the visitor hasn't asked for reduced motion; otherwise the page stays as it is.

  if (!motion) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('motion.css', document.currentScript.src).href;
  css.onload = () => requestAnimationFrame(startReveals);
  document.head.append(css);
})();
