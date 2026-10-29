// Demo accounts and sample progress for the module-based curriculum.
//   node scripts/seed.js                  seed demo accounts if the database has no users
//   node scripts/seed.js --demo-progress  re-create sample progress for the demo (@example.com) accounts only;
//                                         every other account and its progress is left untouched
//   node scripts/seed.js --reset          WIPE every account and all progress, then seed (destructive)
const C = require('../server/curriculum');
const A = require('../server/auth');
const P = require('../server/progress');

const DEMO = {
  admin: { email: 'admin@example.com', name: 'Dwight Santos', password: 'AdminDemo!2026' },
  learnerPassword: 'LearnerDemo!2026',
  learners: [
    { key: 'alex', email: 'alex.rivera@example.com', name: 'Alex Rivera', created: 35, login: 0 },
    { key: 'sam', email: 'sam.chen@example.com', name: 'Sam Chen', created: 10, login: 0 },
    { key: 'morgan', email: 'morgan.lee@example.com', name: 'Morgan Lee', created: 28, login: 1 },
    { key: 'priya', email: 'priya.patel@example.com', name: 'Priya Patel', created: 30, login: 14 }
  ],
  invite: { email: 'jordan.kim@example.com', name: 'Jordan Kim' }
};
const DEMO_EMAILS = [DEMO.admin.email, DEMO.invite.email].concat(DEMO.learners.map((l) => l.email));

function ensureUsers(db, ago, now) {
  const get = (email) => db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!get(DEMO.admin.email)) {
    db.prepare("INSERT INTO users (email,name,role,password_hash,created_at,last_login_at) VALUES (?,?,'admin',?,?,?)")
      .run(DEMO.admin.email, DEMO.admin.name, A.hashPassword(DEMO.admin.password), ago(40), ago(0, 2));
  }
  const ids = { admin: get(DEMO.admin.email) };
  DEMO.learners.forEach((l) => {
    if (!get(l.email)) db.prepare("INSERT INTO users (email,name,role,password_hash,created_at,last_login_at) VALUES (?,?,'learner',?,?,?)")
      .run(l.email, l.name, A.hashPassword(DEMO.learnerPassword), ago(l.created), ago(l.login, 3));
    ids[l.key] = get(l.email).id;
  });
  let token = null;
  const inv = get(DEMO.invite.email);
  if (!inv || !inv.password_hash) {
    token = A.randomToken();
    if (inv) db.prepare('UPDATE users SET invite_token_hash=?, invite_expires_at=? WHERE id=?').run(A.sha256(token), new Date(now + 14 * 86400000).toISOString(), inv.id);
    else db.prepare("INSERT INTO users (email,name,role,invite_token_hash,invite_expires_at,created_at) VALUES (?,?,'learner',?,?,?)")
      .run(DEMO.invite.email, DEMO.invite.name, A.sha256(token), new Date(now + 14 * 86400000).toISOString(), ago(2));
  }
  return { ids, token };
}

function clearDemoProgress(db) {
  const ids = db.prepare(`SELECT id FROM users WHERE email IN (${DEMO_EMAILS.map(() => '?').join(',')})`).all(...DEMO_EMAILS).map((r) => r.id);
  ids.forEach((id) => {
    ['quiz_attempts', 'quiz_sessions', 'lesson_completions', 'checkoffs', 'hour_logs'].forEach((t) => db.prepare(`DELETE FROM ${t} WHERE user_id=?`).run(id));
  });
  return ids.length;
}

// Writes the sample progress. Times are relative to `now` so the weekly report always has a live week.
function seedProgress(db, ids, now) {
  const ago = (days, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString();
  const day = (days) => ago(days).slice(0, 10);
  const admin = { id: ids.admin.id, name: ids.admin.name, role: 'admin' };
  const lessons = (mid) => C.modulesById[mid].lessons.map((l) => l.id);
  const study = (uid, mid, startDays) => lessons(mid).forEach((id, i) => P.markStudied(db, uid, id, ago(startDays - i * 0.3)));
  const quiz = (uid, kind, ref, wrong, at) => {
    const pick = P.pickQuestions(kind, kind === 'module' ? { moduleId: ref } : { lessonId: ref });
    const answers = {};
    pick.questionIds.forEach((id, i) => { const q = C.questionsById[id]; answers[id] = i < pick.questionIds.length - wrong ? q.answer : (q.answer + 1) % q.options.length; });
    return P.recordAttempt(db, uid, { id: null, kind, module_id: pick.moduleId, lesson_id: pick.lessonId, question_ids: JSON.stringify(pick.questionIds) }, answers, at);
  };
  const sign = (uid, itemId, status, days, note) => P.signCheckoff(db, { userId: uid, moduleId: itemId.split('-')[0], itemId, status,
    performedOn: day(days), note, signer: admin, when: ago(days, -2) });
  const signAll = (uid, mid, days, note) => C.modulesById[mid].checkoffs.forEach((c, i) => sign(uid, c.id, 'pass', days - i * 0.2, note));
  const hours = (uid, mid, h, days, note, byAdmin) => P.logHours(db, { userId: uid, moduleId: mid, hours: h, workDate: day(days), note,
    logger: byAdmin ? admin : { id: uid, role: 'learner' }, when: ago(days, -8) });
  const completeModule = (uid, mid, days, opts = {}) => {
    study(uid, mid, days + 1);
    quiz(uid, 'module', mid, opts.wrong || 0, ago(days, 2));
    signAll(uid, mid, days, opts.note || 'Meets checklist.');
    hours(uid, mid, C.modulesById[mid].hours, days, 'Module ' + C.modulesById[mid].number + ' classroom + bench time');
  };

  // Alex — ahead: Phase 1 done, Phase 2 well under way, started hands-on soldering this week.
  const alex = ids.alex;
  completeModule(alex, 'm1', 30); completeModule(alex, 'm2', 29);
  quiz(alex, 'module', 'm3', 1, ago(27)); hours(alex, 'm3', 4, 27, 'Tested out — review only'); // test-out at 80%+
  signAll(alex, 'm3', 26, 'Worksheet and calculator drills complete.');
  study(alex, 'm4', 25); quiz(alex, 'module', 'm4', 0, ago(24));
  sign(alex, 'm4-pa1', 'fail', 24, 'Measured current with leads in the voltage jack on one reading — repeat.');
  C.modulesById.m4.checkoffs.forEach((c) => sign(alex, c.id, 'pass', 22, 'All 10 measurements within tolerance.'));
  hours(alex, 'm4', 10, 23, 'DMM/PSU bench');
  completeModule(alex, 'm5', 16, { wrong: 1 });
  study(alex, 'm6', 6); quiz(alex, 'module', 'm6', 2, ago(5, 4)); quiz(alex, 'module', 'm6', 1, ago(3, 2));
  sign(alex, 'm6-lab1', 'pass', 3, 'Mesh/nodal predictions within 2%.'); sign(alex, 'm6-lab2', 'pass', 2, 'Bridge balanced.');
  hours(alex, 'm6', 12, 4, 'Network analysis labs'); hours(alex, 'm6', 4, 2, 'Bridge lab');
  P.markStudied(db, alex, lessons('m15')[0], ago(1, 5));
  sign(alex, 'm15-lab1', 'pass', 1, 'Iron tinning and temperature check done correctly.'); hours(alex, 'm15', 6, 1, 'Soldering bench intro', true);

  // Sam — new hire: failed the safety quiz once (100% required), passed the retake this week; ESD done.
  const sam = ids.sam;
  study(sam, 'm1', 7); quiz(sam, 'module', 'm1', 1, ago(6, 1)); quiz(sam, 'module', 'm1', 0, ago(4, 2));
  C.modulesById.m1.checkoffs.slice(0, 3).forEach((c) => sign(sam, c.id, 'pass', 3, 'Walkthrough complete.'));
  sign(sam, 'm1-pa1', 'fail', 3, 'Skipped the verify-zero-energy step — retrain and repeat.');
  study(sam, 'm2', 3); quiz(sam, 'module', 'm2', 0, ago(2, 3)); signAll(sam, 'm2', 2, 'Wrist strap and mat checks logged.');
  quiz(sam, 'module', 'm3', 3, ago(1, 2)); // test-out attempt below 80% (study skipped)
  hours(sam, 'm1', 8, 4, 'Safety orientation'); hours(sam, 'm2', 4, 2, 'ESD'); hours(sam, 'm3', 3, 1, 'Math refresher');

  // Morgan — steady: Phase 1 complete, working through DC fundamentals this week.
  const morgan = ids.morgan;
  completeModule(morgan, 'm1', 24); completeModule(morgan, 'm2', 22); completeModule(morgan, 'm3', 18, { wrong: 2 });
  completeModule(morgan, 'm4', 10);
  P.markStudied(db, morgan, lessons('m5')[0], ago(3, 2)); P.markStudied(db, morgan, lessons('m5')[1], ago(1, 2));
  quiz(morgan, 'lesson', lessons('m5')[1], 0, ago(1, 1));
  hours(morgan, 'm5', 6, 3, 'Ohm’s law labs'); hours(morgan, 'm5', 5, 1, 'Series/parallel');

  // Priya — safety quiz passed but practical sign-offs outstanding; nothing this week.
  const priya = ids.priya;
  study(priya, 'm1', 20); quiz(priya, 'module', 'm1', 0, ago(18));
  P.markStudied(db, priya, lessons('m3')[0], ago(15)); P.markStudied(db, priya, lessons('m3')[1], ago(14));
  hours(priya, 'm1', 6, 18, 'Safety classroom'); hours(priya, 'm3', 3, 14, 'Notation');
}

function seedDemo(db, { now = Date.now() } = {}) {
  const ago = (days, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString();
  const tx = db.transaction(() => {
    const { ids, token } = ensureUsers(db, ago, now);
    clearDemoProgress(db);
    seedProgress(db, ids, now);
    return token;
  });
  return { inviteToken: tx(), demo: DEMO };
}

module.exports = { seedDemo, clearDemoProgress, DEMO, DEMO_EMAILS };

if (require.main === module) {
  if ((process.env.NODE_ENV === 'production' || process.env.NO_DEMO === '1') && !process.argv.includes('--force-demo')) {
    console.error('Refusing to seed demo data: NODE_ENV=production or NO_DEMO=1 (this would add demo accounts, and --reset wipes everyone).');
    process.exit(1);
  }
  const { openDb } = require('../server/db');
  const db = openDb();
  if (process.argv.includes('--reset')) {
    db.exec('DELETE FROM quiz_attempts; DELETE FROM quiz_sessions; DELETE FROM lesson_completions; DELETE FROM checkoffs; DELETE FROM hour_logs; DELETE FROM sessions; DELETE FROM users;');
  } else if (!process.argv.includes('--demo-progress') && db.prepare('SELECT COUNT(*) n FROM users').get().n > 0) {
    console.log('Database already has users. Use --demo-progress to refresh demo progress only, or --reset to wipe and reseed.'); process.exit(0);
  }
  const r = seedDemo(db);
  console.log(`Seeded demo progress into ${db.dbPath} (demo @example.com accounts only).`);
  if (r.inviteToken) console.log(`Pending invite for ${DEMO.invite.email}: /#/invite/${r.inviteToken}`);
}
