/* Electronics Academy — single-page app: 4-phase / 20-module program, written tests, check-offs, hours, admin. */
(function () {
  'use strict';
  var CUR = window.CURRICULUM, U = window.Units, esc = U.esc;
  var app = document.getElementById('app');
  var S = { user: null, progress: null };
  var KIND_LABEL = { module: 'Written test', lesson: 'Lesson check', 'testout-lesson': 'Lesson test-out', 'defect-practice': 'Defect exercise' };
  var STATUS = { complete: ['done', '✓ Complete'], 'awaiting-checkoffs': ['await', 'Awaiting check-offs'], 'in-progress': ['prog', 'In progress'],
    'not-started': ['', 'Not started'], locked: ['locked', '🔒 Locked'] };
  var SAFETY = { cleared: ['pass', '✓ Level 0 cleared'], partial: ['await', 'Level 0 partial'], 'not-cleared': ['fail', 'Level 0 not cleared'] };

  // ---------- API ----------
  function api(method, url, body) {
    return fetch('/api' + url, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var e = new Error(data.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; }
        return data;
      });
    });
  }
  function loadProgress() { return api('GET', '/progress').then(function (p) { S.progress = p; return p; }); }
  // Hooks for add-ons such as the guide companion (public/js/guide.js): read-only state access + DOM events.
  function emit(name, detail) { try { document.dispatchEvent(new CustomEvent('ea:' + name, { detail: detail })); } catch (e) { /* add-on errors never break the app */ } }
  window.EA_APP = { api: api, state: function () { return { user: S.user, progress: S.progress }; } };

  // ---------- helpers ----------
  function fmtDate(iso, withTime) {
    if (!iso) return '—';
    var d = new Date(iso);
    return withTime ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function relTime(iso) {
    if (!iso) return 'never';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 86400 * 30) return Math.floor(s / 86400) + ' d ago';
    return fmtDate(iso);
  }
  function pct(x) { return x == null ? '—' : Math.round(x) + '%'; }
  function bar(p, color) { return '<div class="bar"><div class="bar-fill" style="width:' + Math.max(0, Math.min(100, p || 0)) + '%;' + (color ? 'background:' + color : '') + '"></div></div>'; }
  function ring(p, size) {
    size = size || 120; var r = size / 2 - 10, c = 2 * Math.PI * r, off = c * (1 - (p || 0) / 100);
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="ring-text">' + Math.round(p || 0) + '%</text></svg>';
  }
  function methodBadge(m) {
    if (!m) return '';
    return m.method === 'test-out' ? '<span class="badge testout" title="Completed via test-out on ' + fmtDate(m.completedAt) + '">Tested out</span>'
      : '<span class="badge done" title="Completed by study on ' + fmtDate(m.completedAt) + '">✓ Studied</span>';
  }
  // Escapes text and renders simple subscripts: V_TH → V<sub>TH</sub>, R_DS(on) → R<sub>DS(on)</sub>
  function fmt(t) { return esc(t).replace(/([A-Za-zΩβ])_([A-Za-z0-9]+(?:\([a-z]+\))?)/g, '$1<sub>$2</sub>'); }
  function setTitle(t) { document.title = (t ? t + ' · ' : '') + 'Electronics Academy'; }
  function toast(msg, kind) {
    var el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg;
    document.body.appendChild(el); setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, 3200);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lessonState(id) { return S.progress && S.progress.lessons[id]; }
  function modSum(id, prog) {
    var s = (prog || S.progress).summary;
    return s.modules.find(function (m) { return m.id === id; }) || s.advanced.modules.find(function (m) { return m.id === id; });
  }
  function nextLesson() {
    var s = S.progress.summary;
    return CUR.coreLessons().find(function (l) { var ms = modSum(l.moduleId); return !lessonState(l.id) && ms && !ms.locked; });
  }
  function statusBadge(st) { var b = STATUS[st] || ['', st]; return '<span class="badge st-' + (b[0] || 'none') + '">' + b[1] + '</span>'; }
  function safetyBadge(st) { var b = SAFETY[st] || ['', st]; return '<span class="badge ' + b[0] + '">' + b[1] + '</span>'; }
  function coPill(st) { return '<span class="badge ' + (st === 'pass' ? 'pass' : st === 'fail' ? 'fail' : 'pending') + '">' + (st === 'pass' ? '✓ Pass' : st === 'fail' ? '✗ Fail' : 'Pending') + '</span>'; }
  function hrs(h) { return (Math.round((h || 0) * 10) / 10) + ' h'; }
  function today() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function modLabel(m) { return (m.track === 'advanced' ? 'A' : 'M') + m.number; }
  function phaseColor(n) { return ['#4f46e5', '#0891b2', '#16a34a', '#d97706'][(n || 1) - 1] || '#64748b'; }
  function simName(k) { var p = window.Simulator && window.Simulator.PRESETS[k]; return p ? p.name : k; }
  function errorBox(e) { return '<div class="card error-card"><h2>Something went wrong</h2><p>' + esc(e.message || e) + '</p><a class="btn" href="#/">Back to dashboard</a></div>'; }

  // ---------- chrome ----------
  function updateChrome(route) {
    document.body.classList.toggle('signed-out', !S.user);
    document.querySelectorAll('.admin-only').forEach(function (el) { el.hidden = !(S.user && S.user.role === 'admin'); });
    var chip = document.getElementById('userChip');
    chip.hidden = !S.user;
    if (S.user) document.getElementById('userName').textContent = S.user.name + (S.user.role === 'admin' ? ' (admin)' : '');
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === route); });
    document.getElementById('mainnav').classList.remove('open');
  }
  document.getElementById('navToggle').addEventListener('click', function () {
    var n = document.getElementById('mainnav'); n.classList.toggle('open');
    this.setAttribute('aria-expanded', n.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    var n = document.getElementById('mainnav');
    if (n.classList.contains('open') && !e.target.closest('#mainnav') && !e.target.closest('#navToggle')) {
      n.classList.remove('open'); document.getElementById('navToggle').setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('signOut').addEventListener('click', function () {
    api('POST', '/auth/logout').finally(function () { S.user = null; S.progress = null; location.hash = '#/login'; });
  });

  // ---------- views ----------
  function viewDashboard() {
    setTitle('Dashboard');
    var sum = S.progress.summary, nl = nextLesson(), cm = sum.currentModule && CUR.modulesById[sum.currentModule.id];
    var hp = sum.coreHours ? sum.hoursCredited / sum.coreHours * 100 : 0;
    app.innerHTML =
      '<section class="hero card">' +
      '<div class="hero-text"><p class="eyebrow">Welcome back</p><h1>Hi, ' + esc(S.user.name.split(' ')[0]) + ' 👋</h1>' +
      '<p>' + (!sum.safety.gateCleared ? 'Start with <strong>Level 0</strong>: Module 1 (Safety) and Module 2 (ESD). Both written tests need <strong>100%</strong>, and modules 15–20 unlock once both are complete.'
        : cm ? 'You’re on <strong>Module ' + cm.number + ': ' + esc(cm.title) + '</strong>' + (sum.currentModule.status === 'awaiting-checkoffs' ? ' — written test passed, waiting for instructor check-offs.' : '.') : 'All 20 core modules are complete. Outstanding!') + '</p>' +
      '<div class="btn-row">' + (cm ? '<a class="btn" href="#/module/' + cm.id + '">Open Module ' + cm.number + ' →</a>' : '') +
      (nl && (!cm || nl.moduleId !== cm.id) ? '<a class="btn ghost" href="#/lesson/' + nl.id + '">Next lesson: ' + esc(nl.title) + '</a>' : '') +
      '<a class="btn ghost" href="#/hours">Log hours</a></div></div>' +
      '<div class="hero-ring">' + ring(hp, 140) + '<div class="muted small"><strong>' + hrs(sum.hoursCredited) + '</strong> of ' + sum.coreHours + ' h credited</div></div></section>' +
      '<section class="stats">' +
      stat('🧩', sum.modulesComplete + '/' + sum.modulesTotal, 'Modules complete') + stat('🖊️', sum.checkoffsPassed + '/' + sum.checkoffsRequired, 'Check-offs signed') +
      stat('⏱️', hrs(sum.loggedHours), 'Hours logged') + stat('🎯', pct(sum.averageWrittenPercent), 'Avg written test') + '</section>' +
      safetyCard(sum, false) +
      '<h2 class="section-title">Phases</h2><section class="phase-grid">' +
      sum.phases.map(function (ph) {
        var P = CUR.phasesById[ph.id];
        return '<a class="card phase-card" href="#/program?ph=' + ph.id + '" style="--accent:' + phaseColor(ph.number) + '"><div class="eyebrow">Phase ' + ph.number + ' · ' + ph.hours + ' h</div><h3>' + esc(ph.title) + '</h3>' +
          bar(ph.percent, phaseColor(ph.number)) + '<div class="level-meta"><span>' + hrs(ph.hoursCredited) + ' / ' + ph.hours + ' h</span><span>' + ph.modulesComplete + '/' + ph.modulesTotal + ' modules</span></div>' +
          '<div class="mini-mods">' + P.modules.map(function (m) { var ms = modSum(m.id); return '<span class="mini ' + miniCls(ms) + '" title="M' + m.number + ' ' + esc(m.title) + ' — ' + (STATUS[ms.status] || [])[1] + '">' + m.number + '</span>'; }).join('') + '</div></a>';
      }).join('') + '</section>' +
      '<div class="two-col"><section class="card"><h2>Recent activity</h2>' + activityList(S.progress, 8) + '</section>' +
      '<section class="card"><h2>Quick links</h2><div class="quick-links">' +
      '<a href="#/simulator?preset=ac-sine">📈 AC scope demo</a><a href="#/simulator?preset=rc-phase">〰️ RC phase shift</a>' +
      '<a href="#/defects">🔍 Defect inspection (M17)</a><a href="#/advanced">🚀 Advanced track</a><a href="#/tools">⚖️ Calculators</a><a href="#/hours">⏱️ Hours log</a></div></section></div>';
  }
  function miniCls(ms) { return ms.complete ? 'full' : ms.locked ? 'locked' : ms.status === 'awaiting-checkoffs' ? 'await' : ms.status === 'in-progress' ? 'part' : ''; }
  function stat(icon, val, label) { return '<div class="card stat"><span class="stat-icon">' + icon + '</span><div><div class="stat-val">' + val + '</div><div class="muted small">' + label + '</div></div></div>'; }
  function safetyCard(sum, compact) {
    var sf = sum.safety;
    var row = function (id, label) {
      var ms = modSum(id), written = ms.written.passed, co = ms.checkoffs;
      return '<li><a href="#/module/' + id + '"><strong>' + label + '</strong></a><span>' + (written ? '<span class="badge pass">Written 100% ✓</span>' : '<span class="badge fail">Written: ' + (ms.written.bestPercent != null ? pct(ms.written.bestPercent) + ' (need 100%)' : 'not taken') + '</span>') +
        ' <span class="badge ' + (co.passed === co.required ? 'pass' : 'pending') + '">Check-offs ' + co.passed + '/' + co.required + '</span></span></li>';
    };
    return '<section class="card safety-card ' + sf.status + '"><div class="safety-head"><h2>🛡️ Level 0 — safety gate</h2>' + safetyBadge(sf.status) + '</div>' +
      '<ul class="safety-list">' + row('m1', 'M1 Orientation & Electrical Safety') + row('m2', 'M2 ESD Control') + '</ul>' +
      (compact ? '' : '<p class="small muted">' + esc(CUR.level0.rule) + ' ' + (sf.powerAllowed ? 'Bench-power practicals (Module 4 onward) can be signed off.' : 'Until the Module 1 written test is passed, nothing is powered at the bench, so practicals from Module 4 on cannot be signed off.') + '</p>') + '</section>';
  }
  function activityList(prog, n) {
    var items = [];
    Object.keys(prog.lessons).forEach(function (id) { var l = prog.lessons[id], ls = CUR.lessonsById[id]; if (ls) items.push({ at: l.completedAt, html: methodBadge(l) + ' ' + esc(ls.title) }); });
    prog.attempts.forEach(function (a) {
      var m = CUR.modulesById[a.moduleId];
      items.push({ at: a.createdAt, html: '<span class="badge ' + (a.passed ? 'pass' : 'fail') + '">' + (a.kind === 'defect-practice' ? pct(a.percent) : a.score + '/' + a.total) + '</span> ' +
        (a.kind === 'module' && a.mode === 'test-out' ? 'Test-out' : KIND_LABEL[a.kind]) + ': ' + esc(a.lessonId ? CUR.lessonsById[a.lessonId].title : modLabel(m) + ' ' + m.title) });
    });
    prog.checkoffs.forEach(function (c) {
      var m = CUR.modulesById[c.moduleId], it = m.checkoffs.find(function (x) { return x.id === c.itemId; });
      items.push({ at: c.signedAt, html: coPill(c.status) + ' Check-off: ' + esc(it ? it.title : c.itemId) + ' <span class="muted small">(' + modLabel(m) + ', signed by ' + esc(c.signerName) + ')</span>' });
    });
    prog.hours.forEach(function (h) { var m = CUR.modulesById[h.moduleId]; items.push({ at: h.createdAt, html: '<span class="badge">⏱ ' + hrs(h.hours) + '</span> logged on ' + modLabel(m) + ' ' + esc(m.title) }); });
    items.sort(function (a, b) { return b.at.localeCompare(a.at); });
    return items.length ? '<ul class="activity">' + items.slice(0, n).map(function (r) { return '<li><span>' + r.html + '</span><time>' + relTime(r.at) + '</time></li>'; }).join('') + '</ul>'
      : '<p class="muted">No activity yet. Lessons, written tests, check-offs and hours will show up here.</p>';
  }

  function viewProgram() {
    setTitle('Program');
    var sum = S.progress.summary;
    app.innerHTML = '<div class="page-head"><h1>📚 Program</h1><p class="muted">' + esc(CUR.program.title || 'Electronics Technician Program') + ': 4 phases, ' + CUR.modules.length + ' modules, ' + CUR.coreHours + ' core hours. ' +
      'A module is <strong>complete</strong> only when its written test is passed <strong>and</strong> every required practical check-off is signed by an instructor. Hours are credited when a module is complete.</p></div>' +
      safetyCard(sum, true) +
      sum.phases.map(function (ph) {
        var P = CUR.phasesById[ph.id];
        return '<section class="card phase-section" id="' + ph.id + '" style="--accent:' + phaseColor(ph.number) + '"><div class="level-section-head"><div><div class="eyebrow">Phase ' + ph.number + ' · ' + ph.hours + ' h</div><h2>' + esc(ph.title) + '</h2></div>' +
          '<div class="level-section-progress">' + hrs(ph.hoursCredited) + ' / ' + ph.hours + ' h' + bar(ph.percent, phaseColor(ph.number)) + '</div></div>' +
          '<ol class="module-list">' + P.modules.map(function (m) { return moduleRow(m, modSum(m.id)); }).join('') + '</ol></section>';
      }).join('') +
      '<section class="card advanced-teaser"><h2>🚀 Optional advanced track</h2><p class="muted">Extra modules outside the ' + CUR.coreHours + ' core hours (microcontrollers, RF, power electronics, PCB design, Thevenin/Norton, filters, signal integrity…). They don’t count towards core hours.</p><a class="btn ghost" href="#/advanced">Browse the advanced track →</a></section>';
    var anchor = (parseHash().params || {}).ph; if (anchor) { var el = document.getElementById(anchor); if (el) el.scrollIntoView(); }
  }
  function moduleRow(m, ms) {
    var tags = (m.safety ? '<span class="tag safety">Level 0 · 100%</span>' : '') + (m.gated ? '<span class="tag gated">Needs Level 0</span>' : '') + (m.workmanship ? '<span class="tag work">Workmanship</span>' : '');
    return '<li class="mod-row ' + (ms.locked ? 'is-locked' : '') + '"><a href="#/module/' + m.id + '"><span class="lesson-num">' + (ms.locked ? '🔒' : m.number) + '</span>' +
      '<span class="lesson-title">' + esc(m.title) + ' ' + tags + '<small>' + m.hours + ' h · ' + ms.lessons.done + '/' + ms.lessons.total + ' lessons · written ' + (ms.written.passed ? '✓ ' + pct(ms.written.bestPercent) : ms.written.bestPercent != null ? pct(ms.written.bestPercent) : '—') +
      ' (pass ' + ms.written.passPercent + '%) · check-offs ' + ms.checkoffs.passed + '/' + ms.checkoffs.required + (ms.loggedHours ? ' · ' + hrs(ms.loggedHours) + ' logged' : '') + '</small></span>' +
      '<span class="lesson-status">' + statusBadge(ms.status) + '</span></a></li>';
  }

  function viewAdvanced() {
    setTitle('Advanced track');
    app.innerHTML = '<nav class="crumbs"><a href="#/program">Program</a> › Advanced track</nav><div class="page-head"><h1>🚀 Optional advanced track</h1>' +
      '<p class="muted">These modules are <strong>outside the ' + CUR.coreHours + ' core hours</strong> and are not needed for program completion. Power supplies stay in the core program (Module 11). Lessons from the earlier app that go beyond the core curriculum (Thevenin/Norton, filters, PCB design, signal integrity, Arduino) live here.</p></div>' +
      '<section class="module-cards">' + CUR.advanced.map(function (m) {
        var ms = modSum(m.id);
        return '<a class="card adv-card" href="#/module/' + m.id + '"><div class="eyebrow">A' + m.number + ' · ' + (m.hours ? m.hours + ' h (optional)' : 'supplement') + '</div><h3>' + esc(m.title) + '</h3>' +
          '<p class="small">' + esc(m.content || '') + '</p>' + (m.lessons.length ? '<p class="small"><strong>' + ms.lessons.done + '/' + m.lessons.length + '</strong> lessons: ' + m.lessons.map(function (l) { return esc(l.title); }).join(', ') + '</p>' : '<p class="small muted">Outline only — no lessons in the app yet.</p>') +
          (m.drawnFrom ? '<p class="muted small">Drawn from: ' + esc(m.drawnFrom) + '</p>' : '') + '</a>';
      }).join('') + '</section>';
  }

  function viewModule(id) {
    var m = CUR.modulesById[id]; if (!m) return notFound();
    var ms = modSum(id), sum = S.progress.summary, adv = m.track === 'advanced';
    var ph = adv ? null : CUR.phasesById['p' + m.phase];
    setTitle(modLabel(m) + ' ' + m.title);
    var allStudied = m.lessons.length && m.lessons.every(function (l) { var s = lessonState(l.id); return s && s.method === 'study'; });
    var testPct = allStudied ? m.passPercent : m.testOutPercent, tries = S.progress.attempts.filter(function (a) { return a.moduleId === id && a.kind === 'module'; });
    var list = function (title, arr) { return arr && arr.length ? '<h3>' + title + '</h3><ul class="bullets">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; };
    var powerBlock = !adv && m.number >= 4 && !sum.safety.powerAllowed;
    app.innerHTML = '<nav class="crumbs"><a href="#/program">Program</a> › ' + (adv ? '<a href="#/advanced">Advanced track</a>' : '<a href="#/program?ph=' + ph.id + '">Phase ' + ph.number + '</a>') + ' › ' + modLabel(m) + '</nav>' +
      '<section class="card level-banner module-banner" style="--accent:' + (adv ? '#7c3aed' : phaseColor(m.phase)) + '"><span class="level-icon big">' + (ms.locked ? '🔒' : m.safety ? '🛡️' : m.workmanship ? '🔧' : adv ? '🚀' : '📘') + '</span><div class="grow">' +
      '<div class="eyebrow">' + (adv ? 'Advanced track (optional, outside core hours)' : 'Phase ' + m.phase + ': ' + esc(ph.title)) + ' · Module ' + m.number + ' · ' + m.hours + ' h</div><h1>' + esc(m.title) + '</h1>' +
      '<div class="banner-tags">' + statusBadge(ms.status) + (m.safety ? '<span class="tag safety">Level 0 · 100% required · no test-out below 100%</span>' : '') + (m.gated ? '<span class="tag gated">Unlocks after Level 0</span>' : '') + (m.workmanship ? '<span class="tag work">Workmanship module</span>' : '') + '</div>' +
      bar(ms.lessons.total ? ms.lessons.done / ms.lessons.total * 100 : 0, adv ? '#7c3aed' : phaseColor(m.phase)) + '<p class="small">' + ms.lessons.done + ' of ' + ms.lessons.total + ' lessons · ' + ms.lessons.studied + ' studied · ' + ms.lessons.testedOut + ' tested out' + (ms.loggedHours ? ' · ' + hrs(ms.loggedHours) + ' logged' : '') + '</p></div></section>' +
      (ms.locked ? '<div class="callout warn">🔒 <strong>Locked.</strong> ' + esc(CUR.level0.rule) + ' You can read the outline below; lessons, tests, hours and check-offs open once Level 0 is complete.</div>' : '') +
      (powerBlock ? '<div class="callout">⚡ Bench-power practicals can’t be signed off until the Module 1 safety written test is passed at 100%.</div>' : '') +
      '<div class="two-col wide-left"><div>' +
      '<section class="card module-outline">' + (adv ? '<h3>Content</h3><p>' + esc(m.content || '') + '</p>' + (m.drawnFrom ? '<p class="muted small">Drawn from: ' + esc(m.drawnFrom) + '</p>' : '') :
        list('Objectives', m.objectives) + list('Topics', m.topics) + list('Labs', m.labs) + '<h3>Assessment</h3><p>' + esc(m.assessment || '') + '</p>' +
        '<p class="small muted">Written-test pass mark: <strong>' + m.passPercent + '%</strong>' + (m.passSource === 'curriculum' ? ' (from the curriculum)' : ' (app default — the curriculum does not state one)') + '.</p>') + '</section>' +
      '<section class="card"><h2>Lessons</h2>' + (m.lessons.length ? '<ol class="lesson-list">' + m.lessons.map(function (l) {
        var st = lessonState(l.id);
        return '<li class="with-action"><a href="#/lesson/' + l.id + '"><span class="lesson-num">' + (l.index + 1) + '</span><span class="lesson-title">' + esc(l.title) + '<small>' + esc(l.summary) + '</small></span>' +
          '<span class="lesson-status">' + (methodBadge(st) || '<span class="muted small">' + l.minutes + ' min</span>') + '</span></a>' +
          (st || ms.locked ? '' : '<a class="btn tiny ghost" href="#/quiz/testout-lesson/' + l.id + '" title="Score ' + m.testOutPercent + '% to skip this lesson">Test out</a>') + '</li>';
      }).join('') + '</ol>' : '<p class="muted">No app lessons for this module yet — use the outline and your instructor’s materials.</p>') + '</section>' +
      (m.sims && m.sims.length ? '<section class="card"><h2>🔌 Simulator examples</h2><div class="quick-links">' + m.sims.map(function (k) { return '<a href="#/simulator?preset=' + k + '">' + esc(simName(k)) + '</a>'; }).join('') + '</div></section>' : '') +
      '</div><aside>' +
      completionCard(m, ms) +
      (m.lessons.length ? '<section class="card quiz-cta"><h2>📝 Written test</h2><p class="muted small">' + CUR.moduleTestSize(id) + ' questions' + (m.safety ? ' (every question in the module)' : '') + '. Pass mark <strong>' + m.passPercent + '%</strong>.</p>' +
        (allStudied ? '' : '<p class="small callout">Not all lessons studied yet, so this counts as a <strong>test-out</strong> at <strong>' + m.testOutPercent + '%</strong>. Passing marks the remaining lessons as tested out.</p>') +
        '<p class="small">Best: <strong>' + pct(ms.written.bestPercent) + '</strong> · ' + ms.written.attempts + ' attempt' + (ms.written.attempts === 1 ? '' : 's') + (ms.written.passed ? ' · <span class="badge pass">Passed</span>' : '') + '</p>' +
        (ms.locked ? '<button class="btn block" disabled>Locked</button>' : '<a class="btn block" href="#/quiz/module/' + id + '">' + (ms.written.passed ? 'Retake' : allStudied ? 'Take the written test' : 'Test out at ' + testPct + '%') + '</a>') +
        (tries.length ? '<ul class="activity compact">' + tries.slice(0, 4).map(function (a) { return '<li><span><span class="badge ' + (a.passed ? 'pass' : 'fail') + '">' + pct(a.percent) + '</span> ' + (a.mode === 'test-out' ? 'Test-out' : 'Test') + ' (needs ' + a.requiredPercent + '%)</span><time>' + relTime(a.createdAt) + '</time></li>'; }).join('') + '</ul>' : '') + '</section>' : '') +
      (m.defectExercise ? '<section class="card"><h2>🔍 Seeded-defect exercise</h2><p class="small muted">Practise on a randomly seeded virtual board: find ≥' + window.EA_DEFECTS.PASS_PERCENT + '% of seeded defects with at most ' + window.EA_DEFECTS.MAX_FALSE_CALLS + ' false call. Practice only — the check-off is signed by your instructor on a physical board.</p>' +
        (ms.defectPractice && ms.defectPractice.attempts ? '<p class="small">Best: <strong>' + pct(ms.defectPractice.bestPercent) + '</strong> over ' + ms.defectPractice.attempts + ' attempt(s)' + (ms.defectPractice.passed ? ' · <span class="badge pass">met 90%</span>' : '') + '</p>' : '') +
        (ms.locked ? '<button class="btn block" disabled>Locked</button>' : '<a class="btn block secondary" href="#/defects">Start an inspection</a>') + '</section>' : '') +
      checkoffCard(m, ms) + (adv ? '' : hoursCard(m, ms)) + '</aside></div>';
    bindHoursForm(m);
  }
  function completionCard(m, ms) {
    if (m.track === 'advanced' && !m.checkoffs.length) return '';
    var co = ms.checkoffs, ok1 = ms.written.passed, ok2 = co.passed === co.required;
    return '<section class="card completion ' + (ms.complete ? 'done' : '') + '"><h2>' + (ms.complete ? '✅ Module complete' : 'Completion') + '</h2><ul class="checklist">' +
      '<li class="' + (ok1 ? 'ok' : '') + '">' + (ok1 ? '✓' : '○') + ' Written test passed (' + m.passPercent + '%)</li>' +
      '<li class="' + (ok2 ? 'ok' : '') + '">' + (ok2 ? '✓' : '○') + ' Practical check-offs signed: ' + co.passed + ' of ' + co.required + '</li></ul>' +
      (ms.complete ? '<p class="small">Completed ' + fmtDate(ms.completedAt) + (m.track === 'core' ? ' · <strong>' + m.hours + ' h</strong> credited' : '') + '.</p>' : '<p class="small muted">' + (m.track === 'core' ? m.hours + ' h are credited when both are done.' : '') + '</p>') + '</section>';
  }
  function checkoffCard(m, ms) {
    if (!m.checkoffs.length) return '';
    return '<section class="card checkoffs"><h2>🖊️ Practical check-offs</h2><p class="small muted">Signed by an instructor (admin) with the date performed, result and a note. The latest signature for each item counts.</p><ul class="co-list">' +
      ms.checkoffs.items.map(function (it) {
        return '<li class="co-item ' + it.status + '"><div class="co-top">' + coPill(it.status) + ' <strong>' + esc(it.title) + '</strong> <span class="tag">' + (it.kind === 'assessment' ? 'assessment' : 'lab') + '</span></div>' +
          '<div class="small muted">' + esc(it.standard) + '</div>' +
          (it.signedAt ? '<div class="small co-sig">Performed ' + esc(it.performedOn) + ' · signed by <strong>' + esc(it.signerName) + '</strong> ' + relTime(it.signedAt) + (it.note ? ' · “' + esc(it.note) + '”' : '') + (it.history > 1 ? ' · ' + it.history + ' sign-offs' : '') + '</div>' : '') + '</li>';
      }).join('') + '</ul></section>';
  }
  function hoursCard(m, ms) {
    var mine = S.progress.hours.filter(function (h) { return h.moduleId === m.id; });
    return '<section class="card hours-card"><h2>⏱️ Hours</h2><p class="small">Logged <strong>' + hrs(ms.loggedHours) + '</strong> of ' + m.hours + ' h planned.' + bar(Math.min(100, ms.loggedHours / m.hours * 100)) + '</p>' +
      (ms.locked ? '' : '<form class="form hours-form" data-module="' + m.id + '"><div class="form-row"><label class="field"><span>Hours</span><input name="hours" type="number" min="0.25" max="24" step="0.25" required value="1"></label>' +
        '<label class="field"><span>Date</span><input name="workDate" type="date" required value="' + today() + '"></label></div>' +
        '<label class="field"><span>Note</span><input name="note" maxlength="500" placeholder="What did you work on?"></label><button class="btn small">Log hours</button></form>') +
      (mine.length ? '<ul class="activity compact">' + mine.slice(0, 5).map(hourItem).join('') + '</ul>' : '') + '</section>';
  }
  function hourItem(h) {
    var canDel = h.loggerRole !== 'admin' || S.user.role === 'admin';
    return '<li><span><strong>' + hrs(h.hours) + '</strong> · ' + esc(h.workDate) + (h.note ? ' · ' + esc(h.note) : '') + (h.loggerRole === 'admin' ? ' <span class="tag">logged by ' + esc(h.loggedByName) + '</span>' : '') + '</span>' +
      (canDel ? '<button class="link-btn small" data-del-hours="' + h.id + '" title="Remove entry">✕</button>' : '') + '</li>';
  }
  function bindHoursForm(m, after) {
    app.querySelectorAll('.hours-form').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var mid = f.getAttribute('data-module') || (f.moduleId && f.moduleId.value);
        api('POST', '/hours', { moduleId: mid, hours: +f.hours.value, workDate: f.workDate.value, note: f.note.value }).then(function (d) {
          S.progress = d.progress; toast('Logged ' + hrs(+f.hours.value), 'ok'); (after || route)();
        }).catch(function (err) { toast(err.message, 'error'); });
      });
    });
    app.querySelectorAll('[data-del-hours]').forEach(function (b) {
      b.addEventListener('click', function () {
        api('DELETE', '/hours/' + b.getAttribute('data-del-hours')).then(function (d) { S.progress = d.progress || S.progress; return d.progress ? null : loadProgress(); })
          .then(function () { toast('Entry removed', 'ok'); (after || route)(); }).catch(function (err) { toast(err.message, 'error'); });
      });
    });
  }

  function viewHours() {
    setTitle('Hours');
    var sum = S.progress.summary, H = S.progress.hours;
    var open = CUR.modules.filter(function (m) { return !modSum(m.id).locked; });
    var week = H.filter(function (h) { return Date.now() - new Date(h.workDate + 'T12:00:00').getTime() < 7 * 86400000; }).reduce(function (a, h) { return a + h.hours; }, 0);
    app.innerHTML = '<div class="page-head"><h1>⏱️ Hours</h1><p class="muted">Track time against the ' + sum.coreHours + '-hour core program. <strong>Credited</strong> hours come from completed modules (written test + check-offs); <strong>logged</strong> hours are the time you record.</p></div>' +
      '<section class="stats">' + stat('✅', hrs(sum.hoursCredited), 'Credited of ' + sum.coreHours + ' h') + stat('⏱️', hrs(sum.loggedHours), 'Logged in total') + stat('📅', hrs(week), 'Logged last 7 days') + stat('📈', pct(sum.percent), 'Program credited') + '</section>' +
      '<div class="two-col wide-left"><section class="card table-card"><h2>By module</h2><table class="simple-table hours-table"><thead><tr><th>Module</th><th>Planned</th><th>Logged</th><th>Credited</th><th>Status</th></tr></thead><tbody>' +
      CUR.modules.map(function (m) {
        var ms = modSum(m.id);
        return '<tr class="' + (ms.locked ? 'is-locked' : '') + '"><td><a href="#/module/' + m.id + '">M' + m.number + ' ' + esc(m.title) + '</a></td><td>' + m.hours + ' h</td><td>' + (ms.loggedHours ? '<div class="mini-bar">' + bar(Math.min(100, ms.loggedHours / m.hours * 100)) + '</div>' + hrs(ms.loggedHours) : '—') + '</td>' +
          '<td>' + (ms.complete ? '<strong>' + m.hours + ' h</strong>' : '—') + '</td><td>' + statusBadge(ms.status) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><th>Total</th><th>' + sum.coreHours + ' h</th><th>' + hrs(sum.loggedHours) + '</th><th>' + hrs(sum.hoursCredited) + '</th><th></th></tr></tfoot></table></section>' +
      '<aside><section class="card"><h2>Log time</h2><form class="form hours-form"><label class="field"><span>Module</span><select name="moduleId">' + open.map(function (m) {
        return '<option value="' + m.id + '"' + (sum.currentModule && sum.currentModule.id === m.id ? ' selected' : '') + '>M' + m.number + ' ' + esc(m.title) + '</option>'; }).join('') + '</select></label>' +
      '<div class="form-row"><label class="field"><span>Hours</span><input name="hours" type="number" min="0.25" max="24" step="0.25" required value="1"></label><label class="field"><span>Date</span><input name="workDate" type="date" required value="' + today() + '"></label></div>' +
      '<label class="field"><span>Note</span><input name="note" maxlength="500" placeholder="e.g. Lab 2 soldering practice"></label><button class="btn block">Log hours</button></form></section>' +
      '<section class="card"><h2>Recent entries</h2>' + (H.length ? '<ul class="activity compact">' + H.slice(0, 12).map(function (h) { var m = CUR.modulesById[h.moduleId]; return hourItem(h).replace('<span><strong>', '<span><span class="tag">' + modLabel(m) + '</span> <strong>'); }).join('') + '</ul>' : '<p class="muted">No hours logged yet.</p>') + '</section></aside></div>';
    bindHoursForm(null, viewHours);
  }

  // Volt on the sign-in screen (artist's artwork; styles + timeline in css/volt-fx.css). The entrance plays once per page load;
  // later renders (sign out, invite page) show him already landed. Never takes clicks and sits under the card.
  var voltWelcomePlayed = false;
  function voltWelcome() {
    return '<div class="auth-volt" data-phase="enter">' +
      '<div class="av-trail m" aria-hidden="true"></div><div class="av-trail c" aria-hidden="true"></div><div class="av-fly">' +
      '<div class="av-bob"><div class="av-rock"><div class="av-body"><div class="av-pic">' +
      '<img class="av-img" src="img/volt-welcome.jpg" alt="Volt, the academy guide, waving hello" width="864" height="1152" decoding="async">' +
      '<img class="av-wave" src="img/volt-welcome-wave.jpg" alt="" aria-hidden="true" width="864" height="1152" decoding="async">' +
      '</div><span class="av-ring" aria-hidden="true"></span></div></div>' +
      '<div class="av-bubble"><b>Volt</b><span>HELLO, I’M VOLT</span></div></div></div></div>';
  }
  function startVoltWelcome() {
    var el = app.querySelector('.auth-volt'); if (!el) return;
    var W = window.VOLT_WELCOME = window.VOLT_WELCOME || { plays: 0 };
    var wave = el.querySelector('.av-wave');
    function noWave() { el.classList.add('no-wave'); W.wave = 'rock'; }
    W.wave = 'frames';
    if (wave.complete && !wave.naturalWidth) noWave(); else wave.addEventListener('error', noWave);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (voltWelcomePlayed || reduced) { el.classList.add('is-idle'); el.dataset.phase = 'idle'; W.mode = reduced ? 'static' : 'idle'; return; }
    voltWelcomePlayed = true; W.plays++; W.mode = 'entrance'; W.startedAt = Date.now();
    var u = 1 / (+window.VOLT_WELCOME_SPEED || 1);
    el.style.setProperty('--av-u', u + 's');
    el.classList.add('is-entering');
    [['land', 1.15], ['wave', 1.8], ['idle', 3.5]].forEach(function (s) {
      setTimeout(function () { el.dataset.phase = s[0]; if (s[0] === 'idle') W.doneAt = Date.now(); }, s[1] * 1000 * u);
    });
  }

  function viewLogin() {
    setTitle('Sign in');
    app.innerHTML =
      '<div class="auth-wrap">' + voltWelcome() + '<div class="auth-card card">' +
      '<div class="auth-hero"><span class="auth-logo">⚡</span><h1>Electronics Academy</h1><p>From Ohm’s law to signal integrity — lessons, quizzes and a live circuit simulator for your team.</p></div>' +
      '<form id="loginForm" class="form" novalidate>' +
      '<label class="field"><span>Email</span><input type="email" name="email" autocomplete="username" required placeholder="you@company.com"></label>' +
      '<label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required placeholder="••••••••"></label>' +
      '<div id="loginErr" class="error-text" role="alert"></div>' +
      '<button class="btn block" type="submit">Sign in</button>' +
      '<p class="muted small center">New team member? Ask your team lead for an invite link.</p>' +
      '</form></div></div>';
    startVoltWelcome();
    document.getElementById('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button');
      btn.disabled = true; btn.textContent = 'Signing in…';
      api('POST', '/auth/login', { email: f.email.value, password: f.password.value }).then(function (d) {
        S.user = d.user; return loadProgress();
      }).then(function () { location.hash = '#/'; }).catch(function (err) {
        document.getElementById('loginErr').textContent = err.message; btn.disabled = false; btn.textContent = 'Sign in';
      });
    });
  }

  function viewInvite(token) {
    setTitle('Accept invite');
    app.innerHTML = '<div class="auth-wrap">' + voltWelcome() + '<div class="auth-card card"><p class="muted">Checking invite…</p></div></div>';
    startVoltWelcome();
    api('GET', '/auth/invite/' + encodeURIComponent(token)).then(function (inv) {
      app.querySelector('.auth-card').innerHTML = (inv.reset
        ? '<div class="auth-hero"><span class="auth-logo">⚡</span><h1>Reset your password</h1><p>Choose a new password for <strong>' + esc(inv.email) + '</strong>. Your old password keeps working until you save this one.</p></div>'
        : '<div class="auth-hero"><span class="auth-logo">⚡</span><h1>Welcome, ' + esc(inv.name) + '!</h1><p>Set a password to join Electronics Academy as <strong>' + esc(inv.email) + '</strong>.</p></div>') +
        '<form id="invForm" class="form"><label class="field"><span>Your name</span><input name="name" value="' + esc(inv.name) + '"></label>' +
        '<label class="field"><span>' + (inv.reset ? 'New password' : 'Choose a password') + ' (8+ characters)</span><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>' +
        '<div id="invErr" class="error-text"></div><button class="btn block">' + (inv.reset ? 'Save new password' : 'Create account') + '</button></form>';
      document.getElementById('invForm').addEventListener('submit', function (e) {
        e.preventDefault();
        api('POST', '/auth/accept-invite', { token: token, name: e.target.name.value, password: e.target.password.value })
          .then(function (d) { S.user = d.user; return loadProgress(); }).then(function () { location.hash = '#/'; })
          .catch(function (err) { document.getElementById('invErr').textContent = err.message; });
      });
    }).catch(function (e) {
      app.querySelector('.auth-card').innerHTML = '<h2>Invite not valid</h2><p>' + esc(e.message) + '</p><a class="btn" href="#/login">Go to sign in</a>';
    });
  }


  function viewLesson(id) {
    var l = CUR.lessonsById[id]; if (!l) return notFound();
    var m = CUR.modulesById[l.moduleId], ms = modSum(m.id), st = lessonState(id);
    var prev = m.lessons[l.index - 1], next = m.lessons[l.index + 1];
    setTitle(l.title);
    var col = m.track === 'advanced' ? '#7c3aed' : phaseColor(m.phase);
    app.innerHTML = '<nav class="crumbs"><a href="#/program">Program</a> › <a href="#/module/' + m.id + '">' + modLabel(m) + ': ' + esc(m.title) + '</a> › ' + esc(l.title) + '</nav>' +
      (ms.locked ? '<div class="callout warn">🔒 This module is locked until Level 0 (Modules 1 and 2) is complete. You can read ahead, but completion and tests open later.</div>' : '') +
      '<div class="lesson-layout"><article class="card lesson" style="--accent:' + col + '">' +
      '<header><div class="eyebrow">' + modLabel(m) + ' · Lesson ' + (l.index + 1) + ' of ' + m.lessons.length + ' · ' + l.minutes + ' min</div><h1>' + esc(l.title) + '</h1><p class="lead">' + esc(l.summary) + '</p></header>' +
      '<div class="lesson-body">' + l.body + '</div>' +
      '<div class="keypoints"><h3>Key points</h3><ul>' + l.keyPoints.map(function (k) { return '<li>' + fmt(k) + '</li>'; }).join('') + '</ul></div>' +
      (l.sim ? '<a class="sim-link" href="#/simulator?preset=' + l.sim + '">🔌 Try it in the circuit simulator: ' + esc(simName(l.sim)) + ' →</a>' : '') +
      '<footer class="lesson-foot"><div id="completeBox"></div>' +
      '<div class="btn-row">' + (prev ? '<a class="btn ghost" href="#/lesson/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '') + (next ? '<a class="btn ghost" href="#/lesson/' + next.id + '">' + esc(next.title) + ' →</a>' : '<a class="btn ghost" href="#/module/' + m.id + '">Back to ' + modLabel(m) + ' →</a>') + '</div></footer>' +
      '</article><aside class="lesson-aside"><section class="card"><h3>✅ Quick check</h3><p class="muted small">' + l.questions.length + ' practice questions on this lesson, with explanations.</p>' + (ms.locked ? '<button class="btn block" disabled>Locked</button>' : '<a class="btn block" href="#/quiz/lesson/' + l.id + '">Check my understanding</a>') + '</section>' +
      (st || ms.locked ? '' : '<section class="card testout-cta"><h3>⚡ Already know this?</h3><p class="muted small">Score ' + m.testOutPercent + '%' + (m.safety ? ' (Level 0 — no test-out below 100%)' : '+') + ' to mark it complete via test-out.</p><a class="btn block secondary" href="#/quiz/testout-lesson/' + l.id + '">Test out of this lesson</a></section>') +
      '<section class="card"><h3>' + modLabel(m) + ' written test</h3><p class="muted small">Pass mark ' + m.passPercent + '%. Module completion also needs instructor check-offs.</p><a class="btn block ghost" href="#/module/' + m.id + '">Module overview</a></section>' +
      '</aside></div>';
    renderComplete();
    function renderComplete() {
      var box = document.getElementById('completeBox'), s = lessonState(id);
      if (s) {
        box.innerHTML = '<div class="complete-note">' + methodBadge(s) + ' <span class="muted small">on ' + fmtDate(s.completedAt) + '</span>' +
          (s.method === 'study' ? ' <button class="link-btn small" id="undoComplete">Mark as not done</button>' : '') + '</div>';
        var u = document.getElementById('undoComplete');
        if (u) u.addEventListener('click', function () { api('DELETE', '/lessons/' + id + '/complete').then(function (p) { S.progress = p; renderComplete(); }); });
      } else if (ms.locked) {
        box.innerHTML = '<button class="btn" disabled>🔒 Locked until Level 0 is complete</button>';
      } else {
        box.innerHTML = '<button class="btn" id="markDone">✓ Mark lesson complete</button>';
        document.getElementById('markDone').addEventListener('click', function () {
          this.disabled = true;
          api('POST', '/lessons/' + id + '/complete').then(function (p) { S.progress = p; toast('Lesson completed! 🎉', 'ok'); renderComplete(); })
            .catch(function (e) { toast(e.message, 'error'); });
        });
      }
    }
  }

  function viewQuiz(kind, ref) {
    if (['module', 'lesson', 'testout-lesson'].indexOf(kind) < 0) return notFound();
    var isLesson = kind !== 'module';
    var lesson = isLesson ? CUR.lessonsById[ref] : null, m = isLesson ? (lesson && CUR.modulesById[lesson.moduleId]) : CUR.modulesById[ref];
    if (!m || (!isLesson && !m.lessons.length)) return notFound();
    var ms = modSum(m.id);
    var allStudied = m.lessons.every(function (l) { var s = lessonState(l.id); return s && s.method === 'study'; });
    var isTestOut = kind === 'testout-lesson' || (kind === 'module' && !allStudied);
    var need = kind === 'lesson' ? m.passPercent : isTestOut ? m.testOutPercent : m.passPercent;
    var label = kind === 'module' ? (isTestOut ? 'Module test-out' : 'Written test') : KIND_LABEL[kind];
    var subject = lesson ? lesson.title : modLabel(m) + ': ' + m.title;
    var count = kind === 'module' ? CUR.moduleTestSize(m.id) : lesson.questions.length;
    setTitle(label);
    var back = lesson ? '#/lesson/' + lesson.id : '#/module/' + m.id;
    var col = m.track === 'advanced' ? '#7c3aed' : phaseColor(m.phase);
    app.innerHTML = '<nav class="crumbs"><a href="#/program">Program</a> › <a href="#/module/' + m.id + '">' + modLabel(m) + '</a> › ' + label + '</nav>' +
      '<section class="card quiz ' + (isTestOut ? 'is-testout' : '') + '" style="--accent:' + col + '" id="quizBox"></section>';
    var box = document.getElementById('quizBox');
    var session = null, idx = 0, answers = {}, correct = 0, orders = {};
    if (ms.locked) { box.innerHTML = '<div class="quiz-intro"><h1>🔒 Locked</h1><p>' + esc(CUR.level0.rule) + '</p><a class="btn" href="#/module/m1">Go to Module 1</a></div>'; return; }
    box.innerHTML = '<div class="quiz-intro"><div class="eyebrow">' + (isTestOut ? '⚡ Test-out' : kind === 'module' ? '📝 Written test' : '📝 Practice check') + '</div><h1>' + esc(subject) + '</h1>' +
      '<ul class="quiz-facts"><li><strong>' + count + '</strong> multiple-choice questions</li><li>Pass mark <strong>' + need + '%</strong> (' + Math.ceil(count * need / 100 - 1e-9) + ' of ' + count + ')</li>' +
      '<li>You’ll see the explanation after each answer</li></ul>' +
      (m.safety && kind !== 'lesson' ? '<div class="callout warn">🛡️ Level 0 safety module: <strong>100% required</strong>, no test-out below 100%. You may retake as often as you need.</div>' : '') +
      (isTestOut ? '<div class="callout">Passing marks ' + (lesson ? 'this lesson' : 'every remaining lesson in ' + modLabel(m)) + ' as <strong>completed via test-out</strong>' + (kind === 'module' ? ' and counts as the module’s written test' : '') + '. Practical check-offs are still required for module completion.</div>' : '') +
      (kind === 'module' && !isTestOut ? '<div class="callout">Passing the written test is half of module completion — your instructor also signs the practical check-offs.</div>' : '') +
      '<div class="btn-row"><button class="btn" id="startQuiz">Start</button><a class="btn ghost" href="' + back + '">Cancel</a></div></div>';
    document.getElementById('startQuiz').addEventListener('click', function () {
      this.disabled = true;
      api('POST', '/quiz/start', { kind: kind, moduleId: m.id, lessonId: lesson && lesson.id }).then(function (s) { session = s; need = s.passPercent; showQ(); })
        .catch(function (e) { box.innerHTML = errorBox(e); });
    });
    function showQ() {
      var qid = session.questionIds[idx], q = CUR.questionsById[qid];
      orders[qid] = orders[qid] || shuffle(q.options.map(function (_, i) { return i; }));
      var total = session.questionIds.length;
      box.innerHTML = '<div class="quiz-top"><span class="eyebrow">' + (isTestOut ? '⚡ Test-out · ' : '') + esc(subject) + '</span><span class="muted small">Question ' + (idx + 1) + ' of ' + total + ' · ' + correct + ' correct</span></div>' +
        bar(idx / total * 100) + '<h2 class="question" data-qid="' + qid + '">' + fmt(q.q) + '</h2>' +
        '<div class="options" role="radiogroup">' + orders[qid].map(function (oi, k) {
          return '<button class="option" data-oi="' + oi + '" role="radio" aria-checked="false"><span class="opt-key">' + 'ABCDEF'[k] + '</span><span>' + fmt(q.options[oi]) + '</span></button>';
        }).join('') + '</div><div id="feedback"></div>';
      box.querySelectorAll('.option').forEach(function (b) {
        b.addEventListener('click', function () {
          if (answers[qid] != null) return;
          var oi = +b.getAttribute('data-oi'); answers[qid] = oi;
          var ok = oi === q.answer; if (ok) correct++;
          box.querySelectorAll('.option').forEach(function (o) {
            o.disabled = true; var v = +o.getAttribute('data-oi');
            if (v === q.answer) o.classList.add('correct'); else if (v === oi) o.classList.add('wrong');
            o.setAttribute('aria-checked', v === oi);
          });
          var last = idx === total - 1;
          document.getElementById('feedback').innerHTML = '<div class="feedback ' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? '✅ Correct!' : '❌ Not quite.') + '</strong> ' + fmt(q.explanation || '') + '</div>' +
            '<div class="btn-row"><button class="btn" id="nextQ">' + (last ? 'See results' : 'Next question →') + '</button></div>';
          document.getElementById('nextQ').addEventListener('click', function () { if (last) submit(); else { idx++; showQ(); } });
          emit('quiz-answer', { questionId: qid, correct: ok, moduleId: m.id, kind: kind, last: last });
          document.getElementById('nextQ').focus();
        });
      });
    }
    function submit() {
      box.innerHTML = '<p class="muted">Saving your result…</p>';
      api('POST', '/quiz/' + session.sessionId + '/submit', { answers: answers }).then(function (d) {
        S.progress = d.progress; var r = d.result, granted = r.grantedLessons || [], ms2 = modSum(m.id);
        var after = kind !== 'module' ? '' : r.passed ? (ms2.complete ? '<div class="callout ok">✅ <strong>' + modLabel(m) + ' is complete</strong> — written test passed and all check-offs signed.' + (m.track === 'core' ? ' ' + m.hours + ' h credited.' : '') + '</div>'
          : ms2.checkoffs.required ? '<div class="callout ok">Written test passed. <strong>' + (ms2.checkoffs.required - ms2.checkoffs.passed) + ' practical check-off(s)</strong> still need an instructor’s signature before ' + modLabel(m) + ' is complete.</div>' : '') : '';
        box.innerHTML = '<div class="quiz-result ' + (r.passed ? 'passed' : 'failed') + '">' + ring(r.percent, 150) +
          '<h1>' + (r.passed ? (isTestOut ? 'Tested out! ⚡' : 'Passed! 🎉') : 'Keep practising 💪') + '</h1>' +
          '<p>You scored <strong>' + r.score + ' / ' + r.total + '</strong> (' + pct(r.percent) + '). Pass mark: ' + r.requiredPercent + '%.</p>' + after +
          (isTestOut ? (r.passed ? '<div class="callout ok">' + (granted.length ? granted.length + ' lesson' + (granted.length === 1 ? '' : 's') + ' marked <strong>completed via test-out</strong>: ' + granted.map(function (g) { return esc(CUR.lessonsById[g].title); }).join(', ') + '.' : 'Passed — those lessons were already complete.') + '</div>'
            : '<div class="callout">Not passed this time, so no lessons were marked complete. Review the lessons and try again.</div>') : '') +
          '<div class="btn-row center"><a class="btn" href="' + back + '">' + (lesson ? 'Back to lesson' : 'Back to module') + '</a><a class="btn ghost" href="#/quiz/' + kind + '/' + ref + '" id="retry">Try again</a></div></div>' +
          '<h2>Review</h2><ol class="review">' + r.detail.map(function (dq) {
            var q = CUR.questionsById[dq.questionId];
            return '<li class="' + (dq.correct ? 'ok' : 'bad') + '"><strong>' + fmt(q.q) + '</strong><br><span class="small">Your answer: ' + (dq.chosen == null ? '—' : fmt(q.options[dq.chosen])) +
              (dq.correct ? ' ✅' : ' ❌ · Correct: ' + fmt(q.options[q.answer])) + '</span><p class="small muted">' + fmt(q.explanation || '') + '</p></li>';
          }).join('') + '</ol>';
        document.getElementById('retry').addEventListener('click', function (e) { e.preventDefault(); route(true); });
        emit('quiz-result', { moduleId: m.id, kind: kind, passed: r.passed, percent: r.percent, testOut: isTestOut });
      }).catch(function (e) { box.innerHTML = errorBox(e); });
    }
  }

  function viewDefects() {
    var ms = modSum('m17'), D = window.EA_DEFECTS;
    setTitle('Defect inspection');
    app.innerHTML = '<nav class="crumbs"><a href="#/program">Program</a> › <a href="#/module/m17">M17</a> › Seeded-defect exercise</nav>' +
      '<div class="page-head"><h1>🔍 Seeded-defect inspection</h1><p class="muted">Module 17 practice. A virtual board has been seeded with defects. Inspect all 12 locations and record the condition you see. Pass: find ≥' + D.PASS_PERCENT + '% of seeded defects with the right type, with no more than ' + D.MAX_FALSE_CALLS + ' false call. ' +
      'This is practice — the M17 check-off is signed by your instructor on a physical board.</p></div><div id="dxBox"><p class="muted">Preparing a board…</p></div>';
    var box = document.getElementById('dxBox');
    if (ms.locked) { box.innerHTML = '<div class="callout warn">🔒 Module 17 unlocks after Level 0 (Modules 1 and 2) is complete.</div>'; return; }
    api('POST', '/quiz/start', { kind: 'defect-practice' }).then(function (s) {
      var b = s.board, conds = b.conditions;
      box.innerHTML = '<div class="dx-layout"><section class="dx-grid">' + b.locations.map(function (L) {
        return '<div class="card dx-loc" data-loc="' + L.id + '"><div class="dx-head"><strong>' + L.id + '</strong> <span class="muted small">' + esc(L.ref) + ' · ' + (L.kind === 'smt' ? 'SMT' : 'Through-hole') + '</span></div>' + L.svg +
          '<select class="dx-sel" data-loc="' + L.id + '" aria-label="Condition at ' + L.id + '"><option value="">— choose —</option>' +
          conds.filter(function (c) { return c.kinds.indexOf(L.kind) >= 0; }).map(function (c) { return '<option value="' + c.id + '">' + esc(c.label) + '</option>'; }).join('') + '</select><div class="dx-res small"></div></div>';
      }).join('') + '</section><aside><section class="card dx-ref"><h3>Condition guide</h3><dl>' + conds.map(function (c) { return '<dt>' + esc(c.label) + '</dt><dd class="small muted">' + esc(c.hint) + '</dd>'; }).join('') + '</dl></section>' +
        '<section class="card"><p class="small" id="dxCount">0 of 12 locations recorded</p><button class="btn block" id="dxSubmit">Submit inspection</button>' +
        (ms.defectPractice && ms.defectPractice.attempts ? '<p class="small muted">Best so far: ' + pct(ms.defectPractice.bestPercent) + ' over ' + ms.defectPractice.attempts + ' attempt(s).</p>' : '') + '</section></aside></div><div id="dxOut"></div>';
      var sels = box.querySelectorAll('.dx-sel');
      var upd = function () { document.getElementById('dxCount').textContent = Array.prototype.filter.call(sels, function (x) { return x.value; }).length + ' of 12 locations recorded'; };
      sels.forEach(function (x) { x.addEventListener('change', upd); });
      document.getElementById('dxSubmit').addEventListener('click', function () {
        var answers = {}; sels.forEach(function (x) { if (x.value) answers[x.getAttribute('data-loc')] = x.value; });
        if (Object.keys(answers).length < 12 && !window.confirm('Some locations are blank and will count as “no defect”. Submit anyway?')) return;
        this.disabled = true;
        api('POST', '/quiz/' + s.sessionId + '/submit', { answers: answers }).then(function (d) {
          S.progress = d.progress; var r = d.result;
          (r.items || []).forEach(function (it) {
            var card = box.querySelector('.dx-loc[data-loc="' + it.id + '"]'); if (!card) return;
            card.classList.add(it.ok ? 'ok' : 'bad');
            card.querySelector('.dx-res').innerHTML = (it.ok ? '✅ ' : '❌ ') + 'Actual: <strong>' + esc(it.actualLabel) + '</strong>' + (it.ok ? '' : ' · you said ' + esc(it.answeredLabel || 'nothing'));
          });
          sels.forEach(function (x) { x.disabled = true; });
          document.getElementById('dxOut').innerHTML = '<section class="card quiz-result ' + (r.passed ? 'passed' : 'failed') + '">' + ring(r.percent, 130) +
            '<h1>' + (r.passed ? 'Inspection passed 🎯' : 'Not yet 🔍') + '</h1><p>Found <strong>' + r.correct + ' of ' + r.seeded + '</strong> seeded defects (' + pct(r.percent) + ', need ' + D.PASS_PERCENT + '%) · missed ' + r.missed + ' · false calls <strong>' + r.falseCalls + '</strong> (max ' + D.MAX_FALSE_CALLS + ').</p>' +
            '<div class="btn-row center"><a class="btn" href="#/defects" id="dxAgain">New board</a><a class="btn ghost" href="#/module/m17">Back to M17</a></div></section>';
          document.getElementById('dxAgain').addEventListener('click', function (e) { e.preventDefault(); route(true); });
          document.getElementById('dxOut').scrollIntoView({ behavior: 'smooth' });
        }).catch(function (e) { toast(e.message, 'error'); });
      });
    }).catch(function (e) { box.innerHTML = errorBox(e); });
  }

  function viewSimulator(params) {
    setTitle('Circuit simulator');
    app.innerHTML = '<div class="page-head"><h1>🔌 Circuit simulator</h1><p class="muted">Build DC and AC circuits on the breadboard grid. DC is solved with nodal analysis; circuits with a function generator, capacitors or inductors run a time-domain simulation shown on the two-channel virtual scope.</p></div><div id="simMount"></div>';
    window.__sim = window.Simulator.mount(document.getElementById('simMount'), { preset: params.preset });
  }
  function viewTools() {
    setTitle('Tools');
    app.innerHTML = '<div class="page-head"><h1>🧰 Tools</h1><p class="muted">Quick calculators for everyday electronics work.</p></div><div id="toolsMount"></div>';
    window.Tools.render(document.getElementById('toolsMount'));
  }

  function viewAccount() {
    setTitle('Account');
    app.innerHTML = '<div class="narrow"><h1>Account</h1><section class="card"><p><strong>' + esc(S.user.name) + '</strong><br><span class="muted">' + esc(S.user.email) + ' · ' + S.user.role + '</span></p></section>' +
      '<section class="card"><h2>Change password</h2><form id="pwForm" class="form"><label class="field"><span>Current password</span><input type="password" name="cur" autocomplete="current-password" required></label>' +
      '<label class="field"><span>New password (8+ characters)</span><input type="password" name="nw" autocomplete="new-password" minlength="8" required></label><div id="pwMsg"></div><button class="btn">Update password</button></form></section></div>';
    document.getElementById('pwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      api('POST', '/auth/change-password', { currentPassword: e.target.cur.value, newPassword: e.target.nw.value })
        .then(function () { document.getElementById('pwMsg').innerHTML = '<p class="ok-text">Password updated.</p>'; e.target.reset(); })
        .catch(function (err) { document.getElementById('pwMsg').innerHTML = '<p class="error-text">' + esc(err.message) + '</p>'; });
    });
  }


  // ---------- admin ----------
  function viewAdmin() {
    if (S.user.role !== 'admin') return forbidden();
    setTitle('Team');
    app.innerHTML = '<p class="muted">Loading team…</p>';
    api('GET', '/admin/users').then(function (d) {
      var learners = d.users.filter(function (u) { return u.role === 'learner'; });
      var active = learners.filter(function (u) { return u.summary.lastActivity && Date.now() - new Date(u.summary.lastActivity) < 7 * 86400000; }).length;
      var avgH = learners.length ? learners.reduce(function (s, u) { return s + u.summary.hoursCredited; }, 0) / learners.length : 0;
      var cleared = learners.filter(function (u) { return u.summary.safety.gateCleared; }).length;
      var waiting = learners.reduce(function (s, u) { return s + u.summary.modulesAwaitingCheckoffs; }, 0);
      app.innerHTML = '<div class="page-head row"><div><h1>👥 Team dashboard</h1><p class="muted">Phase, hours against the ' + CUR.coreHours + '-hour program, Level 0 safety status and practical check-offs. Select a person to sign check-offs or log hours.</p></div>' +
        '<div class="btn-row"><a class="btn ghost" href="#/admin/report">📧 Weekly report</a><button class="btn" id="addBtn">+ Add member</button></div></div>' +
        '<section class="stats">' + stat('👥', learners.length, 'Learners') + stat('🔥', active + '/' + learners.length, 'Active in last 7 days') +
        stat('⏱️', hrs(avgH), 'Avg hours credited') + stat('🛡️', cleared + '/' + learners.length, 'Level 0 cleared') + '</section>' +
        (waiting ? '<div class="callout">🖊️ <strong>' + waiting + '</strong> module' + (waiting === 1 ? '' : 's') + ' across the team ' + (waiting === 1 ? 'has' : 'have') + ' a passed written test and ' + (waiting === 1 ? 'is' : 'are') + ' waiting for practical check-offs.</div>' : '') +
        '<section class="card" id="addCard" hidden><h2>Add a team member</h2><form id="addForm" class="form form-inline">' +
        '<label class="field"><span>Name</span><input name="name" required placeholder="Jane Doe"></label>' +
        '<label class="field"><span>Email</span><input name="email" type="email" required placeholder="jane@company.com"></label>' +
        '<label class="field"><span>Role</span><select name="role"><option value="learner">Learner</option><option value="admin">Admin</option></select></label>' +
        '<label class="field"><span>Temporary password <small>(optional)</small></span><input name="password" type="text" placeholder="leave blank to create an invite link" minlength="8"></label>' +
        '<button class="btn">Create</button></form><div id="addOut"></div></section>' +
        '<section class="card table-card"><table class="team-table"><thead><tr><th>Member</th><th>Phase · current module</th><th>Hours credited</th><th>Safety</th><th>Check-offs</th><th>Modules</th><th>Avg written</th><th>Last active</th></tr></thead><tbody>' +
        d.users.map(function (u) {
          var s = u.summary, cm = s.currentModule && CUR.modulesById[s.currentModule.id];
          return '<tr data-href="#/admin/user/' + u.id + '" tabindex="0"><td><div class="member"><span class="avatar">' + esc(initials(u.name)) + '</span><div><a href="#/admin/user/' + u.id + '">' + esc(u.name) + '</a>' +
            (u.role === 'admin' ? ' <span class="badge">admin</span>' : '') + (u.invitePending ? ' <span class="badge pending">invite pending</span>' : '') + '<div class="muted small">' + esc(u.email) + '</div></div></div></td>' +
            '<td>' + (cm ? '<span class="tag" style="--tag:' + phaseColor(cm.phase) + '">P' + cm.phase + '</span> M' + cm.number + ' · ' + esc(cm.title) + (s.currentModule.status === 'awaiting-checkoffs' ? ' <span class="badge st-await">awaiting check-offs</span>' : '') : '🏁 Done') + '</td>' +
            '<td class="prog-cell">' + bar(s.percent) + '<span class="small">' + hrs(s.hoursCredited) + ' / ' + s.coreHours + ' · logged ' + hrs(s.loggedHours) + '</span></td>' +
            '<td>' + safetyBadge(s.safety.status) + '</td><td>' + s.checkoffsPassed + '/' + s.checkoffsRequired + '</td>' +
            '<td><div class="mini-mods">' + s.modules.map(function (ms) { return '<span class="mini ' + miniCls(ms) + '" title="M' + ms.number + ' ' + esc(ms.title) + ' — ' + (STATUS[ms.status] || [])[1] + '">' + ms.number + '</span>'; }).join('') + '</div></td>' +
            '<td>' + pct(s.averageWrittenPercent) + '</td><td>' + relTime(s.lastActivity) + '</td></tr>';
        }).join('') + '</tbody></table></section>';
      app.querySelectorAll('tr[data-href]').forEach(function (tr) {
        tr.addEventListener('click', function (e) { if (!e.target.closest('a')) location.hash = tr.getAttribute('data-href'); });
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.hash = tr.getAttribute('data-href'); });
      });
      document.getElementById('addBtn').addEventListener('click', function () { var c = document.getElementById('addCard'); c.hidden = !c.hidden; if (!c.hidden) c.querySelector('input').focus(); });
      document.getElementById('addForm').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target;
        api('POST', '/admin/users', { name: f.name.value, email: f.email.value, role: f.role.value, password: f.password.value || undefined }).then(function (r) {
          var out = document.getElementById('addOut');
          if (r.invitePath) {
            var url = location.origin + r.invitePath;
            out.innerHTML = '<div class="callout ok">Created <strong>' + esc(r.user.name) + '</strong>. Share this invite link with them (valid 14 days):<div class="copy-row"><input readonly value="' + esc(url) + '"><button class="btn small" id="copyInv">Copy</button></div></div>';
            document.getElementById('copyInv').addEventListener('click', function () { navigator.clipboard && navigator.clipboard.writeText(url); toast('Invite link copied', 'ok'); });
          } else out.innerHTML = '<div class="callout ok">Created <strong>' + esc(r.user.name) + '</strong> with the temporary password you set.</div>';
          setTimeout(function () { if (location.hash === '#/admin') { var keep = out.innerHTML; viewAdmin(); setTimeout(function () { var c = document.getElementById('addCard'); if (c) { c.hidden = false; document.getElementById('addOut').innerHTML = keep; } }, 400); } }, 50);
        }).catch(function (err) { document.getElementById('addOut').innerHTML = '<p class="error-text">' + esc(err.message) + '</p>'; });
      });
    }).catch(function (e) { app.innerHTML = errorBox(e); });
  }
  function initials(n) { return n.split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }

  var adminSel = {};
  function viewAdminUser(id, params) {
    if (S.user.role !== 'admin') return forbidden();
    app.innerHTML = '<p class="muted">Loading…</p>';
    api('GET', '/admin/users/' + id).then(function (d) { renderAdminUser(d.user, d.progress, params || {}); }).catch(function (e) { app.innerHTML = errorBox(e); });
  }
  function renderAdminUser(u, p, params) {
    var s = p.summary, self = u.id === S.user.id;
    var sel = params.module || adminSel[u.id] || (s.currentModule ? s.currentModule.id : 'm1');
    adminSel[u.id] = sel;
    var m = CUR.modulesById[sel], ms = modSum(sel, p);
    setTitle(u.name);
    var cm = s.currentModule && CUR.modulesById[s.currentModule.id];
    app.innerHTML = '<nav class="crumbs"><a href="#/admin">Team</a> › ' + esc(u.name) + '</nav>' +
      '<section class="card hero"><div class="hero-text"><div class="member big"><span class="avatar">' + esc(initials(u.name)) + '</span><div><h1>' + esc(u.name) + '</h1><p class="muted">' + esc(u.email) + ' · ' + u.role +
      (u.invitePending ? ' · <span class="badge pending">invite pending</span> <button class="link-btn" id="reinvite">New invite link</button>' : '') +
      ' · <button class="link-btn" id="resetPw" title="Make a one-time link to set a new password (valid 14 days)">Reset password</button></p></div></div>' +
      '<p>Current module: <strong>' + (cm ? 'Phase ' + cm.phase + ' · M' + cm.number + ' — ' + esc(cm.title) : 'All complete') + '</strong> ' + (s.currentModule ? statusBadge(s.currentModule.status) : '') + '<br><span class="small muted">Joined ' + fmtDate(u.createdAt) + ' · Last sign-in ' + relTime(u.lastLoginAt) + ' · Last activity ' + relTime(s.lastActivity) + '</span></p><div id="reinvOut"></div></div>' +
      '<div class="hero-ring">' + ring(s.percent, 130) + '<div class="muted small">' + hrs(s.hoursCredited) + ' / ' + s.coreHours + ' h credited</div></div></section>' +
      '<section class="stats">' + stat('🧩', s.modulesComplete + '/' + s.modulesTotal, 'Modules complete') + stat('🖊️', s.checkoffsPassed + '/' + s.checkoffsRequired, 'Check-offs signed') + stat('⏱️', hrs(s.loggedHours), 'Hours logged') + stat('🎯', pct(s.averageWrittenPercent), 'Avg written test') + '</section>' +
      safetyCardFor(s, p) +
      '<div class="two-col wide-left"><section class="card table-card"><h2>Modules</h2><table class="simple-table admin-mods"><thead><tr><th>Module</th><th>Written</th><th>Check-offs</th><th>Hours</th><th>Status</th></tr></thead><tbody>' +
      s.modules.map(function (x) {
        return '<tr class="' + (x.id === sel ? 'is-sel' : '') + (x.locked ? ' is-locked' : '') + '"><td><a href="#/admin/user/' + u.id + '?module=' + x.id + '">M' + x.number + ' ' + esc(x.title) + '</a></td>' +
          '<td>' + (x.written.bestPercent != null ? '<span class="badge ' + (x.written.passed ? 'pass' : 'fail') + '">' + pct(x.written.bestPercent) + '</span>' + (x.written.method === 'test-out' ? ' <span class="small testout-text">test-out</span>' : '') : '—') + '</td>' +
          '<td>' + x.checkoffs.passed + '/' + x.checkoffs.required + (x.checkoffs.failed ? ' <span class="small error-text">' + x.checkoffs.failed + ' fail</span>' : '') + '</td><td>' + (x.loggedHours ? hrs(x.loggedHours) : '—') + ' / ' + x.hours + '</td><td>' + statusBadge(x.status) + '</td></tr>';
      }).join('') + '</tbody></table></section>' +
      '<aside><section class="card sign-card" id="signCard"><h2>🖊️ Sign check-offs</h2>' +
      '<label class="field"><span>Module</span><select id="signModule">' + CUR.modules.map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>M' + x.number + ' ' + esc(x.title) + '</option>'; }).join('') + '</select></label>' +
      (self ? '<div class="callout warn">You can’t sign off your own practicals — another instructor must do it.</div>' : '') +
      (ms.locked ? '<div class="callout warn">🔒 Locked for ' + esc(u.name.split(' ')[0]) + ' until Level 0 is complete.</div>' : '') +
      (m.number >= 4 && !s.safety.powerAllowed ? '<div class="callout warn">⚡ Module 1 written test not yet passed at 100% — bench-power practicals can’t be signed.</div>' : '') +
      '<p class="small">Written test: ' + (ms.written.passed ? '<span class="badge pass">passed ' + pct(ms.written.bestPercent) + '</span>' : '<span class="badge pending">' + (ms.written.bestPercent != null ? 'best ' + pct(ms.written.bestPercent) : 'not taken') + '</span>') + ' · needs ' + m.passPercent + '%</p>' +
      '<ul class="co-list">' + ms.checkoffs.items.map(function (it) {
        return '<li class="co-item ' + it.status + '"><div class="co-top">' + coPill(it.status) + ' <strong>' + esc(it.title) + '</strong></div><div class="small muted">' + esc(it.standard) + '</div>' +
          (it.signedAt ? '<div class="small co-sig">Performed ' + esc(it.performedOn) + ' · ' + esc(it.signerName) + (it.note ? ' · “' + esc(it.note) + '”' : '') + '</div>' : '') +
          (self || ms.locked ? '' : '<form class="form co-form" data-item="' + it.id + '"><div class="form-row"><label class="field"><span>Date performed</span><input type="date" name="performedOn" required value="' + today() + '"></label>' +
            '<div class="field"><span>Result</span><div class="seg"><label><input type="radio" name="status" value="pass" checked> Pass</label><label><input type="radio" name="status" value="fail"> Fail</label></div></div></div>' +
            '<label class="field"><span>Note</span><input name="note" maxlength="1000" placeholder="Observations, re-train items…"></label><button class="btn small">Sign ' + (it.status === 'pending' ? '' : 'again') + '</button></form>') + '</li>';
      }).join('') + '</ul></section>' +
      '<section class="card"><h2>⏱️ Log hours</h2><form class="form" id="admHours"><label class="field"><span>Module</span><select name="moduleId">' + CUR.modules.map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>M' + x.number + ' ' + esc(x.title) + '</option>'; }).join('') + '</select></label>' +
      '<div class="form-row"><label class="field"><span>Hours</span><input name="hours" type="number" min="0.25" max="24" step="0.25" value="4" required></label><label class="field"><span>Date</span><input name="workDate" type="date" value="' + today() + '" required></label></div>' +
      '<label class="field"><span>Note</span><input name="note" maxlength="500"></label><button class="btn small">Log for ' + esc(u.name.split(' ')[0]) + '</button></form>' +
      (p.hours.length ? '<ul class="activity compact">' + p.hours.slice(0, 6).map(function (h) { return '<li><span><span class="tag">' + modLabel(CUR.modulesById[h.moduleId]) + '</span> <strong>' + hrs(h.hours) + '</strong> · ' + esc(h.workDate) + (h.note ? ' · ' + esc(h.note) : '') + (h.loggerRole === 'admin' ? ' <span class="tag">by ' + esc(h.loggedByName) + '</span>' : '') + '</span></li>'; }).join('') + '</ul>' : '') + '</section></aside></div>' +
      '<section class="card"><h2>Activity</h2>' + activityList(p, 15) + '</section>';
    var reload = function (d) { renderAdminUser(u, d.progress, {}); };
    document.getElementById('signModule').addEventListener('change', function () { adminSel[u.id] = this.value; renderAdminUser(u, p, { module: this.value }); });
    app.querySelectorAll('.co-form').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = f.querySelector('input[name=status]:checked').value;
        api('POST', '/admin/users/' + u.id + '/checkoffs', { moduleId: sel, itemId: f.getAttribute('data-item'), status: status, performedOn: f.performedOn.value, note: f.note.value })
          .then(function (d) { toast('Signed: ' + (status === 'pass' ? 'pass' : 'fail'), 'ok'); reload(d); }).catch(function (err) { toast(err.message, 'error'); });
      });
    });
    document.getElementById('admHours').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target;
      api('POST', '/admin/users/' + u.id + '/hours', { moduleId: f.moduleId.value, hours: +f.hours.value, workDate: f.workDate.value, note: f.note.value })
        .then(function (d) { toast('Logged ' + hrs(+f.hours.value), 'ok'); reload(d); }).catch(function (err) { toast(err.message, 'error'); });
    });
    var ri = document.getElementById('reinvite');
    if (ri) ri.addEventListener('click', function () {
      api('POST', '/admin/users/' + u.id + '/invite').then(function (r) {
        document.getElementById('reinvOut').innerHTML = '<div class="callout ok">New invite link (previous links stop working): <div class="copy-row"><input readonly value="' + esc(location.origin + r.invitePath) + '"></div></div>';
      }).catch(function (e) { toast(e.message, 'error'); });
    });
    document.getElementById('resetPw').addEventListener('click', function () {
      var who = esc(u.name.split(' ')[0]);
      api('POST', '/admin/users/' + u.id + '/reset-password').then(function (r) {
        var out = document.getElementById('reinvOut');
        out.innerHTML = '<div class="callout ok" id="resetOut">Password-reset link for ' + who + ' (valid 14 days, works once' + (r.pending ? '; it also completes their invite' : '; their old password works until they set a new one') + '). Send it to them privately:' +
          '<div class="copy-row"><input readonly value="' + esc(location.origin + r.resetPath) + '"><button class="btn small" id="copyReset">Copy</button></div></div>';
        document.getElementById('copyReset').addEventListener('click', function () {
          var inp = out.querySelector('input'); inp.select();
          (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.reject()).then(function () { toast('Link copied', 'ok'); }, function () { try { document.execCommand('copy'); toast('Link copied', 'ok'); } catch (e) { /* user can copy manually */ } });
        });
      }).catch(function (e) { toast(e.message, 'error'); });
    });
  }
  function safetyCardFor(s, p) { var keep = S.progress; S.progress = p; try { return safetyCard(s, true); } finally { S.progress = keep; } }

  function viewAdminReport() {
    if (S.user.role !== 'admin') return forbidden();
    setTitle('Weekly report');
    app.innerHTML = '<nav class="crumbs"><a href="#/admin">Team</a> › Weekly report</nav><div class="page-head row"><div><h1>📧 Weekly team report</h1>' +
      '<p class="muted">Email-ready HTML (inline styles) covering the 7 days before the chosen date. Nothing is sent automatically — download the HTML or copy it into an email.</p></div>' +
      '<div class="btn-row"><label class="field inline"><span>Week ending</span><input type="date" id="repEnd"></label><a class="btn ghost" id="repJson" target="_blank">JSON</a><a class="btn ghost" id="repHtml" target="_blank">Open HTML</a><a class="btn" id="repDl">Download .html</a></div></div>' +
      '<div class="card report-frame"><iframe id="repFrame" title="Weekly report preview"></iframe></div>';
    var end = document.getElementById('repEnd');
    end.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    function refresh() {
      var e = end.value ? new Date(end.value + 'T23:59:59').toISOString() : '';
      var q = '?end=' + encodeURIComponent(e) + '&tz=' + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago');
      document.getElementById('repFrame').src = '/api/admin/reports/weekly' + q + '&format=html';
      document.getElementById('repJson').href = '/api/admin/reports/weekly' + q + '&format=json';
      document.getElementById('repHtml').href = '/api/admin/reports/weekly' + q + '&format=html';
      var dl = document.getElementById('repDl'); dl.href = '/api/admin/reports/weekly' + q + '&format=html'; dl.download = 'weekly-report-' + (end.value || 'latest') + '.html';
    }
    end.addEventListener('change', refresh); refresh();
  }

  function notFound() { setTitle('Not found'); app.innerHTML = '<div class="card narrow"><h1>Page not found</h1><a class="btn" href="#/">Go to dashboard</a></div>'; }
  function forbidden() { setTitle('Not allowed'); app.innerHTML = '<div class="card narrow"><h1>Admins only</h1><p>This page is for team leads.</p><a class="btn" href="#/">Go to dashboard</a></div>'; }

  // ---------- router ----------
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qi = h.indexOf('?'), params = {};
    if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    return { parts: h.split('/').filter(Boolean), params: params };
  }
  function route() {
    var r = parseHash(), p = r.parts, top = p[0] || 'dashboard';
    if (top === 'invite') { document.body.setAttribute('data-route', 'invite'); updateChrome(''); emit('route', { top: top, parts: p, params: r.params }); return viewInvite(p[1]); }
    if (!S.user) { if (top !== 'login') { location.hash = '#/login'; return; } document.body.setAttribute('data-route', 'login'); updateChrome(''); emit('route', { top: 'login', parts: p, params: r.params }); return viewLogin(); }
    if (top === 'login') { location.hash = '#/'; return; }
    if (top === 'learn' || top === 'level') { location.hash = '#/program'; return; }
    document.body.setAttribute('data-route', top);
    var nav = { dashboard: 'dashboard', program: 'program', advanced: 'program', module: 'program', lesson: 'program', quiz: 'program', defects: 'program', hours: 'hours',
      simulator: 'simulator', tools: 'tools', admin: 'admin', account: 'account' }[top] || '';
    updateChrome(nav);
    window.scrollTo(0, 0);
    document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
    var go = function () { var out = render(); emit('route', { top: top, parts: p, params: r.params }); return out; };
    var render = function () {
      switch (top) {
        case 'dashboard': return viewDashboard();
        case 'program': return viewProgram();
        case 'advanced': return viewAdvanced();
        case 'module': return viewModule(p[1]);
        case 'lesson': return viewLesson(p[1]);
        case 'quiz': return viewQuiz(p[1], p[2]);
        case 'defects': return viewDefects();
        case 'hours': return viewHours();
        case 'simulator': return viewSimulator(r.params);
        case 'tools': return viewTools();
        case 'account': return viewAccount();
        case 'admin': return p[1] === 'user' ? viewAdminUser(+p[2], r.params) : p[1] === 'report' ? viewAdminReport() : viewAdmin();
        default: return notFound();
      }
    };
    if (!S.progress) loadProgress().then(go).catch(function (e) { if (e.status === 401) { S.user = null; location.hash = '#/login'; } else app.innerHTML = errorBox(e); });
    else go();
  }
  window.addEventListener('hashchange', route);

  api('GET', '/me').then(function (d) { S.user = d.user; return d.user ? loadProgress() : null; })
    .catch(function () { S.user = null; })
    .then(route);
})();
