/* Electronics Academy — interactive circuit simulator: DC (MNA) plus AC/transient with a function generator and a 2-channel scope. */
(function (g) {
  'use strict';
  var U = g.Units, S = g.CircuitSolver;
  var COLS = 12, ROWS = 8, SP = 60, PAD = 30;
  var STORAGE_KEY = 'ea-sim-circuit-v1';
  var STEPS = 1500;
  var WINDOWS = [['auto', 'Auto'], [0.001, '1 ms'], [0.002, '2 ms'], [0.005, '5 ms'], [0.01, '10 ms'], [0.02, '20 ms'], [0.05, '50 ms'], [0.1, '100 ms'], [0.2, '200 ms'], [0.5, '500 ms'], [1, '1 s']];
  var LED_COLORS = {
    red: { vf: 2.0, fill: '#ef4444', label: 'Red (Vf 2.0 V)' },
    yellow: { vf: 2.1, fill: '#facc15', label: 'Yellow (Vf 2.1 V)' },
    green: { vf: 2.2, fill: '#22c55e', label: 'Green (Vf 2.2 V)' },
    blue: { vf: 3.0, fill: '#3b82f6', label: 'Blue (Vf 3.0 V)' },
    white: { vf: 3.1, fill: '#f8fafc', label: 'White (Vf 3.1 V)' }
  };
  var TYPES = {
    wire: { name: 'Wire', prefix: 'W', icon: '╱' },
    battery: { name: 'Battery', prefix: 'B', icon: '🔋', defaults: { voltage: 9 } },
    resistor: { name: 'Resistor', prefix: 'R', icon: '⏛', defaults: { resistance: 1000 } },
    led: { name: 'LED', prefix: 'D', icon: '💡', defaults: { color: 'red', forwardVoltage: 2.0, maxCurrent: 0.03 } },
    bulb: { name: 'Bulb', prefix: 'L', icon: '💡', defaults: { resistance: 12, ratedPower: 3 } },
    switch: { name: 'Switch', prefix: 'S', icon: '⏻', defaults: { closed: false } },
    acsource: { name: 'Function generator', prefix: 'G', icon: '∿', defaults: { waveform: 'sine', amplitude: 5, frequency: 1000, offset: 0, duty: 50 } },
    capacitor: { name: 'Capacitor', prefix: 'C', icon: '⫞', defaults: { capacitance: 1e-6 } },
    inductor: { name: 'Inductor', prefix: 'L', icon: '➰', defaults: { inductance: 0.01 } },
    diode: { name: 'Diode', prefix: 'D', icon: '▷|', defaults: { forwardVoltage: 0.7, maxCurrent: 1 } },
    ground: { name: 'Ground', prefix: 'GND', icon: '⏚' }
  };
  var WAVES = { sine: 'Sine', square: 'Square / PWM', triangle: 'Triangle' };

  function P(x, y) { return { x: x, y: y }; }
  function C(type, id, a, b, props) { return Object.assign({ id: id, type: type, a: a, b: b }, TYPES[type].defaults || {}, props || {}); }
  var PRESETS = {
    series: { name: 'Series: 9 V, 1 kΩ + 2 kΩ', comps: [
      C('battery', 'B1', P(2, 5), P(2, 2), { voltage: 9 }), C('wire', 'W1', P(2, 2), P(4, 2)),
      C('resistor', 'R1', P(4, 2), P(7, 2), { resistance: 1000 }), C('wire', 'W2', P(7, 2), P(9, 2)),
      C('resistor', 'R2', P(9, 2), P(9, 5), { resistance: 2000 }), C('wire', 'W3', P(9, 5), P(2, 5))] },
    parallel: { name: 'Parallel: 9 V, 1 kΩ ∥ 2 kΩ', comps: [
      C('battery', 'B1', P(2, 5), P(2, 2), { voltage: 9 }), C('wire', 'W1', P(2, 2), P(5, 2)), C('wire', 'W2', P(5, 2), P(8, 2)),
      C('resistor', 'R1', P(5, 2), P(5, 5), { resistance: 1000 }), C('resistor', 'R2', P(8, 2), P(8, 5), { resistance: 2000 }),
      C('wire', 'W3', P(8, 5), P(5, 5)), C('wire', 'W4', P(5, 5), P(2, 5))] },
    divider: { name: 'Voltage divider + switchable load', comps: [
      C('battery', 'B1', P(2, 6), P(2, 1), { voltage: 9 }), C('wire', 'W1', P(2, 1), P(6, 1)),
      C('resistor', 'R1', P(6, 1), P(6, 3), { resistance: 1000 }), C('resistor', 'R2', P(6, 3), P(6, 6), { resistance: 2000 }),
      C('switch', 'S1', P(6, 3), P(9, 3), { closed: false }), C('resistor', 'R3', P(9, 3), P(9, 6), { resistance: 2000 }),
      C('wire', 'W2', P(9, 6), P(6, 6)), C('wire', 'W3', P(6, 6), P(2, 6))] },
    led: { name: 'LED with current-limiting resistor', comps: [
      C('battery', 'B1', P(2, 5), P(2, 2), { voltage: 5 }), C('wire', 'W1', P(2, 2), P(4, 2)),
      C('resistor', 'R1', P(4, 2), P(7, 2), { resistance: 220 }), C('wire', 'W2', P(7, 2), P(9, 2)),
      C('led', 'D1', P(9, 2), P(9, 5), { color: 'red', forwardVoltage: 2.0 }), C('wire', 'W3', P(9, 5), P(2, 5))] },
    'bulb-switch': { name: 'Bulb and switch', comps: [
      C('battery', 'B1', P(2, 5), P(2, 2), { voltage: 6 }), C('switch', 'S1', P(2, 2), P(5, 2), { closed: true }),
      C('wire', 'W1', P(5, 2), P(8, 2)), C('bulb', 'L1', P(8, 2), P(8, 5), { resistance: 12, ratedPower: 3 }),
      C('wire', 'W2', P(8, 5), P(2, 5))] },
    bridge: { name: 'Wheatstone bridge (KCL/KVL)', comps: [
      C('battery', 'B1', P(1, 6), P(1, 1), { voltage: 10 }), C('wire', 'W1', P(1, 1), P(3, 1)), C('wire', 'W2', P(3, 1), P(8, 1)),
      C('resistor', 'R1', P(3, 1), P(3, 3), { resistance: 1000 }), C('resistor', 'R2', P(3, 3), P(3, 6), { resistance: 2000 }),
      C('resistor', 'R3', P(8, 1), P(8, 3), { resistance: 1000 }), C('resistor', 'R4', P(8, 3), P(8, 6), { resistance: 1000 }),
      C('resistor', 'R5', P(3, 3), P(8, 3), { resistance: 1000 }),
      C('wire', 'W3', P(1, 6), P(3, 6)), C('wire', 'W4', P(3, 6), P(8, 6))] },
    'two-leds': { name: 'Parallel LEDs (each with its own resistor)', comps: [
      C('battery', 'B1', P(1, 6), P(1, 1), { voltage: 9 }), C('wire', 'W1', P(1, 1), P(4, 1)), C('wire', 'W2', P(4, 1), P(8, 1)),
      C('resistor', 'R1', P(4, 1), P(4, 3), { resistance: 470 }), C('led', 'D1', P(4, 3), P(4, 6), { color: 'green', forwardVoltage: 2.2 }),
      C('resistor', 'R2', P(8, 1), P(8, 3), { resistance: 330 }), C('led', 'D2', P(8, 3), P(8, 6), { color: 'blue', forwardVoltage: 3.0 }),
      C('wire', 'W3', P(8, 6), P(4, 6)), C('wire', 'W4', P(4, 6), P(1, 6))] },
    'ac-sine': { name: 'AC: function generator → divider (scope)', probes: { ch1: '2,1', ch2: '6,3' }, comps: [
      C('acsource', 'G1', P(2, 6), P(2, 1), { amplitude: 5, frequency: 1000 }), C('wire', 'W1', P(2, 1), P(6, 1)),
      C('resistor', 'R1', P(6, 1), P(6, 3), { resistance: 1000 }), C('resistor', 'R2', P(6, 3), P(6, 6), { resistance: 1000 }),
      C('wire', 'W2', P(6, 6), P(2, 6))] },
    pwm: { name: 'PWM 25 % → RC smoothing (average ≈ 1.25 V)', window: 0.04, probes: { ch1: '2,1', ch2: '7,1' }, comps: [
      C('acsource', 'G1', P(2, 6), P(2, 1), { waveform: 'square', amplitude: 2.5, offset: 2.5, duty: 25, frequency: 500 }),
      C('wire', 'W1', P(2, 1), P(4, 1)), C('resistor', 'R1', P(4, 1), P(7, 1), { resistance: 1000 }),
      C('capacitor', 'C1', P(7, 1), P(7, 6), { capacitance: 4.7e-6 }), C('wire', 'W2', P(7, 6), P(2, 6))] },
    'rc-phase': { name: 'RC phase shift at 1 kHz (−45° at f꜀)', probes: { ch1: '2,1', ch2: '7,1' }, comps: [
      C('acsource', 'G1', P(2, 6), P(2, 1), { amplitude: 5, frequency: 1000 }), C('wire', 'W1', P(2, 1), P(4, 1)),
      C('resistor', 'R1', P(4, 1), P(7, 1), { resistance: 1000 }), C('capacitor', 'C1', P(7, 1), P(7, 6), { capacitance: 159e-9 }),
      C('wire', 'W2', P(7, 6), P(2, 6))] },
    'rc-charge': { name: 'RC charging: 5 V, 10 kΩ, 10 µF (τ = 100 ms)', window: 0.5, probes: { ch1: '4,1', ch2: '7,1' }, comps: [
      C('battery', 'B1', P(2, 6), P(2, 1), { voltage: 5 }), C('switch', 'S1', P(2, 1), P(4, 1), { closed: true }),
      C('resistor', 'R1', P(4, 1), P(7, 1), { resistance: 10000 }), C('capacitor', 'C1', P(7, 1), P(7, 6), { capacitance: 10e-6 }),
      C('wire', 'W1', P(7, 6), P(2, 6))] },
    'rl-phase': { name: 'RL phase shift: 10 mH + 62.8 Ω at 1 kHz', probes: { ch1: '2,1', ch2: '7,1' }, comps: [
      C('acsource', 'G1', P(2, 6), P(2, 1), { amplitude: 5, frequency: 1000 }), C('wire', 'W1', P(2, 1), P(4, 1)),
      C('inductor', 'L1', P(4, 1), P(7, 1), { inductance: 0.01 }), C('resistor', 'R1', P(7, 1), P(7, 6), { resistance: 62.8 }),
      C('wire', 'W2', P(7, 6), P(2, 6))] },
    'half-wave': { name: 'Half-wave rectifier, 60 Hz (switchable filter cap)', probes: { ch1: '2,1', ch2: '7,1' }, comps: [
      C('acsource', 'G1', P(2, 6), P(2, 1), { amplitude: 10, frequency: 60 }), C('wire', 'W1', P(2, 1), P(4, 1)),
      C('diode', 'D1', P(4, 1), P(7, 1)), C('resistor', 'R1', P(7, 1), P(7, 6), { resistance: 1000 }),
      C('switch', 'S1', P(7, 1), P(10, 1), { closed: false }), C('capacitor', 'C1', P(10, 1), P(10, 6), { capacitance: 100e-6 }),
      C('wire', 'W2', P(10, 6), P(7, 6)), C('wire', 'W3', P(7, 6), P(2, 6))] },
    'full-wave': { name: 'Full-wave bridge rectifier, 60 Hz', probes: { ch1: '4,3', ch2: '10,1' }, comps: [
      C('acsource', 'G1', P(7, 3), P(4, 3), { amplitude: 10, frequency: 60 }),
      C('diode', 'D1', P(4, 3), P(4, 1)), C('diode', 'D2', P(7, 3), P(7, 1)),
      C('diode', 'D3', P(4, 6), P(4, 3)), C('diode', 'D4', P(7, 6), P(7, 3)),
      C('wire', 'W1', P(4, 1), P(7, 1)), C('wire', 'W2', P(7, 1), P(10, 1)), C('resistor', 'R1', P(10, 1), P(10, 6), { resistance: 1000 }),
      C('wire', 'W3', P(10, 6), P(7, 6)), C('wire', 'W4', P(7, 6), P(4, 6)), C('ground', 'GND', P(10, 6), P(10, 6))] }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function gx(p) { return PAD + p.x * SP; }
  function gy(p) { return PAD + p.y * SP; }
  function same(p, q) { return p && q && p.x === q.x && p.y === q.y; }

  function mount(container, opts) {
    opts = opts || {};
    var state = { comps: [], tool: 'select', selected: null, pending: null, drag: null, hover: null, showV: true, showFlow: true, result: null,
      probes: { ch1: null, ch2: null }, window: 'auto' };
    var history = [];

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { saved = null; }
    if (opts.preset && PRESETS[opts.preset]) applyPreset(opts.preset);
    else if (saved && Array.isArray(saved.comps)) { state.comps = saved.comps; if (saved.probes) state.probes = saved.probes; if (saved.window) state.window = saved.window; }
    else applyPreset('series');
    function applyPreset(k) {
      var pr = PRESETS[k];
      state.comps = clone(pr.comps); state.selected = null;
      state.probes = pr.probes ? clone(pr.probes) : autoProbes(state.comps);
      state.window = pr.window || 'auto';
    }
    function autoProbes(comps) { // CH1 on the first source's + terminal
      var src = comps.filter(function (c) { return c.type === 'acsource' || c.type === 'battery'; })[0];
      return { ch1: src ? src.b.x + ',' + src.b.y : null, ch2: null };
    }

    var W = PAD * 2 + (COLS - 1) * SP, H = PAD * 2 + (ROWS - 1) * SP;
    container.innerHTML =
      '<div class="sim">' +
      '  <div class="sim-toolbar" role="toolbar" aria-label="Simulator tools">' +
      '    <div class="tool-group" id="simTools"></div>' +
      '    <div class="tool-group actions">' +
      '      <select id="simPreset" aria-label="Load example circuit"><option value="">Load example…</option>' +
      Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + U.esc(PRESETS[k].name) + '</option>'; }).join('') + '</select>' +
      '      <button class="btn small ghost" id="simUndo" title="Undo (Ctrl+Z)">↶ Undo</button>' +
      '      <button class="btn small ghost" id="simClear">Clear</button>' +
      '    </div>' +
      '    <div class="tool-group toggles">' +
      '      <label><input type="checkbox" id="simShowV" checked> Node voltages</label>' +
      '      <label><input type="checkbox" id="simShowFlow" checked> Current flow</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="sim-hint" id="simHint"></div>' +
      '  <div class="sim-body">' +
      '    <div class="sim-canvas-wrap"><svg class="sim-canvas" id="simSvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Circuit board">' +
      '      <defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '      </defs>' +
      '      <g id="gGrid"></g><g id="gComps"></g><g id="gFlow"></g><g id="gLabels"></g><g id="gNodes"></g><g id="gPreview"></g>' +
      '    </svg></div>' +
      '    <aside class="sim-side">' +
      '      <div class="sim-status" id="simStatus"></div>' +
      '      <div class="card sim-scope" id="simScope"></div>' +
      '      <div class="card sim-props" id="simProps"></div>' +
      '      <div class="card"><h3>Readings</h3><div id="simTable" class="sim-table"></div></div>' +
      '    </aside>' +
      '  </div>' +
      '</div>';

    var $ = function (id) { return container.querySelector('#' + id); };
    var svg = $('simSvg');

    // ---- toolbar ----
    var toolDefs = [['select', '👆', 'Select / toggle'], ['wire', '〰️', 'Wire'], ['battery', '🔋', 'Battery'], ['resistor', '▭', 'Resistor'],
      ['led', '🔴', 'LED'], ['bulb', '💡', 'Bulb'], ['switch', '⏻', 'Switch'], ['acsource', '∿', 'Function gen'], ['capacitor', '⊣⊢', 'Capacitor'],
      ['inductor', '➰', 'Inductor'], ['diode', '▷|', 'Diode'], ['ground', '⏚', 'Ground'], ['probe1', '①', 'Scope CH1'], ['probe2', '②', 'Scope CH2'],
      ['delete', '🗑️', 'Delete']];
    $('simTools').innerHTML = toolDefs.map(function (t) {
      return '<button class="tool" data-tool="' + t[0] + '" title="' + t[2] + '"><span class="ti">' + t[1] + '</span><span class="tl">' + t[2] + '</span></button>';
    }).join('');
    $('simTools').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]'); if (!b) return;
      setTool(b.getAttribute('data-tool'));
    });
    $('simPreset').addEventListener('change', function (e) {
      var k = e.target.value; if (!k) return;
      pushHistory(); applyPreset(k); e.target.value = ''; update();
    });
    $('simUndo').addEventListener('click', undo);
    $('simClear').addEventListener('click', function () { if (!state.comps.length) return; pushHistory(); state.comps = []; state.selected = null; state.probes = { ch1: null, ch2: null }; update(); });
    $('simShowV').addEventListener('change', function (e) { state.showV = e.target.checked; render(); });
    $('simShowFlow').addEventListener('change', function (e) { state.showFlow = e.target.checked; render(); });
    function onKey(e) {
      if (!document.body.contains(container)) { document.removeEventListener('keydown', onKey); return; }
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected) { removeComp(state.selected); }
      else if (e.key === 'Escape') { state.pending = null; state.drag = null; renderPreview(); setHint(); }
    }
    document.addEventListener('keydown', onKey);

    function setTool(t) {
      state.tool = t; state.pending = null; state.drag = null;
      svg.setAttribute('data-tool', t);
      container.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tool') === t); });
      renderPreview(); setHint();
    }
    function setHint() {
      var t = state.tool, h;
      if (t === 'select') h = 'Tap a component to select and edit it. Tap a switch to flip it. Hover/tap a dot to read its voltage.';
      else if (t === 'delete') h = 'Tap a component to delete it.';
      else if (t === 'ground') h = 'Tap a dot to make it the 0 V reference (⏚). Scope probes and node voltages are measured from here.';
      else if (t === 'probe1' || t === 'probe2') h = 'Tap a dot to clip scope ' + (t === 'probe1' ? 'CH1 (blue)' : 'CH2 (orange)') + ' there. Tap the same dot again to remove it.';
      else h = state.pending ? 'Now tap the end point for the ' + TYPES[t].name.toLowerCase() + ' (Esc to cancel).'
        : 'Drag between two dots — or tap a start dot then an end dot — to place a ' + TYPES[t].name.toLowerCase() + '.' +
          (t === 'battery' || t === 'acsource' ? ' The end point is the + terminal.' : t === 'led' || t === 'diode' ? ' Current flows from start (anode) to end (cathode).' : '');
      $('simHint').textContent = h;
      var phonePortrait = window.matchMedia && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
      if (phonePortrait) $('simHint').textContent = h + ' Tip: rotate your phone for a bigger board.';
    }

    function pushHistory() { history.push(JSON.stringify({ comps: state.comps, probes: state.probes, window: state.window })); if (history.length > 50) history.shift(); }
    function undo() {
      if (!history.length) return; var h = JSON.parse(history.pop());
      state.comps = h.comps; state.probes = h.probes || { ch1: null, ch2: null }; state.window = h.window || 'auto'; state.selected = null; update();
    }
    function nextId(type) {
      var pre = TYPES[type].prefix, n = 1;
      var used = {}; state.comps.forEach(function (c) { used[c.id] = true; });
      while (used[pre + n]) n++;
      return pre + n;
    }
    function addComp(type, a, b) {
      if (same(a, b)) return;
      pushHistory();
      var c = C(type, nextId(type), a, b);
      state.comps.push(c);
      if (type !== 'wire') state.selected = c.id;
      update();
    }
    function removeComp(id) {
      pushHistory();
      state.comps = state.comps.filter(function (c) { return c.id !== id; });
      if (state.selected === id) state.selected = null;
      update();
    }
    function getComp(id) { return state.comps.find(function (c) { return c.id === id; }); }

    // ---- pointer handling ----
    function toSvg(e) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    function snap(e) {
      var p = toSvg(e);
      var x = Math.round((p.x - PAD) / SP), y = Math.round((p.y - PAD) / SP);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
      var dx = p.x - gx(P(x, y)), dy = p.y - gy(P(x, y));
      return Math.sqrt(dx * dx + dy * dy) <= SP * 0.48 ? P(x, y) : null;
    }
    svg.addEventListener('pointerdown', function (e) {
      var t = state.tool;
      if (t === 'select' || t === 'delete') {
        var hit = e.target.closest && e.target.closest('[data-id]');
        if (!hit) { state.selected = null; render(); return; }
        var id = hit.getAttribute('data-id');
        if (t === 'delete') { removeComp(id); return; }
        var c = getComp(id);
        if (c.type === 'switch') { pushHistory(); c.closed = !c.closed; state.selected = id; update(); return; }
        state.selected = id; render(); return;
      }
      var p = snap(e); if (!p) return;
      e.preventDefault();
      if (t === 'ground') {
        pushHistory(); state.comps = state.comps.filter(function (c) { return c.type !== 'ground'; });
        state.comps.push(C('ground', 'GND', p, P(p.x, p.y))); update(); return;
      }
      if (t === 'probe1' || t === 'probe2') {
        var ch = t === 'probe1' ? 'ch1' : 'ch2', k = p.x + ',' + p.y;
        pushHistory(); state.probes[ch] = state.probes[ch] === k ? null : k; update(); return;
      }
      if (state.pending && !same(state.pending, p)) { var a = state.pending; state.pending = null; addComp(t, a, p); setHint(); return; }
      state.drag = p; state.hover = p;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      renderPreview();
    });
    svg.addEventListener('pointermove', function (e) {
      var p = snap(e);
      if (!same(p, state.hover)) { state.hover = p; renderPreview(); showHoverVoltage(p); }
    });
    svg.addEventListener('pointerup', function (e) {
      if (!state.drag) return;
      var p = snap(e), start = state.drag; state.drag = null;
      if (p && !same(p, start)) addComp(state.tool, start, p);
      else if (p && same(p, start)) { state.pending = start; setHint(); }
      renderPreview();
    });
    svg.addEventListener('pointercancel', function () { state.drag = null; renderPreview(); }); // e.g. touch turned into a scroll
    svg.addEventListener('pointerleave', function () { if (!state.drag) { state.hover = null; renderPreview(); } });

    function showHoverVoltage(p) {
      if (!p || !state.result || !state.result.ok) return;
      var k = p.x + ',' + p.y, v = state.result.nodeVoltages[k];
      if (v == null || state.tool !== 'select') return;
      if (state.result.transient && state.result.series[k]) {
        var st = S.stats(state.result.series[k], state.result.window);
        $('simHint').textContent = 'Node (' + k + ') vs ground (⏚): ' + (state.result.ac ? U.fmtSI(st.pp, 'V') + ' p-p, ' + U.fmtSI(st.rms, 'V') + ' RMS, average ' + U.fmtSI(st.avg, 'V') : U.fmtSI(v, 'V') + ' at the end of the window') + '.';
      } else $('simHint').textContent = 'Node (' + k + '): ' + U.fmtSI(v, 'V') + ' relative to ground (⏚).';
    }

    // ---- solve + render ----
    function update() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ comps: state.comps, probes: state.probes, window: state.window })); } catch (e) { /* ignore */ }
      state.result = S.needsTransient(state.comps) ? S.transient(state.comps, { tEnd: windowSeconds(), steps: STEPS }) : S.solve(state.comps);
      render();
      if (opts.onChange) opts.onChange(state);
    }

    function windowSeconds() {
      if (state.window !== 'auto' && +state.window > 0) return +state.window;
      var f = S.generatorFrequency(state.comps);
      return f ? 4 / f : 0.1;
    }

    // Text/dot scale: when the board is drawn small (phones) enlarge labels so they stay readable.
    var K = 1;
    function computeK() {
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return 1;
      var s = Math.min(r.width / W, r.height / H);
      return Math.max(1, Math.min(1.9, 0.85 / s));
    }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { var k = computeK(); if (Math.abs(k - K) > 0.02) render(); }).observe(svg);
    }
    function render() {
      K = computeK();
      renderGrid(); renderComps(); renderNodes(); renderPreview(); renderStatus(); renderScope(); renderProps(); renderTable();
    }
    function renderGrid() {
      var used = {};
      state.comps.forEach(function (c) { used[c.a.x + ',' + c.a.y] = 1; used[c.b.x + ',' + c.b.y] = 1; });
      var h = '';
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        h += '<circle class="grid-dot' + (used[x + ',' + y] ? ' used' : '') + '" cx="' + gx(P(x, y)) + '" cy="' + gy(P(x, y)) + '" r="' + ((used[x + ',' + y] ? 4 : 3) * Math.min(K, 1.5)).toFixed(1) + '"/>';
      }
      $('gGrid').innerHTML = h;
    }

    function info(c) { return state.result && state.result.components[c.id]; }
    function powered() { return state.result && state.result.ok; }

    function symbol(c, L) {
      var m = L / 2, s = '', lead = function (x1, x2) { return '<line class="lead" x1="' + x1 + '" y1="0" x2="' + x2 + '" y2="0"/>'; };
      var inf = info(c), on = powered();
      switch (c.type) {
        case 'wire': return lead(0, L);
        case 'resistor':
          s = lead(0, m - 22) + lead(m + 22, L);
          var pts = [[m - 22, 0]], i; for (i = 0; i < 6; i++) pts.push([m - 18 + i * 7.3, i % 2 ? 8 : -8]); pts.push([m + 22, 0]);
          s += '<polyline class="body" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
          return s;
        case 'battery':
          s = lead(0, m - 5) + lead(m + 5, L);
          s += '<line class="plate" x1="' + (m - 5) + '" y1="-8" x2="' + (m - 5) + '" y2="8" stroke-width="5"/>';
          s += '<line class="plate" x1="' + (m + 5) + '" y1="-17" x2="' + (m + 5) + '" y2="17" stroke-width="2.5"/>';
          s += '<text class="pol" x="' + (m + 16) + '" y="-12">+</text><text class="pol" x="' + (m - 20) + '" y="-12">−</text>';
          return s;
        case 'led':
          var col = (LED_COLORS[c.color] || LED_COLORS.red).fill, br = on && inf && inf.on ? Math.min(1, 0.35 + inf.brightness * 0.65) : 0;
          s = lead(0, m - 12) + lead(m + 12, L);
          if (br) s += '<circle cx="' + m + '" cy="0" r="18" fill="' + col + '" opacity="' + (br * 0.55).toFixed(2) + '" filter="url(#glow)"/>';
          s += '<polygon class="body" points="' + (m - 12) + ',-12 ' + (m - 12) + ',12 ' + (m + 12) + ',0" fill="' + (br ? col : '#fff') + '"/>';
          s += '<line class="body" x1="' + (m + 12) + '" y1="-12" x2="' + (m + 12) + '" y2="12"/>';
          var arrow = function (x0, y0) { // small arrow pointing up-right (away from the LED)
            return '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + (x0 + 8) + '" y2="' + (y0 - 10) + '"/>' +
              '<polyline points="' + (x0 + 3) + ',' + (y0 - 9) + ' ' + (x0 + 8) + ',' + (y0 - 10) + ' ' + (x0 + 8) + ',' + (y0 - 5) + '"/>';
          };
          s += '<g class="led-arrows" style="stroke:' + (br ? (c.color === 'white' ? '#94a3b8' : col) : '#94a3b8') + '">' + arrow(m, -14) + arrow(m + 7, -12) + '</g>';
          if (inf && inf.overCurrent) s += '<text class="warn-icon" x="' + (m - 6) + '" y="30">🔥</text>';
          return s;
        case 'bulb':
          var b = on && inf ? Math.min(1, inf.brightness) : 0;
          s = lead(0, m - 15) + lead(m + 15, L);
          if (b > 0.02) s += '<circle cx="' + m + '" cy="0" r="22" fill="#fde047" opacity="' + (0.2 + b * 0.7).toFixed(2) + '" filter="url(#glow)"/>';
          s += '<circle class="body" cx="' + m + '" cy="0" r="15" fill="' + (b > 0.02 ? 'rgba(253,224,71,' + (0.3 + b * 0.7).toFixed(2) + ')' : '#fff') + '"/>';
          s += '<path class="body thin" d="M' + (m - 10.6) + ',-10.6 L' + (m + 10.6) + ',10.6 M' + (m - 10.6) + ',10.6 L' + (m + 10.6) + ',-10.6"/>';
          return s;
        case 'acsource':
          s = lead(0, m - 17) + lead(m + 17, L);
          s += '<circle class="body gen" cx="' + m + '" cy="0" r="17"/>';
          var wv = c.waveform || 'sine';
          s += '<path class="body thin" d="' + (wv === 'square' ? 'M' + (m - 9) + ',5 V-5 H' + m + ' V5 H' + (m + 9) + ' V-5'
            : wv === 'triangle' ? 'M' + (m - 10) + ',5 L' + (m - 5) + ',-5 L' + m + ',5 L' + (m + 5) + ',-5 L' + (m + 10) + ',5'
            : 'M' + (m - 10) + ',0 C' + (m - 7) + ',-12 ' + (m - 3) + ',-12 ' + m + ',0 S' + (m + 7) + ',12 ' + (m + 10) + ',0') + '"/>';
          s += '<text class="pol" x="' + (m + 22) + '" y="-12">+</text>';
          return s;
        case 'capacitor':
          s = lead(0, m - 5) + lead(m + 5, L);
          s += '<line class="plate" x1="' + (m - 5) + '" y1="-14" x2="' + (m - 5) + '" y2="14"/><line class="plate" x1="' + (m + 5) + '" y1="-14" x2="' + (m + 5) + '" y2="14"/>';
          return s;
        case 'inductor':
          s = lead(0, m - 20) + lead(m + 20, L) + '<path class="body" d="M' + (m - 20) + ',0';
          for (var q = 0; q < 4; q++) s += ' a5,6 0 0 1 10,0';
          return s + '"/>';
        case 'diode':
          var cond = on && inf && inf.on;
          s = lead(0, m - 10) + lead(m + 10, L);
          s += '<polygon class="body" points="' + (m - 10) + ',-10 ' + (m - 10) + ',10 ' + (m + 10) + ',0" fill="' + (cond ? '#fde68a' : '#fff') + '"/>';
          s += '<line class="body" x1="' + (m + 10) + '" y1="-10" x2="' + (m + 10) + '" y2="10"/>';
          return s;
        case 'switch':
          s = lead(0, m - 16) + lead(m + 16, L);
          s += '<circle class="contact" cx="' + (m - 16) + '" cy="0" r="4"/><circle class="contact" cx="' + (m + 16) + '" cy="0" r="4"/>';
          s += c.closed ? '<line class="body lever" x1="' + (m - 16) + '" y1="0" x2="' + (m + 16) + '" y2="0"/>'
            : '<line class="body lever" x1="' + (m - 16) + '" y1="0" x2="' + (m + 12) + '" y2="-16"/>';
          return s;
      }
      return '';
    }

    function valueLabel(c) {
      switch (c.type) {
        case 'battery': return U.fmtSI(+c.voltage, 'V');
        case 'resistor': return U.fmtSI(+c.resistance, 'Ω');
        case 'led': return (c.color || 'red') + ' LED';
        case 'bulb': return U.fmtSI(+c.resistance, 'Ω') + ' bulb';
        case 'switch': return c.closed ? 'closed' : 'open';
        case 'acsource': return U.fmtSI(+c.amplitude, 'V') + 'pk ' + U.fmtSI(+c.frequency, 'Hz') + ((c.waveform || 'sine') === 'sine' ? '' : c.waveform === 'square' ? ' sq ' + (+c.duty) + '%' : ' tri') + (+c.offset ? ' +' + U.fmtSI(+c.offset, 'V') : '');
        case 'capacitor': return U.fmtSI(+c.capacitance, 'F');
        case 'inductor': return U.fmtSI(+c.inductance, 'H');
        case 'diode': return 'diode';
      }
      return '';
    }

    function renderComps() {
      var compsH = '', flowH = '', labH = '';
      var shorted = state.result && state.result.status === 'short';
      state.comps.forEach(function (c) {
        var x1 = gx(c.a), y1 = gy(c.a), x2 = gx(c.b), y2 = gy(c.b);
        if (c.type === 'ground') {
          compsH += '<g class="comp comp-ground' + (state.selected === c.id ? ' selected' : '') + '" data-id="' + c.id + '" transform="translate(' + x1 + ',' + y1 + ')">' +
            '<circle class="hit-dot" r="14"/><line class="body" x1="0" y1="0" x2="0" y2="14"/><line class="body" x1="-12" y1="14" x2="12" y2="14"/>' +
            '<line class="body" x1="-8" y1="20" x2="8" y2="20"/><line class="body" x1="-4" y1="26" x2="4" y2="26"/></g>';
          return;
        }
        var L = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        var inf = info(c), hot = shorted && inf && Math.abs(inf.current) > 1;
        var cls = 'comp comp-' + c.type + (state.selected === c.id ? ' selected' : '') + (hot ? ' hot' : '');
        compsH += '<g class="' + cls + '" data-id="' + c.id + '" transform="translate(' + x1 + ',' + y1 + ') rotate(' + ang + ')">' +
          '<line class="hit" x1="0" y1="0" x2="' + L + '" y2="0"/>' + symbol(c, L) + '</g>';
        // Current flow animation
        if (state.showFlow && inf && powered() && !state.result.ac && Math.abs(inf.current) > 1e-6) {
          var I = Math.abs(inf.current), dur = I > 0.1 ? 0.6 : I > 0.02 ? 1 : I > 0.005 ? 1.6 : 2.6;
          var fx1 = x1, fy1 = y1, fx2 = x2, fy2 = y2;
          if (inf.current < 0) { fx1 = x2; fy1 = y2; fx2 = x1; fy2 = y1; }
          flowH += '<line class="flow" x1="' + fx1 + '" y1="' + fy1 + '" x2="' + fx2 + '" y2="' + fy2 + '" style="animation-duration:' + dur + 's"/>';
        }
        if (c.type !== 'wire') {
          var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
          if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } // label above / left
          var side = Math.abs(nx) > 0.5, off = side ? 24 + 6 * K : 30, lx = mx + nx * off, ly = my + ny * off;
          var anchor = side ? (nx < 0 ? 'end' : 'start') : 'middle';
          var reading = inf && powered(), gap = 15 * K, y1L, y2L;
          if (side) { y1L = ly - 2 * K; y2L = ly + 13 * K; }
          else { y2L = my - 17; y1L = reading ? y2L - gap : y2L; }      // above: grow upward, away from the part
          labH += '<text class="clabel" style="font-size:' + (12.5 * K).toFixed(1) + 'px" x="' + lx + '" y="' + y1L.toFixed(1) + '" text-anchor="' + anchor + '"><tspan class="cid">' + c.id + '</tspan> ' + U.esc(valueLabel(c)) + '</text>';
          if (reading) {
            labH += '<text class="creading" style="font-size:' + (11.5 * K).toFixed(1) + 'px" x="' + lx + '" y="' + y2L.toFixed(1) + '" text-anchor="' + anchor + '">' + U.fmtSI(Math.abs(inf.current), 'A') + ' · ' + U.fmtSI(Math.abs(inf.voltage), 'V') + '</text>';
          }
        }
      });
      $('gComps').innerHTML = compsH; $('gFlow').innerHTML = flowH; $('gLabels').innerHTML = labH;
    }

    function renderNodes() {
      var h = '', r = state.result;
      var explicitGround = state.comps.some(function (c) { return c.type === 'ground'; });
      if (r && r.ground && !explicitGround) {
        var gp = r.ground.split(',').map(Number), x = gx(P(gp[0], gp[1])), y = gy(P(gp[0], gp[1]));
        h += '<g class="ground" transform="translate(' + (x - 22) + ',' + (y + 8) + ')"><line x1="0" y1="0" x2="0" y2="8"/><line x1="-9" y1="8" x2="9" y2="8"/><line x1="-6" y1="12" x2="6" y2="12"/><line x1="-3" y1="16" x2="3" y2="16"/></g>';
      }
      if (state.showV && r && r.ok && !r.ac) {
        // one label per electrical node (group points joined by wires), placed at the first point
        var groups = {};
        Object.keys(r.nodeVoltages).forEach(function (k) {
          var v = r.nodeVoltages[k], key = (Math.round(v * 1000) / 1000).toFixed(3);
          (groups[key] = groups[key] || []).push(k);
        });
        Object.keys(groups).forEach(function (key) {
          var k = groups[key].sort(function (a, b) { var A = a.split(',').map(Number), B = b.split(',').map(Number); return A[1] - B[1] || A[0] - B[0]; })[0];
          var p = k.split(',').map(Number), x = gx(P(p[0], p[1])), y = gy(P(p[0], p[1]));
          var t = U.fmtSI(+key, 'V');
          var kk = Math.min(K, 1.6);
          h += '<g class="vtag"><rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (t.length * 6.6 * kk + 10).toFixed(1) + '" height="' + (17 * kk).toFixed(1) + '" rx="' + (8 * kk).toFixed(1) + '"/>' +
            '<text style="font-size:' + (11 * kk).toFixed(1) + 'px" x="' + (x + 11) + '" y="' + (y + 6 + 12.5 * kk).toFixed(1) + '">' + t + '</text></g>';
        });
      }
      ['ch1', 'ch2'].forEach(function (ch, i) {
        var k = state.probes[ch]; if (!k) return;
        var p = k.split(',').map(Number), x = gx(P(p[0], p[1])), y = gy(P(p[0], p[1])), kk = Math.min(K, 1.6);
        h += '<g class="probe probe-' + ch + '"><line x1="' + x + '" y1="' + y + '" x2="' + (x - 14 * kk) + '" y2="' + (y - 20 * kk) + '"/>' +
          '<circle cx="' + (x - 14 * kk) + '" cy="' + (y - 20 * kk) + '" r="' + (9 * kk).toFixed(1) + '"/>' +
          '<text x="' + (x - 14 * kk) + '" y="' + (y - 20 * kk + 4 * kk).toFixed(1) + '" style="font-size:' + (11 * kk).toFixed(1) + 'px" text-anchor="middle">' + (i + 1) + '</text></g>';
      });
      $('gNodes').innerHTML = h;
    }

    function renderPreview() {
      var h = '', t = state.tool, start = state.drag || state.pending;
      if (t !== 'select' && t !== 'delete') {
        if (state.hover) h += '<circle class="hover-dot" cx="' + gx(state.hover) + '" cy="' + gy(state.hover) + '" r="' + (9 * Math.min(K, 1.6)).toFixed(1) + '"/>';
        if (start) {
          h += '<circle class="start-dot" cx="' + gx(start) + '" cy="' + gy(start) + '" r="7"/>';
          if (state.hover && !same(state.hover, start)) h += '<line class="preview" x1="' + gx(start) + '" y1="' + gy(start) + '" x2="' + gx(state.hover) + '" y2="' + gy(state.hover) + '"/>';
        }
      }
      $('gPreview').innerHTML = h;
    }

    function renderStatus() {
      var r = state.result, el = $('simStatus');
      if (!r) { el.innerHTML = ''; return; }
      var cls = r.ok ? (r.warnings.length ? 'warn' : 'ok') : (r.status === 'no-source' ? 'info' : 'error');
      var msg = r.ok ? (r.transient ? '✅ Time-domain run: 0–' + U.fmtSI(r.tEnd, 's') + ' in ' + r.steps + ' steps.' + (r.ac ? ' Table shows RMS over the last whole cycles.' : ' Table shows values at the end of the run.') : '✅ Circuit solved.')
        : (r.status === 'short' ? '⚠️ ' : 'ℹ️ ') + U.esc(r.message);
      if (r.ok && !r.transient) {
        var bats = state.comps.filter(function (c) { return c.type === 'battery'; });
        var tot = bats.reduce(function (s, b) { return s + r.components[b.id].current; }, 0);
        if (bats.length === 1) msg += ' Battery delivers <strong>' + U.fmtSI(tot, 'A') + '</strong> (' + U.fmtSI(r.components[bats[0].id].power, 'W') + ').';
      }
      el.className = 'sim-status ' + cls;
      el.innerHTML = msg + (r.warnings.length ? '<ul>' + r.warnings.map(function (w) { return '<li>' + U.esc(w) + '</li>'; }).join('') + '</ul>' : '');
    }


    // ---- virtual oscilloscope ----
    function niceDiv(x) { // 1-2-5 sequence
      if (!(x > 0)) return 1;
      var e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e;
    }
    function scopeData() {
      var r = state.result; if (!r || !r.ok || !r.transient) return null;
      var out = { t: r.t, ch: [] };
      ['ch1', 'ch2'].forEach(function (ch) {
        var k = state.probes[ch], ser = k && r.series[k];
        if (k && !ser && k === r.ground) ser = new Float64Array(r.t.length); // probe on the reference node
        out.ch.push(ser ? { key: k, v: ser, st: S.stats(ser, r.ac ? r.window : null) } : null);
      });
      return out;
    }
    function renderScope() {
      var el = $('simScope'), r = state.result;
      var winSel = '<label class="scope-tb"><span>Window</span><select id="simWindow" aria-label="Scope time window">' + WINDOWS.map(function (w) {
        return '<option value="' + w[0] + '"' + (String(state.window) === String(w[0]) ? ' selected' : '') + '>' + w[1] + '</option>'; }).join('') + '</select></label>';
      var head = '<div class="scope-head"><h3>Scope</h3>' + winSel + '</div>';
      if (!r || !r.transient) {
        el.innerHTML = head + '<p class="muted small">The scope runs when the circuit has a function generator (∿), capacitor or inductor. Try the AC examples in “Load example…”.</p>';
        bindWindow(); return;
      }
      if (!r.ok) { el.innerHTML = head + '<p class="muted small">Fix the circuit to see waveforms.</p>'; bindWindow(); return; }
      var d = scopeData(), Wd = 300, Hd = 200, cols = 10, rows = 8;
      var maxAbs = 0;
      d.ch.forEach(function (c) { if (c) maxAbs = Math.max(maxAbs, Math.abs(c.st.max), Math.abs(c.st.min)); });
      var vdiv = niceDiv(maxAbs / 3.6 || 1), tdiv = r.tEnd / cols;
      var X = function (t) { return (t / r.tEnd) * Wd; }, Y = function (v) { return Hd / 2 - (v / vdiv) * (Hd / rows); };
      var g = '<rect class="scope-bg" x="0" y="0" width="' + Wd + '" height="' + Hd + '"/>';
      for (var i = 1; i < cols; i++) g += '<line class="scope-grid' + (i === cols / 2 ? ' mid' : '') + '" x1="' + i * Wd / cols + '" y1="0" x2="' + i * Wd / cols + '" y2="' + Hd + '"/>';
      for (i = 1; i < rows; i++) g += '<line class="scope-grid' + (i === rows / 2 ? ' mid' : '') + '" x1="0" y1="' + i * Hd / rows + '" x2="' + Wd + '" y2="' + i * Hd / rows + '"/>';
      var stride = Math.max(1, Math.floor(r.t.length / 600));
      d.ch.forEach(function (c, n) {
        if (!c) return;
        var pts = [];
        for (var k = 0; k < r.t.length; k += stride) pts.push(X(r.t[k]).toFixed(1) + ',' + Math.max(-4, Math.min(Hd + 4, Y(c.v[k]))).toFixed(1));
        g += '<polyline class="trace trace-' + (n + 1) + '" points="' + pts.join(' ') + '"/>';
      });
      if (r.ac && r.window) g += '<rect class="scope-win" x="' + X(r.t[r.window[0]]).toFixed(1) + '" y="0" width="' + (X(r.t[r.window[1]]) - X(r.t[r.window[0]])).toFixed(1) + '" height="' + Hd + '"/>';
      var meas = d.ch.map(function (c, n) {
        var name = 'CH' + (n + 1);
        if (!c) return '<div class="meas meas-' + (n + 1) + ' off"><strong>' + name + '</strong> not connected — pick the ' + (n ? '②' : '①') + ' tool and tap a dot.</div>';
        var f = r.ac ? r.f0 : null;
        return '<div class="meas meas-' + (n + 1) + '"><strong>' + name + '</strong> <span class="mk">node ' + c.key + '</span>' +
          '<span>Vpp <b>' + U.fmtSI(c.st.pp, 'V') + '</b></span><span>Vrms <b>' + U.fmtSI(c.st.rms, 'V') + '</b></span><span>Avg <b>' + U.fmtSI(c.st.avg, 'V') + '</b></span>' +
          (f ? '<span>Freq <b>' + U.fmtSI(f, 'Hz') + '</b></span>' : '<span>End <b>' + U.fmtSI(c.v[c.v.length - 1], 'V') + '</b></span>') + '</div>';
      }).join('');
      var ph = '';
      if (r.ac && d.ch[0] && d.ch[1]) {
        var deg = S.phaseDeg(r.t, d.ch[0].v, d.ch[1].v, r.f0, r.window);
        if (deg != null) ph = '<div class="meas phase"><strong>Phase CH2 vs CH1</strong> <b>' + (deg > 0 ? '+' : '') + deg.toFixed(1) + '°</b> <span class="mk">' + (Math.abs(deg) < 1 ? 'in phase' : deg < 0 ? 'CH2 lags' : 'CH2 leads') + '</span></div>';
      }
      el.innerHTML = head + '<svg class="scope-screen" id="simScopeSvg" viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="Oscilloscope traces">' + g + '</svg>' +
        '<div class="scope-scale"><span>' + U.fmtSI(vdiv, 'V') + '/div</span><span>' + U.fmtSI(tdiv, 's') + '/div</span><span>0 V = centre line</span></div>' +
        '<div class="scope-meas">' + meas + ph + '</div>';
      bindWindow();
    }
    function bindWindow() {
      var sel = $('simWindow'); if (!sel) return;
      sel.addEventListener('change', function () { pushHistory(); state.window = sel.value === 'auto' ? 'auto' : +sel.value; update(); });
    }

    function renderProps() {
      var el = $('simProps'), c = state.selected && getComp(state.selected);
      if (!c) {
        el.innerHTML = '<h3>Properties</h3><p class="muted small">Select a component (👆 tool) to edit its value, flip it, or delete it.</p>' +
          '<p class="muted small">Model: ideal battery and generator, ideal resistors, wires ≈ 0 Ω, LEDs as a forward-voltage drop plus 2 Ω, diodes as 0.7 V plus 0.5 Ω, bulbs as fixed resistors. Capacitors and inductors are solved step by step in time (backward Euler); AC readings are RMS over whole periods.</p>';
        return;
      }
      var inf = info(c), h = '<h3>' + c.id + ' · ' + TYPES[c.type].name + '</h3><div class="form-grid">';
      if (c.type === 'battery') h += field('Voltage', 'voltage', U.fmtSI(+c.voltage, '').trim(), 'V', 'e.g. 9, 1.5, 3.7');
      if (c.type === 'resistor' || c.type === 'bulb') h += field('Resistance', 'resistance', U.fmtSI(+c.resistance, '').trim(), 'Ω', 'e.g. 220, 4.7k, 1M');
      if (c.type === 'bulb') h += field('Rated power', 'ratedPower', String(c.ratedPower), 'W', 'brightness = P / rated');
      if (c.type === 'led') {
        h += '<label class="field"><span>Colour</span><select data-prop="color">' + Object.keys(LED_COLORS).map(function (k) {
          return '<option value="' + k + '"' + (c.color === k ? ' selected' : '') + '>' + LED_COLORS[k].label + '</option>'; }).join('') + '</select></label>';
        h += field('Max current', 'maxCurrent', U.fmtSI(+c.maxCurrent, '').trim(), 'A', 'e.g. 20m');
      }
      if (c.type === 'acsource') {
        h += '<label class="field"><span>Waveform</span><select data-prop="waveform">' + Object.keys(WAVES).map(function (k) {
          return '<option value="' + k + '"' + ((c.waveform || 'sine') === k ? ' selected' : '') + '>' + WAVES[k] + '</option>'; }).join('') + '</select></label>';
        h += field('Amplitude', 'amplitude', U.fmtSI(+c.amplitude, '').trim(), 'V pk', 'peak, e.g. 5');
        h += field('Frequency', 'frequency', U.fmtSI(+c.frequency, '').trim(), 'Hz', 'e.g. 60, 1k');
        h += field('DC offset', 'offset', String(+c.offset || 0), 'V', 'may be 0 or negative');
        if (c.waveform === 'square') h += field('Duty cycle', 'duty', String(c.duty != null ? c.duty : 50), '%', '1–99 % high time');
      }
      if (c.type === 'capacitor') h += field('Capacitance', 'capacitance', U.fmtSI(+c.capacitance, '').trim(), 'F', 'e.g. 100n, 10u');
      if (c.type === 'inductor') h += field('Inductance', 'inductance', U.fmtSI(+c.inductance, '').trim(), 'H', 'e.g. 10m, 100u');
      if (c.type === 'diode') h += field('Forward voltage', 'forwardVoltage', String(c.forwardVoltage != null ? c.forwardVoltage : 0.7), 'V', 'silicon ≈ 0.7');
      if (c.type === 'ground') h += '<p class="small">0 V reference. Node voltages and scope probes are measured from here.</p>';
      if (c.type === 'switch') h += '<button class="btn" data-act="toggle">' + (c.closed ? 'Open switch' : 'Close switch') + '</button>';
      h += '</div>';
      if (inf && powered() && c.type !== 'ground') {
        var rm = state.result.ac ? ' (RMS)' : '';
        h += '<div class="readout"><div><span>Voltage' + rm + '</span><strong>' + U.fmtSI(Math.abs(inf.voltage), 'V') + '</strong></div>' +
          '<div><span>Current' + rm + '</span><strong>' + U.fmtSI(Math.abs(inf.current), 'A') + '</strong></div>' +
          '<div><span>Power' + (rm ? ' (avg)' : '') + '</span><strong>' + U.fmtSI(inf.power, 'W') + '</strong></div></div>';
        if (c.type === 'led' || c.type === 'diode') h += '<p class="small">' + (inf.on ? 'LED is <strong>on</strong>.' : 'LED is <strong>off</strong> — not enough forward voltage, or it is reversed.') + '</p>';
      }
      h += '<div class="btn-row">' + (c.type === 'ground' ? '' : '<button class="btn small ghost" data-act="flip" title="Swap terminals">⇄ Flip</button>') + '<button class="btn small danger" data-act="delete">Delete</button></div>';
      el.innerHTML = h;
      el.querySelectorAll('[data-prop]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var prop = inp.getAttribute('data-prop');
          if (prop === 'color') { pushHistory(); c.color = inp.value; c.forwardVoltage = LED_COLORS[inp.value].vf; update(); return; }
          if (prop === 'waveform') { pushHistory(); c.waveform = inp.value; update(); return; }
          var v = U.parseSI(inp.value);
          if (prop === 'offset' || prop === 'duty' || prop === 'forwardVoltage') {
            var okv = isFinite(v) && (prop === 'offset' ? Math.abs(v) <= 100 : prop === 'duty' ? v >= 1 && v <= 99 : v >= 0 && v <= 5);
            if (!okv) { inp.classList.add('invalid'); inp.title = prop === 'duty' ? 'Enter 1–99 %' : 'Out of range'; return; }
            pushHistory(); c[prop] = v; update(); return;
          }
          if (!isFinite(v) || v <= 0 || (prop === 'voltage' && v > 1000) || (prop === 'resistance' && v < 0.1)) {
            inp.classList.add('invalid'); inp.title = prop === 'resistance' ? 'Enter a value ≥ 0.1 Ω' : 'Enter a positive number'; return;
          }
          pushHistory(); c[prop] = v; update();
        });
      });
      el.querySelectorAll('[data-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.getAttribute('data-act');
          if (a === 'delete') removeComp(c.id);
          else if (a === 'flip') { pushHistory(); var t = c.a; c.a = c.b; c.b = t; update(); }
          else if (a === 'toggle') { pushHistory(); c.closed = !c.closed; update(); }
        });
      });
    }
    function field(label, prop, val, unit, hint) {
      return '<label class="field"><span>' + label + '</span><div class="input-unit"><input data-prop="' + prop + '" value="' + U.esc(val) + '" inputmode="decimal" aria-label="' + label + '"><em>' + unit + '</em></div><small>' + hint + '</small></label>';
    }

    function renderTable() {
      var r = state.result, el = $('simTable');
      var list = state.comps.filter(function (c) { return c.type !== 'wire' && c.type !== 'ground'; });
      if (!list.length) { el.innerHTML = '<p class="muted small">No components yet. Pick a tool or load an example.</p>'; return; }
      var ac = r && r.ac;
      el.innerHTML = '<table><thead><tr><th>Part</th><th>Value</th><th>' + (ac ? 'V rms' : 'V') + '</th><th>' + (ac ? 'I rms' : 'I') + '</th><th>' + (ac ? 'P avg' : 'P') + '</th></tr></thead><tbody>' +
        list.map(function (c) {
          var inf = r && r.ok ? r.components[c.id] : null;
          return '<tr data-sel="' + c.id + '" class="' + (state.selected === c.id ? 'sel' : '') + '"><td>' + c.id + '</td><td>' + U.esc(valueLabel(c)) + '</td>' +
            '<td>' + (inf ? U.fmtSI(Math.abs(inf.voltage), 'V') : '—') + '</td><td>' + (inf ? U.fmtSI(Math.abs(inf.current), 'A') : '—') + '</td><td>' + (inf ? U.fmtSI(inf.power, 'W') : '—') + '</td></tr>';
        }).join('') + '</tbody></table>';
      el.querySelectorAll('[data-sel]').forEach(function (tr) {
        tr.addEventListener('click', function () { state.selected = tr.getAttribute('data-sel'); render(); });
      });
    }

    setTool('select');
    update();
    return {
      state: state, loadPreset: function (k) { if (PRESETS[k]) { pushHistory(); applyPreset(k); update(); } },
      scope: function () { var d = scopeData(), r = state.result; if (!d) return null; return { f0: r.f0, tEnd: r.tEnd, ch: d.ch.map(function (c) { return c && { key: c.key, vpp: c.st.pp, vrms: c.st.rms, avg: c.st.avg, max: c.st.max, min: c.st.min }; }),
        phase: r.ac && d.ch[0] && d.ch[1] ? S.phaseDeg(r.t, d.ch[0].v, d.ch[1].v, r.f0, r.window) : null }; },
      setProbe: function (ch, k) { state.probes[ch] = k; update(); },
      setComps: function (comps) { state.comps = clone(comps); update(); }, result: function () { return state.result; }
    };
  }

  g.Simulator = { mount: mount, PRESETS: PRESETS, LED_COLORS: LED_COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
