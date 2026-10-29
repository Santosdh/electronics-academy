// Phone layout checks (landscape + portrait) and screenshots.  node tests/mobile.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');

const GL = (() => { try { return require('../curriculum-source/guide-lines.json'); } catch (e) { return null; } })();
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4398, BASE = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-mobile-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  // Guide companion helpers: wait for its state, check/skip the first-login tour, and make sure it never sits on key controls.
  let tourChecked = false;
  async function settleGuide(page, label) {
    await page.waitForSelector('body[data-guide-ready]', { state: 'attached' });
    await page.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (await page.$('#guideTour')) {
      if (!tourChecked) {
        tourChecked = true;
        const card = await page.$eval('.guide-tour-card', (c) => { const r = c.getBoundingClientRect(); return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, h: Math.round(r.height) }; });
        ok(`${label} guide tour card fits the phone screen`, card.inside, card);
        await page.tap('#guideTourNext'); await page.waitForTimeout(250);
        ok(`${label} guide tour points at the ☰ menu on phones`, /☰|menu/i.test(await page.textContent('.guide-tour-card')), await page.textContent('.guide-tour-card'));
      }
      await page.tap('#guideTourSkip'); await page.waitForSelector('#guideTour', { state: 'detached' });
    }
  }
  const KEY_CONTROLS = '.topbar a, .topbar button, .hero .btn, #startQuiz, .option, #nextQ, #simTools .tool, .sim-toolbar button, .sim-toolbar select, #simSvg, .module-aside .btn, #markDone';
  const guideCovers = (page) => page.evaluate((sel) => {
    const G = document.getElementById('guide'); if (!G || G.hidden || getComputedStyle(G).display === 'none') return [];
    const g = [...document.querySelectorAll('#guideAvatar, #guideBubble:not([hidden])')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
    const hit = [];
    document.querySelectorAll(sel).forEach((e) => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('#guide')) return;
      g.forEach((b) => { const ix = Math.min(r.right, b.right) - Math.max(r.left, b.left), iy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top); if (ix > 2 && iy > 2) hit.push((e.id || e.className) + ' ' + (e.textContent || '').trim().slice(0, 24)); });
    });
    return hit;
  }, KEY_CONTROLS);
  async function phone(width, height, label) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
    await page.goto(BASE + '/#/login'); await page.waitForSelector('#loginForm');
    await page.fill('input[name=email]', 'alex.rivera@example.com'); await page.fill('input[name=password]', DEMO.learnerPassword);
    await page.tap('#loginForm button'); await page.waitForSelector('.hero');
    await settleGuide(page, label);
    return page;
  }
  const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const shot = async (page, name, full) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, name), fullPage: !!full }); console.log('  saved', name); };
  async function boardFits(page) {
    return page.evaluate(() => {
      const r = document.querySelector('#simSvg').getBoundingClientRect(), w = document.querySelector('.sim-canvas-wrap');
      return { fits: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && w.scrollWidth <= w.clientWidth + 1,
        board: [Math.round(r.width), Math.round(r.height)], viewport: [innerWidth, innerHeight], pageScrolls: document.documentElement.scrollHeight > innerHeight + 1 };
    });
  }
  async function tapGrid(page, gx, gy) {
    const b = await page.$eval('#simSvg', (s) => { const m = s.getScreenCTM(); return { a: m.a, d: m.d, e: m.e, f: m.f }; });
    await page.touchscreen.tap(b.e + (30 + gx * 60) * b.a, b.f + (30 + gy * 60) * b.d);
  }

  for (const [w, h] of [[844, 390], [932, 430]]) {
    const tag = `${w}x${h}`;
    const page = await phone(w, h, tag);
    const meta = await page.$eval('meta[name=viewport]', (m) => m.content);
    ok(`${tag} viewport meta`, /width=device-width/.test(meta) && /initial-scale=1/.test(meta) && !/user-scalable=no/.test(meta), meta);
    ok(`${tag} dashboard no sideways scroll`, await noHScroll(page));
    ok(`${tag} hamburger shown, nav collapsed`, await page.isVisible('#navToggle') && !(await page.isVisible('#mainnav')));
    const fs16 = await page.$eval('body', (b) => parseFloat(getComputedStyle(b).fontSize));
    ok(`${tag} body text ≥ 16px`, fs16 >= 16, fs16);
    const minBtn = await page.$$eval('.hero .btn', (bs) => Math.min(...bs.map((b) => b.getBoundingClientRect().height)));
    ok(`${tag} buttons ≥ 44px tall`, minBtn >= 44, minBtn);
    ok(`${tag} guide avatar shown, bubble not auto-opened on phone`, await page.isVisible('#guideAvatar') && !(await page.isVisible('#guideBubble')));
    ok(`${tag} guide does not cover dashboard controls`, (await guideCovers(page)).length === 0, await guideCovers(page));
    if (w === 844) await shot(page, '20-landscape-dashboard.png');
    await page.tap('#navToggle'); await page.waitForTimeout(200);
    ok(`${tag} menu opens as overlay`, await page.isVisible('#mainnav a[data-nav=simulator]'));
    ok(`${tag} guide steps aside while the menu is open`, !(await page.isVisible('#guideAvatar')));
    if (w === 844) await shot(page, '21-landscape-nav-open.png');
    await page.tap('#mainnav a[data-nav=program]'); await page.waitForSelector('.phase-section');
    ok(`${tag} menu closes after navigating`, !(await page.isVisible('#mainnav')));

    await page.goto(BASE + '/#/module/m6'); await page.waitForSelector('.module-banner');
    await page.tap('#guideAvatar'); await page.waitForSelector('#guideBubble', { state: 'visible' });
    ok(`${tag} long guide tip stays below the top bar and on screen`, (await guideCovers(page)).length === 0 && await page.$eval('#guideBubble', (b) => { const r = b.getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(); return r.top >= t.bottom && r.bottom <= innerHeight; }), await guideCovers(page));
    ok(`${tag} guide shows the module lines from guide-lines.json`, !GL || (await page.textContent('#guideText')).includes(GL.m6.intro.slice(0, 40)));
    await page.tap('#guideClose'); await page.waitForSelector('#guideBubble', { state: 'hidden' });
    // Volt lightning: tapping a lesson link fires the bolt and still navigates exactly once
    {
      const n0 = await page.evaluate(() => window.VOLT_FX.navigations);
      const lessonHref = await page.getAttribute('li.with-action > a[href^="#/lesson/"]', 'href');
      await page.tap('li.with-action > a[href^="#/lesson/"]');
      const inFlight = await page.evaluate(() => !!document.querySelector('.vfx-layer .vfx-bolt'));
      await page.waitForFunction((h) => location.hash === h, lessonHref, { timeout: 2000 }); await page.waitForSelector('.lesson-body');
      const fx = await page.evaluate(() => ({ last: window.VOLT_FX.last, n: window.VOLT_FX.navigations }));
      ok(`${tag} tapping a lesson fires Volt's bolt and opens the lesson once`, inFlight && fx.last.mode === 'bolt' && fx.last.from === 'volt' && fx.n === n0 + 1, fx);
    }
    await page.goto(BASE + '/#/lesson/l2-diodes-leds'); await page.waitForSelector('.lesson-body');
    ok(`${tag} lesson no sideways scroll`, await noHScroll(page));
    if (w === 844) await shot(page, '22-landscape-lesson.png');

    await page.goto(BASE + '/#/quiz/lesson/l1-ohms-law'); await page.waitForSelector('#startQuiz');
    await page.tap('#startQuiz'); await page.waitForSelector('.option'); await page.tap('.option >> nth=0'); await page.waitForSelector('.feedback');
    ok(`${tag} quiz no sideways scroll`, await noHScroll(page));
    ok(`${tag} guide does not cover quiz controls`, (await guideCovers(page)).length === 0, await guideCovers(page));
    if (w === 844) await shot(page, '23-landscape-quiz.png');

    await page.goto(BASE + '/#/simulator?preset=series'); await page.waitForSelector('#simSvg .comp'); await page.waitForTimeout(300);
    const fit = await boardFits(page);
    ok(`${tag} simulator board fits screen, no scrolling`, fit.fits && !fit.pageScrolls, fit);
    ok(`${tag} board uses most of the height`, fit.board[1] >= (h - 44) * 0.85, fit);
    ok(`${tag} all tools visible (2-column rail)`, await page.$$eval('#simTools .tool', (ts) => ts.length >= 15 && ts.every((t) => { const r = t.getBoundingClientRect(); return r.bottom <= innerHeight && r.height >= 30; })));
    ok(`${tag} guide clear of the board and tool rail`, (await guideCovers(page)).length === 0, await guideCovers(page));
    await page.tap('#guideAvatar'); await page.waitForSelector('#guideBubble', { state: 'visible' });
    const sheet = await page.$eval('#guideBubble', (b) => { const r = b.getBoundingClientRect(); return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, h: Math.round(r.height), vh: innerHeight }; });
    ok(`${tag} guide bubble fits the screen in landscape`, sheet.inside && sheet.h <= sheet.vh * 0.6, sheet);
    ok(`${tag} guide offers a simulator challenge`, /Challenge for M/.test(await page.textContent('#guideText')));
    if (w === 844) await shot(page, '45-guide-mobile-landscape.png');
    await page.tap('#guideClose'); await page.waitForSelector('#guideBubble', { state: 'hidden' });
    const fontPx = await page.$eval('.clabel', (t) => t.getBoundingClientRect().height);
    ok(`${tag} component labels readable (≥ 10px)`, fontPx >= 10, fontPx);
    // place a resistor by tap-tap and toggle via the select tool
    await page.tap('#simClear');
    await page.tap('[data-tool=battery]'); await tapGrid(page, 2, 5); await tapGrid(page, 2, 2);
    await page.tap('[data-tool=resistor]'); await tapGrid(page, 2, 2); await tapGrid(page, 6, 2);
    await page.tap('[data-tool=wire]'); await tapGrid(page, 6, 2); await tapGrid(page, 6, 5);
    await tapGrid(page, 6, 5); await tapGrid(page, 2, 5);
    const r = await page.evaluate(() => window.__sim.result());
    ok(`${tag} tap-to-place builds 9 V / 1 kΩ → 9 mA`, r.ok && Math.abs(r.components.R1.current - 0.009) < 1e-6, r.components);
    await page.selectOption('#simPreset', 'led'); await page.tap('[data-tool=select]');
    await page.tap('#simTable tr[data-sel=D1]');
    await page.$eval('.sim-side', (el) => { el.scrollTop = 0; });
    if (w === 844) await shot(page, '24-landscape-simulator.png');
    else await shot(page, '25-landscape-simulator-932x430.png');
    await page.context().close();
  }

  // Portrait
  const pp = await phone(390, 844, 'portrait');
  await pp.goto(BASE + '/#/simulator?preset=led'); await pp.waitForSelector('#simSvg .comp'); await pp.waitForTimeout(300);
  ok('portrait no sideways scroll', await noHScroll(pp));
  const pf = await pp.evaluate(() => { const r = document.querySelector('#simSvg').getBoundingClientRect(); const w = document.querySelector('.sim-canvas-wrap'); return { w: r.width, inner: innerWidth, scroll: w.scrollWidth > w.clientWidth + 1 }; });
  ok('portrait board fits width (no inner scroll)', !pf.scroll && pf.w <= pf.inner, pf);
  ok('portrait tools in at most two rows', await pp.$$eval('#simTools .tool', (ts) => new Set(ts.map((t) => Math.round(t.getBoundingClientRect().top))).size <= 2));
  ok('portrait guide clear of the board and tools', (await guideCovers(pp)).length === 0, await guideCovers(pp));
  await shot(pp, '26-portrait-simulator.png', true);
  await pp.goto(BASE + '/#/'); await pp.waitForSelector('.hero');
  ok('portrait guide does not cover dashboard controls', (await guideCovers(pp)).length === 0, await guideCovers(pp));
  await shot(pp, '27-portrait-dashboard.png');
  // Volt lightning (portrait): tap a phase card, then a module row; both navigate once, back works
  {
    const n0 = await pp.evaluate(() => window.VOLT_FX.navigations);
    await pp.tap('.phase-card >> nth=1');
    await pp.waitForFunction(() => location.hash === '#/program?ph=p2', null, { timeout: 2000 }); await pp.waitForSelector('.mod-row');
    await pp.waitForTimeout(500);
    await pp.tap('.mod-row:not(.is-locked) a[href="#/module/m7"]');
    await pp.waitForFunction(() => location.hash === '#/module/m7', null, { timeout: 2000 }); await pp.waitForSelector('.module-banner');
    const fx = await pp.evaluate(() => ({ last: window.VOLT_FX.last, n: window.VOLT_FX.navigations }));
    ok('portrait taps on a phase card and a module fire the bolt and navigate once each', fx.n === n0 + 2 && fx.last.mode === 'bolt' && fx.last.phase === 2, fx);
    await pp.goBack(); await pp.waitForFunction(() => location.hash === '#/program?ph=p2');
    ok('portrait back button returns to the program after the effect', true);
  }

  // Module-complete celebrations on a phone: fits the screen, tap skips without tapping through
  {
    await pp.goto(BASE + '/#/'); await pp.waitForSelector('.hero'); await pp.waitForTimeout(300);
    const h0 = await pp.evaluate(() => location.hash);
    const fits = [];
    for (const id of ['m7', 'm6', 'm5']) { // E scope, D volt, C circuit
      await pp.evaluate((i) => window.VOLT_CELEBRATE.play({ kind: 'module', id: i }), id); await pp.waitForSelector('.cel-root'); await pp.waitForTimeout(900);
      fits.push(await pp.evaluate(() => { const bad = []; document.querySelectorAll('.cel-root .cel-banner, .cel-root .cel-scope-banner, .cel-root .cel-volt-say').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1)) bad.push(e.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); });
        return { effect: window.VOLT_CELEBRATE.runs ? document.querySelector('.cel-root').dataset.effect : '', bad, scroll: document.documentElement.scrollWidth > innerWidth + 1 }; }));
      await pp.tap('.cel-root', { position: { x: 60, y: 300 }, force: true });
      await pp.waitForFunction(() => !window.VOLT_CELEBRATE.active(), null, { timeout: 3000 });
    }
    ok('portrait celebrations (scope banner, volt, circuit) fit within the screen width', fits.every((f) => !f.bad.length && !f.scroll), fits);
    const last = await pp.evaluate(() => window.VOLT_CELEBRATE.last);
    ok('portrait tap skips the celebration without tapping through', last.endedBy === 'tap' && (await pp.evaluate(() => location.hash)) === h0 && !(await pp.$('.cel-root')), { last, hash: await pp.evaluate(() => location.hash) });
  }

  // Sign-in Volt entrance on phones: portrait = flies in above the card without covering the form; landscape = hidden
  {
    const opts = (w, h) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const wctx = await browser.newContext(opts(390, 844)); const wp = await wctx.newPage();
    wp.on('pageerror', (e) => errors.push('[welcome] ' + e.message));
    await wp.goto(BASE + '/#/login'); await wp.waitForSelector('#loginForm');
    const samples = [];
    for (let i = 0; i < 6; i++) {
      samples.push(await wp.evaluate(() => ({ free: ['input[name=email]', 'input[name=password]', '#loginForm button'].every((s) => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e; }),
        sw: document.documentElement.scrollWidth, iw: innerWidth })));
      await wp.waitForTimeout(200);
    }
    ok('portrait welcome: fly-in never covers the fields / Sign in, no sideways scroll', samples.every((x) => x.free && x.sw <= x.iw + 1), samples);
    await wp.waitForFunction(() => document.querySelector('.auth-volt').dataset.phase === 'idle', null, { timeout: 7000 });
    const lay = await wp.evaluate(() => { const v = document.querySelector('.av-pic').getBoundingClientRect(), c = document.querySelector('.auth-card').getBoundingClientRect(), b = document.querySelector('.av-bubble').getBoundingClientRect();
      return { above: v.top < c.top && v.bottom <= c.top + 30, bubble: [Math.round(b.left), Math.round(b.right)], iw: innerWidth, bubbleIn: b.left >= 0 && b.right <= innerWidth, top: Math.round(b.top) }; });
    ok('portrait welcome: Volt lands above the card, bubble fully on screen', lay.above && lay.bubbleIn && lay.top >= 50, lay);
    await wctx.close();
    const lctx = await browser.newContext(opts(844, 390)); const lp = await lctx.newPage();
    await lp.goto(BASE + '/#/login'); await lp.waitForSelector('#loginForm');
    ok('landscape welcome: Volt hidden so the form fits the short screen', !(await lp.isVisible('.auth-volt')));
    await lctx.close();
  }

  // Desktop sanity: simulator layout unchanged
  const dctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const dp = await dctx.newPage();
  dp.on('pageerror', (e) => errors.push('[desktop] ' + e.message));
  await dp.goto(BASE + '/#/login'); await dp.fill('input[name=email]', 'alex.rivera@example.com'); await dp.fill('input[name=password]', DEMO.learnerPassword);
  await dp.click('#loginForm button'); await dp.waitForSelector('.hero');
  await dp.waitForSelector('body[data-guide-ready]', { state: 'attached' }); await dp.waitForFunction(() => !document.body.dataset.guideTourPending);
  ok('desktop guide shown, tour already done for this user', await dp.isVisible('#guideAvatar') && !(await dp.$('#guideTour')));
  ok('desktop nav inline (no hamburger)', !(await dp.isVisible('#navToggle')) && await dp.isVisible('#mainnav a[data-nav=tools]'));
  await dp.goto(BASE + '/#/simulator?preset=series'); await dp.waitForSelector('#simSvg .comp');
  ok('desktop simulator shows tool labels + page header', await dp.isVisible('.tool .tl') && await dp.isVisible('.page-head'));

  ok('no console/page errors', errors.length === 0, errors);
  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
