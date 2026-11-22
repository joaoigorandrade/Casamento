/* Casamento Verônica & João Igor — page behaviour.
   Ports the DCLogic component from the two design-canvas files:
   countdown, venue tabs, gift Pix dialog, RSVP state and the mobile menu. */
(() => {
  'use strict';

  const CONFIG = {
    // Cerimônia: 28/05/2027, 16h00, horário de Brasília.
    weddingAt: '2027-05-28T16:00:00-03:00',
    // TODO: trocar pela chave Pix real antes de publicar.
    pixKey: 'casamento.vj@email.com',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Shows or hides an overlay (menu, gift sheet) with its CSS transition from motion.css,
  // and pauses smooth scrolling while it is open.
  const animated = () => document.documentElement.classList.contains('motion');
  const showLayer = (el, open) => {
    clearTimeout(el._hideTimer);
    const lenis = window.__lenis;
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (open) {
      el.hidden = false;
      void el.offsetWidth; // commit the closed state so the transition runs
      el.classList.add('is-open');
    } else {
      el.classList.remove('is-open');
      if (animated()) el._hideTimer = setTimeout(() => { el.hidden = true; }, 260);
      else el.hidden = true;
    }
  };

  /* ── Countdown ─────────────────────────────────────────────────────────── */
  const countdown = () => {
    const cells = $$('[data-cd]');
    if (!cells.length) return;

    const target = new Date(CONFIG.weddingAt).getTime();
    const pad = (n) => String(Math.floor(n)).padStart(2, '0');

    const tick = () => {
      const diff = Math.max(0, target - Date.now()) / 1000;
      const values = {
        d: String(Math.floor(diff / 86400)),
        h: pad((diff % 86400) / 3600),
        m: pad((diff % 3600) / 60),
        s: pad(diff % 60),
      };
      for (const el of cells) {
        const v = values[el.dataset.cd];
        if (el.dataset.v === v) continue;
        const first = el.dataset.v === undefined;
        el.dataset.v = v;
        // motion.js rolls the changed digits; the first write just sets the text
        if (!first && window.__roll) window.__roll(el, v);
        else el.textContent = v;
      }
    };

    tick();
    setInterval(tick, 1000);
  };

  /* ── Venue tabs (mobile layout) ────────────────────────────────────────── */
  const venueTabs = () => {
    const tabs = $$('.venues__tab');
    if (!tabs.length) return;

    const select = (tab) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.toggle('is-active', on);
          if (on) panel.classList.add('is-in'); // a hidden tab never got its scroll reveal
          panel.style.setProperty('--from', `${tabs.indexOf(tab) > 0 ? 14 : -14}px`);
        }
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  };

  /* ── Mobile menu ───────────────────────────────────────────────────────── */
  const menu = () => {
    const drawer = $('#menu');
    const openBtn = $('[data-menu-open]');
    if (!drawer || !openBtn) return;

    const setOpen = (open) => {
      showLayer(drawer, open);
      openBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        const close = $('[data-menu-close]', drawer);
        if (close) close.focus();
      } else {
        openBtn.focus();
      }
    };

    openBtn.addEventListener('click', () => setOpen(true));
    $('[data-menu-close]', drawer).addEventListener('click', () => setOpen(false));
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) setOpen(false);
    });
  };

  /* ── Gift dialog + Pix ─────────────────────────────────────────────────── */
  const gifts = () => {
    const modal = $('#giftmodal');
    if (!modal) return;

    const titleEl = $('[data-gift-title]', modal);
    const priceEl = $('[data-gift-price]', modal);
    const keyEl = $('[data-pix-key]', modal);
    const copyBtns = $$('[data-pix-copy]', modal);
    let lastTrigger = null;
    let resetLabel = null;

    keyEl.textContent = CONFIG.pixKey;

    const labelIdle = (btn) => (btn.classList.contains('giftmodal__copy--wide') ? 'Copiar chave Pix' : 'Copiar');
    const labelDone = (btn) => (btn.classList.contains('giftmodal__copy--wide') ? 'Chave copiada' : 'Copiado');

    const setOpen = (open) => {
      showLayer(modal, open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        copyBtns.forEach((b) => { b.textContent = labelIdle(b); });
        clearTimeout(resetLabel);
        $('[data-gift-close]', modal).focus();
      } else if (lastTrigger) {
        lastTrigger.focus();
      }
    };

    $$('[data-gift]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lastTrigger = btn;
        titleEl.textContent = btn.dataset.gift;
        priceEl.textContent = btn.dataset.price;
        setOpen(true);
      });
    });

    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(CONFIG.pixKey);
        } catch {
          // Clipboard blocked (http, old browser, denied permission) — the key
          // stays visible on screen, so the guest can still copy it by hand.
        }
        copyBtns.forEach((b) => { b.textContent = labelDone(b); });
        clearTimeout(resetLabel);
        resetLabel = setTimeout(() => {
          copyBtns.forEach((b) => { b.textContent = labelIdle(b); });
        }, 2500);
      });
    });

    $('[data-gift-close]', modal).addEventListener('click', () => setOpen(false));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) setOpen(false);
    });
  };

  /* ── RSVP ──────────────────────────────────────────────────────────────── */
  const rsvp = () => {
    const form = $('#rsvp-form');
    const thanks = $('#rsvp-thanks');
    if (!form || !thanks) return;

    const titleEl = $('[data-thanks-title]', thanks);
    const textEl = $('[data-thanks-text]', thanks);
    const stickybar = $('#stickybar');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const first = String(data.get('nome') || '').trim().split(' ')[0];
      const going = data.get('vai') !== 'nao';

      titleEl.textContent = going ? `Obrigado, ${first}!` : `Sentiremos sua falta, ${first}.`;
      textEl.textContent = going
        ? 'Sua presença está confirmada. Mal podemos esperar para celebrar com você no dia 28 de maio.'
        : 'Obrigado por nos avisar com carinho. Você estará no nosso coração nesse dia.';

      // NOTE: the design has no backend — nothing is persisted yet.
      // Hook the POST up here when the RSVP endpoint exists.
      form.hidden = true;
      thanks.hidden = false;
      if (stickybar) stickybar.hidden = true;
      if (window.__scrollToTarget) window.__scrollToTarget(thanks);
      else thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('[data-rsvp-reset]', thanks).addEventListener('click', () => {
      form.reset();
      thanks.hidden = true;
      form.hidden = false;
      if (stickybar) stickybar.hidden = false;
      $('#r-nome').focus();
    });
  };

  countdown();
  venueTabs();
  menu();
  gifts();
  rsvp();
})();
