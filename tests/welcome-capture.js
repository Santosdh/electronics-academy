// Screenshots (+ a short video) of Volt's entrance on the sign-in screen.   node tests/welcome-capture.js   (temp DB, port 4391)
// Frames are caught mid-flight by slowing the timeline with window.VOLT_WELCOME_SPEED (set before the page loads).
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo } = require('../scripts/seed');

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4391, BASE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-welcap-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const vidDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ea-welvid-'));
  // speed 0.25 → fly-in 0–4.8 s, landing ~4.6 s, wave 7.2–13.2 s (hand up 7.4–8.2, 9.4–10.2 …), bubble from 6.4 s, idle at 14 s
  async function run(opts, shots) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => { window.VOLT_WELCOME_SPEED = 0.25; });
    const p = await ctx.newPage();
    const t0 = Date.now();
    await p.goto(BASE + '/#/login'); await p.waitForSelector('#loginForm');
    for (const [at, name] of shots) { const d = at - (Date.now() - t0); if (d > 0) await wait(d); await p.screenshot({ path: path.join(SHOTS, name) }); console.log('  saved', name); }
    await ctx.close();
  }
  await run({ viewport: { width: 1366, height: 900 } }, [[1300, '82-welcome-desktop-midflight.png'], [5000, '83-welcome-desktop-landing.png'], [7800, '84-welcome-desktop-wave.png'], [15500, '85-welcome-desktop-landed.png']]);
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  await run(phone, [[900, '86-welcome-phone-midflight.png'], [9800, '87-welcome-phone-wave.png'], [15500, '88-welcome-phone-landed.png']]);

  // Video at real speed: page load → entrance → idle
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vidDir, size: { width: 1280, height: 800 } } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/login'); await p.waitForSelector('#loginForm'); await wait(5500);
  const v = p.video(); await ctx.close();
  const out = path.join(SHOTS, '89-welcome.mp4');
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', await v.path(), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', out]);
    console.log('  saved', path.basename(out));
  } catch (e) { fs.copyFileSync(await v.path(), out.replace(/\.mp4$/, '.webm')); console.log('  ffmpeg failed, saved webm instead', e.message); }

  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  fs.rmSync(vidDir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
