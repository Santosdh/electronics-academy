// Express application (exported separately so tests can run it in-process).
const path = require('path');
const express = require('express');
const C = require('./curriculum');
const A = require('./auth');
const P = require('./progress');
const G = require('./guide');
const GM = require('./games');
const D = require('../public/js/defects');
const { buildWeeklyReport, renderReportHtml } = require('./report');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_DAYS = 14;

// Issue a one-time invite / password-reset link (only the token's hash is stored). Used for new members, re-invites,
// admin password resets and the first-boot admin. A user's existing password keeps working until the link is used.
function issueInvite(db, userId, days = INVITE_DAYS) {
  const token = A.randomToken();
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  db.prepare('UPDATE users SET invite_token_hash=?, invite_expires_at=? WHERE id=?').run(A.sha256(token), expires, userId);
  return { token, path: `/#/invite/${token}`, expires };
}

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // one hop: Render's load balancer (gives the real client IP + req.secure)
  app.use(express.json({ limit: '100kb' }));
  app.use(A.sessionMiddleware(db));
  app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });

  const api = express.Router();
  const wrap = (fn) => (req, res) => { try { fn(req, res); } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Server error' }); if (!e.status) console.error(e); } };
  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

  // ---- Auth ----
  api.post('/auth/login', wrap((req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase(), password = String(req.body.password || '');
    const key = req.ip + '|' + email;
    if (A.loginThrottled(key)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!u || !A.checkPassword(password, u.password_hash)) { A.noteFailure(key); return res.status(401).json({ error: 'Incorrect email or password.' }); }
    A.clearFailures(key);
    const s = A.createSession(db, u.id);
    A.setSessionCookie(req, res, s.token, s.expires);
    res.json({ user: publicUser(u) });
  }));
  api.post('/auth/logout', wrap((req, res) => {
    if (req.sessionTokenHash) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.sessionTokenHash);
    A.clearSessionCookie(res, req); res.json({ ok: true });
  }));
  api.get('/auth/invite/:token', wrap((req, res) => {
    const u = db.prepare('SELECT name,email,password_hash,invite_expires_at FROM users WHERE invite_token_hash=?').get(A.sha256(req.params.token));
    if (!u || u.invite_expires_at < new Date().toISOString()) return res.status(404).json({ error: 'This invite link is invalid or has expired.' });
    res.json({ name: u.name, email: u.email, reset: !!u.password_hash, expiresAt: u.invite_expires_at });
  }));
  api.post('/auth/accept-invite', wrap((req, res) => {
    const { token, password, name } = req.body || {};
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const u = db.prepare('SELECT * FROM users WHERE invite_token_hash=?').get(A.sha256(String(token || '')));
    if (!u || u.invite_expires_at < new Date().toISOString()) return res.status(404).json({ error: 'This invite link is invalid or has expired.' });
    db.transaction(() => {
      // A password reset replaces the old password only now, and signs the user out everywhere else.
      if (u.password_hash) db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
      db.prepare('UPDATE users SET password_hash=?, name=COALESCE(NULLIF(?,\'\'),name), invite_token_hash=NULL, invite_expires_at=NULL WHERE id=?')
        .run(A.hashPassword(String(password)), String(name || '').trim(), u.id);
    })();
    const s = A.createSession(db, u.id);
    A.setSessionCookie(req, res, s.token, s.expires);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(u.id)) });
  }));
  api.post('/auth/change-password', A.requireAuth, wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const { currentPassword, newPassword } = req.body || {};
    if (!A.checkPassword(String(currentPassword || ''), u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
    if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(A.hashPassword(String(newPassword)), u.id);
    res.json({ ok: true });
  }));
  api.get('/me', (req, res) => res.json({ user: req.user || null })); // 200 even when signed out (avoids console noise)

  // ---- Learner progress ----
  api.get('/progress', A.requireAuth, wrap((req, res) => res.json(P.getProgress(db, req.user.id))));
  api.post('/lessons/:id/complete', A.requireAuth, wrap((req, res) => {
    P.markStudied(db, req.user.id, req.params.id);
    res.json(P.getProgress(db, req.user.id));
  }));
  api.delete('/lessons/:id/complete', A.requireAuth, wrap((req, res) => {
    db.prepare('DELETE FROM lesson_completions WHERE user_id=? AND lesson_id=?').run(req.user.id, req.params.id);
    res.json(P.getProgress(db, req.user.id));
  }));
  api.post('/quiz/start', A.requireAuth, wrap((req, res) => {
    const kind = String(req.body.kind || '');
    const summary = P.getProgress(db, req.user.id).summary;
    if (kind === 'defect-practice') {
      const m = C.modulesById.m17;
      P.assertUnlocked(summary, m);
      const layout = P.startDefectExercise();
      const info = db.prepare('INSERT INTO quiz_sessions (user_id,kind,module_id,lesson_id,question_ids,created_at) VALUES (?,?,?,?,?,?)')
        .run(req.user.id, kind, m.id, null, JSON.stringify(layout), P.nowIso());
      return res.json({ sessionId: Number(info.lastInsertRowid), kind, moduleId: m.id, board: D.publicBoard(layout), passPercent: D.PASS_PERCENT });
    }
    const pick = P.pickQuestions(kind, { moduleId: req.body.moduleId, lessonId: req.body.lessonId });
    const m = C.modulesById[pick.moduleId];
    P.assertUnlocked(summary, m);
    const req2 = P.requirement(kind, m, P.loadState(db, req.user.id).lessons);
    const info = db.prepare('INSERT INTO quiz_sessions (user_id,kind,module_id,lesson_id,question_ids,created_at) VALUES (?,?,?,?,?,?)')
      .run(req.user.id, kind, pick.moduleId, pick.lessonId, JSON.stringify(pick.questionIds), P.nowIso());
    res.json({ sessionId: Number(info.lastInsertRowid), kind, moduleId: pick.moduleId, lessonId: pick.lessonId, questionIds: pick.questionIds,
      passPercent: req2.percent, mode: req2.mode });
  }));
  api.post('/quiz/:sessionId/submit', A.requireAuth, wrap((req, res) => {
    const s = db.prepare('SELECT * FROM quiz_sessions WHERE id=? AND user_id=?').get(Number(req.params.sessionId), req.user.id);
    if (!s) return res.status(404).json({ error: 'Quiz not found.' });
    if (s.submitted_at) return res.status(409).json({ error: 'This quiz was already submitted.' });
    const result = s.kind === 'defect-practice' ? P.recordDefectExercise(db, req.user.id, s, req.body.answers || {})
      : P.recordAttempt(db, req.user.id, s, req.body.answers || {});
    res.json({ result, progress: P.getProgress(db, req.user.id) });
  }));
  // Hours: learners log their own time against a module; admins can log for anyone (below).
  api.post('/hours', A.requireAuth, wrap((req, res) => {
    const b = req.body || {};
    const id = P.logHours(db, { userId: req.user.id, moduleId: String(b.moduleId || ''), hours: b.hours, workDate: b.workDate, note: b.note, logger: req.user });
    res.status(201).json({ id, progress: P.getProgress(db, req.user.id) });
  }));
  api.delete('/hours/:id', A.requireAuth, wrap((req, res) => {
    const h = db.prepare('SELECT * FROM hour_logs WHERE id=?').get(Number(req.params.id));
    if (!h || (h.user_id !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'Entry not found.' });
    if (h.logger_role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Hours logged by an admin can only be removed by an admin.' });
    db.prepare('DELETE FROM hour_logs WHERE id=?').run(h.id);
    res.json({ ok: true, progress: P.getProgress(db, h.user_id) });
  }));

  // Guide companion: per-user UI state (collapsed / dismissed / tour done / milestones celebrated) + optional module lines.
  // Lesson games (schema v5 game_plays)
  api.get('/games', A.requireAuth, wrap((req, res) => res.json({ games: GM.list(db, req.user.id) })));
  api.get('/games/:id/stats', A.requireAuth, wrap((req, res) => { GM.gameOf(req.params.id); res.json(GM.stats(db, req.user.id, req.params.id)); }));
  api.get('/games/:id/art', A.requireAuth, wrap((req, res) => { GM.gameOf(req.params.id); res.json(GM.art()); }));
  api.post('/games/:id/plays', A.requireAuth, wrap((req, res) => res.json(GM.recordPlay(db, req.user.id, req.params.id, req.body))));
  api.get('/guide', A.requireAuth, wrap((req, res) => {
    const l = G.loadLines();
    res.json({ state: G.getState(db, req.user.id), lines: l.lines, linesSource: l.source });
  }));
  api.put('/guide', A.requireAuth, wrap((req, res) => res.json({ state: G.setState(db, req.user.id, req.body || {}) })));

  // ---- Admin ----
  const memberRow = (u) => {
    const p = P.getProgress(db, u.id);
    return Object.assign(publicUser(u), { createdAt: u.created_at, lastLoginAt: u.last_login_at, invitePending: !u.password_hash, summary: p.summary });
  };
  api.get('/admin/users', A.requireAdmin, wrap((req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY role, name').all();
    res.json({ users: users.map(memberRow) });
  }));
  api.get('/admin/users/:id', A.requireAdmin, wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: memberRow(u), progress: P.getProgress(db, u.id) });
  }));
  api.post('/admin/users', A.requireAdmin, wrap((req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const role = req.body.role === 'admin' ? 'admin' : 'learner';
    const password = req.body.password ? String(req.body.password) : '';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!name) return res.status(400).json({ error: 'Enter a name.' });
    if (password && password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'A user with that email already exists.' });
    let token = null;
    if (password) {
      db.prepare('INSERT INTO users (email,name,role,password_hash) VALUES (?,?,?,?)').run(email, name, role, A.hashPassword(password));
    } else {
      token = A.randomToken();
      db.prepare('INSERT INTO users (email,name,role,invite_token_hash,invite_expires_at) VALUES (?,?,?,?,?)')
        .run(email, name, role, A.sha256(token), new Date(Date.now() + INVITE_DAYS * 86400000).toISOString());
    }
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    res.status(201).json({ user: memberRow(u), invitePath: token ? `/#/invite/${token}` : null });
  }));
  api.post('/admin/users/:id/invite', A.requireAdmin, wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found.' });
    if (u.password_hash) return res.status(400).json({ error: 'This user has already set a password.' });
    res.json({ invitePath: issueInvite(db, u.id).path });
  }));
  // Admin "Reset password": a fresh invite-style link for ANY user (pending or active). Previous links stop working;
  // the current password keeps working until the user sets a new one through the link.
  api.post('/admin/users/:id/reset-password', A.requireAdmin, wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found.' });
    const inv = issueInvite(db, u.id);
    res.json({ resetPath: inv.path, expiresAt: inv.expires, pending: !u.password_hash });
  }));
  // Practical check-offs (admin sign-offs) were removed from the program; modules complete on the written test.
  // Old rows stay in the `checkoffs` table for history but nothing reads or writes them.
  api.post('/admin/users/:id/checkoffs', A.requireAdmin, (req, res) =>
    res.status(410).json({ error: 'Practical check-offs have been removed — a module is complete once its written test is passed.' }));
  api.post('/admin/users/:id/hours', A.requireAdmin, wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found.' });
    const b = req.body || {};
    const id = P.logHours(db, { userId: u.id, moduleId: String(b.moduleId || ''), hours: b.hours, workDate: b.workDate, note: b.note, logger: req.user });
    res.status(201).json({ id, progress: P.getProgress(db, u.id) });
  }));
  api.get('/admin/reports/weekly', A.requireAdmin, wrap((req, res) => {
    const end = req.query.end ? new Date(String(req.query.end)) : new Date();
    if (isNaN(end)) return res.status(400).json({ error: 'Invalid end date.' });
    const report = buildWeeklyReport(db, { end });
    const fmt = String(req.query.format || '').toLowerCase() || (req.accepts(['json', 'html']) === 'html' ? 'html' : 'json');
    if (fmt === 'html') return res.type('html').send(renderReportHtml(report, { timeZone: req.query.tz }));
    if (fmt === 'both') return res.json({ report, html: renderReportHtml(report, { timeZone: req.query.tz }) });
    res.json(report);
  }));

  api.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);
  app.get('/healthz', (req, res) => { try { db.prepare('SELECT 1').get(); res.json({ ok: true }); } catch (e) { res.status(503).json({ ok: false }); } });
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
  return app;
}

module.exports = { createApp, issueInvite, INVITE_DAYS };
