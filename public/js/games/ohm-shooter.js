/* Ohm's Law Shooter — game engine + view (DOM, no canvas).
 *
 * ART: the look comes from the cartoon art kit — public/css/game-cartoon.css (.gc-* classes) + public/img/game/*.svg.
 * This file only builds the .gc-* DOM the kit documents and toggles its state classes; it never names an image.
 *   Stage   .gc-stage (+ .gc-shake / .gc-flash-wrong, replayed)            HUD  .gc-hud > .gc-lives > .gc-heart(.is-empty/.is-lost)
 *           .gc-streak(.is-bump/.is-hot/.is-zero) · .gc-level(.is-up) · .gc-score(.is-bump)
 *   Problem .gc-problem > .gc-problem-tag + .gc-problem-eq > .gc-term.gc-v|.gc-a|.gc-ohm + .gc-ask
 *   Target  button.gc-target.gc-v|.gc-a|.gc-ohm > span — positioned each frame with --x/--y (px); .is-hit / .is-wrong
 *           Power answers (W) have no bubble of their own: they reuse the yellow .gc-v bubble with a "W" tab (.osg-unit-w, games.css).
 *   Volt    .gc-volt.is-idle|is-shoot|is-hit|is-miss — moved between lanes with `left`; bolts spawn at 88% / 12% of its box
 *   Bolt    .gc-bolt.gc-fly (--x, --y, --fly, --fly-dur)                   Pops .gc-pop.gc-pop-right|-wrong · .gc-plus / .gc-minus
 * Game-only parts the kit doesn't cover keep .osg-* hooks (styled in games.css): .osg-hint (Volt's one-line tip), .osg-banner,
 * .osg-panel / .osg-card (start / pause / game over), .osg-bar (sound + pause buttons). Every .gc element also carries an .osg-* hook.
 * The kit's CSS is detected via GET /api/games/ohms-shooter/art and linked on demand. Without it (or with ?art=placeholder in the
 * hash, or window.OHM_SHOOTER_ART = { css: null }) the same DOM gets a plain fallback look from games.css and Volt's guide SVG.
 * Effects: the "Lightning effects" toggle and prefers-reduced-motion switch data-fx="reduced": no bolt flight, pops, shake or loops.
 * Tests: window.OHM_SHOOTER → { speed, config:{hitsPerLevel, seed}, state(), problem(), targets(), hit(label), start(), pause(), lastSubmitted, saved }
 */
(function () {
  'use strict';
  var O = window.OhmProblems, GAME = O.GAME;
  var UNIT_CLASS = { A: 'gc-a', V: 'gc-v', 'Ω': 'gc-ohm', W: 'gc-v osg-unit-w' };
  var UNIT_KEY = { A: 'a', V: 'v', 'Ω': 'ohm', W: 'w' };
  var TAG = { I: 'Find the current', V: 'Find the voltage', R: 'Find the resistance', P: 'Find the power' };
  var LANES = 4;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var HOOK = window.OHM_SHOOTER = window.OHM_SHOOTER || {};
  HOOK.speed = HOOK.speed || 1;                 // test/capture time multiplier
  HOOK.config = HOOK.config || {};              // e.g. { hitsPerLevel: 3, seed: 42 }

  function fallSeconds(level) { return level <= 4 ? [0, 10, 9, 8.5, 8][level] : Math.max(4.5, 8 - 0.5 * (level - 4)); }
  function mult(streak) { return Math.min(5, 1 + Math.floor(streak / 3)); }
  function unitSym(label) { var u = label.split(' ')[1] || ''; return u.slice(-1); }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function effectsOn() { return !(window.EA_GUIDE && window.EA_GUIDE.effects && window.EA_GUIDE.effects() === false); }
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  // ---------- optional sound (off by default) ----------
  var Sound = {
    on: false, ctx: null,
    init: function () { try { this.on = localStorage.getItem('osg-sound') === '1'; } catch (e) { this.on = false; } },
    set: function (on) { this.on = !!on; try { localStorage.setItem('osg-sound', on ? '1' : '0'); } catch (e) { /* ignore */ } },
    beep: function (kind) {
      if (!this.on) return;
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var ctx = this.ctx = this.ctx || new C(), t = ctx.currentTime;
        var seq = { zap: [[880, 0.05, 'sawtooth']], good: [[660, 0.07, 'square'], [990, 0.1, 'square']], bad: [[220, 0.18, 'sawtooth']], level: [[523, 0.08, 'square'], [659, 0.08, 'square'], [784, 0.14, 'square']], over: [[330, 0.15, 'triangle'], [220, 0.3, 'triangle']] }[kind] || [];
        seq.forEach(function (s) {
          var o = ctx.createOscillator(), g = ctx.createGain(); o.type = s[2]; o.frequency.value = s[0];
          g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + s[1]);
          o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + s[1]); t += s[1];
        });
      } catch (e) { /* sound is optional */ }
    }
  };
  Sound.init();

  // ---------- art kit ----------
  function loadArt(api) {
    if (/[?&]art=placeholder\b/.test(location.hash)) return Promise.resolve({ css: null });
    if (window.OHM_SHOOTER_ART) return Promise.resolve(window.OHM_SHOOTER_ART);
    if (!api) return Promise.resolve({ css: null });
    return api('GET', '/games/' + GAME.id + '/art').catch(function () { return { css: null }; });
  }
  function linkCss(href) {
    return new Promise(function (resolve) {
      var l = document.getElementById('osg-art-css');
      if (l) { l.disabled = false; if (l.sheet) resolve(true); else { l.addEventListener('load', function () { resolve(true); }); l.addEventListener('error', function () { resolve(false); }); } return; }
      l = document.createElement('link'); l.id = 'osg-art-css'; l.rel = 'stylesheet'; l.href = href;
      l.onload = function () { resolve(true); }; l.onerror = function () { resolve(false); };
      document.head.appendChild(l);
      setTimeout(function () { resolve(!!l.sheet); }, 4000);
    });
  }

  // ---------- game ----------
  function mount(el, opts) {
    opts = opts || {};
    var api = opts.api;
    var hitsPerLevel = HOOK.config.hitsPerLevel || GAME.hitsPerLevel;
    var rng = HOOK.config.seed ? O.makeRng(HOOK.config.seed) : Math.random;
    var G = { status: 'ready', level: 1, score: 0, lives: GAME.lives, streak: 0, correct: 0, wrong: 0, levelHits: 0, lane: 1,
      problem: null, targets: [], resolving: false, shooting: false, playMs: 0, best: 0, plays: 0, result: null, nextAt: 0 };
    var raf = 0, last = 0, destroyed = false, hintTimer = 0, poseTimer = 0, lastMult = 1, lastScore = 0;

    el.innerHTML =
      '<div class="osg" data-state="ready" data-art="loading" tabindex="-1">' +
      '<div class="gc-stage osg-stage">' +
        '<div class="gc-hud osg-hud">' +
          '<div class="gc-hud-group"><div class="gc-lives osg-lives"></div>' +
            '<div class="gc-streak osg-streak is-zero" title="Streak multiplier"><i class="gc-streak-icon"></i><b class="osg-mult">x1</b></div></div>' +
          '<div class="gc-hud-group"><div class="gc-level osg-level" aria-live="polite"><small>LVL</small><b class="osg-level-n">1</b></div>' +
            '<div class="gc-score osg-score" aria-label="Score"><small>Score</small><b class="osg-score-n">0</b></div></div>' +
        '</div>' +
        '<div class="gc-problem osg-prompt" aria-live="polite"></div>' +
        '<div class="gc-playfield osg-field"></div>' +
        '<div class="gc-volt osg-volt is-idle" role="img" aria-label="Volt"></div>' +
        '<div class="osg-hint" role="status" hidden></div>' +
        '<div class="osg-banner" hidden></div>' +
        '<div class="osg-panel"></div>' +
      '</div>' +
      '<div class="osg-bar"><button type="button" class="osg-btn osg-sound" aria-pressed="false" title="Sound (off by default)"></button>' +
        '<p class="osg-keys">Tap a bubble · or <kbd>←</kbd> <kbd>→</kbd> + <kbd>Space</kbd> · <kbd>P</kbd> pause</p>' +
        '<button type="button" class="osg-btn osg-pause" title="Pause (P)" aria-label="Pause">⏸</button></div>' +
      '</div>';
    var root = el.querySelector('.osg'), stage = root.querySelector('.osg-stage'), field = root.querySelector('.osg-field'),
      voltEl = root.querySelector('.osg-volt'), hintEl = root.querySelector('.osg-hint'), promptEl = root.querySelector('.osg-prompt'),
      panel = root.querySelector('.osg-panel'), banner = root.querySelector('.osg-banner'), livesEl = root.querySelector('.osg-lives'),
      levelEl = root.querySelector('.osg-level'), levelN = root.querySelector('.osg-level-n'), scoreBox = root.querySelector('.osg-score'),
      scoreEl = root.querySelector('.osg-score-n'), streakEl = root.querySelector('.osg-streak'), multEl = root.querySelector('.osg-mult'),
      soundBtn = root.querySelector('.osg-sound'), pauseBtn = root.querySelector('.osg-pause');

    function fxMode() { return effectsOn() && !reducedMotion() ? 'full' : 'reduced'; }
    function full() { return fxMode() === 'full'; }
    function syncFx() { root.setAttribute('data-fx', fxMode()); }
    syncFx();
    function syncSound() { soundBtn.textContent = Sound.on ? '🔊' : '🔇'; soundBtn.setAttribute('aria-pressed', Sound.on ? 'true' : 'false'); soundBtn.setAttribute('aria-label', Sound.on ? 'Sound on' : 'Sound off'); }
    syncSound();
    function later(fn, ms) { return setTimeout(function () { if (!destroyed) fn(); }, ms / Math.max(0.25, HOOK.speed)); }

    // --- art ---
    function applyArt(cartoon) {
      var link = document.getElementById('osg-art-css'); if (link) link.disabled = !cartoon;   // ?art=placeholder after a cartoon game in the same tab
      root.setAttribute('data-art', cartoon ? 'cartoon' : 'placeholder');
      voltEl.innerHTML = cartoon ? '' : ((window.EA_GUIDE && window.EA_GUIDE.avatar && window.EA_GUIDE.avatar()) || '<span class="osg-volt-fallback">⚡</span>');
      layout();
    }
    function pose(p, ms) {
      ['is-idle', 'is-shoot', 'is-hit', 'is-miss'].forEach(function (c) { voltEl.classList.remove(c); });
      void voltEl.offsetWidth; voltEl.classList.add('is-' + p); voltEl.setAttribute('data-mood', p);
      clearTimeout(poseTimer); if (ms) poseTimer = later(function () { pose('idle'); }, ms);
    }

    // --- HUD ---
    function renderHud(lostIndex) {
      var h = '';
      for (var i = 0; i < GAME.lives; i++) h += '<i class="gc-heart osg-heart' + (i < G.lives ? ' is-full' : ' is-empty') + '"></i>';
      livesEl.innerHTML = h; livesEl.setAttribute('aria-label', G.lives + ' of ' + GAME.lives + ' lives');
      if (lostIndex != null && livesEl.children[lostIndex]) { var hl = livesEl.children[lostIndex]; hl.classList.remove('is-empty'); if (full()) replay(hl, 'is-lost'); else hl.classList.add('is-empty'); }
      levelN.textContent = G.level; levelEl.title = O.LEVELS[Math.min(G.level, 5)].name;
      scoreEl.textContent = G.score.toLocaleString('en-US');
      if (G.score > lastScore && full()) replay(scoreBox, 'is-bump');
      lastScore = G.score;
      var m = mult(G.streak);
      multEl.textContent = 'x' + m;
      streakEl.classList.toggle('is-zero', G.streak === 0); streakEl.classList.toggle('is-hot', m >= 3);
      if (m > lastMult && full()) replay(streakEl, 'is-bump');
      lastMult = m;
    }

    // --- layout (px, relative to the stage) ---
    var L = {};
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight, vw = voltEl.offsetWidth || 110, vh = voltEl.offsetHeight || 128;
      var probBottom = promptEl.offsetTop + promptEl.offsetHeight;
      L = { W: W, H: H, voltW: vw, voltH: vh, voltTop: voltEl.offsetTop || (H - vh), top: probBottom,
        size: Math.round(Math.max(64, Math.min(96, W / LANES - 10))), laneX: function (l) { return (l + 0.5) * W / LANES; } };
      L.ground = L.voltTop + vh * 0.25;          // a correct bubble that sinks to Volt's head is missed
      root.style.setProperty('--osg-size', L.size + 'px'); stage.style.setProperty('--volt-h', vh + 'px');
      field.style.clipPath = 'inset(' + Math.max(0, L.top - 6) + 'px -40px 0 -40px)';   // bubbles slide out from under the problem card
      placeVolt(); G.targets.forEach(position);
    }
    function voltCenter(lane) {   // line Volt's raised fist (88% of his box) up under the lane, kept on screen
      var c = L.laneX(lane) - 0.38 * L.voltW;
      return Math.max(L.voltW * 0.42, Math.min(L.W - L.voltW * 0.5, c));
    }
    function placeVolt() { if (L.W) voltEl.style.left = voltCenter(G.lane) + 'px'; placeHint(); }
    function placeHint() {   // over Volt, but kept inside the stage
      if (!L.W || hintEl.hidden) return; var hw = hintEl.offsetWidth / 2 + 8;
      hintEl.style.left = Math.max(hw, Math.min(L.W - hw, voltCenter(G.lane))) + 'px';
    }

    // --- rounds ---
    function problemHtml(p) {
      var terms = p.givens.map(function (g) { return '<span class="gc-term ' + (UNIT_CLASS[unitSym(g.label)] || '') + '">' + esc(g.sym) + ' = ' + esc(g.label) + '</span>'; }).join('');
      return '<span class="gc-problem-tag">' + esc(TAG[p.ask] || 'Solve') + '</span><div class="gc-problem-eq" aria-label="' + esc(p.prompt) + '">' + terms +
        '<span class="gc-ask">' + esc(p.ask) + ' = ?</span></div>';
    }
    function newRound() {
      clearTargets();
      var p = G.problem = O.generate(G.level, rng);
      promptEl.innerHTML = problemHtml(p);
      if (full()) replay(promptEl, 'osg-new');
      layout();
      var lanes = [0, 1, 2, 3];
      for (var i = 3; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), x = lanes[i]; lanes[i] = lanes[j]; lanes[j] = x; }
      p.options.forEach(function (o, i) {
        var u = unitSym(o.label), b = document.createElement('button');
        b.type = 'button'; b.className = 'gc-target osg-target ' + (UNIT_CLASS[u] || 'gc-v') + (o.label.length > 6 ? ' osg-long' : '');
        b.setAttribute('data-unit', UNIT_KEY[u] || 'x');
        b.style.setProperty('--wobble-delay', (-rng() * 2.4).toFixed(2) + 's');
        b.innerHTML = '<span class="osg-target-label">' + esc(o.label) + '</span>';
        b.setAttribute('aria-label', 'Shoot ' + o.label);
        field.appendChild(b);
        var t = { el: b, opt: o, lane: lanes[i], y: L.top - L.size * 1.3 - rng() * L.H * 0.1, alive: true };
        G.targets.push(t); position(t);
      });
      G.resolving = false;
    }
    function position(t) { t.el.style.setProperty('--x', L.laneX(t.lane) + 'px'); t.el.style.setProperty('--y', t.y + 'px'); }
    function clearTargets() { G.targets.forEach(function (t) { t.el.remove(); }); G.targets = []; }
    function retire(t, cls, ms) {
      t.alive = false; t.el.disabled = true; if (cls) replay(t.el, cls);
      later(function () { t.el.remove(); }, full() ? (ms || 420) : 160);
    }
    function scheduleNext(ms) { G.resolving = true; G.nextAt = G.playMs + ms; }
    function center(t) { return { x: L.laneX(t.lane), y: t.y + L.size / 2 }; }

    function showHint(text) {
      if (!text) return;
      hintEl.textContent = text; hintEl.hidden = false; placeHint();
      clearTimeout(hintTimer); hintTimer = later(function () { hintEl.hidden = true; }, 2800);
    }
    function showBanner(html, ms) { banner.innerHTML = html; banner.hidden = false; later(function () { banner.hidden = true; }, ms); }
    function spawn(cls, x, y, text, ms) {
      var e = document.createElement('span'); e.className = cls; e.style.setProperty('--x', x + 'px'); e.style.setProperty('--y', y + 'px');
      if (text) e.textContent = text;
      stage.appendChild(e); later(function () { e.remove(); }, ms || 900); return e;
    }

    function shoot(t) {
      if (G.status !== 'playing' || G.resolving || G.shooting) return;
      if (t && !t.alive) return;
      if (t) { G.lane = t.lane; placeVolt(); }
      pose('shoot', 380); Sound.beep('zap');
      var x = L.laneX(G.lane), y0 = L.voltTop + L.voltH * 0.12;
      if (!t) { if (full()) bolt(x, y0, L.top, 260); return; }
      t.shot = true;
      var c = center(t);
      if (!full()) { resolve(t); return; }
      var flyMs = Math.max(120, Math.min(260, (y0 - c.y) * 0.45));
      G.shooting = true;
      bolt(x, y0, c.y, flyMs);
      later(function () { G.shooting = false; if (!G.resolving && t.alive && (G.status === 'playing' || G.status === 'paused')) resolve(t); }, flyMs);
    }
    function bolt(x, y0, y1, flyMs) {
      var b = document.createElement('span'); b.className = 'gc-bolt osg-bolt';
      b.style.setProperty('--x', x + 'px'); b.style.setProperty('--y', (y0 - 20) + 'px');
      b.style.setProperty('--fly', Math.min(0, y1 - y0) + 'px'); b.style.setProperty('--fly-dur', (flyMs / 1000 / Math.max(0.25, HOOK.speed)) + 's');
      field.appendChild(b); void b.offsetWidth; b.classList.add('gc-fly');
      later(function () { b.remove(); }, flyMs + 60);
    }
    function resolve(t) {
      var c = center(t);
      if (t.opt.correct) {
        G.streak++; G.correct++; G.levelHits++;
        var pts = 100 * G.level * mult(G.streak); G.score += pts;
        retire(t, 'is-hit');
        G.targets.forEach(function (o) { if (o.alive) retire(o, 'osg-gone'); });
        if (full()) { spawn('gc-pop gc-pop-right osg-pop is-right', c.x, c.y, '', 800); spawn('gc-plus osg-plus', c.x, c.y - 34, '+' + pts, 1000); }
        pose('hit', 750); Sound.beep('good'); hintEl.hidden = true;
        var up = G.levelHits >= hitsPerLevel;
        if (up) {
          G.level++; G.levelHits = 0; Sound.beep('level');
          var LV = O.LEVELS[Math.min(G.level, 5)];
          showBanner('<b>Level ' + G.level + '</b><span>' + esc(LV.name) + '</span>', 1500);
          if (full()) replay(levelEl, 'is-up');
        }
        renderHud(); scheduleNext(up ? 1500 : 500);
      } else {
        G.wrong++; G.streak = 0;
        retire(t, 'is-wrong', 520);
        if (full()) { spawn('gc-pop gc-pop-wrong osg-pop is-wrong', c.x, c.y, '', 850); spawn('gc-minus osg-minus', c.x, c.y - 34, '-1 ♥', 1000); }
        pose('miss', 800); Sound.beep('bad');
        showHint(t.opt.hint);
        hurt();
        loseLife();
      }
    }
    function missed(t) {
      G.streak = 0; G.wrong++;
      retire(t, 'osg-gone');
      G.targets.forEach(function (o) { if (o.alive) retire(o, 'osg-gone'); });
      pose('miss', 800); Sound.beep('bad'); hurt();
      showHint('Missed it! ' + G.problem.answer + '. ' + G.problem.hint);
      if (loseLife()) scheduleNext(1400);
    }
    function hurt() { if (full()) { replay(stage, 'gc-shake'); replay(stage, 'gc-flash-wrong'); later(function () { stage.classList.remove('gc-shake', 'gc-flash-wrong'); }, 700); } else replay(stage, 'osg-hurt-still'); }
    function loseLife() {
      G.lives--; renderHud(G.lives);
      if (G.lives <= 0) { gameOver(); return false; }
      return true;
    }

    // --- loop ---
    function frame(now) {
      if (destroyed) return;
      if (!document.body.contains(root)) { destroy(); return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000) * HOOK.speed; last = now;
      if (G.status === 'playing') {
        G.playMs += dt * 1000;
        var v = (L.ground - L.top + L.size * 1.3) / fallSeconds(G.level);
        if (G.resolving) { if (G.playMs >= G.nextAt) newRound(); }
        else G.targets.forEach(function (t) {
          if (!t.alive) return;
          if (!t.shot) { t.y += v * dt; position(t); }
          if (!t.shot && t.y + L.size >= L.ground) { if (t.opt.correct) missed(t); else retire(t, 'osg-gone'); }
        });
      }
      raf = requestAnimationFrame(frame);
    }

    // --- states ---
    function setStatus(s) { G.status = s; root.setAttribute('data-state', s); document.body.classList.toggle('osg-playing', s === 'playing' || s === 'paused'); }
    function panelHtml(kind) {
      if (kind === 'ready') return '<div class="osg-card"><h2>' + GAME.icon + ' ' + esc(GAME.title) + '</h2><p>Shoot the right answer. ' + GAME.lives + ' lives.</p>' +
        '<p class="osg-best">' + (G.plays ? 'Best <b>' + G.best + '</b> · ' + G.plays + ' play' + (G.plays === 1 ? '' : 's') : 'First play!') + '</p>' +
        '<button type="button" class="btn osg-start">▶ Start</button></div>';
      if (kind === 'paused') return '<div class="osg-card"><h2>Paused</h2><button type="button" class="btn osg-resume">▶ Resume</button> <button type="button" class="btn ghost osg-quit">End game</button></div>';
      var r = G.result || {};
      return '<div class="osg-card osg-over"><h2>Game over</h2><p class="osg-final"><b>' + G.score + '</b> pts · level ' + G.level + '</p>' +
        (r.newBest ? '<p class="osg-newbest">★ New best!</p>' : '') +
        '<p class="osg-best">' + (r.saving ? 'Saving…' : r.error ? 'Couldn’t save: ' + esc(r.error) : 'Best <b>' + G.best + '</b> · ' + G.plays + ' play' + (G.plays === 1 ? '' : 's')) + '</p>' +
        (r.lessonCredited ? '<p class="osg-credit">✓ Ohm’s Law lesson marked studied</p>' : '') +
        '<button type="button" class="btn osg-start">↻ Play again</button>' + (opts.backHref ? ' <a class="btn ghost" href="' + esc(opts.backHref) + '">' + esc(opts.backLabel || 'Back') + '</a>' : '') + '</div>';
    }
    function showPanel(kind) { panel.innerHTML = kind ? panelHtml(kind) : ''; panel.hidden = !kind; }
    function start() {
      G.level = 1; G.score = 0; G.lives = GAME.lives; G.streak = 0; G.correct = 0; G.wrong = 0; G.levelHits = 0; G.lane = 1; G.playMs = 0; G.result = null; G.shooting = false;
      lastScore = 0; lastMult = 1;
      setStatus('playing'); showPanel(null); hintEl.hidden = true; renderHud(); pose('idle');
      showBanner('<b>Level 1</b><span>' + esc(O.LEVELS[1].name) + '</span>', 1200);
      newRound(); root.focus({ preventScroll: true });
    }
    function pause(on) {
      if (on && G.status === 'playing') { setStatus('paused'); showPanel('paused'); }
      else if (!on && G.status === 'paused') { setStatus('playing'); showPanel(null); last = 0; }
    }
    function gameOver() {
      setStatus('over'); clearTargets(); Sound.beep('over');
      G.result = { saving: true }; showPanel('over');
      var body = { score: G.score, level: G.level, correct: G.correct, wrong: G.wrong, durationMs: Math.round(G.playMs) };
      HOOK.lastSubmitted = body;
      (api ? api('POST', '/games/' + GAME.id + '/plays', body) : Promise.reject(new Error('offline')))
        .then(function (s) { G.best = s.best; G.plays = s.plays; G.result = { newBest: s.newBest, lessonCredited: s.lessonCredited }; if (s.lessonCredited && opts.onCredit) opts.onCredit(s.lessonCredited); })
        .catch(function (e) { G.result = { error: e.message || 'error' }; })
        .then(function () { if (!destroyed && G.status === 'over') showPanel('over'); HOOK.saved = G.result; });
    }

    // --- input ---
    function targetFromEl(n) { for (var i = 0; i < G.targets.length; i++) if (G.targets[i].el === n) return G.targets[i]; return null; }
    function onPointer(e) {
      var b = e.target.closest && e.target.closest('.osg-target');
      if (!b || G.status !== 'playing') return;
      e.preventDefault(); shoot(targetFromEl(b));
    }
    function onClick(e) {
      var s = e.target.closest && e.target.closest('button');
      if (!s || !root.contains(s)) return;
      if (s.classList.contains('osg-start')) start();
      else if (s.classList.contains('osg-resume')) pause(false);
      else if (s.classList.contains('osg-quit')) { setStatus('playing'); gameOver(); }
      else if (s === pauseBtn) pause(G.status === 'playing');
      else if (s === soundBtn) { Sound.set(!Sound.on); syncSound(); Sound.beep('good'); }
      else if (s.classList.contains('osg-target') && e.detail === 0) shoot(targetFromEl(s)); // keyboard Enter on a focused bubble
    }
    function onKey(e) {
      if (destroyed || !document.body.contains(root)) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var k = e.key;
      if ((k === 'p' || k === 'P' || k === 'Escape') && (G.status === 'playing' || G.status === 'paused')) { e.preventDefault(); pause(G.status === 'playing'); return; }
      if (G.status !== 'playing') { if ((k === ' ' || k === 'Enter') && G.status !== 'paused' && document.activeElement === root) { e.preventDefault(); start(); } return; }
      if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); G.lane = Math.max(0, G.lane - 1); placeVolt(); }
      else if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); G.lane = Math.min(LANES - 1, G.lane + 1); placeVolt(); }
      else if (k === ' ' || k === 'ArrowUp' || k === 'w') {
        if (e.target && e.target.classList && e.target.classList.contains('osg-target') && k === ' ') return; // native button activation
        e.preventDefault();
        var inLane = G.targets.filter(function (t) { return t.alive && t.lane === G.lane && t.y + L.size > L.top; }).sort(function (a, b) { return b.y - a.y; })[0];
        shoot(inLane || null);
      }
    }
    function onVis() { if (document.hidden) pause(true); }
    function onFx() { syncFx(); }
    field.addEventListener('pointerdown', onPointer);
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('ea:guide-fx', onFx);
    window.addEventListener('resize', layout);
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq && mq.addEventListener) mq.addEventListener('change', onFx);

    function destroy() {
      if (destroyed) return; destroyed = true; cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('ea:guide-fx', onFx); window.removeEventListener('resize', layout);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onFx);
      document.body.classList.remove('osg-playing');
      if (HOOK.instance === inst) HOOK.instance = null;
    }

    renderHud(); showPanel('ready');
    promptEl.innerHTML = '<span class="gc-problem-tag">Ohm’s law</span><div class="gc-problem-eq"><span class="gc-term gc-v">V</span>=<span class="gc-term gc-a">I</span>×<span class="gc-term gc-ohm">R</span></div>';
    loadArt(api).then(function (a) { return a && a.css ? linkCss(a.css) : false; }).then(function (ok) { if (!destroyed) applyArt(!!ok); });
    if (api) api('GET', '/games/' + GAME.id + '/stats').then(function (s) { G.best = s.best; G.plays = s.plays; if (G.status === 'ready') showPanel('ready'); }).catch(function () { /* offline is fine */ });
    layout();
    raf = requestAnimationFrame(frame);

    var inst = {
      root: root, start: start, pause: pause, destroy: destroy,
      state: function () { return { status: G.status, level: G.level, score: G.score, lives: G.lives, streak: G.streak, mult: mult(G.streak), correct: G.correct, wrong: G.wrong, lane: G.lane, resolving: G.resolving, shooting: G.shooting, best: G.best, plays: G.plays, result: G.result, fx: fxMode(), sound: Sound.on, art: root.getAttribute('data-art') }; },
      problem: function () { return G.problem && { prompt: G.problem.prompt, answer: G.problem.answer, kind: G.problem.kind, options: G.problem.options.map(function (o) { return { label: o.label, correct: o.correct, mistake: o.mistake }; }) }; },
      targets: function () { return G.targets.filter(function (t) { return t.alive; }).map(function (t) { return { label: t.opt.label, correct: t.opt.correct, lane: t.lane, y: t.y }; }); },
      hit: function (label) { var t = G.targets.filter(function (x) { return x.alive && x.opt.label === label; })[0]; if (t) shoot(t); return !!t; }
    };
    HOOK.instance = inst;
    ['state', 'problem', 'targets', 'hit', 'start', 'pause'].forEach(function (k) { HOOK[k] = function () { return HOOK.instance && HOOK.instance[k].apply(null, arguments); }; });
    return inst;
  }

  window.OhmShooter = { mount: mount, GAME: GAME };
})();
