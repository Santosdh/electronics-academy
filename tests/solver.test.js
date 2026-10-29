// Run: node tests/solver.test.js
const S = require('../public/js/circuit-solver.js');
let pass = 0, fail = 0;
function near(name, got, want, tol) {
  tol = tol || Math.abs(want) * 1e-3 + 1e-9;
  if (Math.abs(got - want) <= tol) { pass++; console.log('PASS', name, got.toPrecision(6)); }
  else { fail++; console.log('FAIL', name, 'got', got, 'want', want); }
}
function ok(name, cond) { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }

// 1) 9 V with 1k and 2k in series -> 3 mA, 3 V and 6 V
let r = S.solve([
  { id: 'B1', type: 'battery', a: 'gnd', b: 'p', voltage: 9 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'm', resistance: 1000 },
  { id: 'R2', type: 'resistor', a: 'm', b: 'gnd', resistance: 2000 },
]);
near('series current R1', r.components.R1.current, 0.003);
near('series battery current', r.components.B1.current, 0.003);
near('V across R1', r.components.R1.voltage, 3);
near('V across R2 (divider)', r.components.R2.voltage, 6);
near('battery power', r.components.B1.power, 0.027);

// 2) 12 V across 1k || 1k -> 24 mA total, 12 mA each (with wires)
r = S.solve([
  { id: 'B1', type: 'battery', a: 'n0', b: 'n1', voltage: 12 },
  { id: 'W1', type: 'wire', a: 'n1', b: 'n2' },
  { id: 'R1', type: 'resistor', a: 'n2', b: 'n3', resistance: 1000 },
  { id: 'R2', type: 'resistor', a: 'n2', b: 'n3', resistance: 1000 },
  { id: 'W2', type: 'wire', a: 'n3', b: 'n0' },
]);
near('parallel total', r.components.B1.current, 0.024);
near('parallel branch', r.components.R1.current, 0.012);
near('wire current', r.components.W1.current, 0.024);

// 3) Series-parallel: 10 V, 100 Ω + (200 || 200) -> 50 mA total
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 10 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'x', resistance: 100 },
  { id: 'R2', type: 'resistor', a: 'x', b: 'g', resistance: 200 },
  { id: 'R3', type: 'resistor', a: 'x', b: 'g', resistance: 200 },
]);
near('series-parallel total', r.components.B1.current, 0.05);
near('series-parallel node x', r.nodeVoltages.x, 5);

// 4) LED: 5 V, 220 Ω, red LED Vf = 2 V -> (5-2)/(220+2) ≈ 13.5 mA
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 5 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'k', resistance: 220 },
  { id: 'D1', type: 'led', a: 'k', b: 'g', forwardVoltage: 2, maxCurrent: 0.03 },
]);
near('LED current', r.components.D1.current, 3 / 222);
ok('LED on', r.components.D1.on === true);

// 5) LED reversed -> off, ~0 current
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 5 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'k', resistance: 220 },
  { id: 'D1', type: 'led', a: 'g', b: 'k', forwardVoltage: 2 },
]);
ok('reversed LED off', r.components.D1.on === false && Math.abs(r.components.D1.current) < 1e-6);

// 6) LED below forward voltage -> off
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 1.5 },
  { id: 'D1', type: 'led', a: 'p', b: 'g', forwardVoltage: 2 },
]);
ok('LED under Vf off', r.components.D1.on === false);

// 7) Open switch -> no current; closed -> 6V/100Ω = 60 mA
const sw = (closed) => S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 6 },
  { id: 'S1', type: 'switch', a: 'p', b: 'q', closed },
  { id: 'L1', type: 'bulb', a: 'q', b: 'g', resistance: 100, ratedPower: 0.5 },
]);
near('open switch current', sw(false).components.L1.current, 0, 1e-6);
near('closed switch current', sw(true).components.L1.current, 0.06);
near('bulb power', sw(true).components.L1.power, 0.36);

// 8) Short circuit detection
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'p', voltage: 9 },
  { id: 'W1', type: 'wire', a: 'p', b: 'g' },
]);
ok('short detected', r.status === 'short');

// 9) Two batteries in series aiding: 3 V + 6 V across 900 Ω -> 10 mA
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 'm', voltage: 3 },
  { id: 'B2', type: 'battery', a: 'm', b: 'p', voltage: 6 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'g', resistance: 900 },
]);
near('series batteries', r.components.R1.current, 0.01);

// 10) Wheatstone bridge (KVL/KCL check): 10 V, R1=R3=1k, R2=2k, R4=1k, galvanometer 1k
r = S.solve([
  { id: 'B1', type: 'battery', a: 'g', b: 't', voltage: 10 },
  { id: 'R1', type: 'resistor', a: 't', b: 'l', resistance: 1000 },
  { id: 'R2', type: 'resistor', a: 'l', b: 'g', resistance: 2000 },
  { id: 'R3', type: 'resistor', a: 't', b: 'r', resistance: 1000 },
  { id: 'R4', type: 'resistor', a: 'r', b: 'g', resistance: 1000 },
  { id: 'R5', type: 'resistor', a: 'l', b: 'r', resistance: 1000 },
]);
// KCL at node l: I(R1) = I(R2) + I(R5)
near('bridge KCL', r.components.R1.current - r.components.R2.current - r.components.R5.current, 0, 1e-7);
// Hand-solved: 10 = 2.5Vl − Vr and 10 + Vl = 3Vr  →  Vl = 40/6.5 ≈ 6.1538 V, Vr ≈ 5.3846 V
near('bridge Vl', r.nodeVoltages.l, 40 / 6.5);
near('bridge Vr', r.nodeVoltages.r, (10 + 40 / 6.5) / 3);

// 11) No battery
ok('no source status', S.solve([{ id: 'R1', type: 'resistor', a: 'a', b: 'b', resistance: 10 }]).status === 'no-source');

// 12) Simulator presets solve to known answers
globalThis.Units = require('../public/js/units.js');
globalThis.CircuitSolver = S;
const Sim = require('../public/js/simulator.js') || globalThis.Simulator;
const PR = globalThis.Simulator.PRESETS;
r = S.solve(PR.series.comps); near('preset series 3 mA', r.components.R1.current, 0.003);
r = S.solve(PR.parallel.comps); near('preset parallel 13.5 mA', r.components.B1.current, 9 / (2000 / 3));
r = S.solve(PR.divider.comps); near('preset divider unloaded 6 V', r.components.R2.voltage, 6);
const loaded = JSON.parse(JSON.stringify(PR.divider.comps)); loaded.find((c) => c.id === 'S1').closed = true;
r = S.solve(loaded); near('preset divider loaded 4.5 V', r.components.R2.voltage, 4.5);
r = S.solve(PR.led.comps); near('preset LED ≈ 13.5 mA', r.components.D1.current, 3 / 222);
r = S.solve(PR['bulb-switch'].comps); near('preset bulb 0.5 A', r.components.L1.current, 0.5);
r = S.solve(PR.bridge.comps); near('preset bridge R5 current', r.components.R5.current, (40 / 6.5 - (10 + 40 / 6.5) / 3) / 1000);

// ---- Transient / AC ----
const gen = (o) => Object.assign({ id: 'G1', type: 'acsource', a: 'gnd', b: 'in', waveform: 'sine', amplitude: 5, frequency: 1000, offset: 0, duty: 50 }, o || {});
// RC charging: 5 V, 10 kΩ, 10 µF -> 63.2 % at τ = 100 ms
r = S.transient([
  { id: 'B1', type: 'battery', a: 'gnd', b: 'p', voltage: 5 },
  { id: 'R1', type: 'resistor', a: 'p', b: 'c', resistance: 10000 },
  { id: 'C1', type: 'capacitor', a: 'c', b: 'gnd', capacitance: 10e-6 },
], { tEnd: 0.5, steps: 5000 });
const kTau = Math.round(0.1 / r.dt);
near('RC charge 63.2 % at τ', r.series.c[kTau] / 5, 0.632, 0.01);
near('RC charge ≈ 99.3 % at 5τ', r.series.c[r.steps] / 5, 0.993, 0.01);
ok('DC transient reports final values (not RMS)', r.ac === false && r.components.C1.rms === false);
// RC low-pass at its corner: V_C lags the source by 45°, amplitude 0.707
r = S.transient([gen(), { id: 'R1', type: 'resistor', a: 'in', b: 'c', resistance: 1000 }, { id: 'C1', type: 'capacitor', a: 'c', b: 'gnd', capacitance: 159.15e-9 }], { tEnd: 0.008, steps: 4000 });
near('RC corner phase −45°', S.phaseDeg(r.t, r.series.in, r.series.c, 1000), -45, 2);
near('RC corner amplitude ratio 0.707', S.stats(r.series.c, r.window).pp / S.stats(r.series.in, r.window).pp, 0.7071, 0.02);
near('source Vrms = 5/√2', r.components.G1.voltage, 5 / Math.SQRT2, 0.02);
// RL: 10 mH + 62.8 Ω at 1 kHz -> V_R lags 45°
r = S.transient([gen(), { id: 'L1', type: 'inductor', a: 'in', b: 'r', inductance: 0.01 }, { id: 'R1', type: 'resistor', a: 'r', b: 'gnd', resistance: 62.83 }], { tEnd: 0.008, steps: 4000 });
near('RL corner phase −45°', S.phaseDeg(r.t, r.series.in, r.series.r, 1000), -45, 2);
// Half-wave rectifier: peak ≈ Vp − 0.7, no negative half
r = S.transient([gen({ amplitude: 10, frequency: 60 }), { id: 'D1', type: 'diode', a: 'in', b: 'o', forwardVoltage: 0.7 }, { id: 'R1', type: 'resistor', a: 'o', b: 'gnd', resistance: 1000 }], { steps: 2000 });
const hw = S.stats(r.series.o, r.window);
near('half-wave peak ≈ 9.3 V', hw.max, 9.3, 0.05);
ok('half-wave blocks negative half', hw.min > -0.01);
near('half-wave average ≈ Vp−Vf over π', hw.avg, 9.3 / Math.PI, 0.25);
// PWM 25 % duty (0–5 V) averages to 1.25 V
r = S.transient([gen({ waveform: 'square', amplitude: 2.5, offset: 2.5, duty: 25 }), { id: 'R1', type: 'resistor', a: 'in', b: 'gnd', resistance: 1000 }], { tEnd: 0.004, steps: 4000 });
near('PWM 25 % average 1.25 V', S.stats(r.series.in, r.window).avg, 1.25, 0.02);
// Ground component moves the reference
r = S.solve([{ id: 'B1', type: 'battery', a: 'n', b: 'p', voltage: 9 }, { id: 'R1', type: 'resistor', a: 'p', b: 'm', resistance: 1000 }, { id: 'R2', type: 'resistor', a: 'm', b: 'n', resistance: 1000 }, { id: 'GND', type: 'ground', a: 'm', b: 'm' }]);
near('ground at mid-point: + rail is +4.5 V', r.nodeVoltages.p, 4.5); near('− rail is −4.5 V', r.nodeVoltages.n, -4.5);
// Simulator AC presets solve
['ac-sine', 'pwm', 'rc-phase', 'rc-charge', 'rl-phase', 'half-wave', 'full-wave'].forEach((k) => {
  const p = PR[k]; const res = S.transient(p.comps, { tEnd: p.window, steps: 1500 });
  ok('AC preset ' + k + ' solves', p && res.ok && res.warnings.length === 0);
});
r = S.transient(PR['full-wave'].comps, { steps: 2000 });
const fw = S.stats(r.series['10,1'], r.window);
near('full-wave bridge peak ≈ Vp − 1.4', fw.max, 8.6, 0.1); ok('full-wave output never negative', fw.min > -0.01);
const th0 = Math.asin(1.4 / 10); // conduction starts once |v| > 2·Vf
near('full-wave average (exact conduction-angle formula)', fw.avg, (20 * Math.cos(th0) - 1.4 * (Math.PI - 2 * th0)) / Math.PI, 0.08);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
