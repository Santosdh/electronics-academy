/* Builds the curriculum index: program structure (phases → modules) from content/program.js,
   lessons from the lesson banks (content/level*.js from v1 and content/core-*.js). Browser + Node. */
(function (g) {
  var P = g.EA_PROGRAM;
  var bank = {};
  (g.EA_LEVELS || []).forEach(function (lvl) { lvl.lessons.forEach(function (ls) { bank[ls.id] = ls; }); });
  (g.EA_LESSON_BANK || []).forEach(function (ls) { bank[ls.id] = ls; });
  // Simulator examples for reused v1 lessons that now have AC/transient demos.
  var SIM_OVERRIDE = { 'l3-rc': 'rc-charge', 'l3-ac': 'ac-sine', 'l5-power-supplies': 'half-wave', 'l2-capacitors': 'rc-charge', 'l2-inductors': 'rl-phase' };

  var modulesById = {}, lessonsById = {}, questionsById = {};
  var core = P.modules, advanced = P.advanced, all = core.concat(advanced);
  all.forEach(function (m) {
    modulesById[m.id] = m;
    m.lessons = m.lessonIds.map(function (lid, i) {
      var ls = bank[lid];
      if (!ls) throw new Error('Module ' + m.id + ' references missing lesson ' + lid);
      if (lessonsById[lid]) throw new Error('Lesson ' + lid + ' used by two modules');
      ls.moduleId = m.id; ls.track = m.track; ls.index = i;
      if (SIM_OVERRIDE[lid]) ls.sim = SIM_OVERRIDE[lid];
      ls.questions = ls.questions.map(function (q, qi) {
        if (Array.isArray(q)) q = { q: q[0], options: q[1], answer: q[2], explanation: q[3] };
        if (!q.id) q.id = lid + '-q' + (qi + 1);
        q.lessonId = lid; q.moduleId = m.id;
        questionsById[q.id] = q;
        return q;
      });
      lessonsById[lid] = ls;
      return ls;
    });
  });
  var phasesById = {};
  P.phases.forEach(function (p) { phasesById[p.id] = p; p.modules = p.moduleIds.map(function (id) { return modulesById[id]; }); });

  g.CURRICULUM = {
    program: P, phases: P.phases, phasesById: phasesById,
    modules: core, advanced: advanced, allModules: all, modulesById: modulesById,
    lessonsById: lessonsById, questionsById: questionsById,
    coreHours: P.coreHours, level0: P.level0,
    MODULE_TEST_SIZE: 10,
    allLessons: function () { return all.reduce(function (a, m) { return a.concat(m.lessons); }, []); },
    coreLessons: function () { return core.reduce(function (a, m) { return a.concat(m.lessons); }, []); },
    moduleQuestions: function (moduleId) {
      var m = modulesById[moduleId]; if (!m) return [];
      return m.lessons.reduce(function (a, ls) { return a.concat(ls.questions); }, []);
    },
    // Number of questions on a module's written test: all questions for Level 0 safety modules.
    moduleTestSize: function (moduleId) {
      var m = modulesById[moduleId]; var n = this.moduleQuestions(moduleId).length;
      return m && m.safety ? n : Math.min(n, 10);
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = g.CURRICULUM;
})(typeof window !== 'undefined' ? window : globalThis);
