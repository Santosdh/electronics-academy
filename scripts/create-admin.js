// Create (or promote) an admin account.  node scripts/create-admin.js "Full Name" email@company.com 'password'
const { openDb } = require('../server/db');
const A = require('../server/auth');
const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password || password.length < 8) { console.error('Usage: node scripts/create-admin.js "Full Name" email password(8+ chars)'); process.exit(1); }
const db = openDb();
const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
if (existing) db.prepare("UPDATE users SET role='admin', name=?, password_hash=?, invite_token_hash=NULL WHERE id=?").run(name, A.hashPassword(password), existing.id);
else db.prepare("INSERT INTO users (email,name,role,password_hash) VALUES (?,?,'admin',?)").run(email.toLowerCase(), name, A.hashPassword(password));
console.log(`${existing ? 'Updated' : 'Created'} admin ${email} in ${db.dbPath}`);
