/* Ohm's Law Shooter — problem generator (shared by the browser game and the server/tests).
 *
 * Every quantity is an exact decimal {n, e} = n × 10^e (n a positive integer), so answers are never rounded:
 * the correct target always shows the exact result, and distractors are built from the same exact arithmetic
 * using common mistakes (multiplying instead of dividing, flipping a division, a wrong prefix, forgetting to square).
 *
 *   OhmProblems.generate(level, rng) → { level, kind, ask, givens:[{sym,label}], prompt, answer, options:[{label,correct,mistake,hint}], formula, hint }
 *   OhmProblems.makeRng(seed)         → deterministic RNG for tests / replays
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.OhmProblems = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GAME = {
    id: 'ohms-shooter', title: 'Ohm’s Law Shooter', icon: '⚡',
    modules: ['m5'],                         // where Ohm's law and power are taught (M5 DC Fundamentals)
    lessons: ['l1-ohms-law', 'l1-power'],
    creditLesson: 'l1-ohms-law',             // reaching level 4 (= clearing level 3) marks this lesson studied
    creditLevel: 4,
    hitsPerLevel: 5, lives: 3, maxLevel: 99
  };
  var LEVELS = [
    null,
    { n: 1, name: 'Find I', short: 'I = V ÷ R' },
    { n: 2, name: 'Find V and R', short: 'V = I × R · R = V ÷ I' },
    { n: 3, name: 'Prefixes', short: 'mA · kΩ · mV' },
    { n: 4, name: 'Power', short: 'P = V × I · P = I² × R' },
    { n: 5, name: 'Mixed', short: 'Everything, faster' }
  ];

  // ---------- exact decimals ----------
  function Q(n, e) {
    n = Math.round(n); e = e || 0;
    if (n === 0) return { n: 0, e: 0 };
    while (n % 10 === 0) { n /= 10; e++; }
    return { n: n, e: e };
  }
  function mul(a, b) { return a && b ? Q(a.n * b.n, a.e + b.e) : null; }
  function div(a, b) {
    if (!a || !b || !b.n) return null;
    for (var k = 0, p = 1; k <= 9; k++, p *= 10) {
      var num = a.n * p;
      if (num % b.n === 0) return Q(num / b.n, a.e - b.e - k);
    }
    return null; // not a terminating decimal with few digits → not used
  }
  function add(a, b) {
    if (!a || !b) return null;
    var e = Math.min(a.e, b.e);
    return Q(a.n * Math.pow(10, a.e - e) + b.n * Math.pow(10, b.e - e), e);
  }
  function sub(a, b) { return a && b ? add(a, Q(-b.n, b.e)) : null; }
  function shift(a, k) { return a ? Q(a.n, a.e + k) : null; }
  function sig(a) { return String(a.n).length; }
  function eq(a, b) { return !!a && !!b && a.n === b.n && a.e === b.e; }
  function toNumber(a) { return a.n * Math.pow(10, a.e); }
  var PREFIX = { '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M' };
  // Exact SI formatting: 4400 mV → "4.4 V", 0.003 A → "3 mA", 1500 Ω → "1.5 kΩ".
  function format(a, unit) {
    if (!a || !a.n) return '0 ' + unit;
    var digits = String(a.n), lead = a.e + digits.length - 1;
    var p = Math.max(-6, Math.min(6, Math.floor(lead / 3) * 3));
    var s = a.e - p, txt;
    if (s >= 0) txt = digits + new Array(s + 1).join('0');
    else {
      var pad = digits.length + s <= 0 ? new Array(1 - (digits.length + s) + 1).join('0') + digits : digits;
      var cut = pad.length + s;
      txt = pad.slice(0, cut) + '.' + pad.slice(cut);
    }
    return txt + ' ' + PREFIX[String(p)] + unit;
  }

  // ---------- rng ----------
  function makeRng(seed) {
    var t = (seed >>> 0) || 1;
    return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var UNIT = { V: 'V', I: 'A', R: 'Ω', P: 'W' };
  var FORMULA = { I: 'I = V ÷ R', V: 'V = I × R', R: 'R = V ÷ I', P: 'P = V × I', P2: 'P = I² × R' };
  var HINTS = {
    I: { mul: 'You multiplied. I = V ÷ R.', flip: 'Upside down: I = V ÷ R, not R ÷ V.', prefix: 'Right digits, wrong prefix. V ÷ kΩ = mA.', calc: 'I = V ÷ R.', miss: 'I = V ÷ R.' },
    V: { div: 'You divided. V = I × R.', flip: 'V = I × R — multiply.', prefix: 'Check the prefix: mA × Ω = mV.', add: 'Multiply, don’t add: V = I × R.', calc: 'V = I × R.', miss: 'V = I × R.' },
    R: { mul: 'You multiplied. R = V ÷ I.', flip: 'Upside down: R = V ÷ I.', prefix: 'Check the prefix: V ÷ mA = kΩ.', calc: 'R = V ÷ I.', miss: 'R = V ÷ I.' },
    P: { div: 'You divided. P = V × I.', flip: 'P = V × I — multiply.', prefix: 'Check the prefix: V × mA = mW.', add: 'Multiply, don’t add: P = V × I.', calc: 'P = V × I.', miss: 'P = V × I.' },
    P2: { nosquare: 'Square the current first: P = I² × R.', double: 'Square it, don’t double it: I² = I × I.', wrongsq: 'Square I, not R: P = I² × R.', prefix: 'Check the prefix: (mA)² × Ω = µW.', calc: 'P = I² × R.', miss: 'P = I² × R.' }
  };

  // Builds the 4 options (1 correct + 3 plausible wrong ones), all exact and all distinct.
  function finish(rng, level, kind, ask, givens, answer, cands, hk) {
    var unit = UNIT[ask === 'P2' ? 'P' : ask], label = format(answer, unit), seen = {}; seen[label] = 1;
    var opts = [{ label: label, correct: true, mistake: null }], used = {};
    // Real mistakes first; prefix slips only once prefixes are in play (level 3+); then near-miss fillers.
    var prefixOk = level >= 3, maxPrefix = prefixOk ? 2 : 0;
    var real = shuffle(rng, cands.filter(function (c) { return c.m !== 'prefix'; }));
    var pref = shuffle(rng, cands.filter(function (c) { return c.m === 'prefix'; }));
    var fill = shuffle(rng, [{ q: add(answer, Q(1)), m: 'calc' }, { q: mul(answer, Q(2)), m: 'calc' }, { q: div(answer, Q(2)), m: 'calc' },
      { q: sub(answer, Q(1)), m: 'calc' }, { q: shift(answer, 1), m: 'calc' }]);
    var lo = toNumber(answer) / 2000, hi = toNumber(answer) * 2000;
    real.concat(pref, fill).forEach(function (c) {
      if (opts.length >= 4 || !c.q || !(c.q.n > 0) || sig(c.q) > 3 || eq(c.q, answer)) return;
      if (c.m === 'prefix' && (used.prefix || 0) >= maxPrefix) return;
      if (c.m !== 'prefix' && c.m !== 'calc' && used[c.m]) return;
      var v = toNumber(c.q); if (v < 1e-6 || v >= 1e5 || (c.m !== 'prefix' && (v < lo || v > hi))) return;
      var l = format(c.q, unit); if (seen[l]) return; seen[l] = 1;
      used[c.m] = (used[c.m] || 0) + 1;
      opts.push({ label: l, correct: false, mistake: c.m });
    });
    var H = HINTS[hk];
    opts.forEach(function (o) { o.hint = o.correct ? null : (H[o.mistake] || H.calc); });
    var askSym = ask === 'P2' ? 'P' : ask;
    return {
      level: level, kind: kind, ask: askSym, formula: FORMULA[hk], hint: H.miss,
      givens: givens.map(function (g) { return { sym: g[0], label: format(g[1], UNIT[g[0]]) }; }),
      prompt: givens.map(function (g) { return g[0] + ' = ' + format(g[1], UNIT[g[0]]); }).join(', ') + ', ' + askSym + ' = ?',
      answer: label, answerValue: toNumber(answer), options: shuffle(rng, opts)
    };
  }

  // ---------- problem families ----------
  function solveI(rng, level, I, R) {
    var V = mul(I, R);
    return finish(rng, level, 'I', 'I', [['V', V], ['R', R]], I,
      [{ q: mul(V, R), m: 'mul' }, { q: div(R, V), m: 'flip' }, { q: shift(I, 3), m: 'prefix' }, { q: shift(I, -3), m: 'prefix' }], 'I');
  }
  function solveV(rng, level, I, R) {
    var V = mul(I, R);
    return finish(rng, level, 'V', 'V', [['I', I], ['R', R]], V,
      [{ q: div(R, I), m: 'div' }, { q: div(I, R), m: 'div' }, { q: add(I, R), m: 'add' }, { q: shift(V, 3), m: 'prefix' }, { q: shift(V, -3), m: 'prefix' }], 'V');
  }
  function solveR(rng, level, I, R) {
    var V = mul(I, R);
    return finish(rng, level, 'R', 'R', [['V', V], ['I', I]], R,
      [{ q: mul(V, I), m: 'mul' }, { q: div(I, V), m: 'flip' }, { q: shift(R, 3), m: 'prefix' }, { q: shift(R, -3), m: 'prefix' }], 'R');
  }
  function powerVI(rng, level, V, I) {
    var P = mul(V, I);
    return finish(rng, level, 'P', 'P', [['V', V], ['I', I]], P,
      [{ q: div(V, I), m: 'div' }, { q: div(I, V), m: 'div' }, { q: add(V, I), m: 'add' }, { q: shift(P, 3), m: 'prefix' }, { q: shift(P, -3), m: 'prefix' }], 'P');
  }
  function powerI2R(rng, level, I, R) {
    var P = mul(mul(I, I), R);
    return finish(rng, level, 'P2', 'P2', [['I', I], ['R', R]], P,
      [{ q: mul(I, R), m: 'nosquare' }, { q: mul(mul(Q(2), I), R), m: 'double' }, { q: mul(I, mul(R, R)), m: 'wrongsq' }, { q: shift(P, 3), m: 'prefix' }, { q: shift(P, -3), m: 'prefix' }], 'P2');
  }

  var A = function (n) { return Q(n, 0); }, mA = function (n) { return Q(n, -3); }, k = function (n) { return Q(n, 3); };
  var L1_I = [1, 2, 3, 4, 5, 6], L1_R = [2, 3, 4, 5, 6, 8, 10, 12];
  var FAMILIES = {
    1: [function (r, l) { return solveI(r, l, A(pick(r, L1_I)), A(pick(r, L1_R))); }],
    2: [function (r, l) { return solveV(r, l, A(pick(r, [1, 2, 3, 4, 5])), A(pick(r, L1_R))); },
        function (r, l) { return solveR(r, l, A(pick(r, [1, 2, 3, 4, 5])), A(pick(r, L1_R))); },
        function (r, l) { return solveI(r, l, A(pick(r, [2, 3, 4, 5, 6, 8])), A(pick(r, [5, 6, 8, 10, 12, 15]))); }],
    3: [ // volts ÷ kΩ = mA, mA × Ω = mV/V, V ÷ mA = kΩ
        function (r, l) { return solveI(r, l, mA(pick(r, [1, 2, 3, 4, 5, 6, 8, 10])), k(pick(r, [1, 2, 3, 4, 5, 6, 10]))); },
        function (r, l) { return solveV(r, l, mA(pick(r, [2, 5, 10, 20, 25, 50])), A(pick(r, [10, 20, 47, 100, 150, 220]))); },
        function (r, l) { return solveR(r, l, mA(pick(r, [1, 2, 4, 5])), k(pick(r, [1, 2, 3, 5]))); },
        function (r, l) { return solveV(r, l, mA(pick(r, [1, 2, 3, 4, 5])), k(pick(r, [1, 2, 3, 10]))); }],
    4: [function (r, l) { return powerVI(r, l, A(pick(r, [3, 5, 6, 9, 12, 24])), A(pick(r, [2, 3, 4]))); },
        function (r, l) { return powerVI(r, l, A(pick(r, [5, 9, 12, 24])), mA(pick(r, [100, 200, 250, 500]))); },
        function (r, l) { return powerI2R(r, l, A(pick(r, [1, 2, 3])), A(pick(r, [2, 3, 4, 5, 8, 10]))); },
        function (r, l) { return powerI2R(r, l, mA(pick(r, [10, 20, 50, 100])), A(pick(r, [10, 20, 100, 220]))); }]
  };
  function generate(level, rng) {
    rng = rng || Math.random; level = Math.max(1, Math.floor(level) || 1);
    var fams = level <= 4 ? FAMILIES[level] : FAMILIES[2].concat(FAMILIES[3], FAMILIES[4], FAMILIES[3], FAMILIES[4]);
    return pick(rng, fams)(rng, level);
  }

  return { GAME: GAME, LEVELS: LEVELS, generate: generate, makeRng: makeRng, format: format, Q: Q, mul: mul, div: div, add: add };
});
