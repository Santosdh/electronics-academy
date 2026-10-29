/* Module 17 practice: seeded-defect inspection exercise (browser + Node).
   A practice "board" has 12 inspection locations; 5–7 of them carry a seeded condition. The learner
   labels each location with a condition (or "no defect"). Scoring mirrors the Module 17 assessment
   in the curriculum ("find ≥90% of seeded defects"): a seeded defect counts as found only when it is
   labelled with the right condition. The false-call limit is an app practice rule, not from the
   curriculum. Condition names are generic recognition terms used in the lessons — no standard
   clause numbers or acceptance criteria are cited. */
(function (g) {
  'use strict';
  var PASS_PERCENT = 90;
  var MAX_FALSE_CALLS = 1;
  var LOCATIONS = 12;
  var CONDITIONS = [
    { id: 'good', label: 'No defect', defect: false, kinds: ['tht', 'smt'], hint: 'Smooth concave fillet, wetted to lead and pad, lead outline visible.' },
    { id: 'cold', label: 'Cold / disturbed joint', defect: true, kinds: ['tht', 'smt'], hint: 'Rough, grainy or cracked surface; poor flow onto the pad.' },
    { id: 'bridge', label: 'Bridging', defect: true, kinds: ['tht', 'smt'], hint: 'Solder joining conductors that should be separate.' },
    { id: 'nonwet', label: 'Insufficient wetting', defect: true, kinds: ['tht', 'smt'], hint: 'Solder balled up with a high contact angle; bare pad showing.' },
    { id: 'insufficient', label: 'Insufficient solder', defect: true, kinds: ['tht', 'smt'], hint: 'Wetted but too little solder to form the fillet; hole or pad partly bare.' },
    { id: 'excess', label: 'Excess solder', defect: true, kinds: ['tht', 'smt'], hint: 'Convex ball of solder hiding the lead outline.' },
    { id: 'ball', label: 'Solder ball / splash', defect: true, kinds: ['tht', 'smt'], hint: 'Loose spheres of solder away from the joint.' },
    { id: 'tombstone', label: 'Tombstone', defect: true, kinds: ['smt'], hint: 'Chip part standing up on one end.' },
    { id: 'lifted-pad', label: 'Lifted pad', defect: true, kinds: ['tht'], hint: 'Pad separated from the laminate.' },
    { id: 'damage', label: 'Component damage', defect: true, kinds: ['tht', 'smt'], hint: 'Cracked or chipped body, damaged lead.' }
  ];
  var byId = {}; CONDITIONS.forEach(function (c) { byId[c.id] = c; });
  var CORE = ['cold', 'bridge', 'nonwet', 'damage']; // the curriculum's named common defects

  function rngFrom(seed) {
    if (typeof seed !== 'number') return Math.random;
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // Builds a new board. Returns the full layout (kept server-side; includes the answers).
  function makeBoard(seed) {
    var r = rngFrom(seed);
    var nDefects = 5 + Math.floor(r() * 3); // 5..7
    var kinds = []; for (var i = 0; i < LOCATIONS; i++) kinds.push(i % 2 ? 'smt' : 'tht');
    kinds = shuffle(kinds, r);
    var slots = shuffle(kinds.map(function (_, i) { return i; }), r).slice(0, nDefects);
    // Always include at least two of the curriculum's named common defects, then fill at random.
    var wanted = shuffle(CORE, r).slice(0, 2);
    var conds = kinds.map(function () { return 'good'; });
    slots.forEach(function (idx, k) {
      var kind = kinds[idx];
      var pool = CONDITIONS.filter(function (c) { return c.defect && c.kinds.indexOf(kind) >= 0; }).map(function (c) { return c.id; });
      var pick = k < wanted.length && pool.indexOf(wanted[k]) >= 0 ? wanted[k] : pool[Math.floor(r() * pool.length)];
      conds[idx] = pick;
    });
    var refsT = ['J1 pins 1–2', 'J1 pins 3–4', 'J2 pins 1–2', 'U3 pins 7–8', 'U3 pins 13–14', 'K1 pins 1–2'];
    var refsS = ['R12', 'C7', 'R4', 'C15', 'R21', 'C3'];
    var ti = 0, si = 0;
    return {
      v: 1, seed: typeof seed === 'number' ? seed : null, kind: 'm17-seeded-defects', passPercent: PASS_PERCENT,
      locations: kinds.map(function (kind, i) {
        return { id: 'L' + (i + 1), ref: kind === 'tht' ? refsT[ti++ % refsT.length] : refsS[si++ % refsS.length], kind: kind,
          condition: conds[i], jitter: Math.round(r() * 1000) };
      })
    };
  }

  // What the learner's browser receives: no condition names, only what is drawn.
  function publicBoard(layout) {
    return { v: layout.v, passPercent: PASS_PERCENT, maxFalseCalls: MAX_FALSE_CALLS,
      conditions: CONDITIONS.map(function (c) { return { id: c.id, label: c.label, defect: c.defect, kinds: c.kinds, hint: c.hint }; }),
      locations: layout.locations.map(function (l) { return { id: l.id, ref: l.ref, kind: l.kind, svg: drawLocation(l) }; }) };
  }

  function gradeBoard(layout, answers) {
    answers = answers || {};
    var seeded = 0, correct = 0, detected = 0, falseCalls = 0, unanswered = 0;
    var items = layout.locations.map(function (l) {
      var a = typeof answers[l.id] === 'string' && byId[answers[l.id]] ? answers[l.id] : null;
      if (!a) unanswered++;
      var isDefect = l.condition !== 'good';
      var ok = a === l.condition;
      if (isDefect) { seeded++; if (ok) correct++; if (a && a !== 'good') detected++; }
      else if (a && a !== 'good') falseCalls++;
      return { id: l.id, ref: l.ref, kind: l.kind, actual: l.condition, actualLabel: byId[l.condition].label,
        answered: a, answeredLabel: a ? byId[a].label : null, ok: ok, seeded: isDefect };
    });
    var percent = seeded ? Math.round(correct / seeded * 1000) / 10 : 100;
    return { seeded: seeded, correct: correct, detected: detected, falseCalls: falseCalls, unanswered: unanswered,
      missed: seeded - correct, percent: percent, passPercent: PASS_PERCENT, maxFalseCalls: MAX_FALSE_CALLS,
      passed: percent >= PASS_PERCENT && falseCalls <= MAX_FALSE_CALLS, items: items };
  }

  // ---------- Drawing (top-down magnified view, SVG string) ----------
  var SOLDER = '#c9ced3', SOLDER_HI = '#f4f6f8', COPPER = '#c8803e', BOARD = '#1f6b45', MASK = '#25824f';
  function J(l, k) { return ((l.jitter || 0) * (k + 7) % 97) / 97; } // deterministic 0..1 per feature
  function grain(cx, cy, rad, n, l) {
    var s = ''; for (var i = 0; i < n; i++) {
      var a = J(l, i) * 6.283, d = J(l, i + 31) * rad;
      s += '<circle cx="' + (cx + Math.cos(a) * d).toFixed(1) + '" cy="' + (cy + Math.sin(a) * d).toFixed(1) + '" r="' + (0.8 + J(l, i + 3) * 1.4).toFixed(1) + '" fill="#8d9298"/>';
    } return s;
  }
  function thtJoint(cx, cy, cond, l) {
    var s = '';
    if (cond === 'lifted-pad') {
      s += '<ellipse cx="' + (cx + 3) + '" cy="' + (cy + 5) + '" rx="19" ry="17" fill="#0d3a24" opacity=".8"/>';
      s += '<circle cx="' + (cx - 2) + '" cy="' + (cy - 3) + '" r="17" fill="' + COPPER + '" stroke="#7a4a1e" stroke-width="2"/>';
      s += '<path d="M' + (cx - 19) + ' ' + (cy + 8) + ' q8 8 20 6" stroke="#0a2d1b" stroke-width="3" fill="none"/>';
      s += '<circle cx="' + (cx - 2) + '" cy="' + (cy - 3) + '" r="12" fill="url(#gs)"/><circle cx="' + (cx - 2) + '" cy="' + (cy - 3) + '" r="4" fill="#9aa0a6"/>';
      return s;
    }
    var padVisible = cond === 'nonwet' || cond === 'insufficient';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="' + COPPER + '"/>';
    if (cond === 'good' || cond === 'ball' || cond === 'damage' || cond === 'bridge')
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="16" fill="url(#gs)"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#a7adb3" stroke="#7d838a"/>';
    else if (cond === 'cold')
      s += '<path d="M' + (cx - 15) + ' ' + cy + ' l4 -9 l7 -4 l9 1 l6 6 l2 8 l-5 8 l-9 3 l-8 -3 z" fill="#a3a8ad" stroke="#7b8086"/>' + grain(cx, cy, 12, 14, l) +
        '<path d="M' + (cx - 6) + ' ' + (cy - 8) + ' l4 6 l-2 5 l5 6" stroke="#55595e" stroke-width="1.3" fill="none"/>';
    else if (cond === 'nonwet')
      s += '<circle cx="' + (cx + 2) + '" cy="' + (cy - 1) + '" r="9" fill="url(#gb)" stroke="#6f757b" stroke-width="1.5"/>';
    else if (cond === 'insufficient')
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="15" fill="none" stroke="' + SOLDER + '" stroke-width="3"/><path d="M' + (cx - 9) + ' ' + cy + ' a9 9 0 0 1 18 0" fill="#111"/><circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#a7adb3"/>';
    else if (cond === 'excess')
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="19" fill="url(#gb)" stroke="#8a9096"/><ellipse cx="' + (cx - 6) + '" cy="' + (cy - 7) + '" rx="6" ry="4" fill="' + SOLDER_HI + '"/>';
    if (padVisible && cond === 'nonwet') s += '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="none" stroke="#d99a5b" stroke-width="2"/>';
    return s;
  }
  function drawTht(l) {
    var c = l.condition, s = '';
    s += '<text x="8" y="16" class="dx-silk">' + (l.ref.split(' ')[0]) + '</text>';
    if (c === 'damage') {
      s += '<rect x="14" y="20" width="132" height="22" rx="3" fill="#2b2b2f"/>';
      var x0 = 50 + J(l, 2) * 50;
      s += '<path d="M' + x0 + ' 20 l6 8 l-5 6 l7 8" stroke="#d8d8d8" stroke-width="1.6" fill="none"/><path d="M' + (x0 + 18) + ' 42 l8 -7 l8 7z" fill="' + BOARD + '"/>';
    }
    s += thtJoint(55, 72, c === 'lifted-pad' && J(l, 1) < 0.5 ? 'lifted-pad' : (c === 'lifted-pad' ? 'good' : c), l);
    s += thtJoint(105, 72, c === 'lifted-pad' && J(l, 1) >= 0.5 ? 'lifted-pad' : (c === 'lifted-pad' ? 'good' : (c === 'cold' || c === 'nonwet' || c === 'insufficient' || c === 'excess') ? 'good' : c), l);
    if (c === 'bridge') s += '<path d="M60 64 Q80 ' + (60 + J(l, 4) * 6) + ' 100 64 L100 80 Q80 ' + (86 - J(l, 5) * 6) + ' 60 80 Z" fill="url(#gs)" stroke="#8a9096"/>';
    if (c === 'ball') for (var i = 0; i < 3; i++) s += '<circle cx="' + (25 + J(l, i + 9) * 110).toFixed(0) + '" cy="' + (100 + J(l, i + 13) * 15).toFixed(0) + '" r="' + (2.5 + J(l, i) * 2).toFixed(1) + '" fill="url(#gb)"/>';
    return s;
  }
  function smtFillet(x, side, cond, l) { // side -1 left pad, +1 right pad
    var s = '<rect x="' + (x - 13) + '" y="58" width="26" height="32" fill="' + COPPER + '"/>';
    if (cond === 'good' || cond === 'ball' || cond === 'damage' || cond === 'bridge')
      s += '<path d="M' + (x - 13) + ' 58 h26 v32 h-26z" fill="url(#gs)"/>' + '<path d="M' + (x - side * 13) + ' 60 Q' + (x + side * 2) + ' 74 ' + (x - side * 13) + ' 88" stroke="#eef1f3" stroke-width="2" fill="none"/>';
    else if (cond === 'cold') s += '<path d="M' + (x - 12) + ' 60 l9 3 l8 -2 l6 6 l-3 9 l4 8 l-7 6 l-10 -2 l-7 -6 z" fill="#a3a8ad"/>' + grain(x, 74, 10, 12, l);
    else if (cond === 'nonwet') s += '<circle cx="' + (x + side * 5) + '" cy="74" r="7" fill="url(#gb)" stroke="#6f757b"/>';
    else if (cond === 'insufficient') s += '<rect x="' + (side < 0 ? x + 4 : x - 13) + '" y="62" width="9" height="24" fill="' + SOLDER + '"/>';
    else if (cond === 'excess') s += '<ellipse cx="' + x + '" cy="74" rx="18" ry="20" fill="url(#gb)" stroke="#8a9096"/><ellipse cx="' + (x - 5) + '" cy="66" rx="5" ry="3" fill="' + SOLDER_HI + '"/>';
    return s;
  }
  function drawSmt(l) {
    var c = l.condition, s = '<text x="8" y="16" class="dx-silk">' + l.ref + '</text>';
    var leftCond = c, rightCond = (c === 'cold' || c === 'nonwet' || c === 'insufficient' || c === 'excess') ? 'good' : c;
    if (c === 'tombstone') {
      s += '<rect x="42" y="58" width="26" height="32" fill="url(#gs)"/><rect x="92" y="58" width="26" height="32" fill="' + COPPER + '"/>';
      s += '<rect x="44" y="40" width="20" height="30" fill="#151515" stroke="#666" transform="skewX(-8)"/><rect x="47" y="38" width="16" height="6" fill="#d0d4d8"/>';
      s += '<ellipse cx="62" cy="96" rx="22" ry="4" fill="#000" opacity=".3"/>';
      return s;
    }
    if (c === 'bridge') s += '<rect x="92" y="100" width="26" height="14" fill="' + COPPER + '"/><path d="M100 88 q4 8 0 14 h12 q-4 -6 0 -14z" fill="url(#gs)"/>';
    s += smtFillet(55, -1, leftCond, l) + smtFillet(105, 1, rightCond, l);
    s += '<rect x="60" y="62" width="40" height="24" fill="' + (l.ref[0] === 'C' ? '#b8946a' : '#141414') + '"/>';
    s += '<rect x="60" y="62" width="6" height="24" fill="#d0d4d8"/><rect x="94" y="62" width="6" height="24" fill="#d0d4d8"/>';
    if (l.ref[0] === 'R') s += '<text x="80" y="78" class="dx-mark">103</text>';
    if (c === 'damage') s += '<path d="M' + (70 + J(l, 2) * 12) + ' 62 l5 9 l-4 6 l6 9" stroke="#e6e6e6" stroke-width="1.5" fill="none"/><path d="M86 86 l6 -6 l6 6z" fill="' + MASK + '"/>';
    if (c === 'ball') for (var i = 0; i < 3; i++) s += '<circle cx="' + (20 + J(l, i + 9) * 120).toFixed(0) + '" cy="' + (30 + J(l, i + 13) * 10 + (i === 2 ? 70 : 0)).toFixed(0) + '" r="' + (2.5 + J(l, i) * 2).toFixed(1) + '" fill="url(#gb)"/>';
    return s;
  }
  function drawLocation(l) {
    var body = l.kind === 'smt' ? drawSmt(l) : drawTht(l);
    return '<svg viewBox="0 0 160 120" class="dx-svg" role="img" aria-label="Inspection location ' + l.id + ' (' + l.ref + ')">' +
      '<defs><radialGradient id="gs" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="' + SOLDER_HI + '"/><stop offset="1" stop-color="#9ea4aa"/></radialGradient>' +
      '<radialGradient id="gb" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="' + SOLDER + '"/><stop offset="1" stop-color="#6b7177"/></radialGradient></defs>' +
      '<rect width="160" height="120" fill="' + BOARD + '"/><rect x="4" y="4" width="152" height="112" fill="' + MASK + '" opacity=".35"/>' + body + '</svg>';
  }

  var api = { PASS_PERCENT: PASS_PERCENT, MAX_FALSE_CALLS: MAX_FALSE_CALLS, LOCATIONS: LOCATIONS, CONDITIONS: CONDITIONS,
    makeBoard: makeBoard, publicBoard: publicBoard, gradeBoard: gradeBoard, drawLocation: drawLocation };
  g.EA_DEFECTS = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
