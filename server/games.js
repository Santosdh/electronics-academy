// Lesson games: score storage (game_plays, schema v5) and art detection for swappable sprites.
const fs = require('fs');
const path = require('path');
const P = require('./progress');
const OHM = require('../public/js/games/ohm-problems');

const GAMES = { [OHM.GAME.id]: OHM.GAME };
const PUBLIC = path.join(__dirname, '..', 'public');
// Optional art set (made by the artist, not by the game code). Only files that exist are reported, so the client never
// requests a missing file. Drop-in: public/css/game-cartoon.css and public/img/game/<sprite>.svg.
const ART_CSS = 'css/game-cartoon.css';
// Sprite slots the shooter knows (public/img/game/<slot>.svg). Each has a fallback chain in ohm-shooter.js:
// volt-<mood> → volt-idle → volt · target-<a|v|ohm|w> → target · heart-full/empty → heart · pop-right/wrong → spark.
const SPRITES = ['volt', 'volt-idle', 'volt-shoot', 'volt-hit', 'volt-miss',
  'target', 'target-a', 'target-v', 'target-ohm', 'target-w',
  'bolt', 'heart', 'heart-full', 'heart-empty', 'spark', 'pop-right', 'pop-wrong', 'background', 'bg'];

function gameOf(id) {
  const g = GAMES[id];
  if (!g) throw P.httpError(404, 'Unknown game');
  return g;
}

function stats(db, userId, gameId) {
  const r = db.prepare('SELECT COUNT(*) plays, MAX(score) best, MAX(level) bestLevel FROM game_plays WHERE user_id=? AND game=?').get(userId, gameId);
  const last = db.prepare('SELECT score, level, created_at FROM game_plays WHERE user_id=? AND game=? ORDER BY id DESC LIMIT 1').get(userId, gameId);
  return { game: gameId, plays: r.plays, best: r.best || 0, bestLevel: r.bestLevel || 0, last: last ? { score: last.score, level: last.level, at: last.created_at } : null };
}

const int = (v) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);
function recordPlay(db, userId, gameId, body) {
  const g = gameOf(gameId);
  const b = body || {};
  const score = int(b.score), level = int(b.level), correct = int(b.correct ?? 0), wrong = int(b.wrong ?? 0), durationMs = int(b.durationMs ?? 0);
  if (!(score >= 0 && score <= 10000000)) throw P.httpError(400, 'Invalid score.');
  if (!(level >= 1 && level <= g.maxLevel)) throw P.httpError(400, 'Invalid level.');
  if (!(correct >= 0 && correct <= 10000) || !(wrong >= 0 && wrong <= 10000)) throw P.httpError(400, 'Invalid answer counts.');
  if (!(durationMs >= 0 && durationMs <= 6 * 3600 * 1000)) throw P.httpError(400, 'Invalid duration.');
  // A level is reached by hitting hitsPerLevel correct answers per earlier level; reject claims that don't add up.
  if (correct < (level - 1) * g.hitsPerLevel) throw P.httpError(400, 'Level does not match the number of correct answers.');
  db.prepare('INSERT INTO game_plays (user_id,game,score,level,correct,wrong,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(userId, g.id, score, level, correct, wrong, durationMs, new Date().toISOString());
  // Clearing level 3 (reaching level 4) counts as studying the Ohm's Law lesson — the same self-mark as
  // "Mark as studied". It never touches written tests or module completion rules; a locked module is skipped.
  let lessonCredited = null;
  if (g.creditLesson && level >= g.creditLevel) {
    const had = db.prepare('SELECT 1 FROM lesson_completions WHERE user_id=? AND lesson_id=?').get(userId, g.creditLesson);
    if (!had) {
      try { P.markStudied(db, userId, g.creditLesson); lessonCredited = g.creditLesson; } catch (e) { if (!e.status) throw e; }
    }
  }
  return Object.assign(stats(db, userId, g.id), { lessonCredited, newBest: score > 0 && db.prepare('SELECT COUNT(*) n FROM game_plays WHERE user_id=? AND game=? AND score>=?').get(userId, g.id, score).n === 1 });
}

function art() {
  const exists = (rel) => { try { return fs.statSync(path.join(PUBLIC, rel)).isFile(); } catch { return false; } };
  const sprites = {};
  SPRITES.forEach((s) => { const rel = `img/game/${s}.svg`; if (exists(rel)) sprites[s] = '/' + rel; });
  return { css: exists(ART_CSS) ? '/' + ART_CSS : null, sprites };
}

function list(db, userId) {
  return Object.values(GAMES).map((g) => ({ id: g.id, title: g.title, icon: g.icon, modules: g.modules, lessons: g.lessons, stats: stats(db, userId, g.id) }));
}

module.exports = { GAMES, stats, recordPlay, art, list, gameOf };
