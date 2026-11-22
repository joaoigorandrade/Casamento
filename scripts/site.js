/* Casamento Verônica & João Igor — page behaviour.
   Ports the DCLogic component from the two design-canvas files:
   envelope intro, countdown, venue tabs, gift Pix dialog, RSVP, calendar, share and the mobile menu.

   Tudo o que precisa da sua mão está em CONFIG, logo abaixo, marcado com ✋ VOCÊ. */
(() => {
  'use strict';

  const CONFIG = {
    // Cerimônia: 28/05/2027, 16h00, horário de Brasília.
    weddingAt: '2027-05-28T16:00:00-03:00',
    // Até quando o site mostra "É hoje!" antes de virar "Casados".
    partyEndsAt: '2027-05-29T04:00:00-03:00',

    // Pix por celular. pixKey é o que vai para a área de transferência (só dígitos, com DDD —
    // é como os apps dos bancos pedem); pixKeyShown é como aparece na tela.
    pixKey: '31992696270',
    pixKeyShown: '(31) 99269-6270',
    pixKeyType: 'Celular',
    // ✋ VOCÊ: o nome do titular COMO O BANCO MOSTRA na hora do Pix (o convidado confere isso
    //   antes de pagar; se não bater, ele desconfia) e o nome do banco, ex.: 'Nubank', 'Itaú'.
    pixHolder: 'Verônica Andrade Lima',
    pixBank: 'Nubank',

    // ✋ VOCÊ: endereço que recebe as confirmações de presença.
    //   Enquanto estiver vazio, o formulário mostra o agradecimento mas a resposta fica só no
    //   navegador do convidado (localStorage) — NÃO chega até vocês.
    //   Passo a passo para ligar numa planilha do Google (grátis, ~10 min) está em
    //   scripts/rsvp-apps-script.gs. No fim você cola aqui a URL que termina em /exec.
    rsvpEndpoint: '',

    // WhatsApp (55 + DDD + número) para o convidado falar com vocês se o envio do RSVP falhar.
    whatsapp: '5531992696270',

    // ✋ VOCÊ: o endereço final do site (o mesmo das tags og: no <head> do index.html).
    siteUrl: 'https://casamento-veronica-joao-igor.vercel.app/',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const site = $('.site');

  // Preview other moments of the countdown: ?agora=2027-05-28T18:00 (local time).
  const override = new URLSearchParams(location.search).get('agora');
  const offset = override && !Number.isNaN(Date.parse(override)) ? Date.parse(override) - Date.now() : 0;
  const now = () => Date.now() + offset;

  // While an overlay is open, everything else on the page is inert, so Tab and screen readers
  // stay inside the overlay (aria-modal alone does not do that).
  const setInert = (layer, on) => {
    if (!site) return;
    for (const el of site.children) if (el !== layer) el.inert = on;
  };

  // Shows or hides an overlay (menu, gift sheet) with its CSS transition from motion.css,
  // and pauses smooth scrolling while it is open.
  const animated = () => document.documentElement.classList.contains('motion');
  const showLayer = (el, open) => {
    clearTimeout(el._hideTimer);
    const lenis = window.__lenis;
    if (lenis) (open ? lenis.stop() : lenis.start());
    setInert(el, open);
    document.body.style.overflow = open ? 'hidden' : '';
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

  /* ── Envelope intro (first visit only) ─────────────────────────────────── */
  // The <head> script adds html.has-intro on a first visit; the hero entrance waits for it.
  const intro = () => {
    const el = $('#intro');
    const root = document.documentElement;
    if (!el) return;
    if (!root.classList.contains('has-intro')) { el.remove(); return; }

    setInert(el, true);
    document.body.style.overflow = 'hidden';
    const openBtn = $('[data-intro-open]', el);
    openBtn.focus({ preventScroll: true });

    let done = false;
    const finish = () => {
      root.classList.remove('has-intro'); // the hero entrance starts now
      setInert(el, false);
      document.body.style.overflow = '';
      window.__lenis?.start();
      el.remove();
    };
    const open = (skip) => {
      if (done) return;
      done = true;
      try { localStorage.setItem('vj-intro', '1'); } catch { /* private mode: it shows again next time */ }
      if (skip || !animated()) { finish(); return; }
      el.classList.add('is-opening');
      setTimeout(finish, 2100);
    };

    openBtn.addEventListener('click', () => open(false));
    $('[data-intro-skip]', el).addEventListener('click', () => open(true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(true); });
    // Lenis starts after this script; stop it as soon as it exists.
    requestAnimationFrame(() => window.__lenis?.stop());
  };

  /* ── Countdown ─────────────────────────────────────────────────────────── */
  const countdown = () => {
    const cells = $$('[data-cd]');
    if (!cells.length) return;

    const target = new Date(CONFIG.weddingAt).getTime();
    const ends = new Date(CONFIG.partyEndsAt).getTime();
    const section = $('.countdown');
    const pad = (n) => String(Math.floor(n)).padStart(2, '0');
    let phase = null;
    let timer = 0;

    // before → the numbers; today → "É hoje!"; after → "Casados".
    const setPhase = (next) => {
      if (next === phase) return;
      phase = next;
      section?.setAttribute('data-phase', next);
      document.documentElement.dataset.phase = next;
      if (next === 'after') clearInterval(timer);
    };

    const tick = () => {
      const t = now();
      setPhase(t < target ? 'before' : t < ends ? 'today' : 'after');
      const diff = Math.max(0, target - t) / 1000;
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
    timer = setInterval(tick, 1000);
  };

  /* ── Venue tabs (mobile layout) ────────────────────────────────────────── */
  const venueTabs = () => {
    const tabs = $$('.venues__tab');
    if (!tabs.length) return;

    const select = (tab) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.toggle('is-active', on);
          if (on) panel.classList.add('is-in'); // a hidden tab never got its scroll reveal
          panel.style.setProperty('--from', `${tabs.indexOf(tab) > 0 ? 14 : -14}px`);
        }
      }
    };

    tabs.forEach((tab, i) => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
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
      if (open) {
        const close = $('[data-menu-close]', drawer);
        if (close) close.focus();
      } else {
        openBtn.focus({ preventScroll: true });
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
    const copyBtns = $$('[data-pix-copy]', modal);
    let lastTrigger = null;
    let resetLabel = null;

    $('[data-pix-key]', modal).textContent = CONFIG.pixKeyShown || CONFIG.pixKey;
    $('[data-pix-type]', modal).textContent = CONFIG.pixKeyType;
    $('[data-pix-holder]', modal).textContent = CONFIG.pixHolder;
    $('[data-pix-bank]', modal).textContent = CONFIG.pixBank;

    const labelIdle = (btn) => (btn.classList.contains('giftmodal__copy--wide') ? 'Copiar chave Pix' : 'Copiar');
    const labelDone = (btn) => (btn.classList.contains('giftmodal__copy--wide') ? 'Chave copiada' : 'Copiado');

    const setOpen = (open) => {
      showLayer(modal, open);
      if (open) {
        copyBtns.forEach((b) => { b.textContent = labelIdle(b); b.classList.remove('is-done'); });
        clearTimeout(resetLabel);
        $('[data-gift-close]', modal).focus();
      } else if (lastTrigger) {
        lastTrigger.focus({ preventScroll: true });
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
        copyBtns.forEach((b) => { b.textContent = labelDone(b); b.classList.add('is-done'); });
        clearTimeout(resetLabel);
        resetLabel = setTimeout(() => {
          copyBtns.forEach((b) => { b.textContent = labelIdle(b); b.classList.remove('is-done'); });
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
    const errorEl = $('[data-rsvp-error]', form);
    const submit = $('.rsvp__submit', form);
    const stickybar = $('#stickybar');
    const acomp = $('#r-acomp');
    const acompField = acomp?.closest('.field');

    // "Infelizmente não" hides the companions field.
    form.addEventListener('change', () => {
      const going = new FormData(form).get('vai') !== 'nao';
      if (acompField) acompField.classList.toggle('is-off', !going);
      if (acomp) acomp.disabled = !going;
    });

    // Sends the answer. Google Apps Script does not send CORS headers, so the request goes as
    // `no-cors`: the browser can't read the reply, but the row does land in the sheet.
    const send = async (data) => {
      const payload = { ...data, enviadoEm: new Date().toISOString(), pagina: location.href };
      if (!CONFIG.rsvpEndpoint) {
        // Sem endpoint ainda: guarda no navegador para não perder o teste.
        try {
          const list = JSON.parse(localStorage.getItem('vj-rsvp') || '[]');
          list.push(payload);
          localStorage.setItem('vj-rsvp', JSON.stringify(list));
        } catch { /* ignore */ }
        console.warn('[RSVP] CONFIG.rsvpEndpoint está vazio — a resposta NÃO foi enviada. Veja scripts/rsvp-apps-script.gs.', payload);
        return;
      }
      await fetch(CONFIG.rsvpEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams(payload),
      });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form));
      const first = String(data.nome || '').trim().split(/\s+/)[0];
      const going = data.vai !== 'nao';
      const extra = Number(data.acomp || 0);

      errorEl.hidden = true;
      submit.disabled = true;
      submit.textContent = 'Enviando…';
      try {
        await send({ ...data, acomp: going ? extra : 0 });
      } catch {
        submit.disabled = false;
        submit.textContent = 'Enviar confirmação';
        const msg = encodeURIComponent(`Oi! Tentei confirmar presença pelo site e não consegui. Sou ${data.nome} — ${going ? `vou, com ${extra} acompanhante(s)` : 'não poderei ir'}.`);
        $('a', errorEl).href = `https://wa.me/${CONFIG.whatsapp}?text=${msg}`;
        errorEl.hidden = false;
        return;
      }
      submit.disabled = false;
      submit.textContent = 'Enviar confirmação';

      const seats = extra === 0 ? 'Seu lugar está reservado' : `Reservamos ${extra + 1} lugares — o seu e mais ${extra}`;
      titleEl.textContent = going ? `Obrigado, ${first}!` : `Sentiremos sua falta, ${first}.`;
      textEl.textContent = going
        ? `${seats}. Mal podemos esperar para celebrar com você no dia 28 de maio.`
        : 'Obrigado por nos avisar com carinho. Você estará no nosso coração nesse dia.';
      thanks.classList.toggle('is-going', going);

      form.hidden = true;
      thanks.hidden = false;
      if (stickybar) stickybar.hidden = true;
      if (window.__scrollToTarget) window.__scrollToTarget(thanks);
      else thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('[data-rsvp-reset]', thanks).addEventListener('click', () => {
      form.reset();
      form.dispatchEvent(new Event('change'));
      thanks.hidden = true;
      form.hidden = false;
      if (stickybar) stickybar.hidden = false;
      $('#r-nome').focus();
    });
  };

  /* ── Add to calendar ───────────────────────────────────────────────────── */
  const calendar = () => {
    const ics = $$('[data-ics]');
    if (!ics.length) return;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Veronica e Joao Igor//Casamento//PT', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:casamento-veronica-joao-igor-20270528',
      'DTSTAMP:20261101T000000Z',
      'DTSTART:20270528T190000Z', // 16h00 em Brasília
      'DTEND:20270529T060000Z',
      'SUMMARY:Casamento Verônica & João Igor',
      'LOCATION:Paróquia Santíssima Trindade\\, R. Leonardo Gutierrez\\, 125 — Gutierrez\\, Belo Horizonte',
      `DESCRIPTION:Cerimônia às 16h00. Recepção às 17h30 em Braúnas. Traje esporte fino. ${CONFIG.siteUrl}`,
      `URL:${CONFIG.siteUrl}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Amanhã é o casamento!', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    ics.forEach((a) => { a.href = url; a.download = 'casamento-veronica-joao-igor.ics'; });
  };

  /* ── Share the invitation ──────────────────────────────────────────────── */
  const share = () => {
    const btn = $('[data-share]');
    if (!btn) return;
    const text = 'Verônica & João Igor vão se casar — 28 de maio de 2027, em Belo Horizonte.';
    btn.addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, text, url: CONFIG.siteUrl }); } catch { /* cancelled */ }
        return;
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${CONFIG.siteUrl}`)}`, '_blank', 'noopener');
    });
  };

  intro();
  countdown();
  venueTabs();
  menu();
  gifts();
  rsvp();
  calendar();
  share();
})();
