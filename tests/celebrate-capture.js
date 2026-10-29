// Captures screenshots and a short video of the module-complete celebrations (effects A–E lifted from the artist's
// concepts in public/demo/celebrations.html).   node tests/celebrate-capture.js   (own server on a temp DB, port 4392)
// Frames are caught mid-effect by slowing window.VOLT_CELEBRATE.speed; the video plays at real speed.
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4392, BASE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-celcap-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const vidDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ea-celvid-'));
  async function login(p) {
    await p.goto(BASE + '/#/login'); await p.fill('input[name=email]', 'alex.rivera@example.com'); await p.fill('input[name=password]', DEMO.learnerPassword);
    await p.click('#loginForm button'); await p.waitForSelector('.hero');
    await p.waitForSelector('body[data-guide-ready]', { state: 'attached' }); await p.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (await p.$('#guideTour')) { await p.click('#guideTourSkip'); await p.waitForSelector('#guideTour', { state: 'detached' }); }
  }
  async function session(opts) { const ctx = await browser.newContext(opts); const p = await ctx.newPage(); await login(p); return { ctx, p }; }
  // Play one celebration slowed to `speed`, screenshot at real-time offsets (ms), then skip it.
  async function frames(p, spec, speed, shots, prep) {
    await p.evaluate((s) => { window.VOLT_CELEBRATE.speed = s; localStorage.removeItem('ea.celebrate.last'); }, speed); // show each module's own seeded effect
    const t0 = Date.now();
    await p.evaluate((s) => window.VOLT_CELEBRATE.play(s), spec);
    if (prep) await p.evaluate(prep);
    for (const [at, name] of shots) { const d = at - (Date.now() - t0); if (d > 0) await wait(d); await p.screenshot({ path: path.join(SHOTS, name) }); console.log('  saved', name); }
    await p.keyboard.press('Escape'); await p.evaluate(() => { window.VOLT_CELEBRATE.speed = 1; }); await wait(300);
  }
  const page = async (p, hash, sel) => { await p.goto(BASE + hash); await p.waitForSelector(sel); await wait(500); };

  // Desktop (1366×900)
  const d = await session({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  await page(d.p, '/#/program?ph=p2', '.mod-row');
  await frames(d.p, { kind: 'module', id: 'm8' }, 0.4, [[3000, '69-celebrate-A-fireworks.png']]);
  // B on its own: the banner layer only (the other effect layer hidden for the shot)
  await frames(d.p, { kind: 'module', id: 'm5' }, 0.4, [[2900, '70-celebrate-B-banner.png']], () => document.querySelectorAll('.cel-root .cel-layer:not(:has(.cel-banner))').forEach((l) => { l.style.display = 'none'; }));
  await frames(d.p, { kind: 'module', id: 'm5' }, 0.4, [[2900, '71-celebrate-C-circuit.png']]);
  await frames(d.p, { kind: 'module', id: 'm6' }, 0.4, [[2200, '72-celebrate-D-volt-victory-lap.png']]);
  await frames(d.p, { kind: 'module', id: 'm7' }, 0.4, [[1250, '73-celebrate-E-scope-spike.png'], [3600, '74-celebrate-E-scope-banner.png']]);
  await frames(d.p, { kind: 'safety', id: 'm2', phase: 1 }, 0.4, [[2900, '75-celebrate-safety-cleared.png']]);
  await frames(d.p, { kind: 'phase', phase: 2, title: 'Circuit Theory & Devices · 60 h ✓', id: 'm9' }, 0.4, [[4300, '76-celebrate-phase-finale.png']]);
  await d.ctx.close();

  // Reduced motion: calm fade
  const r = await session({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page(r.p, '/#/program?ph=p2', '.mod-row');
  await frames(r.p, { kind: 'module', id: 'm6' }, 0.5, [[1400, '77-celebrate-reduced-motion-calm.png']]);
  await r.ctx.close();

  // Phone portrait
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const m = await session(phone);
  await page(m.p, '/#/program?ph=p2', '.mod-row');
  await frames(m.p, { kind: 'module', id: 'm7' }, 0.4, [[3600, '78-celebrate-phone-E-scope.png']]);
  await frames(m.p, { kind: 'module', id: 'm6' }, 0.4, [[2200, '79-celebrate-phone-D-volt.png']]);
  await frames(m.p, { kind: 'phase', phase: 2, title: 'Circuit Theory & Devices · 60 h ✓', id: 'm9' }, 0.4, [[4300, '80-celebrate-phone-finale.png']]);
  await m.ctx.close();

  // Video: each module effect at real speed, then the phase finale
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vidDir, size: { width: 1280, height: 800 } } });
  const ctxAt = Date.now(), p = await ctx.newPage();
  await login(p); await page(p, '/#/program?ph=p2', '.mod-row');
  const startAt = Date.now();
  for (const spec of [{ kind: 'module', id: 'm8' }, { kind: 'module', id: 'm5' }, { kind: 'module', id: 'm6' }, { kind: 'module', id: 'm7' },
    { kind: 'phase', phase: 2, title: 'Circuit Theory & Devices · 60 h ✓', id: 'm9' }]) {
    await p.evaluate((s) => window.VOLT_CELEBRATE.play(s), spec);
    await p.waitForFunction(() => !window.VOLT_CELEBRATE.active(), null, { timeout: 8000 }); await wait(500);
  }
  const v = p.video(); await ctx.close();
  const out = path.join(SHOTS, '81-celebrations.mp4');
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', await v.path(), '-ss', ((startAt - ctxAt) / 1000).toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart', out]);
    console.log('  saved', path.basename(out));
  } catch (e) { fs.copyFileSync(await v.path(), out.replace(/\.mp4$/, '.webm')); console.log('  ffmpeg failed, saved webm instead', e.message); }

  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  fs.rmSync(vidDir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
