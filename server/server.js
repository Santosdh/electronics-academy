// Entry point: node server/server.js   (PORT defaults to 4321; Render sets PORT)
const { openDb } = require('./db');
const { createApp } = require('./app');
const { bootstrapAdmin } = require('./bootstrap');

const db = openDb();
const userCount = db.prepare('SELECT COUNT(*) n FROM users').get().n;
if (userCount === 0 && process.env.NO_DEMO !== '1') {
  require('../scripts/seed').seedDemo(db);
  console.log('Empty database: seeded demo accounts (see README.md). Set NO_DEMO=1 to skip.');
}
bootstrapAdmin(db, { email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, publicUrl: process.env.PUBLIC_URL });

const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '0.0.0.0';
const server = createApp(db).listen(PORT, HOST, () =>
  console.log(`Electronics Academy running on port ${PORT}${process.env.NODE_ENV === 'production' ? ' (production)' : ` — http://localhost:${PORT}`}  (db: ${db.dbPath})`));

// Render (and Ctrl+C) send SIGTERM/SIGINT: stop accepting requests, then close SQLite cleanly (flushes the WAL).
let stopping = false;
function shutdown(sig) {
  if (stopping) return; stopping = true;
  console.log(`${sig} received, shutting down`);
  server.close(() => { try { db.close(); } catch (e) { /* already closed */ } process.exit(0); });
  setTimeout(() => { try { db.close(); } catch (e) { /* ignore */ } process.exit(0); }, 8000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
