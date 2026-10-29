// "Spirit guide" companion: per-user guide state + optional per-module guide lines.
// Guide lines are read from curriculum-source/guide-lines.json (override with GUIDE_LINES_PATH) when that file exists;
// the browser falls back to its own defaults (public/js/guide.js) for anything missing.
const fs = require('fs');
const path = require('path');

const LINES_PATH = () => process.env.GUIDE_LINES_PATH || path.join(__dirname, '..', 'curriculum-source', 'guide-lines.json');
const MAX_MILESTONES = 300;

function rowToState(r) {
  let milestones = null;
  if (r && r.milestones) { try { milestones = JSON.parse(r.milestones); } catch (e) { milestones = null; } }
  return {
    collapsed: !!(r && r.collapsed), dismissed: !!(r && r.dismissed), tourDone: !!(r && r.tour_done),
    effects: r ? r.fx_enabled !== 0 : true, // "Lightning effects" (bolt + burst on module/lesson clicks)
    milestones: Array.isArray(milestones) ? milestones : null, // null = never initialised (first visit)
    updatedAt: r ? r.updated_at : null
  };
}
function getState(db, userId) { return rowToState(db.prepare('SELECT * FROM guide_state WHERE user_id=?').get(userId)); }

function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }
function setState(db, userId, patch) {
  patch = patch || {};
  const cur = getState(db, userId);
  const next = Object.assign({}, cur);
  ['collapsed', 'dismissed', 'tourDone', 'effects'].forEach((k) => {
    if (patch[k] === undefined) return;
    if (typeof patch[k] !== 'boolean') throw badRequest(k + ' must be true or false.');
    next[k] = patch[k];
  });
  if (patch.milestones !== undefined) {
    if (!Array.isArray(patch.milestones) || patch.milestones.length > MAX_MILESTONES ||
        !patch.milestones.every((m) => typeof m === 'string' && /^[a-z0-9:_-]{1,40}$/i.test(m))) throw badRequest('milestones must be a list of short ids.');
    next.milestones = Array.from(new Set(patch.milestones));
  }
  db.prepare(`INSERT INTO guide_state (user_id, collapsed, dismissed, tour_done, milestones, fx_enabled, updated_at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET collapsed=excluded.collapsed, dismissed=excluded.dismissed, tour_done=excluded.tour_done,
    milestones=excluded.milestones, fx_enabled=excluded.fx_enabled, updated_at=excluded.updated_at`)
    .run(userId, next.collapsed ? 1 : 0, next.dismissed ? 1 : 0, next.tourDone ? 1 : 0, next.milestones ? JSON.stringify(next.milestones) : null, next.effects ? 1 : 0, new Date().toISOString());
  return getState(db, userId);
}

// Accepts {"m1": {...}} or {"modules": {"m1": {...}}}; per module: intro (string), tips / mistakes / commonMistakes (string or list),
// celebrate (optional short string for the module-complete victory lap).
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).map((x) => str(x, 400)).filter(Boolean).slice(0, 8);
function normalizeLines(raw) {
  const src = raw && typeof raw === 'object' ? (raw.modules && typeof raw.modules === 'object' && !Array.isArray(raw.modules) ? raw.modules : raw) : {};
  const out = {};
  Object.keys(src).forEach((k) => {
    const id = String(k).trim().toLowerCase();
    if (!/^[ma]\d{1,2}$/.test(id)) return;
    const v = src[k];
    if (typeof v === 'string') { out[id] = { intro: str(v, 600), tips: [], mistakes: [], celebrate: null }; return; }
    if (!v || typeof v !== 'object') return;
    out[id] = { intro: str(v.intro || v.introduction || v.summary, 600), tips: list(v.tips),
      mistakes: list(v.mistakes || v.commonMistakes || v.common_mistakes || v['common mistakes']),
      // optional one-liner Volt shouts on its victory lap when the module is completed
      celebrate: str(v.celebrate || v.celebration, 140) };
  });
  return out;
}
let cache = { mtime: -1, file: null, lines: {} };
function loadLines() {
  const file = LINES_PATH();
  let st; try { st = fs.statSync(file); } catch (e) { return { source: null, lines: {} }; }
  if (cache.file !== file || cache.mtime !== st.mtimeMs) {
    let lines = {};
    try { lines = normalizeLines(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { console.warn('guide-lines.json could not be read:', e.message); }
    cache = { mtime: st.mtimeMs, file, lines };
  }
  return { source: path.basename(file), lines: cache.lines };
}

module.exports = { getState, setState, loadLines, normalizeLines };
