// First-boot admin bootstrap (production). If the database has no usable admin and ADMIN_EMAIL is set, create that admin
// with NO password and an invite link (valid 14 days), and log exactly one line:
//   ADMIN INVITE: <PUBLIC_URL or relative>/#/invite/<token>
// Idempotent: once any admin has set a password, it does nothing. While the bootstrap admin is still pending it does not
// mint a new link on every boot (the earlier one stays valid); it only issues a fresh one after the old link has expired.
// To get a new link at any time: `node scripts/admin-invite.js <email>` (e.g. from the Render shell).
const { issueInvite } = require('./app');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inviteUrl(path, publicUrl) { return (publicUrl ? String(publicUrl).trim().replace(/\/+$/, '') : '') + path; }

function bootstrapAdmin(db, opts) {
  const o = opts || {};
  const log = o.log || console.log;
  const email = String(o.email || '').trim().toLowerCase();
  const name = String(o.name || '').trim() || email.split('@')[0];
  if (!email) return { action: 'none', reason: 'ADMIN_EMAIL not set' };
  if (!EMAIL_RE.test(email)) { log(`ADMIN_EMAIL "${email}" is not a valid email address; no admin created.`); return { action: 'none', reason: 'invalid email' }; }
  if (db.prepare("SELECT 1 FROM users WHERE role='admin' AND password_hash IS NOT NULL").get()) return { action: 'none', reason: 'admin exists' };

  const now = new Date().toISOString();
  let u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  let action;
  if (!u) {
    db.prepare("INSERT INTO users (email,name,role) VALUES (?,?,'admin')").run(email, name);
    u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    action = 'created';
  } else {
    if (u.role !== 'admin') db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id);
    if (u.invite_token_hash && u.invite_expires_at > now) {
      log(`ADMIN INVITE: already issued for ${email} (valid until ${u.invite_expires_at}); see the first-boot log line, or run: node scripts/admin-invite.js ${email}`);
      return { action: 'pending', userId: u.id };
    }
    action = u.role !== 'admin' ? 'promoted' : 'reissued';
  }
  const inv = issueInvite(db, u.id);
  const url = inviteUrl(inv.path, o.publicUrl);
  log(`ADMIN INVITE: ${url}`);
  return { action, userId: u.id, url, expiresAt: inv.expires };
}

module.exports = { bootstrapAdmin, inviteUrl };
