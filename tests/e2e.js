// Headless-browser smoke test + screenshots.
//   node tests/e2e.js            (starts its own server on a temp DB, port 4399)
// Env: CHROME_PATH (default /usr/bin/google-chrome), SHOTS_DIR (default ./screenshots)
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright-core');
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');
const { buildWeeklyReport, renderReportHtml } = require('../server/report');

const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const PORT = 4399, BASE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : typeof x === 'string' ? x : JSON.stringify(x)); } };

(async () => {
  const dbFile = path.join(os.tmpdir(), `ea-e2e-${Date.now()}.db`);
  const db = openDb(dbFile); seedDemo(db);
  const server = createApp(db).listen(PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  async function newPage(viewport) {
    const ctx = await browser.newContext({ viewport: viewport || { width: 1366, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${page.url()} ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[pageerror] ${page.url()} ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`[http ${r.status()}] ${r.url()}`); });
    page.on('dialog', (d) => d.accept());
    return page;
  }
  // Wait until the guide companion has loaded its state; skip its first-login tour unless the test wants it.
  async function settleGuide(page, keepTour) {
    await page.waitForSelector('body[data-guide-ready]', { state: 'attached' });
    await page.waitForFunction(() => !document.body.dataset.guideTourPending);
    if (!keepTour && await page.$('#guideTour')) { await page.click('#guideTourSkip'); await page.waitForSelector('#guideTour', { state: 'detached' }); }
  }
  async function login(page, email, pw, keepTour) {
    await page.goto(BASE + '/#/login');
    await page.fill('input[name=email]', email);
    await page.fill('input[name=password]', pw);
    await page.click('#loginForm button');
    await page.waitForSelector('.hero');
    await settleGuide(page, keepTour);
  }
  // Key controls the guide must never sit on top of (visible ones only), checked against the avatar and an open bubble.
  const KEY_CONTROLS = '.topbar a, .topbar button, .hero .btn, #startQuiz, .option, #nextQ, #simTools .tool, .sim-toolbar button, .sim-toolbar select, #simSvg, .module-aside .btn, #markDone';
  const guideCovers = (page, sel) => page.evaluate((sel) => {
    const g = [...document.querySelectorAll('#guideAvatar, #guideBubble:not([hidden])')].map((e) => e.getBoundingClientRect()).filter((r) => r.width && document.getElementById('guide') && !document.getElementById('guide').hidden);
    const hit = [];
    document.querySelectorAll(sel).forEach((e) => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('#guide')) return;
      g.forEach((b) => { const ix = Math.min(r.right, b.right) - Math.max(r.left, b.left), iy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top); if (ix > 2 && iy > 2) hit.push((e.id || e.className) + ' ' + (e.textContent || '').trim().slice(0, 24)); });
    });
    return hit;
  }, sel || KEY_CONTROLS);
  const guideText = (page) => page.textContent('#guideText');
  async function openGuide(page) { if (!(await page.isVisible('#guideBubble'))) await page.click('#guideAvatar'); await page.waitForSelector('#guideBubble', { state: 'visible' }); }
  const shot = async (page, name, full) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name), fullPage: !!full }); console.log('  saved', name); };
  const text = (page, sel) => page.textContent(sel);
  const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const answer = (page, wrong) => page.evaluate((wrong) => {
    const q = window.CURRICULUM.questionsById[document.querySelector('.question').dataset.qid];
    [...document.querySelectorAll('.option')].find((o) => (wrong ? +o.dataset.oi !== q.answer : +o.dataset.oi === q.answer)).click();
  }, !!wrong);
  async function runQuiz(page, opts = {}) {
    await page.click('#startQuiz'); await page.waitForSelector('.option');
    for (let i = 0; ; i++) {
      const total = await page.evaluate(() => +document.querySelector('.quiz-top .muted').textContent.match(/of (\d+)/)[1]);
      await answer(page, i >= total - (opts.wrong || 0)); await page.waitForSelector('.feedback');
      if (opts.shotAt === i) await shot(page, opts.shotName);
      if (i === total - 1) break;
      await page.click('#nextQ'); await page.waitForSelector('.option:not([disabled])');
    }
    await page.click('#nextQ'); await page.waitForSelector('.quiz-result');
  }

  // ---- sign-in ----
  let page = await newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('#loginForm');
  ok('redirects to sign-in when logged out', page.url().endsWith('#/login'));
  await shot(page, '01-sign-in.png');
  await page.fill('input[name=email]', 'alex.rivera@example.com'); await page.fill('input[name=password]', 'wrong-password');
  await page.click('#loginForm button'); await page.waitForTimeout(400);
  ok('bad login shows error', /Incorrect/.test(await text(page, '#loginErr')));
  errors.length = 0; // the 401 above is an expected console error

  // ---- learner (Alex: ahead, Level 0 cleared) ----
  await login(page, 'alex.rivera@example.com', DEMO.learnerPassword, true);
  ok('guide: first-login tour starts', await page.isVisible('#guideTour') && /Volt/.test(await text(page, '#guideTourTitle')));
  await page.click('#guideTourNext'); await page.click('#guideTourNext');
  ok('guide: tour spotlights the safety card', /Level 0/.test(await text(page, '#guideTourTitle')) && await page.isVisible('.guide-spot'));
  await shot(page, '40-guide-tour-step.png');
  await page.click('#guideTourBack');
  ok('guide: tour Back works', /program map/i.test(await text(page, '#guideTourTitle')));
  await page.click('#guideTourSkip'); await page.waitForSelector('#guideTour', { state: 'detached' });
  ok('guide: Skip closes the tour and saves it', (await (await page.request.get(BASE + '/api/guide')).json()).state.tourDone === true);
  await page.reload(); await page.waitForSelector('.hero'); await settleGuide(page, true);
  ok('guide: tour does not return after skipping', !(await page.$('#guideTour')));
  ok('guide: avatar on dashboard', await page.isVisible('#guideAvatar'));
  ok('guide: desktop dashboard bubble recommends next module, no check-off talk', await page.isVisible('#guideBubble') && /Next up: M15/.test(await guideText(page)) && !/check-off|instructor/i.test(await guideText(page)), await guideText(page));
  ok('dashboard has no check-off stat', !/check-off/i.test(await text(page, '#app')) && /Lessons done/.test(await text(page, '.stats')));
  ok('guide: dashboard bubble has a link to the module', !!(await page.$('#guideActions a[href="#/module/m15"]')));
  ok('guide: does not cover key dashboard controls', (await guideCovers(page)).length === 0, await guideCovers(page));
  await shot(page, '38-guide-dashboard.png');
  ok('dashboard shows hours ring + 304 h', /%/.test(await text(page, '.hero-ring')) && /304/.test(await text(page, '.hero')));
  ok('dashboard shows 4 phase cards', (await page.$$('.phase-card')).length === 4);
  ok('dashboard safety card cleared', /cleared/i.test(await text(page, '.safety-card')));
  await shot(page, '02-dashboard.png', true);

  await page.goto(BASE + '/#/program'); await page.waitForSelector('.phase-section');
  ok('program lists 4 phases', (await page.$$('.phase-section')).length === 4);
  ok('program lists 20 core modules', (await page.$$('.phase-section .mod-row')).length === 20);
  ok('program shows 304 h', /304/.test(await text(page, '#app')));
  await shot(page, '03-curriculum.png', true);

  await page.goto(BASE + '/#/module/m6'); await page.waitForSelector('.module-banner');
  ok('M6 complete on its passed written test', /Complete/.test(await text(page, '.module-banner')) && /Module complete/.test(await text(page, '.completion')), await text(page, '.module-banner'));
  const m6Txt = await text(page, '#app');
  ok('M6 page has no check-off / labs / sign-off UI', !(await page.$('.checkoffs, .co-item')) && !/check-off|sign-off|instructor/i.test(m6Txt) && !(await page.$$eval('#app h2, #app h3', (hs) => hs.some((h) => /^\W*Labs\b/i.test(h.textContent.trim())))), (m6Txt.match(/.{0,60}(check-off|sign-off|instructor).{0,60}/i) || [''])[0]);
  await shot(page, '04-level.png', true);
  ok('guide: tip dot on module page (no auto-open)', await page.isVisible('#guideAvatar') && !(await page.isVisible('#guideBubble')) && await page.$eval('#guide', (g) => g.classList.contains('has-tip')));
  await openGuide(page);
  const m6Tip = await guideText(page);
  ok('guide: module page explains contents + completion checklist', /Kirchhoff/.test(m6Tip) && /To complete M6/.test(m6Tip) && /Written test ≥ 80%/.test(m6Tip) && !/check-off|instructor/i.test(m6Tip), m6Tip);
  ok('guide: module page offers tip, common mistake and a simulator challenge', /Tip:/.test(m6Tip) && /Common mistake:/.test(m6Tip) && !!(await page.$('#guideActions a[href^="#/simulator?preset="]')));
  const GL = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'curriculum-source', 'guide-lines.json'), 'utf8')); } catch (e) { return null; } })();
  ok('guide: uses curriculum-source/guide-lines.json when present (intro + one of its tips + one of its mistakes)', !GL || (m6Tip.includes(GL.m6.intro) && GL.m6.tips.some((t) => m6Tip.includes(t)) && GL.m6.mistakes.some((t) => m6Tip.includes(t))), m6Tip);
  ok('guide: phase colour follows module (M6 → phase 2)', (await page.getAttribute('#guide', 'data-phase')) === '2');
  await shot(page, '39-guide-module.png');
  await page.click('#guideClose');
  ok('guide: collapse persists', (await (await page.request.get(BASE + '/api/guide')).json()).state.collapsed === true);
  await page.$eval('.completion', (e) => e.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -70));
  await shot(page, '28-module-completion.png');

  await page.goto(BASE + '/#/lesson/l1-ohms-law'); await page.waitForSelector('.lesson-body');
  ok('lesson renders formula', (await page.$$('.lesson .formula')).length >= 1);
  await shot(page, '05-lesson.png', true);
  const m7l = await page.evaluate(() => window.CURRICULUM.modulesById.m7.lessons[0].id);
  await page.goto(BASE + '/#/lesson/' + m7l); await page.waitForSelector('#markDone');
  await page.click('#markDone'); await page.waitForSelector('.complete-note');
  ok('mark lesson complete persists', /Studied/.test(await text(page, '.complete-note')));

  await page.goto(BASE + '/#/quiz/lesson/l1-ohms-law'); await page.waitForSelector('#startQuiz');
  await page.click('#startQuiz'); await page.waitForSelector('.option');
  await page.click('.option >> nth=1'); await page.waitForSelector('.feedback');
  ok('quiz shows explanation after answering', (await text(page, '.feedback')).length > 20);
  await shot(page, '06-quiz.png');
  await page.goto(BASE + '/#/quiz/module/m5'); await page.waitForSelector('#startQuiz');
  ok('guide: quiz page shows a tip dot, never auto-opens', !(await page.isVisible('#guideBubble')) && await page.$eval('#guide', (g) => g.classList.contains('has-tip')));
  await page.click('#startQuiz'); await page.waitForSelector('.option');
  ok('guide: does not cover quiz controls', (await guideCovers(page)).length === 0, await guideCovers(page));
  await answer(page, true); await page.waitForSelector('#feedback .guide-inline');
  const hintHref = await page.getAttribute('#feedback .guide-inline a', 'href');
  const wantLesson = await page.evaluate(() => '#/lesson/' + window.CURRICULUM.questionsById[document.querySelector('.question').dataset.qid].lessonId);
  ok('guide: wrong answer points to the right lesson', hintHref === wantLesson, [hintHref, wantLesson]);
  await page.$eval('.feedback', (e) => e.scrollIntoView({ block: 'center' }));
  await shot(page, '42-guide-quiz-hint.png');

  // module test-out (M7 not fully studied)
  await page.goto(BASE + '/#/quiz/module/m7'); await page.waitForSelector('#startQuiz');
  ok('M7 intro is a test-out', /Test-out/.test(await text(page, '.quiz-intro')));
  await shot(page, '07-testout-intro.png');
  await runQuiz(page, { shotAt: 0, shotName: '08-testout-question.png' });
  ok('passing test-out grants remaining lessons', /completed via test-out/.test(await text(page, '.quiz-result')));
  ok('test-out result says the module is complete (no check-offs)', /M7 is complete/.test(await text(page, '.quiz-result')) && !/check-off/i.test(await text(page, '.quiz-result')), await text(page, '.quiz-result'));
  await shot(page, '09-testout-result.png');
  await page.goto(BASE + '/#/module/m7'); await page.waitForSelector('.module-banner');
  ok('module page shows tested-out badges', (await page.$$('.lesson-list .badge.testout')).length >= 2);

  // hours
  await page.goto(BASE + '/#/hours'); await page.waitForSelector('.hours-table');
  await page.selectOption('.hours-form select[name=moduleId]', 'm7');
  await page.fill('.hours-form input[name=hours]', '2.5');
  await page.fill('.hours-form input[name=note]', 'Scope + DMM practice');
  await page.click('.hours-form button'); await page.waitForTimeout(600);
  ok('learner logs hours', /Scope \+ DMM practice/.test(await text(page, '#app')));
  await shot(page, '29-hours.png', true);

  // M17 seeded-defect exercise
  await page.goto(BASE + '/#/defects'); await page.waitForSelector('.dx-loc');
  ok('defect board has 12 locations', (await page.$$('.dx-loc')).length === 12);
  const layout = JSON.parse(db.prepare("SELECT question_ids FROM quiz_sessions WHERE kind='defect-practice' ORDER BY id DESC LIMIT 1").get().question_ids);
  const seeded = layout.locations.filter((l) => l.condition !== 'good').map((l) => l.id);
  for (const L of layout.locations) await page.selectOption(`.dx-sel[data-loc=${L.id}]`, L.id === seeded[seeded.length - 1] ? 'good' : L.condition);
  await page.click('#dxSubmit'); await page.waitForSelector('#dxOut .quiz-result');
  ok('defect exercise graded per location', (await page.$$('.dx-loc.ok')).length === 11 && (await page.$$('.dx-loc.bad')).length === 1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, '30-defect-exercise.png', true);

  // ---- simulator: DC ----
  await page.goto(BASE + '/#/simulator?preset=series'); await page.waitForSelector('#simSvg .comp');
  let r = await page.evaluate(() => window.__sim.result());
  ok('sim preset 9V/1k/2k gives 3 mA', Math.abs(r.components.R1.current - 0.003) < 1e-6, r.components.R1);
  ok('sim readings table shows 3 mA', /3 mA/.test(await text(page, '#simTable')));
  ok('sim status shows battery current', /3 mA/.test(await text(page, '#simStatus')));
  ok('15 simulator tools', (await page.$$('#simTools .tool')).length === 15);
  await shot(page, '10-simulator.png', true);
  await openGuide(page);
  ok('guide: simulator challenge for the current module', /Challenge for M/.test(await guideText(page)), await guideText(page));
  await shot(page, '43-guide-simulator.png');
  await page.click('#guideClose');
  ok('guide: does not cover simulator tools (desktop)', (await guideCovers(page)).length === 0, await guideCovers(page));
  await page.click('#simClear');
  const box = await page.$eval('#simSvg', (s) => { const b = s.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, vb: s.viewBox.baseVal.width }; });
  const pt = (gx, gy) => ({ x: box.x + (30 + gx * 60) * box.w / box.vb, y: box.y + (30 + gy * 60) * box.w / box.vb });
  const drag = async (tool, a, b) => {
    await page.click(`[data-tool=${tool}]`);
    const p1 = pt(a[0], a[1]), p2 = pt(b[0], b[1]);
    await page.mouse.move(p1.x, p1.y); await page.mouse.down(); await page.mouse.move(p2.x, p2.y, { steps: 5 }); await page.mouse.up();
  };
  const tap2 = async (tool, a, b) => {
    await page.click(`[data-tool=${tool}]`);
    const p1 = pt(a[0], a[1]), p2 = pt(b[0], b[1]);
    await page.mouse.click(p1.x, p1.y); await page.mouse.click(p2.x, p2.y);
  };
  await drag('battery', [1, 5], [1, 2]);
  await drag('wire', [1, 2], [4, 2]);
  await drag('resistor', [4, 2], [4, 5]);
  await tap2('wire', [4, 2], [7, 2]);
  await tap2('resistor', [7, 2], [7, 5]);
  await drag('wire', [7, 5], [4, 5]);
  await drag('wire', [4, 5], [1, 5]);
  r = await page.evaluate(() => window.__sim.result());
  ok('hand-built 9 V across 1k‖1k draws 18 mA', r.ok && Math.abs(r.components.B1.current - 0.018) < 1e-5, JSON.stringify(r.components.B1));
  await page.click('[data-tool=select]');
  await page.click('#simTable tr[data-sel=R2]');
  await page.fill('[data-prop=resistance]', '2k'); await page.press('[data-prop=resistance]', 'Enter');
  await page.locator('[data-prop=resistance]').dispatchEvent('change');
  r = await page.evaluate(() => window.__sim.result());
  ok('editing R2 to 2k gives 13.5 mA', Math.abs(r.components.B1.current - 0.0135) < 1e-5, JSON.stringify(r.components.B1));
  await drag('wire', [1, 2], [1, 5]);
  r = await page.evaluate(() => window.__sim.result());
  ok('short circuit flagged', r.status === 'short' && /Short circuit/.test(await text(page, '#simStatus')));
  await page.click('#simUndo');
  await page.selectOption('#simPreset', 'led'); await page.waitForTimeout(200);
  r = await page.evaluate(() => window.__sim.result());
  ok('LED preset lit (~13.5 mA)', r.components.D1.on && Math.abs(r.components.D1.current - 3 / 222) < 1e-5);
  await page.click('[data-tool=select]');
  await page.click('#simTable tr[data-sel=D1]');
  await shot(page, '11-simulator-led.png');
  await page.selectOption('#simPreset', 'divider'); await page.waitForTimeout(200);
  r = await page.evaluate(() => window.__sim.result());
  ok('divider preset 6 V', Math.abs(r.components.R2.voltage - 6) < 1e-3);
  await page.click('.comp-switch .hit', { force: true });
  r = await page.evaluate(() => window.__sim.result());
  ok('closing load switch drops divider to 4.5 V', Math.abs(r.components.R2.voltage - 4.5) < 1e-3, r.components.R2.voltage);
  await shot(page, '12-simulator-divider.png');

  // ---- simulator: AC + scope ----
  await page.goto(BASE + '/#/simulator?preset=ac-sine'); await page.waitForSelector('#simScopeSvg .trace-1', { state: 'attached' });
  let sc = await page.evaluate(() => window.__sim.scope());
  ok('AC sine on scope: CH1 waveform + frequency', sc && sc.ch[0] && sc.ch[0].vpp > 1 && sc.f0 > 0, sc);
  await page.goto(BASE + '/#/simulator?preset=rc-phase'); await page.waitForSelector('#simScopeSvg .trace-2', { state: 'attached' });
  sc = await page.evaluate(() => window.__sim.scope());
  ok('RC phase: CH2 lags CH1 (-90° < φ < 0°)', sc.phase != null && sc.phase < -1 && sc.phase > -90, sc.phase);
  ok('scope shows phase readout', /Phase CH2 vs CH1/.test(await text(page, '#simScope')));
  await shot(page, '31-simulator-ac-scope.png', true);
  await page.goto(BASE + '/#/simulator?preset=rc-charge'); await page.waitForSelector('#simScopeSvg .trace-1', { state: 'attached' });
  sc = await page.evaluate(() => window.__sim.scope());
  ok('RC charging: capacitor voltage rises from ~0', sc.ch.some((c) => c && c.min < 0.5 && c.max > 3), sc);
  await shot(page, '32-simulator-rc-charge.png');
  await page.goto(BASE + '/#/simulator?preset=half-wave'); await page.waitForSelector('#simScopeSvg .trace-1', { state: 'attached' });
  sc = await page.evaluate(() => window.__sim.scope());
  const outCh = sc.ch.filter(Boolean).sort((a, b) => b.min - a.min)[0];
  ok('half-wave: output never meaningfully negative', outCh.min > -0.05 && outCh.max > 1, sc);
  await shot(page, '33-simulator-half-wave.png');
  await page.goto(BASE + '/#/module/m8'); await page.waitForSelector('.module-banner');
  ok('M8 links AC simulator examples', (await page.$$('a[href*="preset=ac-sine"]')).length >= 1 && (await page.$$('a[href*="preset=rc-phase"]')).length >= 1);
  await page.goto(BASE + '/#/module/m9'); await page.waitForSelector('.module-banner');
  ok('M9 links RC/RL simulator examples', (await page.$$('a[href*="preset=rc-charge"]')).length >= 1 && (await page.$$('a[href*="preset=rl-phase"]')).length >= 1);
  await page.goto(BASE + '/#/module/m11'); await page.waitForSelector('.module-banner');
  ok('M11 links half-wave simulator', (await page.$$('a[href*="preset=half-wave"]')).length >= 1);

  // ---- tools ----
  await page.goto(BASE + '/#/tools'); await page.waitForSelector('#ohmCard');
  ok('Ohm calculator default 9V/3k → 3 mA', /3 mA/.test(await text(page, '#ohmOut')));
  ok('colour code shows 4.7 kΩ', /4\.7 kΩ/.test(await text(page, '#ccValue')));
  await page.fill('#ccFind', '330'); await page.waitForTimeout(100);
  ok('value→bands finds Orange–Orange–Brown', /Orange – Orange – Brown/.test(await text(page, '#ccFindOut')));
  await shot(page, '13-tools.png', true);
  ok('learner cannot open team page', await (async () => { await page.goto(BASE + '/#/admin'); await page.waitForTimeout(300); return /Admins only/.test(await text(page, '#app')); })());

  // ---- gating: Sam has not cleared Level 0 ----
  const sp = await newPage();
  await login(sp, 'sam.chen@example.com', DEMO.learnerPassword);
  const samTip = await guideText(sp);
  ok('guide: Sam (M1 done) is pointed at Level 0 / M2', /Level 0 comes first/.test(samTip) && /Next up: M2/.test(samTip) && !/check-off/i.test(samTip), samTip);
  await sp.goto(BASE + '/#/module/m15'); await sp.waitForSelector('.module-banner');
  ok('Sam: M15 locked until Level 0', /Locked/i.test(await text(sp, '#app')) && (await sp.$$('.hours-form')).length === 0);
  await shot(sp, '34-module-locked.png');
  await sp.goto(BASE + '/#/defects'); await sp.waitForSelector('#dxBox .callout');
  ok('Sam: defect exercise locked', /unlocks after Level 0/.test(await text(sp, '#dxBox')));

  // ---- Volt lightning effects (volt-fx.js) ----
  {
    const fxState = (p) => p.evaluate(() => ({ last: window.VOLT_FX.last, n: window.VOLT_FX.navigations, runs: window.VOLT_FX.runs, hash: location.hash }));
    // Locked module (Sam): bolt fizzles, red outline, Volt explains, no navigation
    await sp.goto(BASE + '/#/program'); await sp.waitForSelector('.mod-row.is-locked');
    const lockedHref = await sp.getAttribute('.mod-row.is-locked a', 'href');
    await sp.click('.mod-row.is-locked a');
    const redFlash = await sp.evaluate(() => new Promise((res) => { const t0 = Date.now(); (function f() { if (document.querySelector('.vfx-layer .vfx-locked')) res(true); else if (Date.now() - t0 > 900) res(false); else requestAnimationFrame(f); })(); }));
    await sp.waitForTimeout(900);
    const lk = await fxState(sp);
    ok('lightning: locked module fizzles with a red outline flash', redFlash && lk.last.locked && lk.last.mode === 'fizzle', lk);
    ok('lightning: locked module does not navigate', lk.hash === '#/program' && lk.n === 0, lk);
    const lockSays = await guideText(sp);
    ok('lightning: Volt says why the module is locked', await sp.isVisible('#guideBubble') && /locked/i.test(lockSays) && lockSays.includes(lockedHref.split('/').pop().toUpperCase()) && /Level 0/.test(lockSays), lockSays);
    await shot(sp, '61-volt-locked-fizzle.png');
    await sp.click('#guideClose');

    const vp = await newPage();
    await login(vp, 'alex.rivera@example.com', DEMO.learnerPassword);
    // Program module row: bolt in flight, then navigation exactly once even when clicked twice; back works
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    const t0 = Date.now();
    await vp.click('.mod-row a[href="#/module/m7"]');
    const mid = await vp.evaluate(() => ({ bolt: !!document.querySelector('.vfx-layer .vfx-bolt'), hash: location.hash }));
    await vp.click('.mod-row a[href="#/module/m8"]').catch(() => {}); // a second click while firing is ignored
    await vp.waitForFunction(() => location.hash === '#/module/m7', null, { timeout: 2000 }); const took = Date.now() - t0;
    await vp.waitForSelector('.module-banner'); await vp.waitForTimeout(700);
    const a1 = await fxState(vp);
    ok('lightning: module click fires a bolt from Volt before the page changes', mid.bolt && mid.hash === '#/program' && a1.last.from === 'volt' && a1.last.exploded, { mid, a1 });
    ok('lightning: navigates once, within ~1.2 s, no double navigation', a1.hash === '#/module/m7' && a1.n === 1 && took < 1500, { took, a1 });
    ok('lightning: outline uses the phase colour (Phase 2)', a1.last.phase === 2 && a1.last.color === (await vp.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--guide-phase-2').trim())), a1.last);
    ok('lightning: effect layer cleaned up', (await vp.$$('.vfx-layer > *')).length === 0);
    await vp.goBack(); await vp.waitForFunction(() => location.hash === '#/program');
    ok('lightning: back button returns to the program', true);
    // Lesson link inside a module
    await vp.goto(BASE + '/#/module/m6'); await vp.waitForSelector('.module-banner');
    const lHref = await vp.getAttribute('li.with-action > a[href^="#/lesson/"]', 'href');
    await vp.click('li.with-action > a[href^="#/lesson/"]');
    await vp.waitForFunction((h) => location.hash === h, lHref, { timeout: 2000 }); await vp.waitForSelector('.lesson-body');
    ok('lightning: lesson link fires and opens the lesson', (await fxState(vp)).last.href === lHref);
    // Advanced-track card and dashboard phase card
    await vp.goto(BASE + '/#/advanced'); await vp.waitForSelector('.adv-card');
    const advHref = await vp.getAttribute('.adv-card', 'href');
    await vp.click('.adv-card');
    await vp.waitForFunction((h) => location.hash === h, advHref, { timeout: 2000 }); await vp.waitForSelector('.module-banner');
    ok('lightning: advanced-track card fires (phase 4 colour) and opens the module', (await fxState(vp)).last.phase === 4);
    await vp.goto(BASE + '/#/'); await vp.waitForSelector('.phase-card');
    await vp.click('.phase-card >> nth=2');
    await vp.waitForFunction(() => location.hash === '#/program?ph=p3', null, { timeout: 2000 });
    ok('lightning: dashboard phase card fires and opens its phase', (await fxState(vp)).last.phase === 3);
    // Keyboard Enter still navigates
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    await vp.focus('.mod-row a[href="#/module/m9"]'); await vp.keyboard.press('Enter');
    await vp.waitForFunction(() => location.hash === '#/module/m9', null, { timeout: 2000 });
    ok('lightning: keyboard Enter navigates (with the effect)', (await fxState(vp)).last.keyboard === true);
    // Failsafe: even if the animation code throws, navigation happens
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    await vp.evaluate(() => { window.__anim = Element.prototype.animate; Element.prototype.animate = () => { throw new Error('boom'); }; });
    await vp.click('.mod-row a[href="#/module/m10"]');
    await vp.waitForFunction(() => location.hash === '#/module/m10', null, { timeout: 2000 }).catch(() => {});
    ok('lightning: failsafe navigates when the animation errors', (await fxState(vp)).hash === '#/module/m10');
    await vp.evaluate(() => { Element.prototype.animate = window.__anim; });
    // Volt minimised → bolt from the avatar; Volt hidden → bolt from the logo
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    ok('lightning: Volt minimised still fires from the avatar', !(await vp.isVisible('#guideBubble')));
    await openGuide(vp); await vp.click('#guideMenuBtn'); await vp.click('[data-gm=dismiss]'); await vp.waitForSelector('#guideRestore');
    await vp.click('.mod-row a[href="#/module/m11"]');
    await vp.waitForFunction(() => location.hash === '#/module/m11', null, { timeout: 2000 });
    ok('lightning: Volt hidden → bolt comes from the logo', (await fxState(vp)).last.from === 'logo');
    await vp.click('#guideRestore'); await vp.waitForSelector('#guideAvatar', { state: 'visible' });
    // Toggle in Volt's ⋯ menu, saved per user
    await openGuide(vp); await vp.click('#guideMenuBtn');
    ok('lightning: ⋯ menu shows "Lightning effects: on"', /Lightning effects: on/.test(await vp.textContent('[data-gm=fx]')));
    await vp.click('[data-gm=fx]'); await vp.waitForTimeout(300);
    ok('lightning: switching off is saved', (await (await vp.request.get(BASE + '/api/guide')).json()).state.effects === false);
    await vp.reload(); await vp.waitForSelector('.module-banner'); await settleGuide(vp);
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    const r0 = (await fxState(vp)).runs;
    await vp.click('.mod-row a[href="#/module/m12"]'); await vp.waitForSelector('.module-banner');
    ok('lightning: off → plain instant navigation, no bolt', (await fxState(vp)).runs === r0 && (await vp.$$('.vfx-layer .vfx-bolt')).length === 0 && (await fxState(vp)).hash === '#/module/m12');
    await openGuide(vp); await vp.click('#guideMenuBtn');
    ok('lightning: menu remembers "off" after reload', /Lightning effects: off/.test(await vp.textContent('[data-gm=fx]')));
    await vp.click('[data-gm=fx]'); await vp.waitForTimeout(300); await vp.click('#guideClose');
    ok('lightning: switched back on', (await (await vp.request.get(BASE + '/api/guide')).json()).state.effects === true);
    // Reduced motion → quick fade, still navigates
    await vp.emulateMedia({ reducedMotion: 'reduce' });
    await vp.goto(BASE + '/#/program'); await vp.waitForSelector('.mod-row');
    const t1 = Date.now();
    await vp.click('.mod-row a[href="#/module/m13"]');
    const rmBolt = await vp.evaluate(() => !!document.querySelector('.vfx-layer .vfx-bolt'));
    await vp.waitForFunction(() => location.hash === '#/module/m13', null, { timeout: 2000 });
    ok('lightning: reduced motion → quick fade (no bolt), still navigates', !rmBolt && (await fxState(vp)).last.mode === 'fade' && Date.now() - t1 < 1000, await fxState(vp));
    await vp.emulateMedia({ reducedMotion: 'no-preference' });
    await vp.context().close();
  }

  // ---- sign-in screen: Volt's entrance (app.js voltWelcome; css/volt-fx.css) ----
  {
    const wp = await newPage();
    const t0 = Date.now();
    await wp.goto(BASE + '/#/login'); await wp.waitForSelector('#loginForm');
    const w0 = await wp.evaluate(() => { const v = document.querySelector('.auth-volt'), f = v.querySelector('.av-fly').getBoundingClientRect(), c = document.querySelector('.auth-card').getBoundingClientRect();
      return { img: v.querySelector('.av-img').getAttribute('src'), alt: v.querySelector('.av-img').alt, wave: v.querySelector('.av-wave').getAttribute('src'), entering: v.classList.contains('is-entering'),
        mode: (window.VOLT_WELCOME || {}).mode, waveMode: (window.VOLT_WELCOME || {}).wave, flyLeft: Math.round(f.left), cardRight: Math.round(c.right), flyFrom: (() => { const an = v.querySelector('.av-fly').getAnimations().find((x) => x.animationName === 'av-fly'); return an ? String(an.effect.getKeyframes()[0].transform || '') : ''; })(),
        before: getComputedStyle(document.querySelector('.auth-wrap'), '::before').content, pe: getComputedStyle(v).pointerEvents,
        z: [getComputedStyle(v).zIndex, getComputedStyle(document.querySelector('.auth-card')).zIndex] }; });
    ok('welcome: Volt is a real element (artist image), not the old CSS ::before', w0.img === 'img/volt-welcome.jpg' && /Volt/.test(w0.alt) && w0.wave === 'img/volt-welcome-wave.jpg' && (w0.before === 'none' || w0.before === 'normal'), w0);
    ok('welcome: entrance plays on load and starts off to the right', w0.entering && w0.mode === 'entrance' && w0.waveMode === 'frames' && (w0.flyLeft > w0.cardRight - 40 || /translateX\(110vw\)/.test(w0.flyFrom)), w0);
    ok('welcome: never takes clicks and sits under the sign-in card', w0.pe === 'none' && +w0.z[1] > +w0.z[0], w0);
    // During the flight: the email/password fields and the button are the top element at their centres (never covered), no sideways scroll
    const hits = [];
    for (let i = 0; i < 5; i++) {
      hits.push(await wp.evaluate(() => ['input[name=email]', 'input[name=password]', '#loginForm button'].every((s) => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e; })
        && document.documentElement.scrollWidth <= innerWidth));
      await wp.waitForTimeout(220);
    }
    ok('welcome: fields and Sign in stay uncovered during the fly-in (and no sideways scroll)', hits.every(Boolean), hits);
    // Wave: crossfade between the two frames; bubble; then idle bob
    let maxWave = 0;
    for (let i = 0; i < 16; i++) { maxWave = Math.max(maxWave, +(await wp.evaluate(() => getComputedStyle(document.querySelector('.av-wave')).opacity))); await wp.waitForTimeout(90); }
    ok('welcome: waves by alternating with the raised-hand frame', maxWave > 0.8, maxWave);
    const rockInfo = await wp.evaluate(() => { const r = getComputedStyle(document.querySelector('.auth-volt .av-rock')); return { name: r.animationName, origin: r.transformOrigin, h: document.querySelector('.auth-volt .av-rock').offsetHeight, iter: r.animationIterationCount }; });
    ok('welcome: whole figure rocks about its bottom centre while waving (3 waves)', rockInfo.name === 'av-rock' && rockInfo.iter === '3' && Math.abs(parseFloat(rockInfo.origin.split(' ')[1]) - rockInfo.h) < 2, rockInfo);
    await wp.waitForFunction(() => document.querySelector('.auth-volt').dataset.phase === 'idle', null, { timeout: 6000 });
    const w1 = await wp.evaluate(() => ({ bubble: document.querySelector('.av-bubble').textContent, bOp: +getComputedStyle(document.querySelector('.av-bubble')).opacity,
      bob: getComputedStyle(document.querySelector('.av-bob')).animationName, wave: +getComputedStyle(document.querySelector('.av-wave')).opacity, W: window.VOLT_WELCOME }));
    ok('welcome: says "HELLO, I\'M VOLT" in a speech bubble', /HELLO, I.M VOLT/.test(w1.bubble) && w1.bOp > 0.9, w1);
    ok('welcome: settles into the idle hover bob (waving frame faded back out)', w1.bob === 'volt-hover' && w1.wave < 0.05, w1);
    const took = w1.W.doneAt - w1.W.startedAt;
    ok('welcome: whole entrance ≈ 3.5 s', took > 3000 && took < 4500, took);
    // Once per page load: when the sign-in screen is drawn again (here: a signed-out deep link bounces back to it) he is already landed
    await wp.evaluate(() => { document.querySelector('.auth-volt').dataset.old = '1'; location.hash = '#/hours'; });
    await wp.waitForFunction(() => location.hash === '#/login' && document.querySelector('.auth-volt') && !document.querySelector('.auth-volt').dataset.old);
    const w2 = await wp.evaluate(() => ({ idle: document.querySelector('.auth-volt').classList.contains('is-idle'), entering: document.querySelector('.auth-volt').classList.contains('is-entering'), plays: window.VOLT_WELCOME.plays }));
    ok('welcome: plays once per page load (later screens show him landed)', w2.idle && !w2.entering && w2.plays === 1, w2);
    await wp.context().close();
    // Fields usable immediately: sign in while he is still flying
    const fp = await newPage();
    await fp.goto(BASE + '/#/login'); await fp.waitForSelector('#loginForm');
    await fp.fill('input[name=email]', 'alex.rivera@example.com'); await fp.fill('input[name=password]', DEMO.learnerPassword);
    const midFlight = await fp.evaluate(() => !window.VOLT_WELCOME.doneAt);
    await fp.click('#loginForm button'); await fp.waitForSelector('.hero', { timeout: 5000 });
    ok('welcome: can type and sign in straight away, mid-entrance', midFlight && !(await fp.$('.auth-volt')), { midFlight });
    await fp.context().close();
    // Reduced motion: no entrance, Volt shown landed with his bubble
    const rctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const rp = await rctx.newPage();
    await rp.goto(BASE + '/#/login'); await rp.waitForSelector('#loginForm'); await rp.waitForTimeout(200);
    const wr = await rp.evaluate(() => ({ mode: window.VOLT_WELCOME.mode, entering: document.querySelector('.auth-volt').classList.contains('is-entering'),
      fly: getComputedStyle(document.querySelector('.av-fly')).animationName, bob: getComputedStyle(document.querySelector('.av-bob')).animationName,
      bOp: +getComputedStyle(document.querySelector('.av-bubble')).opacity, tf: getComputedStyle(document.querySelector('.av-fly')).transform }));
    ok('welcome: prefers-reduced-motion skips the entrance (static Volt + bubble)', wr.mode === 'static' && !wr.entering && wr.fly === 'none' && wr.bob === 'none' && wr.bOp > 0.9 && wr.tf === 'none', wr);
    await rctx.close();
    // No raised-hand frame → gentle rock instead of the crossfade
    const nctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await nctx.route('**/img/volt-welcome-wave.jpg', (r) => r.fulfill({ status: 404, body: '' }));
    const np = await nctx.newPage();
    await np.goto(BASE + '/#/login'); await np.waitForSelector('#loginForm');
    await np.waitForFunction(() => window.VOLT_WELCOME && window.VOLT_WELCOME.wave === 'rock', null, { timeout: 3000 }).catch(() => {});
    const wn = await np.evaluate(() => ({ wave: window.VOLT_WELCOME.wave, rock: getComputedStyle(document.querySelector('.av-rock')).animationName, img: getComputedStyle(document.querySelector('.av-wave')).display }));
    ok('welcome: without the wave frame he only rocks (no frame swap)', wn.wave === 'rock' && wn.rock === 'av-rock' && wn.img === 'none', wn);
    await nctx.close();
  }

  // ---- module-complete celebrations (celebrate.js; effects from artist's demo) ----
  {
    const cp = await newPage();
    await login(cp, 'alex.rivera@example.com', DEMO.learnerPassword);
    const glines = (await (await cp.request.get(BASE + '/api/guide')).json()).lines || {};
    const play = (spec) => cp.evaluate((s) => window.VOLT_CELEBRATE.play(s), spec);
    const ended = () => cp.waitForFunction(() => !window.VOLT_CELEBRATE.active(), null, { timeout: 6000 }).then(() => cp.evaluate(() => window.VOLT_CELEBRATE.last));
    // Rotation: seeded by module id, consecutive modules always differ, never the same effect twice in a row
    const rot = await cp.evaluate(() => { const C = window.VOLT_CELEBRATE, ids = []; for (let i = 1; i <= 20; i++) ids.push('m' + i); for (let i = 1; i <= 6; i++) ids.push('a' + i);
      return { seq: ids.map((id) => C.effectFor(id)), again: ids.map((id) => C.effectFor(id) === C.effectFor(id)), avoid: ids.every((id) => C.effectFor(id, C.effectFor(id)) !== C.effectFor(id)) }; });
    ok('celebrate: rotation uses all four effects A/C/D/E', ['fireworks', 'circuit', 'volt', 'scope'].every((e) => rot.seq.includes(e)), rot.seq);
    ok('celebrate: consecutive modules get different effects', rot.seq.slice(0, 20).every((e, i, a) => i === 0 || e !== a[i - 1]), rot.seq);
    ok('celebrate: seeded (same module → same effect) and never repeats the previous one', rot.again.every(Boolean) && rot.avoid);
    // A module completion: banner B + exactly one effect, in the phase colour, under ~2.5 s
    const r6 = await play({ kind: 'module', id: 'm6' });
    await cp.waitForSelector('.cel-root .cel-volt-say');
    const view6 = await cp.evaluate(() => ({ big: (document.querySelector('.cel-root .cel-banner b, .cel-root .cel-scope-banner b') || {}).textContent, say: document.querySelector('.cel-volt-say').textContent,
      fx: ['cel-fx-circuit', 'cel-fx-volt', 'cel-fx-scope'].filter((c) => document.querySelector('.cel-root .' + c)).length, c: document.querySelector('.cel-root').style.getPropertyValue('--c'),
      p2: getComputedStyle(document.documentElement).getPropertyValue('--guide-phase-2').trim() }));
    ok('celebrate: module → banner "M6 UNLOCKED" + one effect (victory lap)', r6.effect === 'volt' && /M6 UNLOCKED/.test(view6.big) && view6.fx === 1, { r6, view6 });
    ok('celebrate: uses the phase colour', view6.c === view6.p2, view6);
    ok('celebrate: victory-lap line comes from guide-lines.json "celebrate"', !glines.m6 || !glines.m6.celebrate || view6.say === glines.m6.celebrate, { say: view6.say, want: glines.m6 && glines.m6.celebrate });
    const e6 = await ended();
    ok('celebrate: module celebration lasts ≤ 2.5 s', e6.endedBy === 'done' && e6.ms <= 2700 && !(await cp.$('.cel-root')), e6);
    const lf = await cp.evaluate(() => window.VOLT_CELEBRATE.lineFor('a6'));
    ok('celebrate: falls back to its own line when a module has no "celebrate"', (glines.a6 && glines.a6.celebrate) ? lf === glines.a6.celebrate : /locked in/.test(lf), lf);
    // Each effect renders
    for (const [id, cls, name] of [['m5', 'cel-fx-circuit', 'C circuit'], ['m7', 'cel-fx-scope', 'E scope'], ['m8', null, 'A fireworks']]) {
      const r = await play({ kind: 'module', id }); await cp.waitForTimeout(150);
      const v = await cp.evaluate(() => ({ canvas: !!document.querySelector('.cel-root canvas'), cls: [...document.querySelectorAll('.cel-root .cel-layer')].map((l) => l.className).join(' '),
        banner: !!document.querySelector('.cel-root .cel-banner, .cel-root .cel-scope-banner') }));
      ok('celebrate: effect ' + name + ' plays with the banner', v.banner && (cls ? v.cls.includes(cls) : v.canvas && r.effect === 'fireworks'), { r, v });
      await cp.keyboard.press('Escape');
    }
    // Esc / click skip; a click on the overlay never reaches the page underneath
    await play({ kind: 'module', id: 'm9' }); await cp.waitForSelector('.cel-root'); await cp.keyboard.press('Escape');
    ok('celebrate: Esc skips', (await cp.evaluate(() => window.VOLT_CELEBRATE.last.endedBy)) === 'esc' && !(await cp.$('.cel-root')));
    const h0 = await cp.evaluate(() => location.hash);
    await play({ kind: 'module', id: 'm10' }); await cp.waitForSelector('.cel-root'); await cp.mouse.click(110, 200);
    ok('celebrate: click skips without clicking through', (await cp.evaluate(() => window.VOLT_CELEBRATE.last.endedBy)) === 'click' && (await cp.evaluate(() => location.hash)) === h0 && !(await cp.$('.cel-root')));
    // Level 0 cleared
    await play({ kind: 'safety', id: 'm2', phase: 1 }); await cp.waitForSelector('.cel-root');
    ok('celebrate: safety cleared gets the banner too', /UNLOCKED/.test(await cp.textContent('.cel-root')) && /LEVEL 0 CLEARED/.test(await cp.textContent('.cel-root')));
    await cp.keyboard.press('Escape');
    // Phase finale: everything at once, every trace lit, ~4 s
    const rf = await play({ kind: 'phase', phase: 2, title: 'Circuit Theory & Devices', id: 'm9' });
    await cp.waitForTimeout(1600);
    const vf = await cp.evaluate(() => ({ paths: document.querySelectorAll('.cel-root .cel-traces path').length, scope: !!document.querySelector('.cel-root .cel-scope .sig'),
      canvas: !!document.querySelector('.cel-root canvas'), volt: !!document.querySelector('.cel-root .cel-volt'), chip: (document.querySelector('.cel-root .cel-chip span') || {}).textContent,
      big: document.querySelector('.cel-root .cel-scope-banner b').textContent }));
    ok('celebrate: phase finale plays all effects together (all traces lit)', rf.effect === 'finale' && vf.paths >= 10 && vf.scope && vf.canvas && vf.volt && vf.chip === 'P2' && /PHASE 2/.test(vf.big), vf);
    const ef = await ended();
    ok('celebrate: finale ≈ 4 s', ef.endedBy === 'done' && ef.ms >= 3500 && ef.ms <= 4600, ef);
    // Reduced motion → calm fade only
    await cp.emulateMedia({ reducedMotion: 'reduce' });
    const rc = await play({ kind: 'module', id: 'm8' }); await cp.waitForTimeout(100);
    ok('celebrate: reduced motion → calm fade (banner, no canvas/flying)', rc.effect === 'calm' && !!(await cp.$('.cel-root.cel-calm .cel-banner')) && !(await cp.$('.cel-root canvas, .cel-root .cel-volt')));
    const ec = await ended(); ok('celebrate: calm version is short', ec.ms <= 2000, ec);
    await cp.emulateMedia({ reducedMotion: 'no-preference' });
    // Effects switched off in Volt's menu → nothing plays
    await cp.request.put(BASE + '/api/guide', { data: { effects: false } });
    await cp.reload(); await cp.waitForSelector('.hero'); await settleGuide(cp);
    const ro = await play({ kind: 'module', id: 'm6' });
    ok('celebrate: honours the Lightning effects toggle (off → no overlay)', ro.effect === 'none' && !(await cp.$('.cel-root')), ro);
    await cp.request.put(BASE + '/api/guide', { data: { effects: true } });
    await cp.context().close();
  }

  // ---- lesson games: Ohm's Law Shooter (games/ohm-shooter.js + artist's game-cartoon.css) ----
  {
    const gp = await newPage();
    await login(gp, 'morgan.lee@example.com', DEMO.learnerPassword);
    ok('games: nav entry', await gp.isVisible('.topbar a[data-nav="games"]'));
    await gp.goto(BASE + '/#/module/m5'); await gp.waitForSelector('.module-banner');
    ok('games: M5 has a Play card', await gp.isVisible('.play-card[data-game="ohms-shooter"]'));
    await gp.click('.topbar a[data-nav="games"]'); await gp.waitForSelector('.game-card');
    ok('games: hub lists the shooter', /Ohm/.test(await text(gp, '.game-card')));
    await gp.evaluate(() => { window.OHM_SHOOTER.speed = 0.25; window.OHM_SHOOTER.config = { seed: 7 }; });
    await gp.goto(BASE + '/#/games/ohms-shooter'); await gp.waitForSelector('.osg-start');
    await gp.waitForFunction(() => document.querySelector('.osg').dataset.art !== 'loading');
    const S = () => gp.evaluate(() => window.OHM_SHOOTER.state());
    // bubbles slide out from under the problem card; wait (at normal speed) until all four are below it, then slow the game down
    const waitShown = async () => {
      await gp.evaluate(() => { window.OHM_SHOOTER.speed = 1; });
      await gp.waitForFunction(() => { const s = window.OHM_SHOOTER.state(), H = window.OHM_SHOOTER, p = document.querySelector('.osg-prompt');
        const top = p.offsetTop + p.offsetHeight, size = parseFloat(getComputedStyle(document.querySelector('.osg')).getPropertyValue('--osg-size'));
        return !s.resolving && H.targets().length === 4 && H.targets().every((t) => t.y > top - size * 0.1); });
      await gp.evaluate(() => { window.OHM_SHOOTER.speed = 0.25; });
    };
    ok('games: cartoon art kit loaded', (await S()).art === 'cartoon' && await gp.evaluate(() => getComputedStyle(document.querySelector('.osg-volt')).backgroundImage.includes('volt-idle')));
    await gp.click('.osg-start'); await gp.waitForFunction(() => window.OHM_SHOOTER.targets().length === 4);
    const pr = await gp.evaluate(() => window.OHM_SHOOTER.problem());
    ok('games: prompt shown with 4 bubbles, one correct', /= \?/.test(await text(gp, '.osg-prompt')) && pr.options.filter((o) => o.correct).length === 1 && (await gp.$$('.osg-target')).length === 4, pr);
    await waitShown();
    const wrongLab = pr.options.find((o) => !o.correct).label;
    await gp.click(`.osg-target[aria-label="Shoot ${wrongLab}"]`, { force: true });
    await gp.waitForFunction(() => window.OHM_SHOOTER.state().lives === 2);
    ok('games: wrong hit costs a life and Volt gives a 1-line hint', await gp.isVisible('.osg-hint') && (await text(gp, '.osg-hint')).length <= 60 && await gp.$eval('.osg-volt', (v) => v.classList.contains('is-miss')));
    await shot(gp, '97-ohm-shooter-e2e-wrong.png');
    const rightLab = pr.options.find((o) => o.correct).label;
    await gp.click(`.osg-target[aria-label="Shoot ${rightLab}"]`, { force: true });
    await gp.waitForFunction(() => window.OHM_SHOOTER.state().score > 0);
    ok('games: correct hit scores', (await S()).correct === 1);
    // keyboard: wait for the next round, steer to the correct lane, fire
    await waitShown();
    const lane = await gp.evaluate(() => window.OHM_SHOOTER.targets().find((t) => t.correct).lane);
    await gp.focus('.osg');
    let cur = (await S()).lane;
    while (cur !== lane) { await gp.keyboard.press(cur < lane ? 'ArrowRight' : 'ArrowLeft'); cur = (await S()).lane; }
    await gp.keyboard.press('Space');
    await gp.waitForFunction(() => window.OHM_SHOOTER.state().correct === 2);
    ok('games: arrows + space shoot the bubble in Volt\'s lane', (await S()).streak === 2);
    await gp.keyboard.press('p'); ok('games: P pauses', (await S()).status === 'paused');
    await gp.keyboard.press('p');
    // lose the remaining lives -> game over is saved
    for (let i = 0; i < 2; i++) {
      await gp.waitForFunction(() => { const s = window.OHM_SHOOTER.state(); return !s.resolving && !s.shooting && window.OHM_SHOOTER.targets().some((t) => !t.correct); });   // a wrong hit doesn't end the round
      const w = await gp.evaluate(() => window.OHM_SHOOTER.targets().find((t) => !t.correct).label);
      await gp.evaluate((w) => window.OHM_SHOOTER.hit(w), w);
      await gp.waitForFunction((n) => window.OHM_SHOOTER.state().lives === n, 1 - i);
    }
    await gp.waitForFunction(() => window.OHM_SHOOTER.saved);
    const st = await (await gp.request.get(BASE + '/api/games/ohms-shooter/stats')).json();
    ok('games: game over saves best score and play count', await gp.isVisible('.osg-final') && st.plays === 1 && st.best === (await S()).score && st.best > 0, st);
    await gp.goto(BASE + '/#/dashboard'); await gp.waitForSelector('.hero');
    ok('games: leaving the game restores the guide', !(await gp.evaluate(() => document.body.classList.contains('osg-playing'))));
    await gp.context().close();
  }

  // ---- admin ----
  const ap = await newPage();
  await login(ap, DEMO.admin.email, DEMO.admin.password);
  await ap.goto(BASE + '/#/admin'); await ap.waitForSelector('.team-table tbody tr');
  ok('team dashboard lists members', (await ap.$$('.team-table tbody tr')).length >= 5);
  await shot(ap, '14-admin-team.png', true);
  await ap.click('text=Priya Patel'); await ap.waitForSelector('.admin-mods');
  await shot(ap, '15-admin-member.png', true);
  const alexId = db.prepare("SELECT id FROM users WHERE email='alex.rivera@example.com'").get().id;
  await ap.goto(BASE + `/#/admin/user/${alexId}?module=m6`); await ap.waitForSelector('#moduleCard');
  ok('admin member page: no sign-off controls or Check-offs column', !(await ap.$('#signCard, .co-form, .co-list')) && !/check-off|sign check/i.test(await text(ap, '#app')) && /Lessons/.test(await text(ap, '.admin-mods thead')));
  ok('admin module detail shows M6 complete via written test', /Complete/.test(await text(ap, '#moduleCard')) && /Written test: passed/.test(await text(ap, '#moduleCard')), await text(ap, '#moduleCard'));
  ok('retired check-off endpoint answers 410', (await ap.request.post(BASE + `/api/admin/users/${alexId}/checkoffs`, { data: { moduleId: 'm6', itemId: 'x', status: 'pass', performedOn: '2026-10-20' } })).status() === 410);
  await ap.$eval('#moduleCard', (e) => e.scrollIntoView({ block: 'start' }));
  await shot(ap, '35-admin-module-detail.png');
  // Alex passes the M8 written test (test-out) → M8 completes immediately, no sign-off
  const m8 = await page.evaluate(async () => {
    const j = (r) => r.json(), H = { 'Content-Type': 'application/json' };
    const st = await fetch('/api/quiz/start', { method: 'POST', headers: H, body: JSON.stringify({ kind: 'module', moduleId: 'm8' }) }).then(j);
    const answers = {}; st.questionIds.forEach((id) => { answers[id] = window.CURRICULUM.questionsById[id].answer; });
    const sub = await fetch('/api/quiz/' + st.sessionId + '/submit', { method: 'POST', headers: H, body: JSON.stringify({ answers }) }).then(j);
    return sub.progress.summary.modules.find((m) => m.id === 'm8');
  });
  ok('passing the written test completes M8 straight away', m8 && m8.complete && m8.status === 'complete', m8 && m8.status);
  await ap.selectOption('#admHours select[name=moduleId]', 'm6');
  await ap.fill('#admHours input[name=hours]', '3'); await ap.fill('#admHours input[name=note]', 'Bench review with admin');
  await ap.click('#admHours button'); await ap.waitForTimeout(600);
  ok('admin logs hours for learner', /Bench review with admin/.test(await text(ap, '#app')));
  await page.goto(BASE + '/#/'); await page.reload(); await page.waitForSelector('.hero'); await settleGuide(page);
  await page.waitForSelector('#guide.is-celebrating', { timeout: 5000 }).catch(() => null);
  const cel = await guideText(page);
  ok('guide: celebrates the newly completed module', /M8 /.test(cel) && /complete!/.test(cel) && await page.isVisible('#guideBubble'), cel);
  ok('guide: milestone saved so it is not celebrated twice', (await (await page.request.get(BASE + '/api/guide')).json()).state.milestones.includes('mod:m8'));
  const celRun = await page.evaluate(() => window.VOLT_CELEBRATE && window.VOLT_CELEBRATE.runs.filter((r) => r.id === 'm8').pop());
  const m6line = ((await (await page.request.get(BASE + '/api/guide')).json()).lines.m8 || {}).celebrate;
  ok('guide: completion plays the full-screen celebration (banner + one effect)', celRun && celRun.kind === 'module' && /M8 UNLOCKED/.test(celRun.big) && ['fireworks', 'circuit', 'volt', 'scope'].includes(celRun.effect), celRun);
  ok('guide: victory-lap line is the module\'s "celebrate" line (also in the bubble)', !m6line || (celRun.line === m6line && cel.includes(m6line)), { line: celRun && celRun.line, m6line });
  await shot(page, '44-guide-celebration.png');

  await ap.goto(BASE + '/#/admin'); await ap.waitForSelector('#addBtn');
  await ap.click('#addBtn'); await ap.fill('#addForm input[name=name]', 'Casey Demo'); await ap.fill('#addForm input[name=email]', 'casey@example.com');
  await ap.click('#addForm button'); await ap.waitForSelector('.copy-row input', { timeout: 5000 });
  ok('admin invite creates link', /#\/invite\//.test(await ap.inputValue('.copy-row input')));
  const invite = await ap.inputValue('.copy-row input');
  // Admin "Reset password" on a member page (Team): shows a copyable one-time link; the link opens a reset form.
  {
    const kimId = await ap.evaluate(() => fetch('/api/admin/users').then((r) => r.json()).then((d) => (d.users.find((u) => u.role === 'learner' && !u.invitePending) || {}).id));
    await ap.goto(BASE + '/#/admin/user/' + kimId); await ap.waitForSelector('#resetPw');
    await ap.click('#resetPw'); await ap.waitForSelector('#resetOut .copy-row input');
    const resetUrl = await ap.inputValue('#resetOut .copy-row input');
    ok('admin: member page has Reset password → shows a copyable reset link', /\/#\/invite\/[0-9a-f]{64}$/.test(resetUrl) && /old password works/.test(await ap.textContent('#resetOut')));
    await shot(ap, '90-admin-reset-password.png');
    const rp = await newPage();
    await rp.goto(resetUrl.replace(/^https?:\/\/[^/]+/, BASE)); await rp.waitForSelector('#invForm');
    ok('reset link opens a "Reset your password" form', /Reset your password/.test(await rp.textContent('.auth-card')) && /Save new password/.test(await rp.textContent('#invForm button')));
    await shot(rp, '91-reset-password-page.png');
    await rp.context().close();
  }
  await ap.goto(BASE + '/#/admin/report'); await ap.waitForSelector('#repFrame');
  let repText = '';
  for (let i = 0; i < 40 && !/Phase/.test(repText); i++) { await ap.waitForTimeout(250); repText = await ap.frameLocator('#repFrame').locator('body').textContent({ timeout: 2000 }).catch(() => ''); }
  ok('report page shows phases + safety', /Phase/.test(repText) && /Level 0|safety/i.test(repText));
  await shot(ap, '16-admin-report-page.png');

  const ip = await newPage();
  await ip.goto(invite.replace(/^https?:\/\/[^/]+/, BASE)); await ip.waitForSelector('#invForm');
  await ip.fill('#invForm input[name=password]', 'casey-' + 'demo-123'); await ip.click('#invForm button'); await ip.waitForSelector('.hero');
  ok('invited user lands on dashboard', /Casey/.test(await text(ip, '.hero')));
  await settleGuide(ip, true);
  ok('guide: tour starts for a brand-new user', await ip.isVisible('#guideTour'));
  for (let i = 0; i < 6; i++) await ip.click('#guideTourNext');
  ok('guide: last tour step spotlights the guide', /always here/i.test(await text(ip, '#guideTourTitle')));
  await ip.click('#guideTourNext'); await ip.waitForSelector('#guideTour', { state: 'detached' });
  const caseyTip = await guideText(ip);
  ok('guide: new user is sent to Level 0 (M1) and offered the 100% test-out', /Level 0 comes first/.test(caseyTip) && /M1/.test(caseyTip) && !!(await ip.$('#guideActions a[href="#/quiz/module/m1"]')), caseyTip);
  await ip.click('#guideMenuBtn'); await ip.click('[data-gm=tour]'); await ip.waitForSelector('#guideTour');
  ok('guide: tour can be replayed from the menu', await ip.isVisible('#guideTourSkip'));
  await ip.keyboard.press('Escape'); await ip.waitForSelector('#guideTour', { state: 'detached' });
  await openGuide(ip); await ip.click('#guideMenuBtn'); await ip.click('[data-gm=dismiss]');
  ok('guide: dismiss hides the guide and offers a restore button', !(await ip.isVisible('#guideAvatar')) && await ip.isVisible('#guideRestore'));
  await ip.reload(); await ip.waitForSelector('.hero'); await settleGuide(ip); await ip.waitForSelector('#guideRestore');
  ok('guide: dismissal remembered after reload', !(await ip.isVisible('#guideAvatar')) && await ip.isVisible('#guideRestore'));
  await ip.click('#guideRestore'); await ip.waitForSelector('#guideAvatar', { state: 'visible' });
  ok('guide: restore brings it back', (await (await ip.request.get(BASE + '/api/guide')).json()).state.dismissed === false);

  // ---- mobile (portrait) ----
  const mp = await newPage({ width: 390, height: 844 });
  await login(mp, 'sam.chen@example.com', DEMO.learnerPassword);
  ok('no horizontal overflow on mobile dashboard', await noHScroll(mp));
  ok('guide (phone): avatar shown, bubble not auto-opened', await mp.isVisible('#guideAvatar') && !(await mp.isVisible('#guideBubble')));
  ok('guide (phone): avatar clear of key controls', (await guideCovers(mp)).length === 0, await guideCovers(mp));
  await openGuide(mp);
  const sheet = await mp.$eval('#guideBubble', (b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, h: r.height }; });
  ok('guide (phone): bubble is a bottom sheet within the screen', sheet.l >= 0 && sheet.r <= 390 && sheet.h <= 844 * 0.46 && sheet.t > 56, sheet);
  await shot(mp, '41-guide-mobile-portrait.png');
  await mp.click('#guideClose');
  await shot(mp, '17-mobile-dashboard.png', true);
  await mp.goto(BASE + '/#/simulator?preset=led'); await mp.waitForSelector('#simSvg .comp');
  await shot(mp, '18-mobile-simulator.png', true);
  ok('guide (phone): docked clear of the simulator board and tools', (await guideCovers(mp)).length === 0, await guideCovers(mp));
  ok('no horizontal overflow on mobile simulator', await noHScroll(mp));
  await mp.goto(BASE + '/#/simulator?preset=rc-phase'); await mp.waitForSelector('#simScopeSvg .trace-2', { state: 'attached' });
  ok('no horizontal overflow on mobile scope', await noHScroll(mp));
  await mp.$eval('#simScope', (e) => e.scrollIntoView({ block: 'start' }));
  await shot(mp, '36-mobile-scope.png');
  await mp.goto(BASE + '/#/hours'); await mp.waitForSelector('.hours-table');
  ok('no horizontal overflow on mobile hours', await noHScroll(mp));
  await shot(mp, '37-mobile-hours.png', true);

  // ---- weekly report sample (same data) ----
  const rep = buildWeeklyReport(db, { end: new Date() });
  const reportFile = path.join(SHOTS, 'weekly-report-sample.html');
  fs.writeFileSync(reportFile, renderReportHtml(rep, { timeZone: 'America/Chicago' }));
  fs.writeFileSync(path.join(SHOTS, 'weekly-report-sample.json'), JSON.stringify(rep, null, 2));
  const rp = await newPage({ width: 900, height: 1000 });
  await rp.goto('file://' + reportFile); await shot(rp, '19-weekly-report.png', true);

  ok('no console/page errors', errors.length === 0, '\n' + errors.join('\n'));
  await browser.close(); server.close(); db.close();
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbFile + s, { force: true }));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
