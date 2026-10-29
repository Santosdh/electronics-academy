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

// App mapping per module: lessons, written-test pass mark (and where it comes from), practical
// assessment items (from the curriculum's Assessment column), simulator examples.
const C = 'curriculum', P = 'curriculum design principle (written 80%)', A = 'app default (no written % in source)';
const MAP = {
  1: { lessons: ['m1-shock', 'm1-loto', 'm1-protection'], pass: 100, passSource: C, safety: true,
       practical: ['LOTO practical sign-off'] },
  2: { lessons: ['m2-esd-basics', 'm2-esd-practice'], pass: 100, safety: true,
       passSource: 'program policy: safety-critical Level 0 module (curriculum lists Quiz 80%)',
       practical: ['Daily wrist-strap check log maintained'] },
  3: { lessons: ['m3-notation', 'm3-ratios', 'm3-trig', 'l4-binary'], pass: 80, passSource: C, practical: [] },
  4: { lessons: ['m4-dmm', 'm4-psu'], pass: 80, passSource: A,
       practical: ['Practical check-off: 10 measurements within tolerance, no unsafe meter use'] },
  5: { lessons: ['l1-charge-current', 'l1-voltage', 'l1-ohms-law', 'l1-power', 'l1-series-parallel', 'm5-opens-shorts'], pass: 80, passSource: C,
       practical: ['Lab notebook review'], sims: ['series', 'parallel', 'bulb-switch'] },
  6: { lessons: ['l3-kirchhoff', 'l3-dividers', 'm6-bridge-sources'], pass: 80, passSource: C,
       practical: ['Predict and verify 3 node voltages'], sims: ['divider', 'bridge'] },
  7: { lessons: ['l2-resistors', 'm7-components', 'm7-datasheets'], pass: 80, passSource: A,
       practical: ['Practical ID quiz (90%)', 'Data-sheet scavenger hunt'] },
  8: { lessons: ['l3-ac', 'm8-scope', 'm8-generator'], pass: 80, passSource: C,
       practical: ['Practical scope check-off (set up and measure 5 signals unaided)'], sims: ['ac-sine', 'pwm', 'rc-phase'] },
  9: { lessons: ['l2-capacitors', 'l2-inductors', 'l3-rc', 'm9-filters-transformers'], pass: 75, passSource: C,
       practical: ['Lab report'], sims: ['rc-charge', 'rc-phase', 'rl-phase'] },
  10: { lessons: ['l2-diodes-leds', 'l2-transistors-switches', 'm10-rectifiers-testing'], pass: 80, passSource: C,
       practical: ['Practical component test'], sims: ['led', 'two-leds', 'half-wave', 'full-wave'] },
  11: { lessons: ['l5-power-supplies', 'm11-supply-testing'], pass: 80, passSource: P,
       practical: ['Practical: supply meets spec'], sims: ['half-wave', 'full-wave'] },
  12: { lessons: ['l5-opamps', 'm12-gain-db'], pass: 75, passSource: C, practical: ['Lab verification'] },
  13: { lessons: ['l4-logic-gates', 'l4-sequential', 'm13-digital-practice'], pass: 80, passSource: C,
       practical: ['Digital practical assessment'] },
  14: { lessons: ['m14-schematics', 'm14-documents'], pass: 80, passSource: P,
       practical: ['Practical: locate 10 items on board from schematic'] },
  15: { lessons: ['m15-solder-science', 'm15-tht', 'm15-wires-rework'], pass: 80, passSource: P, workmanship: true,
       practical: ['Workmanship inspection of practice board to IPC criteria (target Class 3, with defect log)'] },
  16: { lessons: ['m16-smt', 'm16-rework'], pass: 80, passSource: A, workmanship: true,
       practical: ['Workmanship inspection to IPC-A-610 criteria', 'Practical demonstration'] },
  17: { lessons: ['m17-standards', 'm17-defects'], pass: 80, passSource: A, workmanship: true, defectExercise: true,
       practical: ['Inspection exercise: find ≥90% of seeded defects (instructor-seeded board)'] },
  18: { lessons: ['m18-wire', 'm18-crimp', 'm18-harness'], pass: 80, passSource: P, workmanship: true,
       practical: ['Harness inspection against IPC/WHMA-A-620 criteria'] },
  19: { lessons: ['m19-method', 'm19-failures'], pass: 80, passSource: A,
       practical: ['Practical: isolate 3 of 4 unknown faults within the time limit', 'Troubleshooting report'], sims: ['series', 'divider'] },
  20: { lessons: ['m20-capstone'], pass: 80, passSource: A,
       practical: ['Capstone rubric: workmanship', 'Capstone rubric: functional test', 'Capstone rubric: documentation', 'Capstone rubric: troubleshooting debrief'] }
};
const GATED = [15, 16, 17, 18, 19, 20]; // locked until Modules 1 and 2 are complete (Level 0)

const ADV_LESSONS = {
  'Microcontrollers & Embedded Basics': ['l4-arduino'],
  'Instrumentation, Sensors & Data Acquisition': ['l4-sensors'],
  'Advanced Analog & Circuit Analysis': ['l3-thevenin', 'l5-filters']
};

function standardFor(n, kind) {
  const m = MAP[n];
  if (kind === 'lab') return m.workmanship
    ? 'Pass/fail against the instructor checklist; workmanship judged against the program’s IPC criteria with a defect log'
    : 'Pass/fail against the instructor checklist';
  return 'Pass/fail against the stated assessment standard';
}

const modules = src.modules.map(function (m) {
  const map = MAP[m.number];
  if (!map) throw new Error('No mapping for module ' + m.number);
  const id = 'm' + m.number;
  const checkoffs = m.labs.map(function (lab, i) {
    return { id: id + '-lab' + (i + 1), kind: 'lab', title: lab, standard: standardFor(m.number, 'lab'), required: true };
  }).concat(map.practical.map(function (p, i) {
    return { id: id + '-pa' + (i + 1), kind: 'assessment', title: p, standard: standardFor(m.number, 'assessment') + ': ' + m.assessment, required: true };
  }));
  return {
    id: id, number: m.number, track: 'core', phase: m.phase, title: m.title, hours: m.hours,
    objectives: m.objectives, topics: m.topics, labs: m.labs, assessment: m.assessment, notes: m.notes || '',
    lessonIds: map.lessons, passPercent: map.pass, passSource: map.passSource,
    testOutPercent: map.safety ? 100 : Math.max(80, map.pass),
    safety: !!map.safety, level0: !!map.safety, workmanship: !!map.workmanship,
    gated: GATED.indexOf(m.number) >= 0, defectExercise: !!map.defectExercise,
    checkoffs: checkoffs, sims: map.sims || []
  };
});

const advanced = src.optional.map(function (o, i) {
  return { id: 'a' + (i + 1), number: i + 1, track: 'advanced', title: o.title, hours: o.hours, content: o.content,
    drawnFrom: o.drawnFrom, lessonIds: ADV_LESSONS[o.title] || [], passPercent: 80, testOutPercent: 80,
    passSource: 'app default', checkoffs: [], sims: [] };
});
advanced.push({ id: 'a9', number: 9, track: 'advanced', title: 'PCB Design & Signal Integrity (app supplement)', hours: null,
  content: 'Existing app lessons retained as optional enrichment. Not part of the source curriculum; no planned hours.',
  drawnFrom: 'Electronics Academy v1 lessons', supplement: true, lessonIds: ['l5-pcb', 'l5-signal-integrity'],
  passPercent: 80, testOutPercent: 80, passSource: 'app default', checkoffs: [], sims: [] });

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
console.log('Wrote program.js: ' + modules.length + ' core modules (' + totalHours + ' h), ' + advanced.length + ' advanced, ' +
  modules.reduce((a, m) => a + m.checkoffs.length, 0) + ' check-off items');
