// Screenshots + short screen videos of the Ohm's Law Shooter with the artist's cartoon art kit.
//   node tests/game-capture.js   (own server on a temp DB, port 4391; needs ffmpeg for the .mp4 files)
// Levels are shortened to 3 correct hits (window.OHM_SHOOTER.config.hitsPerLevel = 3) so a ~25 s clip reaches level 4 (power);
// the videos also run the game clock at 1.8×.
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4391, BASE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-gamecap-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const vidDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ea-gamevid-'));
  const desk = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

  async function signIn(p) {
    await p.goto(BASE + '/#/login'); await p.fill('input[name=email]', 'alex.rivera@example.com'); await p.fill('input[name=password]', DEMO.learnerPassword);
    await p.click('#loginForm button'); await p.waitForSelector('.hero');
    await p.waitForSelector('body[data-guide-ready]', { state: 'attached' }); await p.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (await p.$('#guideTour')) { await p.click('#guideTourSkip'); await p.waitForSelector('#guideTour', { state: 'detached' }); }
  }
  const save = async (p, name) => { await p.screenshot({ path: path.join(SHOTS, name) }); console.log('  saved', name); };
  const S = (p) => p.evaluate(() => window.OHM_SHOOTER.state());
  // wait for a fresh round whose bubbles have slid out from under the problem card
  const roundReady = (p) => p.waitForFunction(() => { const H = window.OHM_SHOOTER, s = H.state(), q = document.querySelector('.osg-prompt');
    if (!q || s.status !== 'playing' || s.resolving || s.shooting) return false;
    const top = q.offsetTop + q.offsetHeight, ts = H.targets(); return ts.length === 4 && ts.every((t) => t.y > top - 8); }, null, { timeout: 20000 });
  const label = (p, correct) => p.evaluate((c) => window.OHM_SHOOTER.targets().find((t) => t.correct === c).label, correct);
  const fire = async (p, lab, touch) => { const sel = `.osg-target[aria-label="Shoot ${lab}"]`; if (touch) await p.tap(sel, { force: true }); else await p.click(sel, { force: true }); };
  // keyboard: steer Volt under the right bubble and press Space
  async function keyShot(p, lab) {
    const lane = await p.evaluate((l) => window.OHM_SHOOTER.targets().find((t) => t.label === l).lane, lab);
    await p.focus('.osg'); let cur = (await S(p)).lane;
    while (cur !== lane) { await p.keyboard.press(cur < lane ? 'ArrowRight' : 'ArrowLeft'); await wait(140); cur = (await S(p)).lane; }
    await p.keyboard.press('Space');
  }
  async function openGame(p, touch, viaCard) {
    await p.evaluate(() => { window.OHM_SHOOTER = window.OHM_SHOOTER || {}; window.OHM_SHOOTER.config = { hitsPerLevel: 3, seed: 2026 }; window.OHM_SHOOTER.speed = 1; });
    if (viaCard) {
      await p.goto(BASE + '/#/module/m5'); await p.waitForSelector('.play-card');
      await p.$eval('.play-card', (e) => e.scrollIntoView({ block: 'center' })); await wait(1400);
      if (touch) await p.tap('.play-card .btn'); else await p.click('.play-card .btn');
    } else await p.goto(BASE + '/#/games/ohms-shooter');
    await p.waitForSelector('.osg-start'); await p.waitForFunction(() => document.querySelector('.osg').dataset.art === 'cartoon');
    await p.evaluate(() => window.scrollTo(0, 0));
  }

  // ---- stills ----
  {
    const ctx = await browser.newContext(desk); const p = await ctx.newPage(); await signIn(p);
    await openGame(p, false); await wait(500);
    await p.click('.osg-start'); await roundReady(p);
    await p.evaluate(() => { window.OHM_SHOOTER.speed = 0.25; });
    await fire(p, await label(p, true)); await wait(420);
    await save(p, '94-ohm-shooter-desktop-bolt.png');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext(phone); const p = await ctx.newPage(); await signIn(p);
    await openGame(p, true); await wait(400);
    await p.tap('.osg-start'); await roundReady(p);
    await fire(p, await label(p, false), true); await wait(650);
    await save(p, '95-ohm-shooter-phone-wrong-hint.png');
    // play through to level 4 (power): the W answers reuse the yellow volt bubble
    while ((await S(p)).level < 4) { await roundReady(p); await fire(p, await label(p, true), true); await p.waitForFunction(() => window.OHM_SHOOTER.state().resolving || window.OHM_SHOOTER.state().level >= 4); }
    await roundReady(p); await wait(500);
    await save(p, '96-ohm-shooter-phone-power-level4.png');
    await ctx.close();
  }

  // ---- videos ----
  const videos = [];
  async function record(name, opts, steps) {
    const ctx = await browser.newContext({ ...opts, recordVideo: { dir: vidDir, size: opts.viewport } });
    const ctxAt = Date.now(), p = await ctx.newPage();
    await signIn(p);
    const startAt = Date.now();
    await steps(p);
    const v = p.video(); await ctx.close();
    videos.push({ name, src: await v.path(), skip: Math.max(0, (startAt - ctxAt) / 1000) });
  }
  // the clip only waits for the right bubble to show, and runs the game clock at 1.8× (window.OHM_SHOOTER.speed) to stay ~25 s
  const shown = (p) => p.waitForFunction(() => { const H = window.OHM_SHOOTER, s = H.state(), q = document.querySelector('.osg-prompt');
    if (!q || s.status !== 'playing' || s.resolving || s.shooting) return false;
    const top = q.offsetTop + q.offsetHeight, ts = H.targets(), c = ts.find((t) => t.correct); return ts.length === 4 && c && c.y > top + 4; }, null, { timeout: 20000 });
  const play = (touch) => async (p) => {
    await openGame(p, touch, true); await wait(1000);
    await p.evaluate(() => { window.OHM_SHOOTER.speed = 1.8; });
    if (touch) await p.tap('.osg-start'); else await p.click('.osg-start');
    await shown(p); await fire(p, await label(p, true), touch);             // L1 right
    await roundReady(p); await fire(p, await label(p, false), touch); await wait(1500);   // wrong → hint, -1 life
    await fire(p, await label(p, true), touch);
    await shown(p); if (touch) await fire(p, await label(p, true), touch); else await keyShot(p, await label(p, true));   // keyboard on desktop
    while ((await S(p)).level < 4) { await shown(p); await fire(p, await label(p, true), touch); await wait(150); }
    await roundReady(p); await wait(500); await fire(p, await label(p, true), touch);   // a power round (W answers)
    await wait(1500);
  };
  await record('92-ohm-shooter-desktop.mp4', desk, play(false));
  await record('93-ohm-shooter-phone.mp4', phone, play(true));
  for (const v of videos) {
    const out = path.join(SHOTS, v.name);
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', v.src, '-ss', v.skip.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', out]);
      console.log('  saved', v.name);
    } catch (e) { fs.copyFileSync(v.src, out.replace(/\.mp4$/, '.webm')); console.log('  ffmpeg failed, saved webm instead', e.message); }
  }
  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  fs.rmSync(vidDir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
