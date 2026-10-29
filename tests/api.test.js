// End-to-end API test against an in-memory database. Run: node tests/api.test.js
const { openDb } = require('../server/db');
const { createApp } = require('../server/app');
const { seedDemo, DEMO } = require('../scripts/seed');
const C = require('../server/curriculum');
const A = require('../server/auth');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, extra || ''); } };

(async () => {
  const db = openDb(':memory:');
  const { inviteToken } = seedDemo(db);
  const server = createApp(db).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const client = () => {
    let cookie = '';
    return async (method, path, body) => {
      const r = await fetch(base + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, cookie ? { Cookie: cookie } : {}), body: body ? JSON.stringify(body) : undefined });
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
      const text = await r.text(); let json; try { json = JSON.parse(text); } catch (e) { json = text; }
      return { status: r.status, body: json, headers: r.headers };
    };
  };

  const anon = client();
  ok('unauthenticated /progress is 401', (await anon('GET', '/progress')).status === 401);
  ok('wrong password rejected', (await anon('POST', '/auth/login', { email: DEMO.admin.email, password: 'nope' })).status === 401);

  const admin = client();
  const login = await admin('POST', '/auth/login', { email: DEMO.admin.email, password: DEMO.admin.password });
  ok('admin login', login.status === 200 && login.body.user.role === 'admin');
  ok('session cookie is HttpOnly', /HttpOnly/i.test(login.headers.get('set-cookie') || ''));
  const users = await admin('GET', '/admin/users');
  ok('admin lists users', users.status === 200 && users.body.users.length === 6);

  const learner = client();
  ok('learner login', (await learner('POST', '/auth/login', { email: 'sam.chen@example.com', password: DEMO.learnerPassword })).status === 200);
  ok('learner blocked from admin', (await learner('GET', '/admin/users')).status === 403);
  ok('learner blocked from report', (await learner('GET', '/admin/reports/weekly')).status === 403);
  const prog = (await learner('GET', '/progress')).body;
  ok('seeded Sam: safety partial, M15 locked', prog.summary.safety.status === 'partial' && prog.summary.modules.find((m) => m.id === 'm15').locked, prog.summary.safety);
  ok('seeded Sam: M1 written passed but awaiting check-offs', prog.summary.modules[0].status === 'awaiting-checkoffs' && !prog.summary.modules[0].complete);
  ok('progress includes 4 phases and 304 h', prog.summary.phases.length === 4 && prog.summary.coreHours === 304);

  // Gating: hands-on modules locked until Level 0 complete
  ok('locked module quiz refused (423)', (await learner('POST', '/quiz/start', { kind: 'module', moduleId: 'm15' })).status === 423);
  ok('locked lesson cannot be completed', (await learner('POST', `/lessons/${C.modulesById.m16.lessons[0].id}/complete`)).status === 423);
  ok('defect exercise locked before Level 0', (await learner('POST', '/quiz/start', { kind: 'defect-practice' })).status === 423);

  // Study completion
  const lid = C.modulesById.m5.lessons[0].id;
  await learner('POST', `/lessons/${lid}/complete`);
  let p = (await learner('GET', '/progress')).body;
  ok('study completion recorded', p.lessons[lid] && p.lessons[lid].method === 'study');

  // Module test-out at 80% (M6, nothing studied)
  let st = (await learner('POST', '/quiz/start', { kind: 'module', moduleId: 'm6' })).body;
  ok('module test-out mode at 80%', st.mode === 'test-out' && st.passPercent === 80 && st.questionIds.length === C.moduleTestSize('m6'), st);
  const n6 = st.questionIds.length;
  let answers = {}; st.questionIds.forEach((id, i) => { const q = C.questionsById[id]; answers[id] = i < Math.ceil(n6 * 0.7) ? q.answer : (q.answer + 1) % 4; });
  let sub = (await learner('POST', `/quiz/${st.sessionId}/submit`, { answers })).body;
  ok('70% fails test-out, grants nothing', sub.result.passed === false && sub.result.grantedLessons.length === 0);
  ok('resubmitting same quiz is rejected', (await learner('POST', `/quiz/${st.sessionId}/submit`, { answers })).status === 409);
  st = (await learner('POST', '/quiz/start', { kind: 'module', moduleId: 'm6' })).body;
  answers = {}; st.questionIds.forEach((id, i) => { const q = C.questionsById[id]; answers[id] = i < Math.round(n6 * 0.8) ? q.answer : (q.answer + 1) % 4; });
  sub = (await learner('POST', `/quiz/${st.sessionId}/submit`, { answers })).body;
  ok('80% passes module test-out', sub.result.passed === true && sub.result.percent === 80, sub.result);
  ok('test-out grants all module lessons', sub.result.grantedLessons.length === C.modulesById.m6.lessons.length);
  const m6 = sub.progress.summary.modules.find((m) => m.id === 'm6');
  ok('written passed but not complete until check-offs signed', m6.written.passed && !m6.complete && m6.status === 'awaiting-checkoffs');

  // Lesson test-out
  const l7 = C.modulesById.m7.lessons[0];
  st = (await learner('POST', '/quiz/start', { kind: 'testout-lesson', lessonId: l7.id })).body;
  answers = {}; st.questionIds.forEach((id) => { answers[id] = C.questionsById[id].answer; });
  sub = (await learner('POST', `/quiz/${st.sessionId}/submit`, { answers })).body;
  ok('lesson test-out grants that lesson', sub.result.passed && sub.progress.lessons[l7.id].method === 'test-out');

  // Admin creates learner via invite; invite acceptance
  const created = await admin('POST', '/admin/users', { name: 'Taylor New', email: 'taylor@example.com' });
  ok('admin creates invite', created.status === 201 && /#\/invite\//.test(created.body.invitePath));
  ok('duplicate email rejected', (await admin('POST', '/admin/users', { name: 'X', email: 'taylor@example.com' })).status === 409);
  const tok = created.body.invitePath.split('/').pop();
  const newbie = client();
  ok('invite lookup', (await newbie('GET', '/auth/invite/' + tok)).body.email === 'taylor@example.com');
  ok('short password rejected', (await newbie('POST', '/auth/accept-invite', { token: tok, password: 'short' })).status === 400);
  const acc = await newbie('POST', '/auth/accept-invite', { token: tok, password: 'longenough1' });
  ok('invite accepted + signed in', acc.status === 200 && (await newbie('GET', '/me')).body.user.email === 'taylor@example.com');
  ok('invite cannot be reused', (await client()('POST', '/auth/accept-invite', { token: tok, password: 'longenough2' })).status === 404);
  ok('seeded Jordan invite works', (await client()('GET', '/auth/invite/' + inviteToken)).status === 200);
  const taylorId = created.body.user.id;

  // Safety module: 100% required, no test-out below 100%
  st = (await newbie('POST', '/quiz/start', { kind: 'module', moduleId: 'm1' })).body;
  ok('M1 test uses every safety question at 100%', st.passPercent === 100 && st.mode === 'test-out' && st.questionIds.length === C.moduleQuestions('m1').length);
  answers = {}; st.questionIds.forEach((id, i) => { const q = C.questionsById[id]; answers[id] = i ? q.answer : (q.answer + 1) % 4; });
  sub = (await newbie('POST', `/quiz/${st.sessionId}/submit`, { answers })).body;
  ok('one wrong answer fails the safety test-out', !sub.result.passed && sub.result.percent < 100 && sub.result.grantedLessons.length === 0);
  ok('check-off for M4 refused before M1 quiz passed (no bench power)', (await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm4', itemId: 'm4-lab1', status: 'pass', performedOn: '2026-10-20' })).status === 423);
  st = (await newbie('POST', '/quiz/start', { kind: 'module', moduleId: 'm1' })).body;
  answers = {}; st.questionIds.forEach((id) => { answers[id] = C.questionsById[id].answer; });
  sub = (await newbie('POST', `/quiz/${st.sessionId}/submit`, { answers })).body;
  ok('100% passes the safety test', sub.result.passed && sub.result.percent === 100);
  let m1 = sub.progress.summary.modules[0];
  ok('M1 not complete until check-offs signed; no hours credited', !m1.complete && sub.progress.summary.hoursCredited === 0);

  // Check-offs (admin-signed)
  ok('learner cannot sign check-offs', (await newbie('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-lab1', status: 'pass', performedOn: '2026-10-20' })).status === 403);
  ok('check-off needs pass/fail', (await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-lab1', status: 'ok', performedOn: '2026-10-20' })).status === 400);
  ok('check-off needs a date', (await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-lab1', status: 'pass', performedOn: 'yesterday' })).status === 400);
  ok('unknown check-off item 404', (await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-lab99', status: 'pass', performedOn: '2026-10-20' })).status === 404);
  const adminId = login.body.user.id;
  ok('admin cannot sign own check-off', (await admin('POST', `/admin/users/${adminId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-lab1', status: 'pass', performedOn: '2026-10-20' })).status === 400);
  let co = await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: 'm1-pa1', status: 'fail', performedOn: '2026-10-20', note: 'Missed verify step' });
  ok('fail sign-off recorded with signer + note', co.status === 201 && co.body.progress.checkoffs[0].status === 'fail' && co.body.progress.checkoffs[0].signerName === DEMO.admin.name && co.body.progress.checkoffs[0].note === 'Missed verify step');
  for (const c of C.modulesById.m1.checkoffs) co = await admin('POST', `/admin/users/${taylorId}/checkoffs`, { moduleId: 'm1', itemId: c.id, status: 'pass', performedOn: '2026-10-21' });
  m1 = co.body.progress.summary.modules[0];
  ok('M1 complete after written + all check-offs; 8 h credited', m1.complete && co.body.progress.summary.hoursCredited === 8, m1);
  ok('Level 0 not cleared until M2 also complete', co.body.progress.summary.safety.status === 'partial');

  // Hours
  let hr = await newbie('POST', '/hours', { moduleId: 'm3', hours: 2.5, workDate: '2026-10-21', note: 'Notation drills' });
  ok('learner logs hours', hr.status === 201 && hr.body.progress.summary.loggedHours === 2.5);
  ok('hours out of range rejected', (await newbie('POST', '/hours', { moduleId: 'm3', hours: 30, workDate: '2026-10-21' })).status === 400);
  ok('learner cannot log hours on a locked module', (await newbie('POST', '/hours', { moduleId: 'm15', hours: 1, workDate: '2026-10-21' })).status === 423);
  hr = await admin('POST', `/admin/users/${taylorId}/hours`, { moduleId: 'm1', hours: 8, workDate: '2026-10-20', note: 'Classroom' });
  ok('admin logs hours for learner', hr.status === 201 && hr.body.progress.summary.loggedHours === 10.5);
  const adminHour = hr.body.progress.hours.find((h) => h.loggerRole === 'admin');
  ok('learner cannot delete instructor-logged hours', (await newbie('DELETE', '/hours/' + adminHour.id)).status === 403);

  // Unlock Sam's hands-on modules by signing the failed LOTO practical, then try the defect exercise
  const samUser = users.body.users.find((u) => u.email === 'sam.chen@example.com');
  co = await admin('POST', `/admin/users/${samUser.id}/checkoffs`, { moduleId: 'm1', itemId: 'm1-pa1', status: 'pass', performedOn: '2026-10-22', note: 'Repeated correctly' });
  ok('latest sign-off wins: Sam clears Level 0', co.body.progress.summary.safety.gateCleared === true);
  st = await learner('POST', '/quiz/start', { kind: 'defect-practice' });
  ok('defect board issued without answers', st.status === 200 && st.body.board.locations.length === 12 && !JSON.stringify(st.body.board.locations).includes('"condition"'));
  answers = {}; st.body.board.locations.forEach((l) => { answers[l.id] = 'good'; });
  sub = (await learner('POST', `/quiz/${st.body.sessionId}/submit`, { answers })).body;
  ok('defect exercise graded (all "no defect" fails)', sub.result.passed === false && sub.result.seeded >= 5 && sub.result.correct === 0 && sub.result.passPercent === 90);
  ok('defect practice tracked on M17', sub.progress.summary.modules.find((m) => m.id === 'm17').defectPractice.attempts === 1);

  // Drill-down + report
  const sam = users.body.users.find((u) => u.email === 'sam.chen@example.com');
  const dd = await admin('GET', '/admin/users/' + sam.id);
  ok('admin drill-down', dd.status === 200 && dd.body.progress.attempts.length >= 3 && dd.body.progress.checkoffs.length > 0);
  const rj = await admin('GET', '/admin/reports/weekly?format=json');
  ok('report JSON', rj.status === 200 && rj.body.team.memberCount === 5 && rj.body.team.pendingInvites.length === 1 && rj.body.members.length === 5);
  ok('report has phases, hours, safety, check-offs', rj.body.team.phases.length === 4 && rj.body.program.coreHours === 304 && rj.body.team.safety.members.length === 5 && rj.body.team.checkoffsThisWeek.signed >= 5);
  ok('report flags ahead and behind', rj.body.team.ahead.some((m) => m.name === 'Alex Rivera') && rj.body.team.behind.some((m) => m.name === 'Priya Patel'));
  const rh = await admin('GET', '/admin/reports/weekly?format=html');
  ok('report HTML', rh.status === 200 && /Weekly Team Report/.test(rh.body) && /Safety status/.test(rh.body) && /Check-offs signed this week/.test(rh.body) && !/<script/i.test(rh.body) && !/<link/i.test(rh.body));
  const both = await admin('GET', '/admin/reports/weekly?format=both');
  ok('report both', both.body.report && typeof both.body.html === 'string');

  // ---- Guide companion state + lines ----
  {
    const fs = require('fs'), os = require('os'), path = require('path');
    ok('guide: anonymous GET is 401', (await anon('GET', '/guide')).status === 401);
    ok('guide: anonymous PUT is 401', (await anon('PUT', '/guide', { collapsed: true })).status === 401);
    const g0 = await learner('GET', '/guide');
    ok('guide: defaults for a new state', g0.status === 200 && g0.body.state.collapsed === false && g0.body.state.dismissed === false && g0.body.state.tourDone === false && g0.body.state.milestones === null, g0.body);
    ok('guide: lines object present', g0.body.lines && typeof g0.body.lines === 'object');
    const g1 = await learner('PUT', '/guide', { collapsed: true, tourDone: true, milestones: ['mod:m3', 'phase:p1', 'safety', 'safety'] });
    ok('guide: PUT persists and dedupes milestones', g1.status === 200 && g1.body.state.collapsed && g1.body.state.tourDone && g1.body.state.milestones.length === 3, g1.body);
    const g2 = (await learner('GET', '/guide')).body.state;
    ok('guide: partial PUT keeps other fields', g2.collapsed === true && g2.tourDone === true && g2.dismissed === false && g2.milestones.includes('phase:p1'));
    ok('guide: dismiss persists', (await learner('PUT', '/guide', { dismissed: true })).body.state.dismissed === true && (await learner('GET', '/guide')).body.state.dismissed === true);
    ok('guide: state is per user', (await admin('GET', '/guide')).body.state.dismissed === false);
    ok('guide: non-boolean rejected', (await learner('PUT', '/guide', { collapsed: 'yes' })).status === 400);
    ok('guide: bad milestone rejected', (await learner('PUT', '/guide', { milestones: ['<script>'] })).status === 400);
    ok('guide: milestones must be array', (await learner('PUT', '/guide', { milestones: 'safety' })).status === 400);
    ok('guide: lightning effects on by default', g0.body.state.effects === true, g0.body.state);
    const gf = await learner('PUT', '/guide', { effects: false });
    ok('guide: effects switch persists', gf.status === 200 && gf.body.state.effects === false && (await learner('GET', '/guide')).body.state.effects === false && (await learner('GET', '/guide')).body.state.tourDone === true);
    ok('guide: effects switch is per user', (await admin('GET', '/guide')).body.state.effects === true);
    ok('guide: non-boolean effects rejected', (await learner('PUT', '/guide', { effects: 'off' })).status === 400);
    ok('guide: effects switch back on', (await learner('PUT', '/guide', { effects: true })).body.state.effects === true);
    await learner('PUT', '/guide', { dismissed: false, collapsed: false });

    // Lines file: loaded when present, normalised, unknown keys dropped
    const tmp = path.join(os.tmpdir(), `ea-guide-lines-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ m1: { intro: 'Custom intro', tips: ['Tip A', 'Tip B'], commonMistakes: ['Oops'], celebrate: '  Ohm\'s law: mastered.  ' }, m5: { summary: 'S5' }, bogus: { intro: 'x' } }));
    process.env.GUIDE_LINES_PATH = tmp;
    const gl = (await learner('GET', '/guide')).body;
    ok('guide: lines loaded from file', gl.linesSource === path.basename(tmp) && gl.lines.m1.intro === 'Custom intro' && gl.lines.m1.tips.length === 2 && gl.lines.m1.mistakes[0] === 'Oops', gl);
    ok('guide: optional celebrate line kept (trimmed), null when absent', gl.lines.m1.celebrate === "Ohm's law: mastered." && gl.lines.m5.celebrate === null, gl.lines.m1);
    ok('guide: lines normalised (summary→intro, unknown keys dropped)', gl.lines.m5.intro === 'S5' && !gl.lines.bogus);
    fs.writeFileSync(tmp, JSON.stringify({ modules: { m2: { introduction: 'Wrapped' } } }));
    const fut = new Date(Date.now() + 5000); fs.utimesSync(tmp, fut, fut);
    const gl2 = (await learner('GET', '/guide')).body;
    ok('guide: lines reload on change, {modules:{}} wrapper accepted', gl2.lines.m2 && gl2.lines.m2.intro === 'Wrapped' && !gl2.lines.m1, gl2.lines);
    fs.writeFileSync(tmp, '{ not json');
    fs.utimesSync(tmp, new Date(Date.now() + 9000), new Date(Date.now() + 9000));
    const gl3 = await learner('GET', '/guide');
    ok('guide: malformed lines file falls back to defaults', gl3.status === 200 && Object.keys(gl3.body.lines).length === 0);
    fs.unlinkSync(tmp);
    process.env.GUIDE_LINES_PATH = path.join(os.tmpdir(), 'ea-no-such-file.json');
    const gl4 = (await learner('GET', '/guide')).body;
    ok('guide: missing lines file → empty lines (client defaults)', gl4.linesSource === null && Object.keys(gl4.lines).length === 0);
    delete process.env.GUIDE_LINES_PATH;

    // Migration v2 → v3 keeps every user; deleting a user cascades to guide_state
    const { SCHEMA_VERSION } = require('../server/db');
    const file = path.join(os.tmpdir(), `ea-mig-${process.pid}.db`);
    let d = openDb(file); seedDemo(d);
    const before = d.prepare('SELECT id,email,role,password_hash FROM users ORDER BY id').all();
    d.exec('DROP TABLE guide_state'); d.pragma('user_version = 2'); d.close();
    d = openDb(file);
    const after = d.prepare('SELECT id,email,role,password_hash FROM users ORDER BY id').all();
    ok('migration: schema is v4', SCHEMA_VERSION === 4 && d.pragma('user_version', { simple: true }) === 4);
    ok('migration: guide_state table created', !!d.prepare("SELECT name FROM sqlite_master WHERE name='guide_state'").get());
    ok('migration: users, roles and password hashes preserved', JSON.stringify(before) === JSON.stringify(after) && after.length === before.length);
    // v3 → v4: an existing v3 guide_state row (no fx column) keeps its values and gets effects on
    {
      const f3 = path.join(os.tmpdir(), `ea-mig3-${process.pid}.db`);
      let d3 = openDb(f3); seedDemo(d3);
      const users3 = d3.prepare('SELECT id,email,role,password_hash FROM users ORDER BY id').all();
      const lid = users3.find((u) => u.role === 'learner').id;
      d3.exec('DROP TABLE guide_state');
      d3.exec("CREATE TABLE guide_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, collapsed INTEGER NOT NULL DEFAULT 0, dismissed INTEGER NOT NULL DEFAULT 0, tour_done INTEGER NOT NULL DEFAULT 0, milestones TEXT, updated_at TEXT NOT NULL)");
      d3.prepare("INSERT INTO guide_state VALUES (?,1,0,1,'[\"safety\"]','2026-10-29T12:00:00Z')").run(lid);
      d3.pragma('user_version = 3'); d3.close();
      d3 = openDb(f3);
      const st = require('../server/guide').getState(d3, lid);
      ok('migration v3 → v4: version bumped, fx column added', d3.pragma('user_version', { simple: true }) === 4 && d3.prepare('PRAGMA table_info(guide_state)').all().some((c) => c.name === 'fx_enabled'));
      ok('migration v3 → v4: guide state and users preserved, effects default on', st.collapsed && st.tourDone && st.milestones[0] === 'safety' && st.effects === true &&
        JSON.stringify(d3.prepare('SELECT id,email,role,password_hash FROM users ORDER BY id').all()) === JSON.stringify(users3), st);
      d3.close(); ['', '-wal', '-shm'].forEach((s) => { try { fs.unlinkSync(f3 + s); } catch (e) { /* ignore */ } });
    }
    const uid = after.find((u) => u.role === 'learner').id;
    d.prepare("INSERT INTO guide_state (user_id,collapsed,dismissed,tour_done,milestones,updated_at) VALUES (?,0,0,1,'[]',datetime('now'))").run(uid);
    d.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);
    d.prepare('DELETE FROM users WHERE id=?').run(uid);
    ok('guide_state cascades on user delete', !d.prepare('SELECT 1 FROM guide_state WHERE user_id=?').get(uid));
    d.close(); ['', '-wal', '-shm'].forEach((s) => { try { fs.unlinkSync(file + s); } catch (e) { /* ignore */ } });
  }

  // ---- Admin "Reset password" (invite-style link for any user) ----
  {
    const samId = (await admin('GET', '/admin/users')).body.users.find((u) => u.email === 'sam.chen@example.com').id;
    const before = JSON.stringify((await learner('GET', '/progress')).body.summary.modules.map((m) => m.status));
    ok('reset: learners cannot issue reset links', (await learner('POST', `/admin/users/${samId}/reset-password`)).status === 403);
    ok('reset: anonymous cannot issue reset links', (await anon('POST', `/admin/users/${samId}/reset-password`)).status === 401);
    ok('reset: unknown user is 404', (await admin('POST', '/admin/users/999999/reset-password')).status === 404);
    const r1 = await admin('POST', `/admin/users/${samId}/reset-password`);
    ok('reset: admin gets a link for an active user', r1.status === 200 && /^\/#\/invite\/[0-9a-f]{64}$/.test(r1.body.resetPath) && r1.body.pending === false, r1.body);
    const days = (new Date(r1.body.expiresAt) - Date.now()) / 86400000;
    ok('reset: link valid ~14 days', days > 13.9 && days <= 14, days);
    const tok1 = r1.body.resetPath.split('/').pop();
    const info = await anon('GET', '/auth/invite/' + tok1);
    ok('reset: link opens as a password reset for that user', info.status === 200 && info.body.reset === true && info.body.email === 'sam.chen@example.com');
    const other = client();
    ok('reset: old password still works until a new one is set', (await other('POST', '/auth/login', { email: 'sam.chen@example.com', password: DEMO.learnerPassword })).status === 200);
    ok('reset: existing sessions still work before the reset is used', (await learner('GET', '/progress')).status === 200);
    const r2 = await admin('POST', `/admin/users/${samId}/reset-password`);
    const tok2 = r2.body.resetPath.split('/').pop();
    ok('reset: a newer link replaces the older one', (await anon('GET', '/auth/invite/' + tok1)).status === 404 && (await anon('GET', '/auth/invite/' + tok2)).status === 200);
    ok('reset: short password refused, link not consumed', (await anon('POST', '/auth/accept-invite', { token: tok2, password: 'short' })).status === 400 && (await anon('GET', '/auth/invite/' + tok2)).status === 200);
    const newPw = 'Rst-' + require('crypto').randomBytes(9).toString('hex');
    const resetter = client();
    const acc = await resetter('POST', '/auth/accept-invite', { token: tok2, password: newPw });
    ok('reset: setting the new password signs them in', acc.status === 200 && acc.body.user.email === 'sam.chen@example.com' && (await resetter('GET', '/progress')).status === 200);
    ok('reset: old password stops working once the new one is set', (await client()('POST', '/auth/login', { email: 'sam.chen@example.com', password: DEMO.learnerPassword })).status === 401);
    ok('reset: new password works', (await client()('POST', '/auth/login', { email: 'sam.chen@example.com', password: newPw })).status === 200);
    ok('reset: old sessions are signed out', (await learner('GET', '/progress')).status === 401 && (await other('GET', '/progress')).status === 401);
    ok('reset: link is single-use', (await anon('GET', '/auth/invite/' + tok2)).status === 404 && (await anon('POST', '/auth/accept-invite', { token: tok2, password: newPw + 'x' })).status === 404);
    ok('reset: progress kept', JSON.stringify((await resetter('GET', '/progress')).body.summary.modules.map((m) => m.status)) === before);
    // pending (never accepted) user
    const pend = await admin('POST', '/admin/users', { name: 'Pat Pending', email: 'pat.pending@example.com' });
    const rp = await admin('POST', `/admin/users/${pend.body.user.id}/reset-password`);
    ok('reset: works for a pending user too (and replaces the invite)', rp.status === 200 && rp.body.pending === true && (await anon('GET', pend.body.invitePath.replace('/#', ''))).status === 404);
    const rpTok = rp.body.resetPath.split('/').pop();
    const pi = await anon('GET', '/auth/invite/' + rpTok);
    ok('reset: pending user sees the normal welcome (not "reset")', pi.status === 200 && pi.body.reset === false);
    ok('reset: pending user can join through it', (await client()('POST', '/auth/accept-invite', { token: rpTok, password: newPw })).status === 200);
    // admin's own account
    const meId = (await admin('GET', '/me')).body.user.id;
    ok('reset: admin can make a link for their own account', (await admin('POST', `/admin/users/${meId}/reset-password`)).status === 200 && (await admin('GET', '/admin/users')).status === 200);
  }

  // ---- Production cookie flags + trust proxy ----
  {
    const prevEnv = process.env.NODE_ENV;
    const dev = await client()('POST', '/auth/login', { email: DEMO.admin.email, password: DEMO.admin.password });
    ok('cookie: plain http in dev is not Secure', !/;\s*Secure/i.test(dev.headers.get('set-cookie')));
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' }, body: JSON.stringify({ email: DEMO.admin.email, password: DEMO.admin.password }) });
    ok('cookie: behind an HTTPS proxy (trust proxy) it is Secure', /;\s*Secure/i.test(r.headers.get('set-cookie')));
    process.env.NODE_ENV = 'production';
    try {
      const pr = await client()('POST', '/auth/login', { email: DEMO.admin.email, password: DEMO.admin.password });
      const c = pr.headers.get('set-cookie') || '';
      ok('cookie: production → Secure, HttpOnly, SameSite=Lax', /;\s*Secure/i.test(c) && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c), c.replace(/=[0-9a-f]{20,}/, '=…'));
      const lo = await fetch(base + '/auth/logout', { method: 'POST' });
      ok('cookie: production logout clears with the same flags', /Max-Age=0/.test(lo.headers.get('set-cookie')) && /Secure/.test(lo.headers.get('set-cookie')));
    } finally { if (prevEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prevEnv; }
  }

  // ---- First-boot admin bootstrap (unit) ----
  {
    const { bootstrapAdmin } = require('../server/bootstrap');
    const b = openDb(':memory:');
    const lines = []; const log = (l) => lines.push(l);
    ok('bootstrap: nothing without ADMIN_EMAIL', bootstrapAdmin(b, { log }).action === 'none' && !lines.length && !b.prepare('SELECT COUNT(*) n FROM users').get().n);
    const r1 = bootstrapAdmin(b, { email: ' Dwight.Santos@SpaceX.com ', name: 'Dwight Santos', publicUrl: 'https://academy.example.com/', log });
    const u = b.prepare('SELECT * FROM users').all();
    ok('bootstrap: creates the admin with no password', r1.action === 'created' && u.length === 1 && u[0].role === 'admin' && u[0].email === 'dwight.santos@spacex.com' && u[0].name === 'Dwight Santos' && !u[0].password_hash);
    ok('bootstrap: logs one ADMIN INVITE line with PUBLIC_URL', lines.length === 1 && /^ADMIN INVITE: https:\/\/academy\.example\.com\/#\/invite\/[0-9a-f]{64}$/.test(lines[0]), lines[0] && lines[0].replace(/[0-9a-f]{64}/, '<token>'));
    const exp = (new Date(u[0].invite_expires_at) - Date.now()) / 86400000;
    ok('bootstrap: invite valid 14 days', exp > 13.9 && exp <= 14);
    const r2 = bootstrapAdmin(b, { email: 'dwight.santos@spacex.com', name: 'Dwight Santos', log });
    const u2 = b.prepare('SELECT * FROM users').all();
    ok('bootstrap: later boot is idempotent (no new user, link unchanged)', r2.action === 'pending' && u2.length === 1 && u2[0].invite_token_hash === u[0].invite_token_hash && !/\/#\/invite\/[0-9a-f]{64}/.test(lines[1] || ''));
    b.prepare("UPDATE users SET invite_expires_at='2000-01-01T00:00:00Z'").run();
    lines.length = 0;
    const r3 = bootstrapAdmin(b, { email: 'dwight.santos@spacex.com', log });
    ok('bootstrap: expired first link → a fresh one (relative without PUBLIC_URL)', r3.action === 'reissued' && /^ADMIN INVITE: \/#\/invite\/[0-9a-f]{64}$/.test(lines[0] || ''));
    b.prepare('UPDATE users SET password_hash=?').run(A.hashPassword(require('crypto').randomBytes(12).toString('hex')));
    lines.length = 0;
    ok('bootstrap: no-op once an admin has a password', bootstrapAdmin(b, { email: 'someone.else@example.com', log }).action === 'none' && !lines.length && b.prepare('SELECT COUNT(*) n FROM users').get().n === 1);
    const b2 = openDb(':memory:');
    b2.prepare("INSERT INTO users (email,name,role) VALUES ('boss@example.com','Boss','learner')").run();
    lines.length = 0;
    ok('bootstrap: promotes an existing learner with that email', bootstrapAdmin(b2, { email: 'boss@example.com', log }).action === 'promoted' && b2.prepare('SELECT role FROM users').get().role === 'admin' && lines.length === 1);
    ok('bootstrap: invalid ADMIN_EMAIL is refused', bootstrapAdmin(openDb(':memory:'), { email: 'not-an-email', log: () => {} }).action === 'none');
    b.close(); b2.close();
  }

  // ---- Production boot (real process): NO_DEMO, bootstrap line, invite works, healthz, PORT ----
  {
    const { spawn } = require('child_process');
    const os = require('os'), pathM = require('path'), fsM = require('fs');
    const dir = fsM.mkdtempSync(pathM.join(os.tmpdir(), 'ea-prod-'));
    const port = 4300 + Math.floor(Math.random() * 60) + 30;
    const boot = () => new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [pathM.join(__dirname, '..', 'server', 'server.js')], {
        env: Object.assign({}, process.env, { PORT: String(port), DB_PATH: pathM.join(dir, 'academy.db'), NODE_ENV: 'production', NO_DEMO: '1',
          ADMIN_EMAIL: 'first.admin@example.com', ADMIN_NAME: 'First Admin', PUBLIC_URL: 'https://academy.example.com', SESSION_SECRET: 'test-only' }),
        stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => { out += d; if (/running on port/.test(out)) resolve({ proc, get out() { return out; } }); });
      proc.stderr.on('data', (d) => { out += d; });
      proc.on('exit', (c) => reject(new Error('server exited ' + c + ': ' + out)));
      setTimeout(() => reject(new Error('boot timeout: ' + out)), 15000);
    });
    const stop = (p) => new Promise((r) => { p.proc.removeAllListeners('exit'); p.proc.on('exit', r); p.proc.kill('SIGTERM'); });
    const s1 = await boot();
    const m = /ADMIN INVITE: https:\/\/academy\.example\.com\/#\/invite\/([0-9a-f]{64})/.exec(s1.out);
    ok('prod boot: logs the ADMIN INVITE line on an empty DB', !!m && (s1.out.match(/ADMIN INVITE:/g) || []).length === 1);
    ok('prod boot: honours PORT and /healthz is 200', (await fetch(`http://127.0.0.1:${port}/healthz`)).status === 200);
    const pb = `http://127.0.0.1:${port}/api`;
    const inv = await (await fetch(pb + '/auth/invite/' + (m && m[1]))).json();
    ok('prod boot: the invite link opens for the admin', inv.email === 'first.admin@example.com' && inv.reset === false);
    const prodDb = require('better-sqlite3')(pathM.join(dir, 'academy.db'), { readonly: true });
    const pu = prodDb.prepare('SELECT email, role FROM users').all(); prodDb.close();
    ok('prod boot: NO_DEMO=1 → only the bootstrap admin, no demo data', pu.length === 1 && pu[0].role === 'admin');
    await stop(s1);
    const s2 = await boot();
    ok('prod boot: second boot creates nothing and prints no new link', !/\/#\/invite\/[0-9a-f]{64}/.test(s2.out) && /already issued/.test(s2.out));
    await stop(s2);
    fsM.rmSync(dir, { recursive: true, force: true });
  }

  // Logout invalidates session
  await learner('POST', '/auth/logout');
  ok('logout ends session', (await learner('GET', '/progress')).status === 401);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
