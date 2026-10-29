// Ohm's Law Shooter problem generator: exact answers, plausible distinct distractors. Run: node tests/game.test.js
const O = require('../public/js/games/ohm-problems');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };

// Parse "4.7 kΩ" → number (independent of the generator's formatter)
const MUL = { µ: 1e-6, m: 1e-3, '': 1, k: 1e3, M: 1e6 };
function val(label) {
  const m = label.match(/^(\d+(?:\.\d+)?) ([µmkM]?)(V|A|Ω|W)$/);
  if (!m) return NaN;
  return { v: Number(m[1]) * MUL[m[2]], unit: m[3] };
}
function givens(p) { const g = {}; p.givens.forEach((x) => { g[x.sym] = val(x.label).v; }); return g; }
const close = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-9;
function expected(p) {
  const g = givens(p);
  if (p.kind === 'I') return g.V / g.R;
  if (p.kind === 'V') return g.I * g.R;
  if (p.kind === 'R') return g.V / g.I;
  if (p.kind === 'P') return g.V * g.I;
  if (p.kind === 'P2') return g.I * g.I * g.R;
  return NaN;
}

// Formatter is exact
ok('format: 3 A', O.format(O.Q(3), 'A') === '3 A');
ok('format: 0.003 A → 3 mA', O.format(O.Q(3, -3), 'A') === '3 mA');
ok('format: 4400 mV → 4.4 V', O.format(O.Q(4400, -3), 'V') === '4.4 V');
ok('format: 1500 Ω → 1.5 kΩ', O.format(O.Q(15, 2), 'Ω') === '1.5 kΩ');
ok('format: 250 mW', O.format(O.Q(25, -2), 'W') === '250 mW');
ok('format: 50 µW', O.format(O.Q(5, -5), 'W') === '50 µW');
ok('format: 117.5 mW kept exact', O.format(O.Q(1175, -4), 'W') === '117.5 mW');
ok('div: exact only', O.div(O.Q(12), O.Q(4)).n === 3 && O.div(O.Q(1), O.Q(3)) === null);

// Deterministic with a seed
const a = O.generate(3, O.makeRng(42)), b = O.generate(3, O.makeRng(42));
ok('seeded generator is deterministic', JSON.stringify(a) === JSON.stringify(b));

// Bulk properties over every level
const rng = O.makeRng(2026), seenKinds = {}, seenMistakes = {}, issues = [];
for (let level = 1; level <= 7; level++) {
  for (let i = 0; i < 1500; i++) {
    const p = O.generate(level, rng);
    seenKinds[level] = seenKinds[level] || new Set(); seenKinds[level].add(p.kind);
    const exp = expected(p), ans = val(p.answer), correct = p.options.filter((o) => o.correct);
    const labels = p.options.map((o) => o.label);
    const unitWanted = { I: 'A', V: 'V', R: 'Ω', P: 'W' }[p.ask];
    if (p.options.length !== 4) issues.push(['count', p]);
    if (correct.length !== 1 || correct[0].label !== p.answer) issues.push(['one correct', p]);
    if (new Set(labels).size !== 4) issues.push(['distinct labels', p]);
    if (!close(ans.v, exp) || ans.unit !== unitWanted) issues.push(['exact answer', p.prompt, p.answer, exp]);
    if (!close(p.answerValue, exp)) issues.push(['answerValue', p.prompt]);
    p.options.forEach((o) => {
      const v = val(o.label);
      if (!(v.v > 0) || v.unit !== unitWanted) issues.push(['option unit/positive', p.prompt, o.label]);
      if (!o.correct && close(v.v, exp)) issues.push(['distractor equals answer', p.prompt, o.label]);
      if (!o.correct && !o.hint) issues.push(['distractor hint', p.prompt, o.label]);
      if (!o.correct) { seenMistakes[o.mistake] = (seenMistakes[o.mistake] || 0) + 1; if (level < 3 && o.mistake === 'prefix') issues.push(['prefix before L3', p.prompt]); }
    });
    if (!p.prompt.endsWith(p.ask + ' = ?') || p.hint.length > 60) issues.push(['prompt/hint', p.prompt, p.hint]);
    if (p.hint.split(/[.!?]\s/).length > 2) issues.push(['hint is one line', p.hint]);
  }
}
ok('every problem: 4 distinct options, exactly one correct, exact answer, right units', issues.length === 0, issues.slice(0, 3));
ok('L1 asks only for I', [...seenKinds[1]].join() === 'I');
ok('L2 asks for V and R', seenKinds[2].has('V') && seenKinds[2].has('R'));
ok('L3 uses prefixes (mA / kΩ / mV) in prompts', (() => { const r = O.makeRng(3); for (let i = 0; i < 50; i++) { const p = O.generate(3, r); if (!/(mA|kΩ|mV)/.test(p.prompt + p.answer)) return false; } return true; })());
ok('L4 is power: P = V×I and P = I²×R', seenKinds[4].has('P') && seenKinds[4].has('P2') && seenKinds[4].size === 2);
ok('L5+ mixes everything', ['V', 'R', 'P', 'P2'].every((k) => seenKinds[6].has(k)));
ok('distractors come from common mistakes', ['mul', 'flip', 'div', 'prefix', 'nosquare', 'double'].every((m) => seenMistakes[m] > 0), seenMistakes);

// Specific common mistakes are offered
(function () {
  const r = O.makeRng(9);
  let mulSeen = false, flipSeen = false;
  for (let i = 0; i < 300 && !(mulSeen && flipSeen); i++) {
    const p = O.generate(1, r), g = givens(p);
    p.options.forEach((o) => { const v = val(o.label).v; if (close(v, g.V * g.R)) mulSeen = o.mistake === 'mul'; if (close(v, g.R / g.V) && o.mistake === 'flip') flipSeen = true; });
  }
  ok('L1 offers V×R (multiplied) and R÷V (flipped) as wrong answers', mulSeen && flipSeen);
  const p = O.generate(4, O.makeRng(5));
  ok('wrong-answer hints are one short line', p.options.filter((o) => !o.correct).every((o) => o.hint.length <= 60));
})();

ok('game meta: hosted on M5, credits l1-ohms-law at level 4', O.GAME.modules.join() === 'm5' && O.GAME.creditLesson === 'l1-ohms-law' && O.GAME.creditLevel === 4 && O.GAME.lives === 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
