// Progress model for the module-based curriculum, shared by the API, seed script and weekly report.
//
// A module is COMPLETE when its written test is passed (or tested out). There are no instructor /
// admin practical sign-offs any more: the old `checkoffs` table is kept for history but is no longer
// read. Level 0 (Modules 1 & 2, 100% pass mark) must be complete before Modules 15–20 unlock.
const C = require('./curriculum');
const D = require('../public/js/defects');

const nowIso = () => new Date().toISOString();
const round1 = (x) => Math.round(x * 10) / 10;
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- Loading state ----------
function loadState(db, userId) {
  const lessons = {};
  db.prepare('SELECT lesson_id, method, completed_at FROM lesson_completions WHERE user_id=?').all(userId).forEach((r) => {
    if (C.lessonsById[r.lesson_id]) lessons[r.lesson_id] = { method: r.method, completedAt: r.completed_at };
  });
  const attempts = db.prepare(`SELECT id, kind, module_id AS moduleId, lesson_id AS lessonId, mode, required_percent AS requiredPercent,
      score, total, percent, passed, detail, created_at AS createdAt FROM quiz_attempts WHERE user_id=? ORDER BY created_at, id`).all(userId)
    .map((a) => Object.assign(a, { passed: !!a.passed, detail: a.detail ? JSON.parse(a.detail) : null }));
  const hours = db.prepare(`SELECT h.id, h.module_id AS moduleId, h.hours, h.work_date AS workDate, h.note, h.logger_role AS loggerRole,
      h.logged_by AS loggedBy, u.name AS loggedByName, h.created_at AS createdAt
      FROM hour_logs h LEFT JOIN users u ON u.id=h.logged_by WHERE h.user_id=? ORDER BY h.work_date, h.id`).all(userId);
  return { lessons, attempts, hours };
}

// ---------- Derivations ----------
function writtenStatus(m, attempts) {
  const tests = attempts.filter((a) => a.kind === 'module' && a.moduleId === m.id);
  const passedAttempt = tests.find((a) => a.passed) || null;
  return {
    attempts: tests.length,
    bestPercent: tests.length ? Math.max.apply(null, tests.map((a) => a.percent)) : null,
    passed: !!passedAttempt,
    passedAt: passedAttempt ? passedAttempt.createdAt : null,
    method: passedAttempt ? passedAttempt.mode : null,
    firstAttemptPassed: tests.length ? tests[0].passed : null
  };
}

function moduleSummary(m, st, ctx) {
  const done = m.lessons.filter((l) => st.lessons[l.id]);
  const written = writtenStatus(m, st.attempts);
  const complete = written.passed;
  const locked = !!m.gated && !ctx.gateCleared;
  const logged = st.hours.filter((h) => h.moduleId === m.id).reduce((a, h) => a + h.hours, 0);
  const defect = m.defectExercise ? st.attempts.filter((a) => a.kind === 'defect-practice' && a.moduleId === m.id) : null;
  const started = done.length > 0 || written.attempts > 0 || logged > 0;
  const completedAt = complete ? written.passedAt : null;
  return {
    id: m.id, number: m.number, track: m.track, phase: m.phase || null, title: m.title, hours: m.hours,
    locked, safety: !!m.safety, gated: !!m.gated,
    lessons: { total: m.lessons.length, done: done.length,
      studied: done.filter((l) => st.lessons[l.id].method === 'study').length,
      testedOut: done.filter((l) => st.lessons[l.id].method === 'test-out').length },
    written: Object.assign(written, { passPercent: m.passPercent, testOutPercent: m.testOutPercent }),
    loggedHours: round1(logged),
    defectPractice: defect ? { attempts: defect.length, bestPercent: defect.length ? Math.max.apply(null, defect.map((a) => a.percent)) : null,
      passed: defect.some((a) => a.passed) } : null,
    complete, completedAt,
    status: locked ? 'locked' : complete ? 'complete' : started ? 'in-progress' : 'not-started'
  };
}

function summarize(st) {
  // Level 0 first (Modules 1 & 2 are never gated themselves).
  const pre = { gateCleared: false };
  const m1 = moduleSummary(C.modulesById.m1, st, pre), m2 = moduleSummary(C.modulesById.m2, st, pre);
  const ctx = { gateCleared: m1.complete && m2.complete };
  const modules = C.modules.map((m) => moduleSummary(m, st, ctx));
  const advanced = C.advanced.map((m) => moduleSummary(m, st, ctx));
  const complete = modules.filter((m) => m.complete);
  const credited = complete.reduce((a, m) => a + m.hours, 0);
  const phases = C.phases.map((p) => {
    const ms = modules.filter((m) => p.moduleIds.includes(m.id));
    const cr = ms.filter((m) => m.complete).reduce((a, m) => a + m.hours, 0);
    return { id: p.id, number: p.number, title: p.title, hours: p.hours, hoursCredited: cr,
      percent: round1(cr / p.hours * 100), modulesComplete: ms.filter((m) => m.complete).length, modulesTotal: ms.length };
  });
  const coreLessons = C.coreLessons();
  const coreDone = coreLessons.filter((l) => st.lessons[l.id]);
  const coreModuleIds = new Set(C.modules.map((m) => m.id));
  const tests = st.attempts.filter((a) => a.kind === 'module' && coreModuleIds.has(a.moduleId));
  const attempted = modules.filter((m) => m.written.attempts > 0);
  const current = modules.find((m) => !m.complete && !m.locked) || null;
  const loggedCore = st.hours.filter((h) => coreModuleIds.has(h.moduleId)).reduce((a, h) => a + h.hours, 0);
  const loggedAdv = st.hours.filter((h) => !coreModuleIds.has(h.moduleId)).reduce((a, h) => a + h.hours, 0);
  const lastActivity = [].concat(Object.values(st.lessons).map((l) => l.completedAt), st.attempts.map((a) => a.createdAt),
    st.hours.map((h) => h.createdAt)).sort().pop() || null;
  const advLessons = C.advanced.reduce((a, m) => a.concat(m.lessons), []);
  return {
    coreHours: C.coreHours, hoursCredited: credited, percent: round1(credited / C.coreHours * 100),
    modulesComplete: complete.length, modulesTotal: modules.length,
    lessonsDone: coreDone.length, lessonsTotal: coreLessons.length,
    studied: coreDone.filter((l) => st.lessons[l.id].method === 'study').length,
    testedOut: coreDone.filter((l) => st.lessons[l.id].method === 'test-out').length,
    loggedHours: round1(loggedCore),
    averageWrittenPercent: tests.length ? round1(tests.reduce((s, a) => s + a.percent, 0) / tests.length) : null,
    firstAttemptPassRate: attempted.length ? Math.round(attempted.filter((m) => m.written.firstAttemptPassed).length / attempted.length * 100) : null,
    currentModule: current ? { id: current.id, number: current.number, title: current.title, status: current.status } : null,
    safety: {
      m1Complete: m1.complete, m2Complete: m2.complete, gateCleared: ctx.gateCleared,
      status: ctx.gateCleared ? 'cleared' : m1.complete || m2.complete ? 'partial' : 'not-cleared'
    },
    phases, modules,
    advanced: { modules: advanced, lessonsDone: advLessons.filter((l) => st.lessons[l.id]).length, lessonsTotal: advLessons.length,
      writtenPassed: advanced.filter((m) => m.written.passed).length, loggedHours: round1(loggedAdv),
      started: advanced.filter((m) => m.status !== 'not-started').length },
    lastActivity
  };
}

function getProgress(db, userId) {
  const st = loadState(db, userId);
  return { lessons: st.lessons, attempts: st.attempts.slice().reverse(),
    hours: st.hours.slice().reverse(), summary: summarize(st) };
}

// ---------- Rules ----------
function moduleOf(id) { const m = C.modulesById[id]; if (!m) throw httpError(404, 'Unknown module'); return m; }
function assertUnlocked(summary, m) {
  if (m.gated && !summary.safety.gateCleared)
    throw httpError(423, `Module ${m.number} is locked until Level 0 (Module 1 Safety and Module 2 ESD) is complete.`);
}

// Picks question ids for a quiz.
function pickQuestions(kind, { moduleId, lessonId }) {
  if (kind === 'lesson' || kind === 'testout-lesson') {
    const ls = C.lessonsById[lessonId];
    if (!ls) throw httpError(404, 'Unknown lesson');
    return { moduleId: ls.moduleId, lessonId: ls.id, questionIds: shuffle(ls.questions.map((q) => q.id)) };
  }
  if (kind === 'module') {
    const m = moduleOf(moduleId);
    const n = C.moduleTestSize(m.id);
    // Balanced across lessons: round-robin through shuffled lesson pools so every lesson is tested.
    const pools = shuffle(m.lessons).map((l) => shuffle(l.questions));
    const picked = [];
    for (let i = 0; picked.length < n; i++) { const p = pools[i % pools.length]; if (p.length) picked.push(p.shift()); }
    return { moduleId: m.id, lessonId: null, questionIds: shuffle(picked.map((q) => q.id)) };
  }
  throw httpError(400, 'Unknown quiz kind');
}

// Pass mark for an attempt. Module tests taken before every lesson is studied are test-outs and use
// the module's test-out mark (80%, or 100% for the Level 0 safety modules).
function requirement(kind, m, lessons) {
  if (kind === 'testout-lesson') return { mode: 'test-out', percent: m.testOutPercent };
  if (kind === 'lesson') return { mode: 'practice', percent: m.passPercent };
  const allStudied = m.lessons.every((l) => lessons[l.id] && lessons[l.id].method === 'study');
  return allStudied ? { mode: 'test', percent: m.passPercent } : { mode: 'test-out', percent: m.testOutPercent };
}

function grade(questionIds, answers, requiredPercent) {
  let score = 0;
  const detail = questionIds.map((id) => {
    const q = C.questionsById[id];
    const chosen = answers && Number.isInteger(answers[id]) ? answers[id] : null;
    const correct = chosen === q.answer;
    if (correct) score++;
    return { questionId: id, chosen, correctAnswer: q.answer, correct };
  });
  const total = questionIds.length;
  const percent = total ? round1((score / total) * 100) : 0;
  return { score, total, percent, passed: percent >= requiredPercent, requiredPercent, detail };
}

function recordAttempt(db, userId, sessionRow, answers, when) {
  const m = moduleOf(sessionRow.module_id);
  const at = when || nowIso();
  const st = loadState(db, userId);
  const req = requirement(sessionRow.kind, m, st.lessons);
  const qids = JSON.parse(sessionRow.question_ids);
  const g = grade(qids, answers, req.percent);
  const tx = db.transaction(() => {
    const info = db.prepare(`INSERT INTO quiz_attempts (session_id,user_id,kind,module_id,lesson_id,mode,required_percent,score,total,percent,passed,answers,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(sessionRow.id || null, userId, sessionRow.kind, m.id, sessionRow.lesson_id, req.mode, req.percent,
      g.score, g.total, g.percent, g.passed ? 1 : 0, JSON.stringify(answers || {}), at);
    if (sessionRow.id) db.prepare('UPDATE quiz_sessions SET submitted_at=? WHERE id=?').run(at, sessionRow.id);
    const granted = [];
    if (g.passed && req.mode === 'test-out') {
      const ids = sessionRow.kind === 'testout-lesson' ? [sessionRow.lesson_id] : m.lessons.map((l) => l.id);
      const ins = db.prepare('INSERT OR IGNORE INTO lesson_completions (user_id,lesson_id,module_id,method,completed_at,quiz_attempt_id) VALUES (?,?,?,?,?,?)');
      ids.forEach((lid) => { if (ins.run(userId, lid, m.id, 'test-out', at, info.lastInsertRowid).changes) granted.push(lid); });
    }
    return { attemptId: Number(info.lastInsertRowid), granted };
  });
  const r = tx();
  return Object.assign({ attemptId: r.attemptId, grantedLessons: r.granted, kind: sessionRow.kind, mode: req.mode, moduleId: m.id }, g);
}

function markStudied(db, userId, lessonId, when) {
  const ls = C.lessonsById[lessonId];
  if (!ls) throw httpError(404, 'Unknown lesson');
  assertUnlocked(summarize(loadState(db, userId)), C.modulesById[ls.moduleId]);
  db.prepare('INSERT OR IGNORE INTO lesson_completions (user_id,lesson_id,module_id,method,completed_at) VALUES (?,?,?,?,?)')
    .run(userId, lessonId, ls.moduleId, 'study', when || nowIso());
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function logHours(db, { userId, moduleId, hours, workDate, note, logger, when }) {
  const m = moduleOf(moduleId);
  const h = Number(hours);
  if (!(h > 0 && h <= 24)) throw httpError(400, 'Hours must be between 0 and 24.');
  if (!DATE_RE.test(String(workDate || ''))) throw httpError(400, 'Enter the date worked (YYYY-MM-DD).');
  if (logger.role !== 'admin') assertUnlocked(summarize(loadState(db, userId)), m);
  const info = db.prepare(`INSERT INTO hour_logs (user_id,module_id,hours,work_date,note,logged_by,logger_role,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(userId, m.id, Math.round(h * 4) / 4, workDate, String(note || '').slice(0, 500) || null, logger.id, logger.role, when || nowIso());
  return Number(info.lastInsertRowid);
}

// ---------- Module 17 seeded-defect practice ----------
function startDefectExercise() { return D.makeBoard(); }
function recordDefectExercise(db, userId, sessionRow, answers, when) {
  const layout = JSON.parse(sessionRow.question_ids);
  const r = D.gradeBoard(layout, answers || {});
  const at = when || nowIso();
  const info = db.prepare(`INSERT INTO quiz_attempts (session_id,user_id,kind,module_id,lesson_id,mode,required_percent,score,total,percent,passed,answers,detail,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(sessionRow.id || null, userId, 'defect-practice', 'm17', null, 'practice', D.PASS_PERCENT,
    r.correct, r.seeded, r.percent, r.passed ? 1 : 0, JSON.stringify(answers || {}), JSON.stringify(r), at);
  if (sessionRow.id) db.prepare('UPDATE quiz_sessions SET submitted_at=? WHERE id=?').run(at, sessionRow.id);
  return Object.assign({ attemptId: Number(info.lastInsertRowid) }, r);
}

module.exports = { pickQuestions, grade, requirement, recordAttempt, markStudied, logHours, getProgress, summarize,
  loadState, startDefectExercise, recordDefectExercise, assertUnlocked, httpError, nowIso };
