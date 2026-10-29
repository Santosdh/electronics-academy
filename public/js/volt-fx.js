/* ==========================================================================
   Volt lightning effects (volt-fx.js)
   When a learner clicks/taps a module or lesson, Volt fires a jagged lightning
   bolt from its antenna to the chosen element; the element's outline flashes
   neon in its phase colour (--guide-phase-N) and then explodes into sparks,
   revealing the new page underneath.

   - Targets: dashboard phase cards / Level 0 module links / "Open module"
     buttons, Program module rows, lesson links on a module page (and prev/next
     lesson buttons), Advanced-track cards. Breadcrumbs are left alone.
   - Volt minimised → bolt still starts at the avatar. Volt hidden → bolt
     starts at the top-left logo.
   - Locked module → the bolt fizzles short, the outline flashes red, Volt says
     why, and there is no navigation.
   - prefers-reduced-motion → a quick outline fade (~150 ms) then navigation.
   - "Lightning effects: off" in Volt's ⋯ menu (saved per user) → plain links.
   - Navigation ALWAYS happens: it is scheduled up front with a failsafe timer,
     every step is wrapped in try/catch, and a guard prevents double navigation.
   Test hooks: window.VOLT_FX (speed factor, run counter, last run details).
   ========================================================================== */
(function () {
  'use strict';
  var SEL = 'a[href^="#/module/"], a[href^="#/lesson/"], a[href^="#/program?ph="]';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var T = { travel: 200, impact: 200, navigate: 470, total: 820, fade: 150, fizzle: 650 }; // ms at speed 1
  var FX = window.VOLT_FX = {
    speed: 1, runs: 0, navigations: 0, last: null, busy: false, selector: SEL,
    enabled: function () { return !window.EA_GUIDE || !window.EA_GUIDE.effects || window.EA_GUIDE.effects() !== false; },
    reducedMotion: function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  };
  var CUR = window.CURRICULUM;
  var pending = null; // { href, timers[], done }

  function ms(t) { return Math.max(0, t * (FX.speed > 0 ? 1 / FX.speed : 1)); }
  function prog() { try { return window.EA_APP && window.EA_APP.state().progress; } catch (e) { return null; } }
  function modStatus(id) {
    var p = prog(); if (!p || !p.summary) return null;
    var s = p.summary;
    return (s.modules || []).find(function (m) { return m.id === id; }) || ((s.advanced && s.advanced.modules) || []).find(function (m) { return m.id === id; }) || null;
  }
  function phaseOf(href) {
    try {
      var m = /^#\/module\/([\w-]+)/.exec(href), l = /^#\/lesson\/([\w-]+)/.exec(href), ph = /[?&]ph=p(\d)/.exec(href), M = null;
      if (ph) return +ph[1];
      if (m) M = CUR.modulesById[m[1]];
      else if (l && CUR.lessonsById[l[1]]) M = CUR.modulesById[CUR.lessonsById[l[1]].moduleId];
      if (!M) return 1;
      if (M.track === 'advanced' || !M.phase) return 4;
      return Math.min(4, Math.max(1, +M.phase || 1));
    } catch (e) { return 1; }
  }
  function targetFor(a) { return a.closest('.mod-row, .safety-list li') || a; }

  // ---------------- navigation (always happens, exactly once) ----------------
  function navigate(p) {
    if (!p || p.done) return;
    p.done = true; p.timers.forEach(clearTimeout);
    FX.busy = false; pending = null;
    try {
      FX.navigations++;
      if (location.hash === p.href) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = p.href;
    } catch (e) { location.href = p.href; }
  }
  // A different navigation (nav bar, back button…) while a bolt is in flight cancels ours.
  window.addEventListener('hashchange', function () {
    if (pending && !pending.done && location.hash !== pending.href) { pending.done = true; pending.timers.forEach(clearTimeout); pending = null; FX.busy = false; }
  });

  // ---------------- overlay helpers ----------------
  var layer = null;
  function overlay() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement('div'); layer.className = 'vfx-layer'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer); return layer;
  }
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; (parent || overlay()).appendChild(e); return e; }
  function later(p, fn, t) {
    var id = setTimeout(function () { try { fn(); } catch (e) { if (p) navigate(p); } }, ms(t));
    if (p) p.timers.push(id); return id;
  }
  function cleanup(nodes, t) { setTimeout(function () { nodes.forEach(function (n) { if (n && n.remove) n.remove(); }); }, ms(t)); }

  // Where the bolt starts: Volt's antenna tip (open or minimised), else the logo; null = no bolt.
  function origin() {
    var g = document.getElementById('guide');
    if (g && !g.hidden) {
      var ant = g.querySelector('.guide-avatar .g-bolt') || g.querySelector('.guide-avatar .g-antenna') || g.querySelector('.guide-avatar');
      var r = ant && ant.getBoundingClientRect();
      if (r && r.width + r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2, from: 'volt' };
    }
    var b = document.querySelector('.topbar .brand-icon') || document.querySelector('.topbar .brand');
    var rb = b && b.getBoundingClientRect();
    if (rb && rb.width + rb.height > 0) return { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2, from: 'logo' };
    return null;
  }
  // Jagged bolt by midpoint displacement.
  function boltPoints(x1, y1, x2, y2, rough) {
    var pts = [[x1, y1], [x2, y2]], len = Math.hypot(x2 - x1, y2 - y1), disp = Math.min(90, len * (rough || 0.22));
    for (var it = 0; it < 5; it++) {
      var next = [pts[0]];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, off = (Math.random() - 0.5) * disp;
        next.push([(a[0] + b[0]) / 2 - dy / d * off, (a[1] + b[1]) / 2 + dx / d * off], b);
      }
      pts = next; disp /= 2;
    }
    return pts;
  }
  function pathD(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '); }
  function drawBolt(o, tx, ty, cls, p, fraction) {
    var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'vfx-bolt ' + (cls || ''));
    svg.setAttribute('width', innerWidth); svg.setAttribute('height', innerHeight); svg.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
    var ex = o.x + (tx - o.x) * (fraction || 1), ey = o.y + (ty - o.y) * (fraction || 1);
    var main = boltPoints(o.x, o.y, ex, ey), d = pathD(main), paths = [];
    ['vfx-bolt-glow', 'vfx-bolt-core'].forEach(function (c) { var pe = document.createElementNS(SVGNS, 'path'); pe.setAttribute('class', c); pe.setAttribute('d', d); svg.appendChild(pe); paths.push(pe); });
    // a couple of forks
    for (var k = 0; k < 2; k++) {
      var at = main[Math.floor(main.length * (0.35 + 0.3 * Math.random()))], ang = Math.atan2(ey - o.y, ex - o.x) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6);
      var fl = Math.hypot(ex - o.x, ey - o.y) * (0.15 + Math.random() * 0.15);
      var f = document.createElementNS(SVGNS, 'path'); f.setAttribute('class', 'vfx-bolt-fork');
      f.setAttribute('d', pathD(boltPoints(at[0], at[1], at[0] + Math.cos(ang) * fl, at[1] + Math.sin(ang) * fl, 0.3))); svg.appendChild(f); paths.push(f);
    }
    overlay().appendChild(svg);
    paths.forEach(function (pe) {
      var L = 2000; try { L = pe.getTotalLength() || L; } catch (e) { /* jsdom etc. */ }
      pe.style.strokeDasharray = L + ' ' + L; pe.style.strokeDashoffset = L;
      if (pe.animate) pe.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: ms(T.travel), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      else pe.style.strokeDashoffset = 0;
    });
    return svg;
  }
  function ring(rect, cls, color) {
    var r = el('div', 'vfx-ring ' + cls);
    var cs = null; try { cs = getComputedStyle(FX._target); } catch (e) { /* ignore */ }
    r.style.left = rect.left - 3 + 'px'; r.style.top = rect.top - 3 + 'px'; r.style.width = rect.width + 6 + 'px'; r.style.height = rect.height + 6 + 'px';
    r.style.borderRadius = cs && cs.borderTopLeftRadius && cs.borderTopLeftRadius !== '0px' ? 'calc(' + cs.borderTopLeftRadius + ' + 3px)' : '8px';
    if (color) r.style.setProperty('--vfx-c', color);
    r.style.setProperty('--vfx-speed', ms(1000) + 'ms');
    return r;
  }
  function burst(rect, color, n) {
    var nodes = [], cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var flash = el('div', 'vfx-flash'); flash.style.left = cx + 'px'; flash.style.top = cy + 'px';
    flash.style.setProperty('--vfx-c', color); flash.style.setProperty('--vfx-w', Math.max(rect.width, 140) * 1.6 + 'px');
    flash.style.setProperty('--vfx-speed', ms(1000) + 'ms'); nodes.push(flash);
    for (var i = 0; i < n; i++) {
      // start on the outline, fly outward
      var t = i / n, side = Math.floor(t * 4), u = (t * 4) % 1, x, y;
      if (side === 0) { x = rect.left + u * rect.width; y = rect.top; } else if (side === 1) { x = rect.right; y = rect.top + u * rect.height; }
      else if (side === 2) { x = rect.right - u * rect.width; y = rect.bottom; } else { x = rect.left; y = rect.bottom - u * rect.height; }
      var dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, dist = 60 + Math.random() * 150;
      var s = el('span', 'vfx-shard' + (i % 3 === 0 ? ' vfx-spark' : ''));
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--vfx-c', color);
      s.style.setProperty('--dx', (dx / d * dist).toFixed(1) + 'px'); s.style.setProperty('--dy', (dy / d * dist).toFixed(1) + 'px');
      s.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg'); s.style.setProperty('--vfx-speed', ms(1000) + 'ms');
      nodes.push(s);
    }
    return nodes;
  }

  // ---------------- the effect ----------------
  function phaseColor(n) {
    var v = ''; try { v = getComputedStyle(document.documentElement).getPropertyValue('--guide-phase-' + n).trim(); } catch (e) { /* ignore */ }
    return v || ['#22d3ee', '#ff2bd6', '#facc15', '#a78bfa'][n - 1];
  }
  function aimPoint(rect, e) {
    var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    if (e && e.detail > 0 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) { x = e.clientX; y = e.clientY; }
    return { x: x, y: y };
  }
  function run(a, href, e) {
    var target = targetFor(a), rect = target.getBoundingClientRect(), n = phaseOf(href), color = phaseColor(n);
    var p = pending = { href: href, timers: [], done: false };
    FX.busy = true; FX.runs++; FX._target = target;
    var info = FX.last = { href: href, phase: n, color: color, locked: false, mode: 'bolt', from: null, at: Date.now(), keyboard: !(e && e.detail > 0) };
    // Failsafe first, so nothing below can stop the navigation.
    p.timers.push(setTimeout(function () { navigate(p); }, ms(T.total) + 400));
    try {
      if (FX.reducedMotion()) {
        info.mode = 'fade';
        var rf = ring(rect, 'vfx-fade', color); cleanup([rf], T.fade + 250);
        later(p, function () { navigate(p); }, T.fade);
        return;
      }
      var o = origin(), aim = aimPoint(rect, e), nodes = [];
      info.from = o ? o.from : 'none';
      if (o) { var b = drawBolt(o, aim.x, aim.y, '', p); b.style.setProperty('--vfx-c', color); nodes.push(b); }
      target.classList.add('vfx-hit');
      var startGlow = o ? T.travel - 30 : 0;
      later(p, function () {
        var r = ring(rect, 'vfx-glow', color); nodes.push(r);
        var spark = el('div', 'vfx-impact'); spark.style.left = aim.x + 'px'; spark.style.top = aim.y + 'px'; spark.style.setProperty('--vfx-c', color); spark.style.setProperty('--vfx-speed', ms(1000) + 'ms'); nodes.push(spark);
      }, startGlow);
      later(p, function () {
        nodes.forEach(function (x) { if (x.classList && x.classList.contains('vfx-glow')) x.classList.add('vfx-explode'); if (x.classList && x.classList.contains('vfx-bolt')) x.classList.add('vfx-out'); });
        nodes.push.apply(nodes, burst(rect, color, window.innerWidth < 600 ? 18 : 26));
        info.exploded = true;
      }, startGlow + T.impact);
      // reveal: navigate while the burst is still flying over the new page
      later(p, function () { navigate(p); }, startGlow + T.impact + 70);
      cleanup(nodes, T.total + 200);
      setTimeout(function () { target.classList.remove('vfx-hit'); }, ms(T.total));
    } catch (err) { info.error = String(err && err.message || err); navigate(p); }
  }
  function fizzle(a, href, modId, e) {
    var target = targetFor(a), rect = target.getBoundingClientRect(), nodes = [];
    FX.runs++; FX._target = target;
    var info = FX.last = { href: href, locked: true, module: modId, mode: 'fizzle', from: null, at: Date.now(), said: false, keyboard: !(e && e.detail > 0) };
    try {
      var rm = FX.reducedMotion(), o = rm ? null : origin(), aim = aimPoint(rect, e);
      info.from = o ? o.from : 'none';
      if (o) { var b = drawBolt(o, aim.x, aim.y, 'vfx-fizzle', null, 0.72); nodes.push(b); }
      later(null, function () {
        var r = ring(rect, 'vfx-locked' + (rm ? ' vfx-still' : ''), '#ff3b5c'); nodes.push(r);
        if (o) { var puff = el('div', 'vfx-puff'); puff.style.left = (o.x + (aim.x - o.x) * 0.72) + 'px'; puff.style.top = (o.y + (aim.y - o.y) * 0.72) + 'px'; puff.style.setProperty('--vfx-speed', ms(1000) + 'ms'); nodes.push(puff); }
      }, o ? T.travel - 40 : 0);
      cleanup(nodes, T.fizzle + 150);
    } catch (err) { info.error = String(err && err.message || err); }
    try { info.said = !!(window.EA_GUIDE && window.EA_GUIDE.sayLocked && window.EA_GUIDE.sayLocked(modId)); } catch (err) { info.said = false; }
    if (!info.said) toast(rect, modId);
    try { target.setAttribute('aria-describedby', 'vfxLockMsg'); } catch (err) { /* ignore */ }
    live('Locked. ' + ((CUR && CUR.level0 && CUR.level0.rule) || 'Finish Level 0 first.'));
  }
  // When Volt is hidden, a small toast explains the lock instead.
  function toast(rect, modId) {
    var old = document.querySelector('.vfx-toast'); if (old) old.remove();
    var M = CUR && CUR.modulesById[modId], t = document.createElement('div'); t.className = 'vfx-toast'; t.setAttribute('role', 'status');
    t.textContent = '🔒 ' + (M ? (M.track === 'advanced' ? 'A' : 'M') + M.number + ' is locked. ' : 'Locked. ') + ((CUR && CUR.level0 && CUR.level0.rule) || '');
    t.style.left = Math.max(8, Math.min(rect.left, innerWidth - 328)) + 'px';
    t.style.top = Math.min(rect.bottom + 8, innerHeight - 90) + 'px';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }
  function live(text) {
    var r = document.getElementById('vfxLockMsg');
    if (!r) { r = document.createElement('div'); r.id = 'vfxLockMsg'; r.className = 'vfx-sr'; r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
    r.textContent = ''; setTimeout(function () { r.textContent = text; }, 30);
  }

  // ---------------- click / tap / keyboard Enter ----------------
  document.addEventListener('click', function (e) {
    var took = null;
    try {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest && e.target.closest(SEL);
      if (!a || !a.closest('#app') || a.closest('.crumbs') || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (pending && !pending.done) { e.preventDefault(); return; } // already firing: no double navigation
      if (!FX.enabled()) return; // effects off: plain link
      var mod = /^#\/module\/([\w-]+)/.exec(href), st = mod && modStatus(mod[1]);
      e.preventDefault(); took = href;
      if (st && st.locked) { fizzle(a, href, mod[1], e); return; }
      run(a, href, e);
    } catch (err) {
      // If anything goes wrong before we took over, let the browser follow the link.
      if (pending && !pending.done) navigate(pending);
      else if (took && !(FX.last && FX.last.locked && FX.last.href === took) && location.hash !== took) location.hash = took;
    }
  }, true);
})();
