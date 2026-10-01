// Scroll motion below the hero. BaseLayout loads this file on the first scroll (or 3s after the page
// has loaded), and it loads motion.css (next to it). Neither is part of the page, which keeps them
// off the hero's first paint (as a module script, inline code or a deferred script it measurably
// delayed it in Lighthouse).
//
//   data-reveal            the element fades in and rises 12px once it's 18% visible
//   data-reveal-stagger    the same for each child, one after another
//   data-play              a mock's one-shot sequence (CSS steps marked .m-step, plus the typing
//                          and count-up helpers below); data-play="manual" is left to its owner,
//                          which adds .is-playing itself (CSS steps only)
//   data-draw              a connector line drawn by scroll progress (How it works)
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

  const selector = '[data-reveal], [data-reveal-stagger], [data-play]:not([data-play="manual"])';

  function startReveals() {
    // Anything already on screen (say, after a reload partway down the page) just stays as it is.
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        el.removeAttribute('data-reveal');
        el.removeAttribute('data-reveal-stagger');
        el.removeAttribute('data-play');
      }
    }
    for (const parent of document.querySelectorAll('[data-reveal-stagger]')) {
      [...parent.children].forEach((child, i) => child.style.setProperty('--i', String(i)));
    }
    for (const el of document.querySelectorAll('[data-play]')) preparePlay(el);
    root.classList.add('motion');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          if (entry.target.hasAttribute('data-play')) play(entry.target);
          else entry.target.classList.add('is-in');
        }
      },
      { threshold: 0.18 },
    );
    document.querySelectorAll(selector).forEach((el) => io.observe(el));
    startDraw(true);
  }

  // ---------- scroll-drawn connector (How it works) ----------
  // The line runs between the first and last [data-draw-at] markers. It only grows, and is fully
  // drawn just before the section's center reaches the middle of the screen. Without motion it's
  // drawn right away (it's laid out by script, so without JavaScript there's no line).

  function startDraw(animate) {
    for (const section of document.querySelectorAll('[data-draw]')) {
      const line = section.querySelector('[data-draw-line]');
      const markers = [...section.querySelectorAll('[data-draw-at]')];
      if (!line || markers.length < 2) continue;
      const box = line.parentElement;
      let progress = 0;
      let queued = false;

      const place = () => {
        const b = box.getBoundingClientRect();
        const centers = markers.map((m) => {
          const r = m.getBoundingClientRect();
          return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
        });
        const first = centers[0];
        const last = centers[centers.length - 1];
        const vertical = Math.abs(last.y - first.y) > Math.abs(last.x - first.x);
        line.dataset.axis = vertical ? 'y' : 'x';
        line.style.left = `${first.x}px`;
        line.style.top = `${first.y}px`;
        line.style.width = vertical ? '' : `${last.x - first.x}px`;
        line.style.height = vertical ? `${last.y - first.y}px` : '';
      };

      const paint = () => {
        section.style.setProperty('--p', String(progress));
        markers.forEach((m, i) => m.classList.toggle('reached', progress >= i / (markers.length - 1) - 0.001));
      };

      const update = () => {
        queued = false;
        const r = section.getBoundingClientRect();
        // reaches 1 a little before the section's center gets to mid-screen
        const p = (window.innerHeight - r.top) / ((window.innerHeight / 2 + r.height / 2) * 0.92);
        progress = Math.max(progress, Math.min(1, Math.max(0, p)));
        paint();
        if (progress >= 1) window.removeEventListener('scroll', onScroll);
      };
      const onScroll = () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      };

      place();
      window.addEventListener('resize', place);
      if (document.fonts) document.fonts.ready.then(place);
      // already on screen (or past it) when this starts: drawn in full, like everything else
      const r = section.getBoundingClientRect();
      if (!animate || r.top < window.innerHeight) {
        progress = 1;
        paint();
      } else {
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
      }
    }
  }

  // ---------- start ----------
  // The CSS is needed either way (it styles the connector); the motion itself only starts when the
  // visitor hasn't asked for reduced motion.

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('motion.css', document.currentScript.src).href;
  css.onload = () => requestAnimationFrame(() => (motion ? startReveals() : startDraw(false)));
  document.head.append(css);
})();
