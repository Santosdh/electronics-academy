// Sanity checks for the curriculum structure. Run: node tests/content.test.js
const C = require('../server/curriculum.js');
const src = require('../curriculum-source/curriculum.json');
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };
const ids = new Set();
const bankLessonIds = new Set();
(globalThis.EA_LEVELS || []).forEach((l) => l.lessons.forEach((ls) => bankLessonIds.add(ls.id)));
(globalThis.EA_LESSON_BANK || []).forEach((ls) => bankLessonIds.add(ls.id));

check(C.phases.length === 4, 'expected 4 phases');
check(C.modules.length === 20, 'expected 20 core modules');
check(C.coreHours === 304, 'core hours should be 304');
check(C.modules.reduce((a, m) => a + m.hours, 0) === 304, 'module hours should sum to 304');
check(C.phases.reduce((a, p) => a + p.modules.length, 0) === 20, 'phases must cover all 20 modules');
// Faithful to the source: titles and hours match curriculum.json exactly (labs/practical sign-offs are intentionally not carried over).
src.modules.forEach((s, i) => {
  const m = C.modules[i];
  check(m.number === s.number && m.title === s.title && m.hours === s.hours, `module ${s.number} title/hours mismatch`);
  check(m.labs === undefined && m.checkoffs === undefined, `module ${s.number} still carries labs/check-offs (removed: no admin sign-offs)`);
  check(/^Written test/.test(m.assessment) && !/practical|instructor|sign/i.test(m.assessment), `module ${s.number} assessment should be written-test only`);
  check(m.lessons.length >= 1, `module ${s.number} has no lessons`);
  check(C.moduleQuestions(m.id).length >= 3, `module ${s.number} needs a written test`);
  check(m.passPercent >= 75 && m.passPercent <= 100, `module ${s.number} pass percent`);
  check(m.testOutPercent >= 80 && m.testOutPercent >= m.passPercent, `module ${s.number} test-out percent`);
});
['m1', 'm2'].forEach((id) => {
  const m = C.modulesById[id];
  check(m.safety && m.passPercent === 100 && m.testOutPercent === 100, id + ' must require 100%');
});
['m15', 'm16', 'm17', 'm18', 'm19', 'm20'].forEach((id) => check(C.modulesById[id].gated, id + ' must be gated'));
check(C.modules.filter((m) => m.gated).length === 6, 'only modules 15-20 gated');
check(C.modulesById.m11.lessons.some((l) => l.id === 'l5-power-supplies'), 'M11 must have the power-supply lesson');
check(C.modulesById.m17.defectExercise, 'M17 needs the defect exercise');
['l3-thevenin', 'l5-filters', 'l5-pcb', 'l5-signal-integrity', 'l4-arduino'].forEach((id) =>
  check(C.lessonsById[id] && C.lessonsById[id].track === 'advanced', id + ' should be Advanced track'));
check(src.optional.length === C.advanced.filter((a) => !a.supplement).length, 'all optional modules listed');
// Every lesson in the banks is assigned to exactly one module.
bankLessonIds.forEach((id) => check(C.lessonsById[id], 'lesson not assigned to a module: ' + id));
// No standard clause numbers invented: lessons must not cite section/clause numbers of IPC/NASA docs.
C.allLessons().forEach((ls) => {
  check(!ids.has(ls.id), 'dup lesson ' + ls.id); ids.add(ls.id);
  check(ls.body && ls.body.length >= 400, ls.id + ' body too short');
  check(ls.questions.length >= 3, ls.id + ' needs >=3 questions');
  check(!/(IPC|J-STD|8739)[^<]{0,40}(§|clause|section|para\.?)\s*\d/i.test(ls.body), ls.id + ' cites a standard clause');
  check(!/Level [1-5]\b/.test(ls.body), ls.id + ' still references old Level numbering');
  ls.questions.forEach((q) => {
    check(!ids.has(q.id), 'dup question ' + q.id); ids.add(q.id);
    check(q.answer >= 0 && q.answer < q.options.length, q.id + ' bad answer index');
    check(new Set(q.options).size === q.options.length, q.id + ' duplicate options');
    check(q.options.length === 4, q.id + ' should have 4 options');
    check(!!q.explanation, q.id + ' missing explanation');
  });
});
const nL = C.allLessons().length, nQ = Object.keys(C.questionsById).length;
console.log(`${C.phases.length} phases, ${C.modules.length} core modules (${C.coreHours} h), ${C.advanced.length} advanced, ${nL} lessons, ${nQ} questions`);
C.phases.forEach((p) => {
  console.log(`  Phase ${p.number} ${p.title} (${p.hours} h)`);
  p.modules.forEach((m) => console.log(`    M${m.number} ${m.title}: ${m.lessons.length} lessons, ${C.moduleQuestions(m.id).length} Qs, test ${C.moduleTestSize(m.id)} @ ${m.passPercent}%`));
});
if (errors.length) { console.log('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('content OK');
