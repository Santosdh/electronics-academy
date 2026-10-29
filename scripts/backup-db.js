// Consistent online backup of the SQLite database (safe while the server is running).
//   node scripts/backup-db.js [out-file]     default: <db dir>/backup-<timestamp>.db   (uses DB_PATH)
const path = require('path');
const { openDb } = require('../server/db');
const db = openDb();
const out = process.argv[2] || path.join(path.dirname(db.dbPath), `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
db.backup(out).then(() => { console.log(`Backed up ${db.dbPath} → ${out}`); db.close(); })
  .catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
