const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SESSION_DAYS = 7;
const COOKIE = 'ea_sid';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');

function hashPassword(pw) { return bcrypt.hashSync(pw, 10); }
function checkPassword(pw, hash) { return !!hash && bcrypt.compareSync(pw, hash); }

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function createSession(db, userId) {
  const token = randomToken();
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 86400000);
  db.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(sha256(token), userId, now.toISOString(), exp.toISOString());
  db.prepare('UPDATE users SET last_login_at=? WHERE id=?').run(now.toISOString(), userId);
  return { token, expires: exp };
}

// Sessions are opaque random 256-bit tokens; only their SHA-256 is stored, so no signing secret is needed.
// Cookies are always HttpOnly + SameSite=Lax; Secure in production (behind Render's HTTPS proxy, see `trust proxy`)
// or whenever the request itself arrived over HTTPS.
const isProd = () => process.env.NODE_ENV === 'production';
const cookieSecure = (req) => isProd() || !!(req && req.secure);
function setSessionCookie(req, res, token, expires) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${cookieSecure(req) ? '; Secure' : ''}`);
}
function clearSessionCookie(res, req) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecure(req) ? '; Secure' : ''}`); }

function sessionMiddleware(db) {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    req.user = null;
    if (token) {
      const row = db.prepare(`SELECT u.id, u.email, u.name, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash=?`).get(sha256(token));
      if (row && row.expires_at > new Date().toISOString()) {
        req.user = { id: row.id, email: row.email, name: row.name, role: row.role };
        req.sessionTokenHash = sha256(token);
      }
    }
    next();
  };
}

const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please sign in.' });
const requireAdmin = (req, res, next) => !req.user ? res.status(401).json({ error: 'Please sign in.' })
  : req.user.role !== 'admin' ? res.status(403).json({ error: 'Admins only.' }) : next();

// Tiny in-memory login throttle: 10 failed attempts per IP+email per 15 minutes.
const fails = new Map();
function loginThrottled(key) {
  const now = Date.now(), rec = fails.get(key);
  if (!rec || now - rec.first > 15 * 60000) return false;
  return rec.count >= 10;
}
function noteFailure(key) {
  const now = Date.now(), rec = fails.get(key);
  if (!rec || now - rec.first > 15 * 60000) fails.set(key, { first: now, count: 1 }); else rec.count++;
}
function clearFailures(key) { fails.delete(key); }

module.exports = { hashPassword, checkPassword, createSession, setSessionCookie, clearSessionCookie, sessionMiddleware,
  requireAuth, requireAdmin, sha256, randomToken, loginThrottled, noteFailure, clearFailures };
