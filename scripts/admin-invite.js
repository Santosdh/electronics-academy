// Print a fresh invite / password-reset link for an existing user (the old password keeps working until the link is used).
//   node scripts/admin-invite.js someone@company.com        (uses DB_PATH and PUBLIC_URL from the environment)
const { openDb } = require('../server/db');
const { issueInvite } = require('../server/app');
const { inviteUrl } = require('../server/bootstrap');
const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: node scripts/admin-invite.js email'); process.exit(1); }
const db = openDb();
const u = db.prepare('SELECT id, role FROM users WHERE email=?').get(email);
if (!u) { console.error(`No user ${email} in ${db.dbPath}`); process.exit(1); }
const inv = issueInvite(db, u.id);
console.log(`INVITE (${u.role}, valid until ${inv.expires}): ${inviteUrl(inv.path, process.env.PUBLIC_URL)}`);
