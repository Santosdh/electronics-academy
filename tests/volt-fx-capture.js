// Captures mid-animation screenshots and short screen videos of Volt's lightning effect.
//   node tests/volt-fx-capture.js   (own server on a temp DB, port 4393; needs ffmpeg for the .mp4 files)
// The effect is slowed with window.VOLT_FX.speed so frames can be caught mid-flight.
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4393, BASE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-fxcap-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const vidDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ea-fxvid-'));
  async function session(opts) {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    await p.goto(BASE + '/#/login'); await p.fill('input[name=email]', 'alex.rivera@example.com'); await p.fill('input[name=password]', DEMO.learnerPassword);
    await p.click('#loginForm button'); await p.waitForSelector('.hero');
    await p.waitForSelector('body[data-guide-ready]', { state: 'attached' }); await p.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (await p.$('#guideTour')) { await p.click('#guideTourSkip'); await p.waitForSelector('#guideTour', { state: 'detached' }); }
    return { ctx, p };
  }
  // speed 0.1 → bolt travels 0–2.0 s, outline glows from ~1.7 s, explodes at ~3.7 s, page changes at ~4.4 s.
  async function sequence(p, sel, names, tap) {
    await p.evaluate(() => { window.VOLT_FX.speed = 0.1; });
    const t0 = Date.now();
    if (tap) await p.tap(sel); else await p.click(sel);
    const at = async (ms, name) => { const d = ms - (Date.now() - t0); if (d > 0) await wait(d); await p.screenshot({ path: path.join(SHOTS, name) }); console.log('  saved', name); };
    if (names[0]) await at(1000, names[0]);
    if (names[1]) await at(2900, names[1]);
    if (names[2]) await at(4000, names[2]);
    if (names[3]) await at(4650, names[3]);
    await wait(2500); await p.evaluate(() => { window.VOLT_FX.speed = 1; });
  }

  // Desktop: Program → M7 (Phase 2)
  const d = await session({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  await d.p.goto(BASE + '/#/program?ph=p2'); await d.p.waitForSelector('.mod-row'); await wait(600);
  await sequence(d.p, '.mod-row a[href="#/module/m7"]', ['55-volt-bolt-desktop.png', '56-volt-outline-glow-desktop.png', '57-volt-explosion-desktop.png', '58-volt-reveal-desktop.png']);
  // Desktop: dashboard phase card (Phase 3)
  await d.p.goto(BASE + '/#/'); await d.p.waitForSelector('.phase-card'); await wait(600);
  await d.p.$eval('.phase-grid', (e) => e.scrollIntoView({ block: 'center' })); await wait(300);
  await sequence(d.p, '.phase-card >> nth=2', ['59-volt-bolt-dashboard-card.png', null, '60-volt-explosion-dashboard-card.png']);
  await d.ctx.close();

  // Phone portrait: module page → lesson link (tap)
  const phoneOpts = (w, h) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await session(phoneOpts(390, 844));
  await m.p.goto(BASE + '/#/module/m6'); await m.p.waitForSelector('.module-banner');
  await m.p.$eval('li.with-action > a[href^="#/lesson/"]', (e) => e.scrollIntoView({ block: 'center' })); await wait(500);
  await sequence(m.p, 'li.with-action > a[href^="#/lesson/"]', ['62-volt-bolt-phone.png', '63-volt-outline-glow-phone.png', '64-volt-explosion-phone.png'], true);
  await m.ctx.close();
  // Phone landscape: program → module row (tap)
  const l = await session(phoneOpts(844, 390));
  await l.p.goto(BASE + '/#/program?ph=p3'); await l.p.waitForSelector('.mod-row'); await wait(600);
  await sequence(l.p, '.phase-section#p3 .mod-row a >> nth=1', ['65-volt-bolt-phone-landscape.png', null, '66-volt-explosion-phone-landscape.png'], true);
  await l.ctx.close();

  // Videos: real speed, then a slowed-down replay
  const videos = [];
  async function record(name, opts, steps) {
    const ctx = await browser.newContext({ ...opts, recordVideo: { dir: vidDir, size: opts.viewport } });
    const ctxAt = Date.now(), p = await ctx.newPage();
    await p.goto(BASE + '/#/login'); await p.fill('input[name=email]', 'alex.rivera@example.com'); await p.fill('input[name=password]', DEMO.learnerPassword);
    await p.click('#loginForm button'); await p.waitForSelector('.hero');
    await p.waitForSelector('body[data-guide-ready]', { state: 'attached' }); await p.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (await p.$('#guideTour')) { await p.click('#guideTourSkip'); await p.waitForSelector('#guideTour', { state: 'detached' }); }
    const startAt = Date.now();
    await steps(p);
    const v = p.video(); await ctx.close();
    videos.push({ name, src: await v.path(), skip: Math.max(0, (startAt - ctxAt) / 1000) });
  }
  const tap = (p, sel, touch) => (touch ? p.tap(sel) : p.click(sel));
  const demo = (touch) => async (p) => {
    await p.goto(BASE + '/#/program?ph=p2'); await p.waitForSelector('.mod-row'); await wait(1200);
    await tap(p, '.mod-row a[href="#/module/m7"]', touch); await p.waitForSelector('.module-banner'); await wait(1500);
    await p.$eval('li.with-action > a[href^="#/lesson/"]', (e) => e.scrollIntoView({ block: 'center' })); await wait(800);
    await tap(p, 'li.with-action > a[href^="#/lesson/"]', touch); await p.waitForSelector('.lesson-body'); await wait(1500);
    await p.goto(BASE + '/#/program?ph=p2'); await p.waitForSelector('.mod-row'); await wait(1000);
    await p.evaluate(() => { window.VOLT_FX.speed = 0.25; });
    await tap(p, '.mod-row a[href="#/module/m8"]', touch); await p.waitForSelector('.module-banner'); await wait(2200);
  };
  await record('67-volt-lightning-desktop.mp4', { viewport: { width: 1280, height: 800 } }, demo(false));
  await record('68-volt-lightning-phone.mp4', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, demo(true));
  for (const v of videos) {
    const out = path.join(SHOTS, v.name);
    try {
      // drop the sign-in part and encode H.264 for wide compatibility
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', v.src, '-ss', v.skip.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', out]);
      console.log('  saved', v.name);
    } catch (e) { fs.copyFileSync(v.src, out.replace(/\.mp4$/, '.webm')); console.log('  ffmpeg failed, saved webm instead', e.message); }
  }
  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  fs.rmSync(vidDir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
