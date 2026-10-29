// SQLite database setup (better-sqlite3, synchronous API) with versioned migrations.
//   v1 — level-based progress (Electronics Academy v1)
//   v2 — curriculum restructure: module-based progress, practical check-offs, hours log.
//        v1 progress tables are kept as legacy_v1_* (nothing is dropped); lesson completions are
//        carried over because lesson ids are unchanged. Users and sessions are untouched.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 4;

const USERS = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','learner')) DEFAULT 'learner',
  password_hash TEXT,                 -- NULL until an invite is accepted
  invite_token_hash TEXT,
  invite_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);`;

const PROGRESS_V2 = `
CREATE TABLE IF NOT EXISTS lesson_completions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('study','test-out')),
  completed_at TEXT NOT NULL,
  quiz_attempt_id INTEGER,            -- the test-out attempt that granted it
  PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- module | lesson | testout-lesson | defect-practice
  module_id TEXT NOT NULL,
  lesson_id TEXT,
  question_ids TEXT NOT NULL,         -- JSON array (question ids, or the defect-exercise layout)
  created_at TEXT NOT NULL,
  submitted_at TEXT
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES quiz_sessions(id),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  module_id TEXT NOT NULL,
  lesson_id TEXT,
  mode TEXT,                          -- module tests: 'test' (all lessons studied first) or 'test-out'
  required_percent REAL,              -- pass mark that applied to this attempt
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percent REAL NOT NULL,
  passed INTEGER NOT NULL,
  answers TEXT,                       -- JSON {questionId: chosenIndex}
  detail TEXT,                        -- JSON extra result data (defect exercise)
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkoffs (   -- practical / lab sign-offs (history; latest row per item wins)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass','fail')),
  performed_on TEXT NOT NULL,         -- YYYY-MM-DD the practical was performed
  note TEXT,
  standard TEXT,                      -- the pass standard it was judged against (snapshot)
  signed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hour_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),
  work_date TEXT NOT NULL,            -- YYYY-MM-DD
  note TEXT,
  logged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  logger_role TEXT NOT NULL CHECK (logger_role IN ('admin','learner')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_completions_user ON lesson_completions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_checkoffs_user ON checkoffs(user_id, module_id, item_id, signed_at);
CREATE INDEX IF NOT EXISTS idx_hours_user ON hour_logs(user_id, work_date);
`;

// v3: the in-app guide's per-user state (purely additive; no existing rows are touched).
const GUIDE_V3 = `
CREATE TABLE IF NOT EXISTS guide_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  collapsed INTEGER NOT NULL DEFAULT 0,
  dismissed INTEGER NOT NULL DEFAULT 0,
  tour_done INTEGER NOT NULL DEFAULT 0,
  milestones TEXT,                    -- JSON list of milestone ids already celebrated
  updated_at TEXT NOT NULL
);
`;

// v4: per-user "Lightning effects" switch for the guide (column added in place; defaults to on, existing rows untouched).
function guideV4(db) {
  if (!db.prepare('PRAGMA table_info(guide_state)').all().some((c) => c.name === 'fx_enabled')) db.exec('ALTER TABLE guide_state ADD COLUMN fx_enabled INTEGER NOT NULL DEFAULT 1');
}

const hasTable = (db, t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
const columns = (db, t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);

function migrate(db) {
  const version = db.pragma('user_version', { simple: true });
  if (version >= SCHEMA_VERSION) { db.exec(PROGRESS_V2); db.exec(GUIDE_V3); guideV4(db); return { from: version, to: version, migrated: false }; }
  if (version === 2 || version === 3) { // v2/v3 → v4: add the guide table and/or its effects column only
    db.transaction(() => { db.exec(PROGRESS_V2); db.exec(GUIDE_V3); guideV4(db); db.pragma(`user_version = ${SCHEMA_VERSION}`); })();
    return { from: version, to: SCHEMA_VERSION, migrated: true, carriedLessons: 0, legacyAttempts: 0 };
  }
  const v1 = hasTable(db, 'lesson_completions') && columns(db, 'lesson_completions').includes('level_id');
  const stats = { from: v1 ? 1 : 0, to: SCHEMA_VERSION, migrated: true, carriedLessons: 0, legacyAttempts: 0 };
  db.pragma('foreign_keys = OFF');
  const run = db.transaction(() => {
    if (v1) {
      db.exec(`ALTER TABLE quiz_attempts RENAME TO legacy_v1_quiz_attempts;
               ALTER TABLE quiz_sessions RENAME TO legacy_v1_quiz_sessions;
               ALTER TABLE lesson_completions RENAME TO legacy_v1_lesson_completions;
               DROP INDEX IF EXISTS idx_attempts_user; DROP INDEX IF EXISTS idx_completions_user;`);
    }
    db.exec(PROGRESS_V2);
    db.exec(GUIDE_V3);
    guideV4(db);
    if (v1) {
      const C = require('./curriculum');
      const ins = db.prepare('INSERT OR IGNORE INTO lesson_completions (user_id,lesson_id,module_id,method,completed_at) VALUES (?,?,?,?,?)');
      db.prepare('SELECT * FROM legacy_v1_lesson_completions').all().forEach((r) => {
        const ls = C.lessonsById[r.lesson_id];
        if (ls && ins.run(r.user_id, r.lesson_id, ls.moduleId, r.method, r.completed_at).changes) stats.carriedLessons++;
      });
      stats.legacyAttempts = db.prepare('SELECT COUNT(*) n FROM legacy_v1_quiz_attempts').get().n;
    }
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  });
  run();
  db.pragma('foreign_keys = ON');
  return stats;
}

function openDb(file) {
  const dbPath = file || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'academy.db');
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(USERS);
  db.migration = migrate(db);
  db.dbPath = dbPath;
  return db;
}

module.exports = { openDb, migrate, SCHEMA_VERSION };
