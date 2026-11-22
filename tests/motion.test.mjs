// Motion tests for the mobile site. Run with `npm test`.
// Serves the repo on a random port, opens it in headless Chromium at phone size
// and checks that the page moves where it should and stays still where it should.
// External requests (fonts, Lenis, maps) are blocked so the run is offline and stable.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const PHONE = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

let server, base, browser;

before(async () => {
  server = http.createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path === '/' ? 'index.html' : path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(options = {}) {
  const context = await browser.newContext({ ...PHONE, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
  await page.goto(base);
  return { page, errors, close: () => context.close() };
}

const wait = (page, ms) => page.waitForTimeout(ms);
// html has `scroll-behavior: smooth` when Lenis is absent (it is blocked here), so jump instantly
const jump = (page, y) => page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
const jumpTo = (page, sel) => page.$eval(sel, (e) => scrollTo({ top: e.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
const petalPositions = (page) => page.$$eval('.petals g', (gs) => gs.map((g) => g.getAttribute('transform')));

test('hero entrance plays and lands on the still design', async () => {
  const { page, errors, close } = await open();
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains('motion')));
  // mid-entrance the names are still rising in
  assert.ok(Number(await page.$eval('.hero__names', (e) => getComputedStyle(e).opacity)) < 1);
  await wait(page, 2200);
  for (const sel of ['.hero__oval', '.hero__names', '.couple__v', '.couple__j', '.hero__meta']) {
    assert.equal(await page.$eval(sel, (e) => getComputedStyle(e).opacity), '1', `${sel} is fully in`);
  }
  assert.deepEqual(errors, []);
  await close();
});

test('petals drift in the hero and sleep when it scrolls away', async () => {
  const { page, close } = await open();
  await wait(page, 300);
  assert.equal(await page.$$eval('.petals g', (gs) => gs.length), 9);
  assert.equal(await page.evaluate(() => window.__petals.running), true);

  const a = await petalPositions(page);
  await wait(page, 400);
  const b = await petalPositions(page);
  assert.ok(a.some((t, i) => t !== b[i]), 'petals move');

  // every petal stays a valid, finite transform (no NaN from the clock)
  assert.ok(b.every((t) => /^translate\(-?[\d.]+ -?[\d.]+\) rotate\(-?[\d.]+\)$/.test(t)));

  await jump(page, 1e6);
  await wait(page, 400);
  assert.equal(await page.evaluate(() => window.__petals.running), false, 'paused off screen');
  assert.equal(await page.$eval('.couple__v-live', (e) => getComputedStyle(e).animationPlayState), 'paused');
  const c = await petalPositions(page);
  await wait(page, 300);
  assert.deepEqual(await petalPositions(page), c, 'nothing moves while paused');

  await jump(page, 0);
  await wait(page, 400);
  assert.equal(await page.evaluate(() => window.__petals.running), true, 'wakes when back');
  await close();
});

test('countdown digits roll instead of snapping, and settle on the right value', async () => {
  const { page, close } = await open();
  const sec = page.locator('.countdown [data-cd="s"]');
  // within ~1.1 s the seconds change and the roll starts
  await page.waitForFunction(() => document.querySelector('.countdown [data-cd="s"] .digit__out'), null, { timeout: 2500 });
  const state = await sec.evaluate((el) => ({
    v: el.dataset.v,
    shown: [...el.querySelectorAll('.digit__in')].map((d) => d.textContent).join(''),
    outs: [...el.querySelectorAll('.digit')].map((d) => d.querySelectorAll('.digit__out').length),
    anim: getComputedStyle(el.querySelector('.digit__in.is-new')).animationName,
  }));
  assert.equal(state.shown, state.v, 'incoming digits spell the current value');
  assert.ok(state.outs.every((n) => n <= 1), 'never more than one digit leaving per place');
  assert.equal(state.anim, 'roll-in');

  // leaving digits are removed once they have rolled out
  await wait(page, 700);
  const left = await sec.evaluate((el) => {
    const outs = el.querySelectorAll('.digit__out');
    return [...outs].filter((o) => o.getAnimations().every((a) => a.playState === 'finished')).length;
  });
  assert.equal(left, 0);
  await close();
});

test('timeline line draws and each stop ripples as it is reached', async () => {
  const { page, close } = await open();
  await jumpTo(page, '.schedule');
  await page.waitForFunction(() => document.querySelector('.schedule__item.is-past'), null, { timeout: 3000 });
  const line = Number(await page.$eval('.schedule', (e) => e.style.getPropertyValue('--line')));
  assert.ok(line > 0 && line <= 1, `line drawn (${line})`);
  const ripple = await page.$eval('.schedule__item.is-past', (e) => getComputedStyle(e, '::after').animationName);
  assert.equal(ripple, 'ripple');
  await close();
});

test('RSVP thank-you card arrives and its marks come alive', async () => {
  const { page, close } = await open();
  await page.fill('#r-nome', 'Teste Convidado');
  await page.click('.rsvp__submit');
  await page.waitForSelector('#rsvp-thanks:not([hidden])');
  assert.equal(await page.$eval('#rsvp-thanks', (e) => getComputedStyle(e).animationName), 'thanks-in');
  await wait(page, 1400);
  assert.equal(await page.$eval('#rsvp-thanks', (e) => getComputedStyle(e).opacity), '1');
  assert.equal(await page.$eval('.rsvp__thanks-marks .mark--flower', (e) => getComputedStyle(e).animationName), 'sway-mid');
  assert.equal(await page.$eval('.rsvp__thanks-marks .mark--burst', (e) => getComputedStyle(e).animationName), 'spin');
  await close();
});

test('reduced motion: the page is the still design', async () => {
  const { page, errors, close } = await open({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('motion')), false);
  assert.equal(await page.$$eval('.petals', (p) => p.length), 0, 'no petals');
  assert.equal(await page.$eval('.hero__names', (e) => getComputedStyle(e).opacity), '1', 'hero shows at once');
  await wait(page, 1300);
  const sec = await page.$eval('.countdown [data-cd="s"]', (el) => ({ html: el.innerHTML, v: el.dataset.v }));
  assert.equal(sec.html, sec.v, 'countdown writes plain text, no rolling digits');
  assert.deepEqual(errors, []);
  await close();
});

test('desktop layout keeps the petals off', async () => {
  const { page, close } = await open({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await wait(page, 300);
  assert.equal(await page.evaluate(() => window.__petals.running), false);
  assert.equal(await page.$eval('.petals', (e) => getComputedStyle(e).display), 'none');
  await close();
});

// scroll to fraction p of the Traje pin (the stage sticks below the top bar)
const dressAt = (page, p) => page.evaluate((p) => {
  const d = document.querySelector('.dress'), st = document.querySelector('.dress__stage');
  const top = d.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(st).top) || 0);
  scrollTo({ top: top + p * (d.offsetHeight - st.offsetHeight), behavior: 'instant' });
}, p);
const dressTs = (page) => page.$$eval('.dress [data-beat]', (els) => els.map((e) => Number(e.style.getPropertyValue('--t'))));

test('Traje: the stage pins and the moodboard assembles as you scroll', async () => {
  const { page, errors, close } = await open();
  await dressAt(page, 0);
  await wait(page, 900);
  const start = await dressTs(page);
  assert.ok(start.length > 15);
  assert.ok(start.every((t) => t < 0.05), 'nothing is placed at the start');

  await dressAt(page, 0.5);
  await wait(page, 900);
  const bar = await page.$eval('.dress__stage', (e) => parseFloat(getComputedStyle(e).top));
  assert.equal(await page.$eval('.dress__stage', (e) => Math.round(e.getBoundingClientRect().top)), bar, 'pinned mid-way');
  const mid = await dressTs(page);
  assert.ok(mid.some((t) => t > 0.99) && mid.some((t) => t < 0.01), 'half assembled mid-way');

  await dressAt(page, 1);
  await wait(page, 1200);
  assert.ok((await dressTs(page)).every((t) => Math.abs(t - 1) < 0.01), 'every piece lands on its pose');
  assert.equal(await page.$eval('.dress__tag', (e) => getComputedStyle(e).opacity), '1');
  assert.deepEqual(errors, []);
  await close();
});

test('Traje with reduced motion is the finished collage, not pinned', async () => {
  const { page, close } = await open({ reducedMotion: 'reduce' });
  await jumpTo(page, '.dress');
  await wait(page, 300);
  const s = await page.evaluate(() => {
    const d = document.querySelector('.dress'), st = document.querySelector('.dress__stage');
    return { pos: getComputedStyle(st).position, extra: d.offsetHeight - st.offsetHeight };
  });
  assert.equal(s.pos, 'relative');
  assert.ok(s.extra <= 1, `section is just the stage (+ its 1px border), not a tall pin (${s.extra}px)`);
  for (const sel of ['.dress__cardwrap', '.dress__tag', '.dress__blazer', '.dress__swatch--1', '.dress__word--a']) {
    const st = await page.$eval(sel, (e) => ({ o: getComputedStyle(e).opacity, tr: getComputedStyle(e).translate }));
    assert.equal(st.o, sel === '.dress__word--a' ? '0.9' : '1', `${sel} visible`);
    assert.ok(st.tr === 'none' || /^0px( 0px)?$/.test(st.tr), `${sel} at its pose (${st.tr})`);
  }
  await close();
});

test('motion never makes the phone layout scroll sideways', async () => {
  const { page, close } = await open();
  for (const y of [0, 0.25, 0.5, 0.75, 1]) {
    await jump(page, await page.evaluate((k) => (document.body.scrollHeight - innerHeight) * k, y));
    await wait(page, 250);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(over <= 0, `no horizontal overflow at ${y * 100}% (${over}px)`);
  }
  await close();
});

test('envelope intro: holds the hero, opens on tap, then never shows again', async () => {
  const context = await browser.newContext(PHONE);
  // the page skips the intro for automated browsers; pretend to be a person
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await context.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.goto(base);
  assert.ok(await page.isVisible('#intro'), 'intro shows on the first visit');
  await wait(page, 1500);
  assert.equal(await page.$eval('.hero__names', (e) => getComputedStyle(e).opacity), '0', 'hero entrance waits');
  assert.equal(await page.$eval('#historia', (e) => e.inert), true, 'page behind is inert');
  await page.click('[data-intro-open]');
  await page.waitForSelector('#intro', { state: 'detached', timeout: 4000 });
  await wait(page, 2200);
  assert.equal(await page.$eval('.hero__names', (e) => getComputedStyle(e).opacity), '1', 'hero plays after');
  await page.reload();
  assert.equal(await page.$('#intro'), null, 'second visit goes straight in');
  await context.close();
});

test('countdown turns into "É hoje!" on the day and "Casados" after', async () => {
  for (const [at, phase] of [['2027-05-28T18:00', 'today'], ['2027-06-02T10:00', 'after']]) {
    const context = await browser.newContext(PHONE);
    await context.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
    const page = await context.newPage();
    await page.goto(`${base}?agora=${at}`);
    assert.equal(await page.$eval('.countdown', (e) => e.dataset.phase), phase);
    assert.equal(await page.isVisible(`.countdown__done--${phase}`), true);
    assert.equal(await page.isVisible('.countdown__grid'), false);
    await context.close();
  }
});
