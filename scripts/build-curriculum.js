#!/usr/bin/env node
/* Generates public/js/content/program.js from curriculum-source/curriculum.json (extracted verbatim
   from the curriculum generator) plus the app mapping below. Re-run after editing either:
     node scripts/build-curriculum.js                                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = JSON.parse(fs.readFileSync(path.join(root, 'curriculum-source/curriculum.json'), 'utf8'));

const PHASES = [
  { id: 'p1', number: 1, title: 'Foundations', modules: [1, 2, 3, 4] },
  { id: 'p2', number: 2, title: 'Circuit Theory & Devices', modules: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { id: 'p3', number: 3, title: 'Hands-On Workmanship', modules: [14, 15, 16, 17, 18] },
  { id: 'p4', number: 4, title: 'Troubleshooting & Capstone', modules: [19, 20] }
];

// App mapping per module: lessons, written-test pass mark (and where it comes from), simulator examples.
// Practical labs and instructor sign-offs from the source curriculum are intentionally NOT carried into
// the app (program decision, Oct 2026): a module is complete once its written test is passed or tested out.
const C = 'curriculum', P = 'curriculum design principle (written 80%)', A = 'app default (no written % in source)';
const MAP = {
  1: { lessons: ['m1-shock', 'm1-loto', 'm1-protection'], pass: 100, passSource: C, safety: true },
  2: { lessons: ['m2-esd-basics', 'm2-esd-practice'], pass: 100, safety: true,
       passSource: 'program policy: safety-critical Level 0 module (curriculum lists Quiz 80%)' },
  3: { lessons: ['m3-notation', 'm3-ratios', 'm3-trig', 'l4-binary'], pass: 80, passSource: C },
  4: { lessons: ['m4-dmm', 'm4-psu'], pass: 80, passSource: A },
  5: { lessons: ['l1-charge-current', 'l1-voltage', 'l1-ohms-law', 'l1-power', 'l1-series-parallel', 'm5-opens-shorts'], pass: 80, passSource: C, sims: ['series', 'parallel', 'bulb-switch'] },
  6: { lessons: ['l3-kirchhoff', 'l3-dividers', 'm6-bridge-sources'], pass: 80, passSource: C, sims: ['divider', 'bridge'] },
  7: { lessons: ['l2-resistors', 'm7-components', 'm7-datasheets'], pass: 80, passSource: A },
  8: { lessons: ['l3-ac', 'm8-scope', 'm8-generator'], pass: 80, passSource: C, sims: ['ac-sine', 'pwm', 'rc-phase'] },
  9: { lessons: ['l2-capacitors', 'l2-inductors', 'l3-rc', 'm9-filters-transformers'], pass: 75, passSource: C, sims: ['rc-charge', 'rc-phase', 'rl-phase'] },
  10: { lessons: ['l2-diodes-leds', 'l2-transistors-switches', 'm10-rectifiers-testing'], pass: 80, passSource: C, sims: ['led', 'two-leds', 'half-wave', 'full-wave'] },
  11: { lessons: ['l5-power-supplies', 'm11-supply-testing'], pass: 80, passSource: P, sims: ['half-wave', 'full-wave'] },
  12: { lessons: ['l5-opamps', 'm12-gain-db'], pass: 75, passSource: C },
  13: { lessons: ['l4-logic-gates', 'l4-sequential', 'm13-digital-practice'], pass: 80, passSource: C },
  14: { lessons: ['m14-schematics', 'm14-documents'], pass: 80, passSource: P },
  15: { lessons: ['m15-solder-science', 'm15-tht', 'm15-wires-rework'], pass: 80, passSource: P, workmanship: true },
  16: { lessons: ['m16-smt', 'm16-rework'], pass: 80, passSource: A, workmanship: true },
  17: { lessons: ['m17-standards', 'm17-defects'], pass: 80, passSource: A, workmanship: true, defectExercise: true },
  18: { lessons: ['m18-wire', 'm18-crimp', 'm18-harness'], pass: 80, passSource: P, workmanship: true },
  19: { lessons: ['m19-method', 'm19-failures'], pass: 80, passSource: A, sims: ['series', 'divider'] },
  20: { lessons: ['m20-capstone'], pass: 80, passSource: A }
};
const GATED = [15, 16, 17, 18, 19, 20]; // locked until Modules 1 and 2 are complete (Level 0)

const ADV_LESSONS = {
  'Microcontrollers & Embedded Basics': ['l4-arduino'],
  'Instrumentation, Sensors & Data Acquisition': ['l4-sensors'],
  'Advanced Analog & Circuit Analysis': ['l3-thevenin', 'l5-filters']
};

function assessmentFor(map) {
  return map.safety ? 'Written test (100% required, may retake)' : 'Written test (' + map.pass + '%)';
}

const modules = src.modules.map(function (m) {
  const map = MAP[m.number];
  if (!map) throw new Error('No mapping for module ' + m.number);
  const id = 'm' + m.number;
  return {
    id: id, number: m.number, track: 'core', phase: m.phase, title: m.title, hours: m.hours,
    objectives: m.objectives, topics: m.topics, assessment: assessmentFor(map), notes: m.notes || '',
    lessonIds: map.lessons, passPercent: map.pass, passSource: map.passSource,
    testOutPercent: map.safety ? 100 : Math.max(80, map.pass),
    safety: !!map.safety, level0: !!map.safety, workmanship: !!map.workmanship,
    gated: GATED.indexOf(m.number) >= 0, defectExercise: !!map.defectExercise,
    sims: map.sims || []
  };
});

const advanced = src.optional.map(function (o, i) {
  return { id: 'a' + (i + 1), number: i + 1, track: 'advanced', title: o.title, hours: o.hours, content: o.content,
    drawnFrom: o.drawnFrom, lessonIds: ADV_LESSONS[o.title] || [], passPercent: 80, testOutPercent: 80,
    passSource: 'app default', sims: [] };
});
advanced.push({ id: 'a9', number: 9, track: 'advanced', title: 'PCB Design & Signal Integrity (app supplement)', hours: null,
  content: 'Existing app lessons retained as optional enrichment. Not part of the source curriculum; no planned hours.',
  drawnFrom: 'Electronics Academy v1 lessons', supplement: true, lessonIds: ['l5-pcb', 'l5-signal-integrity'],
  passPercent: 80, testOutPercent: 80, passSource: 'app default', sims: [] });

const totalHours = modules.reduce((a, m) => a + m.hours, 0);
if (totalHours !== 304) throw new Error('Core hours ' + totalHours + ' != 304');

const program = {
  title: 'Electronics Technician Foundations Curriculum',
  coreHours: totalHours,
  phases: PHASES.map(p => ({ id: p.id, number: p.number, title: p.title, moduleIds: p.modules.map(n => 'm' + n),
    hours: p.modules.reduce((a, n) => a + modules[n - 1].hours, 0) })),
  modules: modules,
  advanced: advanced,
  level0: { moduleIds: ['m1', 'm2'], unlocks: GATED.map(n => 'm' + n),
    rule: 'Modules 1 (Safety) and 2 (ESD) form Level 0. Their written tests require 100% (test-out also only at 100%). Modules 15–20 stay locked until Modules 1 and 2 are complete.' },
  powerRule: 'Nothing is powered at the bench until the Module 1 safety quiz is passed at 100%.',
  pacing: { fullTimeHoursPerWeek: 40, partTimeHoursPerWeek: 16, note: 'Suggested pacing from the curriculum: about 8 weeks full time (40 h/wk), or about 19–20 weeks part time (16 h/wk). Modules 15–18 can run in parallel with Modules 8–13.' }
};

const out = '/* GENERATED by scripts/build-curriculum.js from curriculum-source/curriculum.json — do not edit by hand. */\n' +
  '(function (g) { g.EA_PROGRAM = ' + JSON.stringify(program, null, 1) + ';\n' +
  "  if (typeof module === 'object' && module.exports) module.exports = g.EA_PROGRAM;\n" +
  "})(typeof window !== 'undefined' ? window : globalThis);\n";
fs.writeFileSync(path.join(root, 'public/js/content/program.js'), out);
console.log('Wrote program.js: ' + modules.length + ' core modules (' + totalHours + ' h), ' + advanced.length + ' advanced');
