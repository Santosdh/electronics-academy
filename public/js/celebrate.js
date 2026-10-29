/*
 * Module-complete celebrations — window.VOLT_CELEBRATE.
 *
 * Effects A–E are lifted from artist's concepts in public/demo/celebrations.html (design and code credit: artist):
 *   A neon fireworks (canvas particles), B glitch banner, C circuit power-up chip, D Volt victory lap, E scope pulse.
 * E: a trace sweeps across the top, spikes, and the spike opens into the banner (here carrying B's text).
 * Adapted for the app: retimed to < 2.5 s (phase finale ≈ 4 s), phase colour from --guide-phase-N, the live Volt avatar
 * is cloned for the victory lap, tap / click / Esc skips, reduced motion gets a calm fade, and nothing plays when the
 * learner has switched "Lightning effects" off in Volt's ⋯ menu.
 *
 * Called by guide.js (checkMilestones → celebrate) — this replaces the old confetti hook.
 *   play({ kind: 'module' | 'safety' | 'phase', id, phase, label, title, line, sub })
 * Every module completion: banner B + ONE of A/C/D/E, rotated by module number (so consecutive modules always differ,
 * and never the same effect twice in a row). Phase completion: the finale — everything at once, every trace lit.
 */
(function () {
  'use strict';
  var ORDER = ['fireworks', 'circuit', 'volt', 'scope'];
  var MODULE_MS = 2400, FINALE_MS = 4000, CALM_MS = 1800;
  var PAL = ['#00f0ff', '#ff2bd6', '#f9f871', '#a259ff', '#39ff88'];
  var LAST_KEY = 'ea.celebrate.last';
  var C = window.VOLT_CELEBRATE = { speed: 1, runs: [], last: null, play: play, skip: skip, effectFor: effectFor,
    active: function () { return !!cur; }, ORDER: ORDER, lineFor: lineFor };
  var cur = null;

  function k() { return 1 / (C.speed || 1); }
  function ms(n) { return n * k(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enabled() { return !(window.EA_GUIDE && typeof window.EA_GUIDE.effects === 'function' && !window.EA_GUIDE.effects()); }
  function phaseColor(n) {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--guide-phase-' + n).trim();
    return v || PAL[(n - 1) % 4];
  }
  function modOf(id) { var CUR = window.CURRICULUM; return (CUR && CUR.modulesById && CUR.modulesById[id]) || null; }
  function phaseOfModule(M) { if (!M) return 1; if (M.track === 'advanced' || !M.phase) return 4; return Math.min(4, Math.max(1, +M.phase || 1)); }
  function labelOf(M) { return M ? (M.track === 'advanced' ? 'A' : 'M') + M.number : ''; }

  // Seeded by module id: core modules rotate by number, advanced ones are offset so A1 ≠ M1. Never repeats the previous effect.
  function effectFor(id, prev) {
    var M = modOf(id), n = M ? +M.number : 0;
    if (!M) { n = 0; String(id || '').split('').forEach(function (ch) { n += ch.charCodeAt(0); }); }
    var i = (n + (M && M.track === 'advanced' ? 2 : 0)) % ORDER.length;
    if (prev && ORDER[i] === prev) i = (i + 1) % ORDER.length;
    return ORDER[i];
  }
  function lastEffect() { try { return localStorage.getItem(LAST_KEY); } catch (e) { return null; } }
  function rememberEffect(e) { try { localStorage.setItem(LAST_KEY, e); } catch (x) { /* private mode */ } }

  // Victory-lap line: guide-lines.json `celebrate` for the module, else a line built from the module title.
  function lineFor(id) {
    var M = modOf(id), g = window.EA_GUIDE;
    var custom = g && typeof g.celebrateLine === 'function' ? g.celebrateLine(id) : null;
    if (custom) return custom;
    if (!M) return 'NICE WORK!';
    var t = String(M.title || '').split(/[:(—–]/)[0].trim();
    return t ? t + ': locked in. ⚡' : 'NICE WORK!';
  }

  // ---------------- overlay ----------------
  function mount(spec, color, calm) {
    var r = document.createElement('div');
    r.className = 'cel-root' + (calm ? ' cel-calm' : ''); r.setAttribute('data-kind', spec.kind);
    r.style.setProperty('--c', color); r.style.setProperty('--cel-ms', Math.round(1000 * k()) + 'ms');
    r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite');
    r.innerHTML = '<span class="cel-sr">' + esc(spec.sr || '') + '</span><span class="cel-skip" aria-hidden="true">tap · esc to skip</span>';
    document.body.appendChild(r);
    return r;
  }
  function layer(r, cls, html) { var d = document.createElement('div'); d.className = 'cel-layer ' + (cls || ''); d.innerHTML = html; r.appendChild(d); return d; }

  // B. glitch banner (artist)
  function banner(r, spec) {
    layer(r, '', '<div class="cel-banner"><small>' + esc(spec.kicker) + '</small><b>' + esc(spec.big) + '</b>' +
      (spec.sub ? '<em>' + esc(spec.sub) + '</em>' : '') + '</div>');
  }
  // C. circuit power-up (artist). `all` = finale: every trace lights up.
  function circuit(r, spec, all) {
    var W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2 + H * 0.09, h = 75;
    var ps = [[0, H * .3, cx - 200, H * .3, cx - 200, cy, cx - h, cy], [W, H * .85, cx + 220, H * .85, cx + 220, cy, cx + h, cy],
      [W * .28, H, W * .28, cy + 150, cx - 30, cy + 150, cx - 30, cy + h], [W * .72, H, W * .72, cy + 170, cx + 30, cy + 170, cx + 30, cy + h]];
    if (all) ps = ps.concat([[0, H * .62, cx - 140, H * .62, cx - 140, cy + 40, cx - h, cy + 40], [W, H * .45, cx + 150, H * .45, cx + 150, cy - 40, cx + h, cy - 40],
      [W * .1, H, W * .1, H * .78, cx - 60, H * .78, cx - 60, cy + h], [W * .9, H, W * .9, H * .7, cx + 60, H * .7, cx + 60, cy + h],
      [0, H * .95, W * .2, H * .95, W * .2, cy - 20, cx - h, cy - 20], [W, cy, W * .85, cy, W * .85, cy + 20, cx + h, cy + 20]]);
    var d = ps.map(function (p, i) { return '<path style="animation-delay:calc(var(--cel-ms) * ' + (i % 4) * .05 + ')" d="M' + p[0] + ' ' + p[1] + ' L' + p[2] + ' ' + p[3] + ' L' + p[4] + ' ' + p[5] + ' L' + p[6] + ' ' + p[7] + '"/>'; }).join('');
    var dots = ps.map(function (p) { return '<circle cx="' + p[2] + '" cy="' + p[3] + '" r="5"/><circle cx="' + p[4] + '" cy="' + p[5] + '" r="5"/>'; }).join('');
    layer(r, 'cel-fx-circuit', '<div class="cel-circuit"><svg class="cel-traces" aria-hidden="true">' + d + dots + '</svg><div class="cel-chip"><span>' + esc(spec.chip) + '</span><i>ONLINE</i></div></div>');
  }
  // D. Volt victory lap (artist) — clones the live avatar (artist's AVATAR SVG) so Volt looks exactly like Volt.
  var VOLT_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><polygon class="g-halo" points="32,4 58,19 58,49 32,64 6,49 6,19"/><line class="g-antenna" x1="32" y1="20" x2="32" y2="11"/><path class="g-bolt" d="M34 0 L27 9 H31.5 L29 15 L37 6 H32.5 Z"/><polygon class="g-ear" points="10,30 4,34 4,44 10,48"/><polygon class="g-ear" points="54,30 60,34 60,44 54,48"/><path class="g-head" d="M19 20 H45 L54 29 V47 L45 56 H19 L10 47 V29 Z"/><path class="g-trace" d="M19 20 V25 H24 M45 20 V25 H40 M19 56 V52 H26 M45 56 V52 H38"/><path class="g-face" d="M15 30 H49 L46 47 H18 Z"/><g class="g-eyes"><ellipse cx="25.5" cy="36" rx="3.6" ry="1.6"/><ellipse cx="38.5" cy="36" rx="3.6" ry="1.6"/></g><path class="g-mouth" d="M27.5 41 Q32 46 36.5 41 Z"/><rect class="g-cheek" x="18" y="40.5" width="3" height="1.6"/><rect class="g-cheek" x="43" y="40.5" width="3" height="1.6"/></svg>';
  function volt(r, spec, fw) {
    var live = document.querySelector('#guideAvatar svg');
    var svg = live ? live.outerHTML.replace(/\sid="[^"]*"/g, '') : VOLT_SVG;
    layer(r, 'cel-fx-volt', '<div class="cel-volt-wrap"><div class="cel-volt">' + svg + '</div><div class="cel-volt-say">' + esc(spec.line || 'NICE WORK!') + '</div></div>');
    timer(function () { fw.burst(innerWidth / 2, innerHeight / 2 + innerHeight * .09, spec.color); }, ms(1050));
  }
  // E. scope pulse (artist, public/demo/celebrations.html): a trace sweeps across the top on a graticule, spikes in the middle,
  // and the spike opens out into the banner. Here the banner it opens into is B's text (MODULE COMPLETE · Mx UNLOCKED).
  function scope(r, spec) {
    var W = innerWidth, H = innerHeight * .4, mid = H * .55, cx = W / 2, pts = [], g = '', x, i;
    for (x = 0; x <= W; x += 6) { var y = mid + Math.sin(x / 38) * H * .06, d = Math.abs(x - cx); if (d < 60) y = mid - (1 - d / 60) * (mid - H * .08); pts.push(x.toFixed(0) + ',' + y.toFixed(1)); }
    for (i = 1; i < 10; i++) g += '<line class="grat" x1="' + W * i / 10 + '" y1="0" x2="' + W * i / 10 + '" y2="' + H + '"/>';
    for (i = 1; i < 5; i++) g += '<line class="grat" x1="0" y1="' + H * i / 5 + '" x2="' + W + '" y2="' + H * i / 5 + '"/>';
    var l = layer(r, 'cel-fx-scope', '<div class="cel-scope" style="--sy:calc(8vh + ' + (H * .08).toFixed(0) + 'px)"><svg class="cel-scope-trace" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + g +
      '<polyline class="sig" pathLength="1" points="' + pts.join(' ') + '"/></svg>' +
      '<div class="cel-scope-banner cel-banner-e"><small>' + esc(spec.kicker) + '</small><b>' + esc(spec.big) + '</b>' + (spec.sub ? '<em>' + esc(spec.sub) + '</em>' : '') + '</div></div>');
    return l;
  }
  // A. neon fireworks (artist's canvas particle system, frame-rate independent and scaled by speed)
  function fireworksEngine(r) {
    var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); r.insertBefore(cv, r.firstChild);
    var ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, parts = [], raf = 0, last = 0, color = PAL[0], stopped = false;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    function burst(x, y, c) { var n = innerWidth < 600 ? 60 : 90; for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = 2 + Math.random() * 5; parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 38 + Math.random() * 22, c: Math.random() < .6 ? (c || color) : PAL[i % 5] }); } go(); }
    function rocket(c) { color = c || color; var x = innerWidth * (.15 + Math.random() * .7), ty = innerHeight * (.25 + Math.random() * .3); parts.push({ x: x, y: innerHeight, vx: 0, vy: -(innerHeight - ty) / 22, l: 22, c: '#fff', rk: 1 }); go(); }
    function go() { if (!raf && !stopped) { last = 0; raf = requestAnimationFrame(loop); } }
    function loop(t) {
      raf = 0; if (stopped) return;
      var dt = last ? Math.min(3, (t - last) / 16.67) : 1; last = t; dt /= k();
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,' + Math.min(.6, .2 * dt).toFixed(3) + ')'; ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter'; var born = [];
      parts = parts.filter(function (p) {
        p.x += p.vx * dt; p.y += p.vy * dt; if (!p.rk) { p.vy += .07 * dt; p.vx *= Math.pow(.985, dt); p.vy *= Math.pow(.985, dt); } p.l -= dt;
        if (p.rk && p.l <= 0) { born.push(p); return false; }
        ctx.fillStyle = p.c;   // glow halo + core (cheaper than shadowBlur, which stalls software-rendered canvases)
        ctx.globalAlpha = .28; ctx.fillRect(p.x - 2.5, p.y - 2.5, p.rk ? 8 : 7.5, p.rk ? 13 : 7.5);
        ctx.globalAlpha = 1; ctx.fillRect(p.x, p.y, p.rk ? 3 : 2.5, p.rk ? 8 : 2.5); return p.l > 0;
      });
      born.forEach(function (p) { burst(p.x, p.y, color); });
      if (parts.length) raf = requestAnimationFrame(loop); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    return { burst: burst, rocket: rocket, count: function () { return parts.length; }, stop: function () { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; } };
  }
  function fireworks(fw, n, c) { for (var i = 0; i < n; i++) (function (i) { timer(function () { fw.rocket(c); }, ms(i * 170)); })(i); }

  // ---------------- lifecycle ----------------
  function timer(fn, t) { if (!cur) return; var id = setTimeout(function () { if (cur) fn(); }, t); cur.timers.push(id); }
  function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); skip('esc'); } }
  function onTap(e) { e.preventDefault(); e.stopPropagation(); skip(e.type === 'touchstart' ? 'tap' : 'click'); }
  function finish(how) {
    if (!cur) return; var c = cur; cur = null;
    c.timers.forEach(clearTimeout); if (c.fw) c.fw.stop();
    document.removeEventListener('keydown', onKey, true);
    c.run.endedBy = how; c.run.ms = Date.now() - c.t0;
    if (c.root.parentNode) c.root.parentNode.removeChild(c.root);
    document.dispatchEvent(new CustomEvent('ea:celebrate-end', { detail: c.run }));
  }
  function skip(how) { finish(how || 'skip'); }

  function play(spec) {
    spec = spec || {};
    if (!enabled()) { C.last = { kind: spec.kind, effect: 'none', reason: 'effects-off', id: spec.id }; C.runs.push(C.last); return C.last; }
    if (cur) finish('replaced');
    var M = modOf(spec.id), phase = spec.phase || phaseOfModule(M), color = spec.color || phaseColor(phase);
    var label = spec.label || labelOf(M), calm = reduced(), kind = spec.kind || 'module';
    var s = { kind: kind, color: color, line: spec.line || lineFor(spec.id), chip: label || ('P' + phase) };
    if (kind === 'phase') { s.kicker = '// PHASE ' + phase + ' COMPLETE'; s.big = 'PHASE ' + phase + ' ONLINE'; s.sub = spec.title || ''; s.chip = 'P' + phase; }
    else if (kind === 'safety') { s.kicker = '// MODULE COMPLETE · LEVEL 0 CLEARED'; s.big = 'M15–M20 UNLOCKED'; s.sub = spec.sub || 'Safety & ESD ✓ · hands-on modules open'; }
    else { s.kicker = '// MODULE COMPLETE'; s.big = (label || 'MODULE') + ' UNLOCKED'; s.sub = spec.sub || ((spec.title || (M && M.title) || '') + ' ✓'); }
    s.sr = s.kicker.replace('// ', '') + ': ' + s.big + '. ' + (s.sub || '');
    var effect = kind === 'phase' ? 'finale' : effectFor(spec.id || kind, lastEffect());
    if (calm) effect = 'calm';
    var total = calm ? CALM_MS : (kind === 'phase' ? FINALE_MS : MODULE_MS);
    var root = mount({ kind: kind, sr: s.sr }, color, calm);
    var run = { kind: kind, id: spec.id || null, phase: phase, effect: effect, line: s.line, big: s.big, calm: calm, at: Date.now(), color: color };
    cur = { root: root, timers: [], t0: Date.now(), run: run, fw: null };
    C.last = run; C.runs.push(run);
    root.setAttribute('data-effect', effect);
    root.addEventListener('click', onTap); root.addEventListener('touchstart', onTap, { passive: false });
    document.addEventListener('keydown', onKey, true);

    if (calm) {
      layer(root, '', '<div class="cel-glow"></div>'); banner(root, s);
    } else if (effect === 'finale') {
      root.style.setProperty('--cel-out', '3.4'); root.classList.add('cel-finale');
      cur.fw = fireworksEngine(root);
      scope(root, s); circuit(root, s, true);
      timer(function () { fireworks(cur.fw, innerWidth < 600 ? 6 : 9, color); }, ms(900));
      timer(function () { volt(root, s, cur.fw); }, ms(1300));
    } else {
      if (effect === 'scope') scope(root, s);   // E's banner grows out of the spike
      else banner(root, s);
      if (effect === 'fireworks') { cur.fw = fireworksEngine(root); fireworks(cur.fw, innerWidth < 600 ? 3 : 4, color); }
      else if (effect === 'circuit') circuit(root, s, false);
      else if (effect === 'volt') { cur.fw = fireworksEngine(root); volt(root, s, cur.fw); }
      rememberEffect(effect);
    }
    timer(function () { root.classList.add('cel-out'); }, ms(total - 300));
    timer(function () { finish('done'); }, ms(total));
    document.dispatchEvent(new CustomEvent('ea:celebrate', { detail: run }));
    return run;
  }
})();
