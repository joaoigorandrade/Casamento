/* Casamento — motion engine.
   Smooth wheel scrolling (Lenis), scroll reveals and the scroll-linked layers:
   hero parallax, drifting ornaments, the timeline line and the gift rail.
   One rAF loop reads the scroll once per frame, eases every layer toward its
   target and sleeps when everything has settled. See assets/MOTION.md. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 759.98px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Tuning — every number that shapes the motion. */
  const T = {
    follow: 0.14,          // 0–1 per frame (60 fps): how quickly layers catch up with the scroll
    hero: {
      ovalDrop: 70,        // px the oval sinks as the hero scrolls away (slower than the page)
      ovalShrink: 0.05,
      checkerLift: -60,    // px the checkerboard moves (counter-parallax)
      split: 70,           // artwork units each face drifts outward
      cornerTurn: 140,     // deg the corner marks turn over the hero's height
    },
    dress: {               // Traje moodboard; each piece's [start, end] scroll window is its data-beat
      overshoot: 2.2,      // how far a stamped piece (tag, stickers) squashes past its pose before settling
      settle: 1.1,         // the same, gentler, for the card
    },
    railScale: 0.06,       // how much smaller gift cards out of focus are
    rollCarry: 70,         // ms each countdown digit to the left rolls after the one on its right
    petals: {              // hero petals (mobile), in px and ms
      count: 9,
      size: [10, 17],
      period: 12000,       // one fall from top to bottom (±20% per petal)
      sway: 14,
      drift: 26,           // sideways travel over one fall (±)
      opacity: 0.85,
    },
    lenis: { lerp: 0.085, wheelMultiplier: 0.9 },
    anchorOffset: -64,
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ── Smooth scrolling ──────────────────────────────────────────────────── */
  let lenis = null;
  if (!reduced.matches && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ ...T.lenis, smoothWheel: true });
    window.__lenis = lenis; // site.js stops it while the menu or the gift sheet is open
  }

  const scrollToTarget = (el) => {
    if (lenis) {
      lenis.scrollTo(el, {
        offset: T.anchorOffset,
        duration: 1.2,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      });
    } else {
      el.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  };
  window.__scrollToTarget = scrollToTarget;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    // let the menu drawer start closing (and Lenis restart) before travelling
    requestAnimationFrame(() => scrollToTarget(el));
    history.replaceState(null, '', `#${id}`);
  });

  if (reduced.matches) return; // the rest is decoration; html.motion is absent too

  /* ── Reveals ───────────────────────────────────────────────────────────── */
  // [selector, kind, stagger group]. A group staggers its matches in order.
  const REVEALS = [
    ['.section__head .ornament', 'draw'],
    ['.section__head', null, '.kicker, .section__title, .rsvp__deadline'],
    ['.countdown', null, '.kicker, .countdown__cell'],
    ['.story__photo', 'scale'],
    ['.story__text', null, 'p, .signature'],
    ['.gallery', null, '.gallery__item', true],
    ['.schedule__actions'],
    ['.venues__tabs'],
    ['.venues', null, '.venue'],
    ['.venues__note'],
    ['.schedule', null, '.schedule__item'],
    ['.gifts__lede'],
    ['.gifts', null, '.gift', true], // a rail: reveal together, not as each card swipes in
    ['.rsvp__form', null, ':scope > .field, :scope > .rsvp__row, :scope > .rsvp__submit'],
    ['.footer__inner', null, '.footer__names, .footer__place, .footer__sign'],
  ];

  const toReveal = new Set();
  const groups = new Map(); // container → children revealed with it
  for (const [sel, kind, group, together] of REVEALS) {
    for (const el of $$(sel)) {
      if (group) {
        const kids = $$(group, el).filter((c) => !c.hasAttribute('data-reveal'));
        kids.forEach((c, i) => {
          c.setAttribute('data-reveal', '');
          c.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`);
          if (!together) toReveal.add(c);
        });
        if (together) { groups.set(el, kids); toReveal.add(el); }
      } else {
        el.setAttribute('data-reveal', kind || '');
        toReveal.add(el);
      }
    }
  }
  $$('.signature').forEach((s) => toReveal.add(s));

  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      (groups.get(e.target) || []).forEach((c) => c.classList.add('is-in'));
      revealer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  toReveal.forEach((el) => revealer.observe(el));

  /* ── Idle loops sleep off screen ───────────────────────────────────────── */
  const sleepers = $$('.hero, .has-drift, .countdown, .dress');
  const sleeper = new IntersectionObserver((entries) => {
    for (const e of entries) {
      e.target.classList.toggle('is-offscreen', !e.isIntersecting);
      if (e.target.classList.contains('hero')) petals.wake();
    }
  }, { rootMargin: '80px 0px' });

  /* ── Countdown: changed digits roll up instead of snapping ─────────────── */
  // site.js calls this with the new value. Digits are compared from the right,
  // and each place to the left rolls a beat later, like a carry.
  const rollUnseen = (el) => document.hidden || el.closest('.is-offscreen, .is-tucked');
  window.__roll = (el, next) => {
    const prev = el._shown ?? el.textContent;
    el._shown = next;
    if (rollUnseen(el) || prev.length !== next.length || !/^\d+$/.test(prev + next)) {
      el.textContent = next;
      return;
    }
    if (!el.querySelector('.digit')) {
      el.innerHTML = [...prev].map((c) => `<span class="digit"><span class="digit__in">${c}</span></span>`).join('');
    }
    const cells = el.querySelectorAll('.digit');
    [...next].forEach((c, i) => {
      const cell = cells[i];
      const cur = cell.querySelector('.digit__in');
      if (cur.textContent === c) return;
      cell.querySelector('.digit__out')?.remove();
      cur.className = 'digit__out';
      cur.setAttribute('aria-hidden', 'true');
      cur.addEventListener('animationend', () => cur.remove(), { once: true });
      const inc = document.createElement('span');
      inc.className = 'digit__in is-new';
      inc.textContent = c;
      cell.style.setProperty('--d', `${(next.length - 1 - i) * T.rollCarry}ms`);
      cell.appendChild(inc);
    });
  };

  /* ── Petals drifting down the hero (mobile) ────────────────────────────── */
  // One SVG inside the checkerboard, so it rides the checker's parallax and
  // falls behind the oval. One clock; it stops off screen, in the background
  // and on the desktop layout.
  const seeded = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const wave = (t, period, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
  const loop = (t, period, phase = 0) => ((t / period + phase) % 1 + 1) % 1;

  const petals = (() => {
    const host = $('.hero__checker');
    const heroEl = $('.hero');
    if (!host || !heroEl) return { wake() {} };
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'petals');
    svg.setAttribute('aria-hidden', 'true');
    const items = Array.from({ length: T.petals.count }, (_, i) => {
      const s = T.petals.size[0] + seeded(i, 1) * (T.petals.size[1] - T.petals.size[0]);
      const g = document.createElementNS(NS, 'g');
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', i % 3 === 0 ? '#i-burst' : '#i-flower');
      use.setAttribute('width', s.toFixed(1));
      use.setAttribute('height', s.toFixed(1));
      use.setAttribute('x', (-s / 2).toFixed(1));
      use.setAttribute('y', (-s / 2).toFixed(1));
      g.appendChild(use);
      svg.appendChild(g);
      return {
        g, burst: i % 3 === 0,
        period: T.petals.period * (0.8 + seeded(i, 2) * 0.4),
        phase: seeded(i, 3),
        x: seeded(i, 4),
        swayP: 3600 * (0.85 + seeded(i, 5) * 0.3),
        swayPh: seeded(i, 6),
        drift: (seeded(i, 7) - 0.5) * 2 * T.petals.drift,
        turn: seeded(i, 8) * 360,
        dir: seeded(i, 9) > 0.5 ? 1 : -1,
      };
    });
    host.appendChild(svg);

    let W = 1, H = 1, t = 0, last = 0, on = false;
    const size = () => { W = host.clientWidth || 1; H = host.clientHeight || 1; };
    const draw = () => {
      for (const p of items) {
        const k = loop(t, p.period, p.phase);
        const y = -20 + k * (H + 40);
        const x = p.x * W + T.petals.sway * wave(t, p.swayP, p.swayPh) + p.drift * k;
        const r = p.turn + (p.burst ? p.dir * t * 0.02 : 24 * wave(t, p.swayP * 1.3, p.swayPh + 0.25));
        const fade = Math.min(1, k / 0.06, (1 - k) / 0.06);
        p.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)})`);
        p.g.setAttribute('opacity', (fade * T.petals.opacity).toFixed(3));
      }
    };
    const tick = (now) => {
      if (!on) return;
      t += Math.min(50, now - last); // a long gap (tab away) never makes them jump
      last = now;
      draw();
      requestAnimationFrame(tick);
    };
    const wake = () => {
      const want = mobile.matches && !document.hidden && !heroEl.classList.contains('is-offscreen');
      svg.style.display = mobile.matches ? '' : 'none';
      if (want === on) return;
      on = want;
      if (on) { size(); last = performance.now(); requestAnimationFrame(tick); }
    };
    addEventListener('resize', size);
    mobile.addEventListener('change', wake);
    document.addEventListener('visibilitychange', wake);
    size();
    draw();
    return { wake, get running() { return on; } };
  })();
  window.__petals = petals; // read by tests

  sleepers.forEach((el) => sleeper.observe(el));
  petals.wake();

  /* ── Scroll-linked layers ──────────────────────────────────────────────── */
  const hero = $('.hero');
  const oval = $('.hero__oval');
  const checker = $('.hero__checker');
  const faceV = $('.couple__v');
  const faceJ = $('.couple__j');
  const corners = $$('.hero__corner');
  const topbar = $('.topbar');
  const stickybar = $('#stickybar');
  const rsvp = $('#rsvp');
  const schedule = $('.schedule');
  const scheduleItems = schedule ? $$('.schedule__item', schedule) : [];
  const rail = $('.gifts');
  const giftCards = rail ? $$('.gift', rail) : [];
  const dress = $('.dress');
  const dressStage = dress ? $('.dress__stage', dress) : null;
  const dressPieces = dress ? $$('[data-beat]', dress).map((el) => {
    const [a, b] = el.dataset.beat.split(',').map(Number);
    return { el, a, b, kind: el.dataset.ease || 'out' };
  }) : [];
  // ease-out for most pieces; a back-out (overshoot, then settle) for the stamped ones
  const backOut = (t, s) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
  const dressEase = {
    out: (t) => 1 - (1 - t) ** 3,
    settle: (t) => backOut(t, T.dress.settle),
    stamp: (t) => backOut(t, T.dress.overshoot),
  };

  const drifts = $$('[data-drift]').map((el) => {
    const [speed, spin] = el.dataset.drift.split(',').map(Number);
    return { el, host: el.parentElement, speed, spin, top: 0, h: 0 };
  });

  // Layout is measured on load/resize only, never inside the frame loop.
  let vh = innerHeight;
  let heroH = 1;
  let rsvpTop = Infinity;
  let rsvpBottom = Infinity;
  let schedTop = 0;
  let schedH = 1;
  let itemTops = [];
  let dressTop = 0;
  let dressH = 0;
  let dressRun = 1;

  const measure = () => {
    vh = innerHeight;
    const y = scrollY;
    heroH = hero ? hero.offsetHeight : 1;
    for (const d of drifts) {
      const r = d.host.getBoundingClientRect();
      d.top = r.top + y;
      d.h = r.height;
    }
    if (rsvp) {
      const r = rsvp.getBoundingClientRect();
      rsvpTop = r.top + y;
      rsvpBottom = r.bottom + y;
    }
    if (schedule) {
      const r = schedule.getBoundingClientRect();
      schedTop = r.top + y;
      schedH = Math.max(1, r.height);
      itemTops = scheduleItems.map((it) => it.getBoundingClientRect().top + y - schedTop + 10);
    }
    if (dress) {
      const r = dress.getBoundingClientRect();
      // the stage pins below the top bar, so the run starts when the section reaches it
      dressTop = r.top + y - (parseFloat(getComputedStyle(dressStage).top) || 0);
      dressH = r.height;
      dressRun = Math.max(1, r.height - dressStage.offsetHeight);
    }
    railCheck();
    kick();
  };

  // Eased values: current chases target every frame.
  const ease = {};
  const follow = (key, target) => {
    const cur = ease[key] ?? target;
    const next = cur + (target - cur) * T.follow;
    ease[key] = Math.abs(target - next) < 0.01 ? target : next;
    if (ease[key] !== target) busy = true;
    return ease[key];
  };

  let busy = false;
  let running = false;
  let lastY = -1;

  const frame = (time) => {
    if (lenis) lenis.raf(time);
    const y = scrollY;
    busy = lenis ? lenis.isScrolling : false;

    // hero: the oval sinks slower than the page, faces drift apart, checker counter-moves
    if (hero && y < heroH + vh) {
      const p = clamp(y / heroH);
      const ovalY = follow('ovalY', p * T.hero.ovalDrop);
      const ovalS = 1 - follow('ovalS', p * T.hero.ovalShrink);
      oval.style.translate = `0 ${ovalY.toFixed(2)}px`;
      oval.style.scale = ovalS.toFixed(4);
      checker.style.translate = `0 ${follow('chk', p * T.hero.checkerLift).toFixed(2)}px`;
      const split = follow('split', p * T.hero.split);
      faceV.style.translate = `${(-split).toFixed(2)}px 0`;
      faceJ.style.translate = `${split.toFixed(2)}px 0`;
      const turn = follow('turn', p * T.hero.cornerTurn);
      corners.forEach((c, i) => { c.style.rotate = `${(i % 2 ? -turn : turn).toFixed(2)}deg`; });
    }

    // ornaments drift against the scroll and turn while their section passes
    for (const d of drifts) {
      if (y + vh < d.top - 200 || y > d.top + d.h + 200) continue;
      const p = clamp(((y + vh) - d.top) / (vh + d.h)) * 2 - 1; // -1 entering … 1 leaving
      const k = drifts.indexOf(d);
      d.el.style.translate = `0 ${follow(`dy${k}`, p * d.speed).toFixed(2)}px`;
      d.el.style.rotate = `${follow(`dr${k}`, p * d.spin).toFixed(2)}deg`;
    }

    // Traje: while the stage is pinned, scrolling assembles the moodboard
    if (dress && y + vh > dressTop - 200 && y < dressTop + dressH + 200) {
      const p = clamp((y - dressTop) / dressRun);
      dress.style.setProperty('--p', follow('dressP', p).toFixed(4));
      dressPieces.forEach((d, i) => {
        const t = follow(`dress${i}`, clamp((p - d.a) / (d.b - d.a)));
        d.el.style.setProperty('--t', dressEase[d.kind](t).toFixed(4));
      });
    }

    // timeline: the line fills up to the middle of the screen
    if (schedule && mobile.matches) {
      const reach = y + vh * 0.6 - schedTop;
      const line = follow('line', clamp(reach / schedH));
      schedule.style.setProperty('--line', line.toFixed(4));
      const drawn = line * schedH;
      scheduleItems.forEach((it, i) => it.classList.toggle('is-past', drawn >= itemTops[i]));
    }

    // chrome
    if (y !== lastY) {
      topbar.classList.toggle('is-scrolled', y > 8);
      if (stickybar && mobile.matches) {
        const inRsvp = y + vh > rsvpTop + 120 && y < rsvpBottom;
        stickybar.classList.toggle('is-tucked', y < heroH * 0.55 || inRsvp);
      }
      lastY = y;
      busy = true;
    }

    if (busy || lenis?.isScrolling) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      if (lenis) idleLenis();
    }
  };

  // Lenis needs its own tick to notice wheel input; keep one cheap loop for it
  // while the main loop sleeps.
  let lenisIdle = false;
  const idleLenis = () => {
    if (lenisIdle) return;
    lenisIdle = true;
    const tick = (t) => {
      if (running) { lenisIdle = false; return; }
      lenis.raf(t);
      if (lenis.isScrolling) { lenisIdle = false; kick(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  };

  /* ── Gift rail: the card nearest the start sits forward ────────────────── */
  const railCheck = () => {
    if (!rail) return;
    const isRail = rail.scrollWidth > rail.clientWidth + 4;
    rail.classList.toggle('is-rail', isRail);
    if (!isRail) giftCards.forEach((g) => { g.style.scale = ''; });
    else railFrame();
  };
  let railQueued = false;
  const railFrame = () => {
    railQueued = false;
    const left = rail.getBoundingClientRect().left + 24;
    for (const g of giftCards) {
      const r = g.getBoundingClientRect();
      const off = clamp(Math.abs(r.left - left) / r.width);
      g.style.scale = (1 - off * T.railScale).toFixed(4);
    }
  };
  if (rail) {
    rail.addEventListener('scroll', () => {
      if (!rail.classList.contains('is-rail') || railQueued) return;
      railQueued = true;
      requestAnimationFrame(railFrame);
    }, { passive: true });
  }

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  // fonts and the maps change heights after first paint
  if (document.fonts) document.fonts.ready.then(measure);
  new ResizeObserver(() => measure()).observe(document.body);

  measure();
})();
