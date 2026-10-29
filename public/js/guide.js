/* Electronics Academy — guide companion ("spirit guide").
 * A floating avatar + speech bubble on every signed-in page with context-aware tips, milestone celebrations and a
 * first-login tour. Self-contained: markup and logic live here, styling in css/guide.css (themable via --guide-* variables).
 * It talks to the app only through window.EA_APP (api + read-only state) and the ea:* DOM events emitted by app.js.
 * Rename the character in ONE place: GUIDE_CONFIG.name below. */
(function () {
  'use strict';
  var GUIDE_CONFIG = {
    name: 'Volt',                    // ← the guide's display name, used everywhere
    tagline: 'your electronics sidekick',
    compactQuery: '(max-width: 760px), (max-height: 520px)'
  };
  var NAME = GUIDE_CONFIG.name;
  var CUR = window.CURRICULUM, U = window.Units, esc = U.esc;
  if (!CUR || !window.EA_APP) return;

  // Default per-module lines. curriculum-source/guide-lines.json (served via GET /api/guide) overrides any of these.
  var DEFAULT_LINES = {
    m1: { intro: 'Safety first, always. This module covers how current affects people, safe bench habits, lockout/tagout, PPE and what to do in an emergency.',
      tips: ['Treat every circuit as live until you have checked it yourself.', 'Capacitors can hold a charge after power is off — discharge before you touch.'],
      mistakes: ['Assuming “low voltage” means “no hazard”.'] },
    m2: { intro: 'ESD: the zap you can’t feel can still kill a part. You’ll learn grounding, wrist straps, ESD-safe packaging and handling.',
      tips: ['Check your wrist strap before every session, not once a week.'], mistakes: ['Touching component leads instead of the body or edges of the board.'] },
    m3: { intro: 'The maths you use every day at the bench: units, prefixes, scientific notation and quick estimates.',
      tips: ['Convert to base units (V, A, Ω) before you calculate, then convert back.'], mistakes: ['Mixing up milli (m) and mega (M).'] },
    m4: { intro: 'Your first instruments: the digital multimeter and the bench power supply — measuring safely and setting limits.',
      tips: ['Set the current limit on the supply before you connect the circuit.'], mistakes: ['Measuring current with the leads still in the current jack, then probing voltage.'] },
    m5: { intro: 'Ohm’s law, power, series and parallel — the core of everything that follows.',
      tips: ['Predict the answer before you measure or simulate; the surprise is where the learning is.'], mistakes: ['Adding parallel resistances directly instead of their reciprocals.'] },
    m6: { intro: 'Kirchhoff’s laws, voltage dividers and bridges: how to solve circuits with more than one loop.',
      tips: ['Pick a reference node first and write every voltage relative to it.'], mistakes: ['Forgetting that a load changes a divider’s output (loading).'] },
    m7: { intro: 'Real components and how to read their data sheets: ratings, tolerances, packages and markings.',
      tips: ['Check the absolute maximum ratings first, then the typical values.'], mistakes: ['Using a part right at its maximum rating with no margin.'] },
    m8: { intro: 'AC and your second set of instruments: the oscilloscope and the function generator.',
      tips: ['Set the probe attenuation on the scope to match the probe (1× or 10×).'], mistakes: ['Confusing peak, peak-to-peak and RMS values.'] },
    m9: { intro: 'Capacitors, inductors, RC/RL/RLC behaviour and transformers — where time and frequency start to matter.',
      tips: ['One time constant (τ = RC) gets a charging capacitor to about 63%.'], mistakes: ['Ignoring the phase shift between voltage and current.'] },
    m10: { intro: 'Semiconductors: diodes, LEDs and transistors used as switches.',
      tips: ['Always give an LED a series resistor (or another current limit).'], mistakes: ['Putting a diode or LED in backwards — check the band or the flat.'] },
    m11: { intro: 'Power supplies: rectifiers, filtering and regulation — and how to test them.',
      tips: ['A bigger filter capacitor means less ripple, but higher peak charging current.'], mistakes: ['Forgetting the diode drops when estimating the output voltage.'] },
    m12: { intro: 'Amplifiers and op-amp basics: gain, feedback and the common configurations.',
      tips: ['With negative feedback, an op-amp tries to make its two inputs equal.'], mistakes: ['Expecting an output beyond the supply rails.'] },
    m13: { intro: 'Digital fundamentals: logic levels, gates, number systems and basic logic circuits.',
      tips: ['Write the truth table first; the circuit follows from it.'], mistakes: ['Leaving unused CMOS inputs floating.'] },
    m14: { intro: 'Reading schematics, assembly drawings and technical documentation.',
      tips: ['Follow one net at a time and mark it off as you go.'], mistakes: ['Working from an out-of-date drawing revision.'] },
    m15: { intro: 'Hand soldering I: through-hole parts and wires/terminals, plus basic desoldering.',
      tips: ['Heat the joint, not the solder — let the joint melt the solder.'], mistakes: ['Moving the joint before the solder has solidified (disturbed joint).'] },
    m16: { intro: 'Hand soldering II: surface-mount parts and rework.',
      tips: ['Tack one pad first, align the part, then solder the rest.'], mistakes: ['Too much heat for too long — lifted pads.'] },
    m17: { intro: 'Workmanship inspection and quality: spotting and classifying defects consistently.',
      tips: ['Inspect in the same order every time so nothing gets skipped.'], mistakes: ['Calling a cosmetic variation a defect (false call), or missing a real one.'] },
    m18: { intro: 'Wiring, crimping, cables and harnesses.',
      tips: ['Use the right crimp tool and die for the terminal — and pull-test your practice crimps.'], mistakes: ['Nicked strands from stripping with the wrong gauge setting.'] },
    m19: { intro: 'Systematic troubleshooting: from symptom to root cause with a repeatable method.',
      tips: ['Split the circuit in half and test in the middle — then repeat.'], mistakes: ['Swapping parts before measuring.'] },
    m20: { intro: 'The capstone: build, inspect, test and troubleshoot a complete project.',
      tips: ['Plan your inspection and test steps before you power anything up.'], mistakes: ['Skipping the visual inspection because “it probably works”.'] }
  };

  // Simulator challenges per preset, and a fallback preset for modules without their own simulator examples.
  var CHALLENGES = {
    series: 'Predict the current before you look, then hover a node to check. Bonus: double one resistor — what happens to the voltage across the other?',
    parallel: 'Which branch carries more current? Predict, then check the readings table. Add another branch — does the battery current go up or down?',
    'bulb-switch': 'Predict the current with the switch open, then flip it with the select tool. Were you right?',
    divider: 'Predict the divider output, then close the load switch. Why does the output sag? (That’s loading.)',
    bridge: 'Change one resistor until the voltage between the two midpoints is 0 V — a balanced bridge.',
    led: 'Change the series resistor until the LED current is about 10 mA. Which value did you need?',
    'two-leds': 'Why does each LED need its own resistor? Try removing one and see what the readings say.',
    'ac-sine': 'Read Vpp and Vrms on CH1. Is Vrms about Vpp ÷ 2.83? Then double the frequency — what changes on the scope, and what doesn’t?',
    pwm: 'Change the duty cycle and watch the average voltage follow it.',
    'rc-phase': 'Read the phase between CH1 and CH2. Raise the frequency — does CH2 get smaller and lag more?',
    'rc-charge': 'Find where the capacitor reaches about 63% — that’s one time constant (τ = RC). Halve R: what happens to τ?',
    'rl-phase': 'An inductor resists changes in current. Raise the frequency and watch the voltage across the resistor.',
    'half-wave': 'Close the filter-capacitor switch and watch the ripple shrink. Predict the peak output — remember the diode drop.',
    'full-wave': 'Compare the ripple with the half-wave circuit. Why is it smaller?'
  };
  var FALLBACK_SIM = { m1: 'bulb-switch', m2: 'series', m3: 'divider', m4: 'series', m7: 'led', m12: 'divider', m13: 'led', m14: 'bridge',
    m15: 'series', m16: 'led', m17: 'divider', m18: 'parallel', m20: 'divider' };
  var CHEERS = ['Nice! ⚡', 'Spot on!', 'You’re wired for this.', 'Correct — keep the current flowing!', 'Zero resistance there. 👌', 'Textbook.'];
  var NUDGES = ['No worries — that’s how learning works.', 'Close! Mistakes are just data.', 'Not this time — let’s fix that gap.'];
  var PHASE_EMOJI = ['🛡️', '🔌', '🔥', '🧭'];

  // ---------------- state ----------------
  var G = { userId: null, loading: null, ready: false, gs: null, lines: {}, ctx: null, open: false, menu: false, dot: false,
    progressRef: null, quizWrong: {}, lastModule: null, tour: null, pendingTour: false };
  var api = window.EA_APP.api;
  function app() { return window.EA_APP.state(); }
  function isCompact() { return window.matchMedia && window.matchMedia(GUIDE_CONFIG.compactQuery).matches; }
  function linesFor(id) {
    var d = DEFAULT_LINES[id] || {}, o = G.lines[id] || {};
    return { intro: o.intro || d.intro || '', tips: (o.tips && o.tips.length ? o.tips : d.tips) || [], mistakes: (o.mistakes && o.mistakes.length ? o.mistakes : d.mistakes) || [], celebrate: o.celebrate || d.celebrate || null };
  }
  function modLabel(m) { return (m.track === 'advanced' ? 'A' : 'M') + m.number; }
  function modSum(p, id) {
    var s = p.summary; return s.modules.find(function (m) { return m.id === id; }) || (s.advanced.modules || []).find(function (m) { return m.id === id; });
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function link(href, text, cls) { return '<a class="guide-btn ' + (cls || '') + '" href="' + href + '">' + text + '</a>'; }
  function save(patch) {
    Object.keys(patch).forEach(function (k) { G.gs[k] = patch[k]; });
    return api('PUT', '/guide', patch).then(function (d) { if (d && d.state) G.gs = d.state; }).catch(function () { /* keep the local copy */ });
  }

  // ---------------- avatar ----------------
  // Volt: a hovering cyber-drone head (design by artist). Colours come from CSS variables; class names are used by guide.css/cyberpunk.css.
  var AVATAR = '<svg class="guide-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<polygon class="g-halo" points="32,4 58,19 58,49 32,64 6,49 6,19"/>' +
    '<line class="g-antenna" x1="32" y1="20" x2="32" y2="11"/>' +
    '<path class="g-bolt" d="M34 0 L27 9 H31.5 L29 15 L37 6 H32.5 Z"/>' +
    '<polygon class="g-ear" points="10,30 4,34 4,44 10,48"/><polygon class="g-ear" points="54,30 60,34 60,44 54,48"/>' +
    '<path class="g-head" d="M19 20 H45 L54 29 V47 L45 56 H19 L10 47 V29 Z"/>' +
    '<path class="g-trace" d="M19 20 V25 H24 M45 20 V25 H40 M19 56 V52 H26 M45 56 V52 H38"/>' +
    '<circle class="g-node" cx="24" cy="25" r="1.3"/><circle class="g-node" cx="40" cy="25" r="1.3"/><circle class="g-node" cx="26" cy="52" r="1.3"/><circle class="g-node" cx="38" cy="52" r="1.3"/>' +
    '<path class="g-face" d="M15 30 H49 L46 47 H18 Z"/>' +
    '<g class="g-eyes"><ellipse cx="25.5" cy="36.5" rx="3.6" ry="2.6"/><ellipse cx="38.5" cy="36.5" rx="3.6" ry="2.6"/></g>' +
    '<path class="g-mouth" d="M28 42 Q32 44.5 36 42"/>' +
    '<rect class="g-cheek" x="18" y="40.5" width="3" height="1.6"/><rect class="g-cheek" x="43" y="40.5" width="3" height="1.6"/>' +
    '</svg>';

  var root, bubble, textEl, actionsEl, menuEl, avatarBtn;
  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'guide'; root.className = 'guide'; root.hidden = true;
    root.innerHTML =
      '<div class="guide-bubble" id="guideBubble" role="dialog" aria-label="' + esc(NAME) + ' says" hidden>' +
        '<div class="guide-head"><span class="guide-name">' + esc(NAME) + '</span><span class="guide-tag">' + esc(GUIDE_CONFIG.tagline) + '</span>' +
        '<button class="guide-icon" id="guideMenuBtn" aria-label="' + esc(NAME) + ' menu" aria-haspopup="true" aria-expanded="false">⋯</button>' +
        '<button class="guide-icon" id="guideClose" aria-label="Collapse ' + esc(NAME) + '">×</button></div>' +
        '<div class="guide-menu" id="guideMenu" role="menu" hidden>' +
          '<button role="menuitem" data-gm="next">🧭 What should I do next?</button>' +
          '<button role="menuitem" data-gm="tour">🎬 Replay the tour</button>' +
          '<button role="menuitem" data-gm="fx" aria-pressed="true">⚡ Lightning effects: <span class="guide-fx-state">on</span></button>' +
          '<button role="menuitem" data-gm="collapse">🔽 Minimise</button>' +
          '<button role="menuitem" data-gm="dismiss">👋 Hide ' + esc(NAME) + '</button></div>' +
        '<div class="guide-text" id="guideText"></div><div class="guide-actions" id="guideActions"></div>' +
      '</div>' +
      '<button class="guide-avatar" id="guideAvatar" title="' + esc(NAME) + ' — tips for this page" aria-label="Talk to ' + esc(NAME) + '" aria-expanded="false" aria-controls="guideBubble">' + AVATAR +
        '<span class="guide-dot" aria-hidden="true"></span></button>';
    document.body.appendChild(root);
    bubble = root.querySelector('#guideBubble'); textEl = root.querySelector('#guideText'); actionsEl = root.querySelector('#guideActions');
    menuEl = root.querySelector('#guideMenu'); avatarBtn = root.querySelector('#guideAvatar');
    avatarBtn.addEventListener('click', function () { setOpen(!G.open, true); });
    root.querySelector('#guideClose').addEventListener('click', function () { setOpen(false, true); });
    root.querySelector('#guideMenuBtn').addEventListener('click', function () { showMenu(!G.menu); });
    menuEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-gm]'); if (!b) return;
      var a = b.getAttribute('data-gm'); showMenu(false);
      if (a === 'next') { say(recommendation(app().progress), true); }
      else if (a === 'tour') replayTour();
      else if (a === 'collapse') setOpen(false, true);
      else if (a === 'dismiss') dismiss();
      else if (a === 'fx') { save({ effects: !fxOn() }); fxLabel(); document.dispatchEvent(new CustomEvent('ea:guide-fx', { detail: { on: fxOn() } })); }
    });
    actionsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ga]'); if (!b) return;
      var a = b.getAttribute('data-ga');
      if (a === 'tour') replayTour(); else if (a === 'close') setOpen(false, true);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (G.tour) endTour(true); else if (G.menu) showMenu(false); else if (G.open && root.contains(document.activeElement)) { setOpen(false, true); avatarBtn.focus(); }
    });
    document.addEventListener('click', function (e) { if (G.menu && !e.target.closest('#guideMenu') && !e.target.closest('#guideMenuBtn')) showMenu(false); });
  }
  // "Lightning effects" (volt-fx.js): saved per user in guide state; on unless switched off.
  function fxOn() { return !G.gs || G.gs.effects !== false; }
  function fxLabel() {
    var b = menuEl && menuEl.querySelector('[data-gm="fx"]'); if (!b) return;
    b.setAttribute('aria-pressed', fxOn()); b.querySelector('.guide-fx-state').textContent = fxOn() ? 'on' : 'off';
  }
  function showMenu(on) { if (on) fxLabel(); G.menu = on; menuEl.hidden = !on; root.querySelector('#guideMenuBtn').setAttribute('aria-expanded', on); }
  function setOpen(on, byUser) {
    G.open = on; bubble.hidden = !on; avatarBtn.setAttribute('aria-expanded', on);
    root.classList.toggle('is-open', on);
    if (on) setDot(false); else showMenu(false);
    if (byUser) save({ collapsed: !on });
  }
  function setDot(on) { G.dot = on; root.classList.toggle('has-tip', on); }
  // msg = { html, actions: [html], mood }
  function say(msg, forceOpen) {
    if (!root || !msg) return;
    textEl.innerHTML = msg.html; actionsEl.innerHTML = (msg.actions || []).join('');
    root.setAttribute('data-mood', msg.mood || 'happy');
    if (forceOpen) setOpen(true);
    else if (!G.open) setDot(true);
  }
  function dismiss() {
    setOpen(false); save({ dismissed: true });
    root.hidden = true; document.body.classList.remove('has-guide'); restoreLink(true);
  }
  function restoreLink(on) {
    var f = document.querySelector('.footer'), b = document.getElementById('guideRestore');
    if (!on) { if (b) b.remove(); return; }
    if (!f || b) return;
    b = document.createElement('button'); b.id = 'guideRestore'; b.className = 'guide-restore'; b.type = 'button';
    b.textContent = '⚡ Bring back ' + NAME;
    b.addEventListener('click', function () { save({ dismissed: false, collapsed: false }); restoreLink(false); show(); refresh(true); });
    f.appendChild(b);
  }
  function show() { root.hidden = false; document.body.classList.add('has-guide'); }

  // ---------------- context-aware content ----------------
  function coreMods(p) { return p.summary.modules.filter(function (m) { return m.track !== 'advanced'; }); }
  function allStudied(m) { var p = app().progress; return m.lessons.every(function (l) { var s = p.lessons[l.id]; return s && s.method === 'study'; }); }

  // Dashboard: which module to do next (Level 0 gate, locks, test-out).
  function recommendation(p) {
    if (!p) return null;
    var sum = p.summary, mods = coreMods(p), parts = [], actions = [];
    if (!sum.safety.gateCleared) {
      var l0 = ['m1', 'm2'].map(function (id) { return modSum(p, id); }).filter(function (m) { return !m.complete; });
      var t = l0[0], M = CUR.modulesById[t.id];
      parts.push('<strong>Level 0 comes first.</strong> Modules 1 (Safety) and 2 (ESD) need <strong>100%</strong> on the written test — test-out is also only at 100%. Modules 15–20 unlock after that.');
      parts.push('Next up: <strong>' + modLabel(M) + ' · ' + esc(M.title) + '</strong> (' + t.lessons.done + '/' + t.lessons.total + ' lessons done).' +
        (t.lessons.done === 0 ? ' Already know it cold? You can test out — but only a perfect score counts.' : ''));
      actions.push(link('#/module/' + M.id, 'Open ' + modLabel(M) + ' →', 'primary'));
      if (t.lessons.done === 0) actions.push(link('#/quiz/module/' + M.id, 'Test out at 100%'));
      return { html: parts.map(function (x) { return '<p>' + x + '</p>'; }).join(''), actions: actions, mood: 'focus' };
    }
    var target = mods.find(function (m) { return m.status === 'in-progress' && !m.locked; }) || mods.find(function (m) { return !m.complete && !m.locked; });
    if (target) {
      var TM = CUR.modulesById[target.id];
      parts.push('Next up: <strong>' + modLabel(TM) + ' · ' + esc(TM.title) + '</strong> — ' + target.lessons.done + '/' + target.lessons.total + ' lessons, ' +
        (Math.round(target.loggedHours * 10) / 10) + ' of ' + TM.hours + ' h logged.');
      if (target.lessons.studied === 0 && !target.written.passed) parts.push('Already know this stuff? Take the module test as a <strong>test-out at ' + TM.testOutPercent + '%</strong> and skip ahead.');
      actions.push(link('#/module/' + TM.id, 'Open ' + modLabel(TM) + ' →', 'primary'));
      if (target.lessons.studied === 0 && !target.written.passed) actions.push(link('#/quiz/module/' + TM.id, 'Test out'));
    }
    if (!target) {
      var locked = mods.filter(function (m) { return m.locked; });
      if (locked.length) parts.push('🔒 ' + locked.map(modLabel).join(', ') + ' ' + (locked.length === 1 ? 'is' : 'are') + ' locked. ' + esc(CUR.level0.rule));
      else { parts.push('🏆 All 20 core modules are complete — that’s the whole ' + CUR.coreHours + '-hour program! Fancy an optional advanced module?'); actions.push(link('#/advanced', 'Advanced track →', 'primary')); }
    }
    return { html: parts.map(function (x) { return '<p>' + x + '</p>'; }).join(''), actions: actions, mood: target ? 'happy' : 'focus' };
  }

  function moduleTips(id) {
    var p = app().progress, M = CUR.modulesById[id]; if (!M || !p) return null;
    var ms = modSum(p, id), L = linesFor(id), parts = [], actions = [];
    if (L.intro) parts.push('<p>' + esc(L.intro) + '</p>');
    else parts.push('<p><strong>' + modLabel(M) + '</strong> is about ' + esc(M.title) + '.' + ((M.objectives || [])[0] ? ' You’ll ' + esc(M.objectives[0].charAt(0).toLowerCase() + M.objectives[0].slice(1)) + '.' : '') + '</p>');
    if (ms.locked) {
      parts.push('<p>🔒 <strong>Locked for now.</strong> ' + esc(CUR.level0.rule) + '</p>');
      actions.push(link('#/module/m1', 'Go to Level 0 →', 'primary'));
      return { html: parts.join(''), actions: actions, mood: 'focus' };
    }
    var need = [];
    need.push((ms.written.passed ? '✅' : '⬜') + ' Written test ≥ <strong>' + M.passPercent + '%</strong>' + (ms.written.bestPercent != null && !ms.written.passed ? ' (best so far ' + Math.round(ms.written.bestPercent) + '%)' : ''));
    if (M.track !== 'advanced') need.push('⏱️ ' + (Math.round(ms.loggedHours * 10) / 10) + ' of ' + M.hours + ' planned hours logged');
    parts.push('<p class="guide-sub">To complete ' + modLabel(M) + ':</p><ul class="guide-list">' + need.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>');
    if (ms.complete) parts.push('<p>🎉 Done and dusted. Nice work!</p>');
    else if (M.safety) parts.push('<p>🛡️ Level 0 module: <strong>100%</strong> needed, test-out too. Read every option slowly.</p>');
    else if (ms.lessons.studied === 0 && !ms.written.passed) parts.push('<p>⚡ Know it already? The module test counts as a <strong>test-out at ' + M.testOutPercent + '%</strong>.</p>');
    if (L.tips[0]) parts.push('<p>💡 <strong>Tip:</strong> ' + esc(L.tips[0]) + '</p>');
    if (L.mistakes[0]) parts.push('<p>⚠️ <strong>Common mistake:</strong> ' + esc(L.mistakes[0]) + '</p>');
    if (M.sims && M.sims.length) actions.push(link('#/simulator?preset=' + M.sims[0], '🔌 Simulator challenge'));
    return { html: parts.join(''), actions: actions, mood: ms.complete ? 'party' : 'happy' };
  }

  function lessonTips(id) {
    var l = CUR.lessonsById[id]; if (!l) return null;
    var M = CUR.modulesById[l.moduleId], L = linesFor(l.moduleId), p = app().progress, st = p && p.lessons[id];
    var tip = L.tips[1] || L.tips[0];
    return { html: '<p>Reading <strong>' + esc(l.title) + '</strong> from ' + modLabel(M) + '. ' + (st ? 'Already done ✅ — the quick check is great for a refresher.' : 'Mark it done when you’re finished, then try the quick check.') + '</p>' +
      (tip ? '<p>💡 ' + esc(tip) + '</p>' : ''), actions: [link('#/quiz/lesson/' + id, 'Quick check')], mood: 'happy' };
  }

  function simContext() {
    var p = app().progress, id = G.lastModule;
    if (!id && p && p.summary.currentModule) id = p.summary.currentModule.id;
    return id && CUR.modulesById[id] ? CUR.modulesById[id] : CUR.modulesById.m5;
  }
  function simTips(params) {
    var M = simContext(), loaded = params && params.preset, presets = (M.sims && M.sims.length) ? M.sims : [FALLBACK_SIM[M.id] || 'series'];
    var preset = loaded && CHALLENGES[loaded] ? loaded : presets[0];
    var name = window.Simulator && window.Simulator.PRESETS[preset] ? window.Simulator.PRESETS[preset].name : preset;
    var actions = [];
    if (preset !== loaded) actions.push(link('#/simulator?preset=' + preset, 'Load the circuit', 'primary'));
    var others = presets.filter(function (k) { return k !== preset; });
    if (others[0]) actions.push(link('#/simulator?preset=' + others[0], 'Another one'));
    return { html: '<p class="guide-sub">🎯 Challenge for ' + modLabel(M) + ' · ' + esc(name) + '</p><p>' + esc(CHALLENGES[preset] || CHALLENGES.series) + '</p>', actions: actions, mood: 'focus' };
  }

  function quizTips(kind, ref) {
    var l = kind === 'module' ? null : CUR.lessonsById[ref], M = l ? CUR.modulesById[l.moduleId] : CUR.modulesById[ref];
    if (!M) return null;
    var html = M.safety && kind !== 'lesson' ? 'Safety module: <strong>100%</strong> needed. Take your time — there’s no clock, and retakes are fine.'
      : kind === 'testout-lesson' || (kind === 'module' && !allStudied(M)) ? 'Test-out time ⚡ Show what you already know. If it doesn’t go your way, the lessons will be right here.'
      : kind === 'lesson' ? 'Quick check — practice only, so relax and learn from the explanations.' : 'You’ve studied every lesson. You’ve got this! 💪';
    return { html: '<p>' + html + '</p>', mood: 'focus' };
  }

  function pageTips(c) {
    var p = app().progress; if (!p) return null;
    var sum = p.summary;
    switch (c.top) {
      case 'dashboard': return recommendation(p);
      case 'module': return moduleTips(c.parts[1]);
      case 'lesson': return lessonTips(c.parts[1]);
      case 'quiz': return quizTips(c.parts[1], c.parts[2]);
      case 'simulator': return simTips(c.params);
      case 'program': return { html: '<p>Here’s the whole map: 4 phases, 20 modules, ' + sum.coreHours + ' core hours. You’ve got <strong>' + sum.modulesComplete + '</strong> modules complete' +
        (sum.currentModule ? ' and you’re on <strong>M' + sum.currentModule.number + '</strong>' : '') + '. 🔒 means a module is waiting on Level 0.</p>',
        actions: sum.currentModule ? [link('#/module/' + sum.currentModule.id, 'Jump to M' + sum.currentModule.number, 'primary')] : [], mood: 'happy' };
      case 'hours': return { html: '<p>Log bench and study time against each module — it’s how we see you’re on pace. <strong>' + (Math.round(sum.hoursCredited * 10) / 10) + ' of ' + sum.coreHours + ' h</strong> credited so far (hours count once a module is complete).</p>', mood: 'happy' };
      case 'defects': return { html: '<p>🔍 Detective mode! Find at least ' + window.EA_DEFECTS.PASS_PERCENT + '% of the seeded defects with no more than ' + window.EA_DEFECTS.MAX_FALSE_CALLS + ' false call. Use the condition guide — and inspect in the same order every time.</p>', mood: 'focus' };
      case 'tools': return { html: '<p>Calculators for quick checks. Pro move: work it out on paper first, then use these to confirm.</p>', mood: 'happy' };
      case 'advanced': return { html: '<p>🚀 The advanced track is optional and sits outside the ' + CUR.coreHours + ' core hours — pick what fits your job.</p>', mood: 'happy' };
      case 'admin': return { html: '<p>Team view. Open a learner to see their modules and written tests, log hours for them or reset their password; the weekly report lives under <strong>Weekly report</strong>.</p>', mood: 'happy' };
      case 'account': return { html: '<p>Your account settings. You can replay my tour from the ⋯ menu any time.</p>', actions: ['<button class="guide-btn" data-ga="tour">🎬 Replay tour</button>'], mood: 'happy' };
      default: return null;
    }
  }

  // ---------------- milestones ----------------
  function earned(p) {
    var out = [], s = p.summary;
    if (s.safety.gateCleared) out.push('safety');
    s.phases.forEach(function (ph) { if (ph.modulesTotal && ph.modulesComplete >= ph.modulesTotal) out.push('phase:' + ph.id); });
    s.modules.concat(s.advanced.modules || []).forEach(function (m) { if (m.complete) out.push('mod:' + m.id); });
    return out;
  }
  function checkMilestones() {
    var p = app().progress; if (!p || !G.gs || G.gs.dismissed) return;
    G.progressRef = p;
    var have = earned(p);
    if (!G.gs.milestones) { save({ milestones: have }); return; } // first visit: remember, don't celebrate history
    var seen = G.gs.milestones, fresh = have.filter(function (k) { return seen.indexOf(k) < 0; });
    if (!fresh.length) return;
    save({ milestones: seen.concat(fresh) });
    celebrate(fresh, p);
  }
  function celebrate(keys, p) {
    var lines = [];
    if (keys.indexOf('safety') >= 0) lines.push('🛡️ <strong>Level 0 cleared!</strong> Safety and ESD are done — the hands-on modules 15–20 are now unlocked.');
    keys.filter(function (k) { return k.indexOf('phase:') === 0; }).forEach(function (k) {
      var ph = p.summary.phases.find(function (x) { return x.id === k.slice(6); }); if (ph) lines.push(PHASE_EMOJI[ph.number - 1] + ' <strong>Phase ' + ph.number + ' complete:</strong> ' + esc(ph.title) + '! That’s ' + ph.hours + ' hours of the program in the bag.');
    });
    var mods = keys.filter(function (k) { return k.indexOf('mod:') === 0; }).map(function (k) { return CUR.modulesById[k.slice(4)]; }).filter(Boolean);
    if (mods.length) lines.push('🎉 <strong>' + mods.map(function (m) { return modLabel(m) + ' ' + esc(m.title); }).join(', ') + '</strong> complete!');
    var hero = mods[mods.length - 1], victory = hero ? (linesFor(hero.id).celebrate || null) : null;
    if (victory) lines.push('⚡ <em>' + esc(victory) + '</em>');
    root.classList.add('is-celebrating'); fxCelebrate(keys, p, mods);
    setTimeout(function () { root.classList.remove('is-celebrating'); }, 2400);
    var next = recommendation(p);
    say({ html: lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') + (next ? '<p class="guide-sub">What’s next?</p>' + next.html : ''), actions: next ? next.actions : [], mood: 'party' },
      !(isCompact() && G.ctx && G.ctx.top === 'simulator'));
  }
  // Full-screen celebration (public/js/celebrate.js, effects from artist's demo) — replaces the old confetti burst.
  // One overlay per batch: a finished phase gets the finale; otherwise Level 0 / the newest module gets banner + one effect.
  function fxCelebrate(keys, p, mods) {
    var C = window.VOLT_CELEBRATE; if (!C) return;
    try {
      var phKey = keys.filter(function (k) { return k.indexOf('phase:') === 0; }).pop();
      var ph = phKey && p.summary.phases.find(function (x) { return x.id === phKey.slice(6); });
      var hero = mods[mods.length - 1];
      if (ph) C.play({ kind: 'phase', phase: ph.number, title: ph.title + ' · ' + ph.hours + ' h ✓', id: hero ? hero.id : null, line: hero ? null : 'PHASE ' + ph.number + ' DONE!' });
      else if (keys.indexOf('safety') >= 0) C.play({ kind: 'safety', id: hero ? hero.id : 'm2', phase: 1 });
      else if (hero) C.play({ kind: 'module', id: hero.id, title: hero.title });
    } catch (e) { /* a celebration must never break the guide */ }
  }

  // ---------------- walkthrough tour ----------------
  function tourSteps() {
    var c = isCompact();
    return [
      { sel: null, title: 'Hi, I’m ' + NAME + '! ⚡', body: 'I’m ' + GUIDE_CONFIG.tagline + '. I’ll point out what to do next, explain each module and cheer you on. Quick 30-second tour?' },
      { sel: c ? '#navToggle' : '#mainnav a[data-nav="program"]', title: 'The program map', body: 'All 4 phases and 20 modules live under <strong>Program</strong>' + (c ? ' (open the ☰ menu)' : '') + '. Each module has lessons and a written test; passing the test completes it.' },
      { sel: '.safety-card', title: 'Level 0: safety first', body: 'Modules 1 and 2 need 100% on their written tests. Until they’re done, the hands-on modules 15–20 stay locked.' },
      { sel: '.hero .btn', title: 'Continue where you left off', body: 'This button always takes you to your current module. Know the material already? Look for <strong>Test out</strong>.' },
      { sel: c ? '#navToggle' : '#mainnav a[data-nav="hours"]', title: 'Log your hours', body: 'Record bench and study time per module under <strong>Hours</strong>.' },
      { sel: c ? '#navToggle' : '#mainnav a[data-nav="simulator"]', title: 'Play in the simulator', body: 'Build circuits, probe them and watch the scope. I’ll give you a challenge for your current module.' },
      { sel: '#guideAvatar', title: 'I’m always here', body: 'Tap me for tips on any page. Use the ⋯ menu to ask what’s next, replay this tour, or hide me.' }
    ];
  }
  function startTour() {
    if (G.tour || !root || root.hidden) return;
    setOpen(false);
    var ov = document.createElement('div'); ov.className = 'guide-tour'; ov.id = 'guideTour';
    ov.innerHTML = '<div class="guide-spot" hidden></div><div class="guide-tour-card" role="dialog" aria-modal="true" aria-labelledby="guideTourTitle">' +
      '<div class="guide-tour-head"><span class="guide-tour-av" aria-hidden="true">' + AVATAR + '</span><h2 id="guideTourTitle"></h2></div><div class="guide-tour-body"></div>' +
      '<div class="guide-tour-nav"><button class="guide-btn ghost" id="guideTourSkip">Skip tour</button><span class="guide-tour-count"></span>' +
      '<button class="guide-btn" id="guideTourBack">Back</button><button class="guide-btn primary" id="guideTourNext">Next</button></div></div>';
    document.body.appendChild(ov);
    G.tour = { el: ov, i: 0, steps: tourSteps() };
    root.classList.add('in-tour');
    ov.querySelector('#guideTourSkip').addEventListener('click', function () { endTour(true); });
    ov.querySelector('#guideTourBack').addEventListener('click', function () { tourGo(G.tour.i - 1); });
    ov.querySelector('#guideTourNext').addEventListener('click', function () { if (G.tour.i >= G.tour.steps.length - 1) endTour(false); else tourGo(G.tour.i + 1); });
    window.addEventListener('resize', tourPlace);
    tourGo(0);
  }
  function tourGo(i) {
    var T = G.tour; if (!T) return;
    T.i = Math.max(0, Math.min(i, T.steps.length - 1));
    var s = T.steps[T.i], ov = T.el;
    ov.querySelector('#guideTourTitle').innerHTML = s.title;
    ov.querySelector('.guide-tour-body').innerHTML = '<p>' + s.body + '</p>';
    ov.querySelector('.guide-tour-count').textContent = (T.i + 1) + ' / ' + T.steps.length;
    ov.querySelector('#guideTourBack').disabled = T.i === 0;
    ov.querySelector('#guideTourNext').textContent = T.i === T.steps.length - 1 ? 'Let’s go!' : 'Next';
    ov.setAttribute('data-step', T.i + 1);
    var t = s.sel && document.querySelector(s.sel);
    if (t && t.scrollIntoView && t.getBoundingClientRect().height) t.scrollIntoView({ block: 'center' });
    tourPlace();
    ov.querySelector('#guideTourNext').focus({ preventScroll: true });
  }
  function tourPlace() {
    var T = G.tour; if (!T) return;
    var s = T.steps[T.i], ov = T.el, spot = ov.querySelector('.guide-spot'), card = ov.querySelector('.guide-tour-card');
    var t = s.sel && document.querySelector(s.sel), r = t && t.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    if (!r || !r.width || !r.height) { spot.hidden = true; ov.classList.add('no-target'); card.style.left = ''; card.style.top = ''; card.classList.remove('placed'); return; }
    ov.classList.remove('no-target'); spot.hidden = false;
    var pad = 6;
    spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
    card.classList.add('placed');
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 14, top;
    if (r.bottom + gap + ch <= vh - 8) top = r.bottom + gap;
    else if (r.top - gap - ch >= 8) top = r.top - gap - ch;
    else top = Math.max(8, vh - ch - 8);
    var left = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), vw - cw - 8);
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function endTour(skipped) {
    var T = G.tour; if (!T) return;
    T.el.remove(); G.tour = null; root.classList.remove('in-tour');
    window.removeEventListener('resize', tourPlace);
    save({ tourDone: true });
    refresh(!skipped);
  }
  function replayTour() {
    if (G.gs && G.gs.dismissed) { save({ dismissed: false }); restoreLink(false); show(); }
    var onDash = G.ctx && G.ctx.top === 'dashboard';
    if (onDash && document.querySelector('.hero')) { startTour(); return; }
    G.pendingTour = true; location.hash = '#/';
  }

  // ---------------- routing / events ----------------
  function phaseFor(c) {
    var M = null, p = app().progress;
    if (c.top === 'module' || c.top === 'quiz' && c.parts[1] === 'module') M = CUR.modulesById[c.parts[c.top === 'module' ? 1 : 2]];
    else if (c.top === 'lesson' || c.top === 'quiz') { var l = CUR.lessonsById[c.parts[c.top === 'lesson' ? 1 : 2]]; M = l && CUR.modulesById[l.moduleId]; }
    if (!M && p && p.summary.currentModule) M = CUR.modulesById[p.summary.currentModule.id];
    var ph = M && (CUR.phasesById['p' + M.phase] || CUR.phasesById[M.phase]);
    return ph ? ph.number : M && M.track === 'advanced' ? 4 : 1;
  }
  function refresh(forceOpen) {
    if (!root || !G.gs || G.gs.dismissed || !G.ctx) return;
    var c = G.ctx, msg = pageTips(c);
    root.setAttribute('data-phase', phaseFor(c));
    if (!msg) { setOpen(false); setDot(false); return; }
    // Auto-open only on the desktop dashboard (unless the user minimised it) so the bubble never sits on top of page controls;
    // everywhere else a glowing dot on the avatar says "I have a tip for this page".
    var auto = forceOpen || (c.top === 'dashboard' && !G.gs.collapsed && !isCompact());
    say(msg, false);
    if (auto) setOpen(true); else { if (G.open) setOpen(false); setDot(true); }
  }
  function onRoute(d) {
    var u = app().user;
    if (!u) { hideAll(); return; }
    G.ctx = { top: d.top, parts: d.parts || [], params: d.params || {} };
    if (d.top === 'module' || d.top === 'lesson') {
      var id = d.top === 'module' ? d.parts[1] : (CUR.lessonsById[d.parts[1]] || {}).moduleId;
      if (id && CUR.modulesById[id]) G.lastModule = id;
    }
    if (d.top !== 'quiz') G.quizWrong = {};
    ensure(u).then(function () {
      if (G.ctx !== null && G.ctx.top !== d.top) return;
      if (G.gs.dismissed) { root.hidden = true; document.body.classList.remove('has-guide'); setTimeout(function () { restoreLink(true); }, 0); return; }
      show(); restoreLink(false);
      if (G.tour && d.top !== 'dashboard') endTour(true);
      refresh(false);
      checkMilestones();
      if (d.top === 'dashboard' && (G.pendingTour || !G.gs.tourDone)) {
        G.pendingTour = false; document.body.dataset.guideTourPending = '1';
        var tries = 0;
        (function attempt() {
          if (G.ctx && G.ctx.top === 'dashboard' && document.querySelector('.hero')) { startTour(); delete document.body.dataset.guideTourPending; }
          else if (++tries < 20 && G.ctx && G.ctx.top === 'dashboard') setTimeout(attempt, 150);
          else delete document.body.dataset.guideTourPending;
        })();
      }
    });
  }
  function hideAll() {
    if (G.tour) { G.tour.el.remove(); G.tour = null; }
    if (root) { root.hidden = true; setOpen(false); }
    document.body.classList.remove('has-guide'); restoreLink(false);
    G.userId = null; G.gs = null; G.ready = false; G.loading = null;
    delete document.body.dataset.guideReady;
  }
  function ensure(u) {
    if (G.userId === u.id && G.loading) return G.loading;
    build(); G.userId = u.id; G.quizWrong = {}; G.lastModule = null;
    G.loading = api('GET', '/guide').then(function (d) {
      G.gs = d.state; G.lines = d.lines || {}; G.ready = true;
    }).catch(function () {
      G.gs = { collapsed: false, dismissed: false, tourDone: true, milestones: null }; G.ready = true;
    }).then(function () { document.body.dataset.guideReady = '1'; });
    return G.loading;
  }

  function lessonHref(q) { return q && q.lessonId && CUR.lessonsById[q.lessonId] ? '#/lesson/' + q.lessonId : null; }
  document.addEventListener('ea:route', function (e) { try { onRoute(e.detail || {}); } catch (err) { if (window.console) console.warn('guide', err); } });
  document.addEventListener('ea:quiz-answer', function (e) {
    var d = e.detail || {}; if (!G.gs || G.gs.dismissed) return;
    var q = CUR.questionsById[d.questionId], fb = document.getElementById('feedback');
    if (d.correct) { root.setAttribute('data-mood', 'party'); if (Math.random() < 0.34 && fb) fb.insertAdjacentHTML('beforeend', '<p class="guide-inline guide-inline-ok"><span class="guide-mini" aria-hidden="true">⚡</span> ' + esc(NAME) + ': ' + esc(pick(CHEERS)) + '</p>'); return; }
    root.setAttribute('data-mood', 'focus');
    var href = lessonHref(q), l = href && CUR.lessonsById[q.lessonId];
    if (l) G.quizWrong[l.id] = (G.quizWrong[l.id] || 0) + 1;
    if (fb) fb.insertAdjacentHTML('beforeend', '<p class="guide-inline"><span class="guide-mini" aria-hidden="true">⚡</span> <strong>' + esc(NAME) + ':</strong> ' + esc(pick(NUDGES)) +
      (l ? ' This one’s covered in <a href="' + href + '" target="_blank" rel="noopener">' + esc(l.title) + '</a> (opens in a new tab so you keep your place).' : '') + '</p>');
  });
  document.addEventListener('ea:quiz-result', function (e) {
    var d = e.detail || {}; if (!G.gs || G.gs.dismissed) return;
    var ids = Object.keys(G.quizWrong).sort(function (a, b) { return G.quizWrong[b] - G.quizWrong[a]; }).slice(0, 4);
    var msg;
    if (d.passed) msg = { html: '<p>🎉 <strong>' + Math.round(d.percent) + '%</strong> — ' + (d.testOut ? 'tested out like a pro!' : 'passed!') + ' ' + esc(pick(CHEERS)) + '</p>' +
      (ids.length ? '<p class="guide-sub">Worth a quick re-read:</p><ul class="guide-list">' + ids.map(function (id) { return '<li><a href="#/lesson/' + id + '">' + esc(CUR.lessonsById[id].title) + '</a></li>'; }).join('') + '</ul>' : ''), mood: 'party' };
    else msg = { html: '<p>' + Math.round(d.percent) + '% this time — not there yet, and that’s okay. ' + (ids.length ? 'Review these, then retake:' : 'Review the lessons, then retake.') + '</p>' +
      (ids.length ? '<ul class="guide-list">' + ids.map(function (id) { return '<li><a href="#/lesson/' + id + '">' + esc(CUR.lessonsById[id].title) + '</a>' + (G.quizWrong[id] > 1 ? ' (' + G.quizWrong[id] + ' missed)' : '') + '</li>'; }).join('') + '</ul>' : ''),
      actions: d.moduleId ? [link('#/module/' + d.moduleId, 'Back to the module')] : [], mood: 'focus' };
    G.quizWrong = {};
    say(msg, !isCompact());
    setTimeout(checkMilestones, 400);
  });
  // Progress changes outside a route change (marking a lesson done, logging hours…): re-check milestones.
  setInterval(function () {
    var p = app().progress;
    if (G.ready && p && p !== G.progressRef) { checkMilestones(); if (G.ctx && G.ctx.top === 'dashboard' && G.open) refresh(false); }
  }, 1500);
  window.addEventListener('resize', function () { if (G.tour) tourPlace(); });

  window.EA_GUIDE = { config: GUIDE_CONFIG, defaults: DEFAULT_LINES, challenges: CHALLENGES, replayTour: replayTour,
    state: function () { return G.gs; }, open: function () { setOpen(true); },
    effects: fxOn, avatar: function () { return AVATAR; }, celebrateLine: function (id) { return linesFor(id).celebrate; }, visible: function () { return !!(root && !root.hidden); }, isOpen: function () { return G.open; },
    // Used by volt-fx.js when a locked module is clicked: Volt explains why (returns false if Volt is hidden).
    sayLocked: function (id) {
      var M = CUR.modulesById[id]; if (!root || root.hidden || !M) return false;
      say({ html: '<p>⚡💨 <strong>Fizzle!</strong> ' + modLabel(M) + ' ' + esc(M.title) + ' is 🔒 locked.</p><p>' + esc(CUR.level0.rule) + '</p>',
        actions: [link('#/module/m1', 'Go to Level 0 →', 'primary')], mood: 'focus' }, true);
      return true;
    }, recommendation: function () { return recommendation(app().progress); } };
})();
