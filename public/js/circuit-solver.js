/*
 * Electronics Academy - DC circuit solver
 * Modified Nodal Analysis (MNA) with a piecewise-linear LED model.
 *
 * Component format:
 *   { id, type, a, b, ...params }
 *   a / b are terminals: either a string node name or {x, y} grid point.
 *   type: 'wire' | 'battery' | 'resistor' | 'bulb' | 'led' | 'switch'
 *   battery: a = negative (−), b = positive (+), param voltage (V)
 *   resistor: param resistance (Ω)
 *   bulb: param resistance (Ω), ratedPower (W) — modelled as a fixed resistor
 *   led: a = anode, b = cathode, params forwardVoltage (V), maxCurrent (A)
 *   switch: param closed (bool)
 *   diode: a = anode, b = cathode, param forwardVoltage (V, default 0.7) — rectifier diode
 *   ground: single-point marker (a = b) that sets the 0 V reference node
 *   AC / transient parts (use transient() instead of solve()):
 *   acsource: function generator, a = − (reference), b = + ; params waveform ('sine'|'square'|'triangle'),
 *             amplitude (V peak), frequency (Hz), offset (V DC), duty (% high time, square only)
 *   capacitor: param capacitance (F)   inductor: param inductance (H)
 *
 * Sign conventions in results:
 *   voltage = V(a) − V(b)
 *   current = current flowing through the component from a to b (A)
 *   For a battery, current is reported as the current it delivers out of its
 *   + terminal (positive when it is discharging normally).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CircuitSolver = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WIRE_R = 1e-4;        // wires and closed switches are tiny resistors
  var GMIN = 1e-9;          // tiny leak to ground so floating nodes stay solvable
  var LED_RS = 2;           // LED on-state series resistance (Ω)
  var LED_OFF_G = 1e-9;     // LED off-state conductance (S)
  var SHORT_CURRENT = 100;  // A — above this a battery is treated as shorted

  var DIODE_RS = 0.5;       // rectifier diode on-state series resistance (Ω)
  function vfOf(c) { return c.type === 'diode' ? (c.forwardVoltage != null ? +c.forwardVoltage : 0.7) : (+c.forwardVoltage || 2); }
  function rsOf(c) { return c.type === 'diode' ? DIODE_RS : LED_RS; }

  function key(t) {
    if (typeof t === 'string') return t;
    return t.x + ',' + t.y;
  }

  // Gaussian elimination with partial pivoting. Returns null if singular.
  function linsolve(A, b) {
    var n = b.length, i, j, k;
    var M = A.map(function (row, r) { return row.concat([b[r]]); });
    for (k = 0; k < n; k++) {
      var piv = k, max = Math.abs(M[k][k]);
      for (i = k + 1; i < n; i++) {
        if (Math.abs(M[i][k]) > max) { max = Math.abs(M[i][k]); piv = i; }
      }
      if (max < 1e-18) return null;
      if (piv !== k) { var t = M[k]; M[k] = M[piv]; M[piv] = t; }
      for (i = k + 1; i < n; i++) {
        var f = M[i][k] / M[k][k];
        if (f === 0) continue;
        for (j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  function solve(components) {
    var gnd = (components || []).filter(function (c) { return c.type === 'ground'; })[0];
    var comps = (components || []).filter(function (c) { return c.type !== 'ground' && key(c.a) !== key(c.b); });
    var result = {
      ok: true, status: 'ok', message: '', ground: null,
      nodeVoltages: {}, components: {}, warnings: []
    };
    var batteries = comps.filter(function (c) { return c.type === 'battery'; });
    if (!batteries.length) {
      result.ok = false; result.status = 'no-source';
      result.message = 'Add a battery to power the circuit.';
      comps.forEach(function (c) { result.components[c.id] = { voltage: 0, current: 0, power: 0 }; });
      return result;
    }

    // Collect nodes
    var nodeIndex = {}, nodeNames = [];
    function addNode(t) {
      var k = key(t);
      if (!(k in nodeIndex)) { nodeIndex[k] = nodeNames.length; nodeNames.push(k); }
    }
    comps.forEach(function (c) { addNode(c.a); addNode(c.b); });
    var groundKey = gnd && (key(gnd.a) in nodeIndex) ? key(gnd.a) : key(batteries[0].a);
    result.ground = groundKey;

    // Matrix index for a node (-1 = ground)
    var idx = {}, n = 0;
    nodeNames.forEach(function (k) { idx[k] = (k === groundKey) ? -1 : n++; });
    var vsrc = batteries;
    var m = vsrc.length;
    var size = n + m;

    var leds = comps.filter(function (c) { return c.type === 'led' || c.type === 'diode'; });
    var ledOn = {};
    leds.forEach(function (l) { ledOn[l.id] = false; });

    var x = null, iter, changed;
    for (iter = 0; iter < 60; iter++) {
      var A = [], b = [], r, cI;
      for (r = 0; r < size; r++) { A.push(new Array(size).fill(0)); b.push(0); }
      var stampG = function (ka, kb, g) {
        var p = idx[ka], q = idx[kb];
        if (p >= 0) A[p][p] += g;
        if (q >= 0) A[q][q] += g;
        if (p >= 0 && q >= 0) { A[p][q] -= g; A[q][p] -= g; }
      };
      // current source injecting I into node ka and drawing from kb
      var stampI = function (ka, kb, I) {
        var p = idx[ka], q = idx[kb];
        if (p >= 0) b[p] += I;
        if (q >= 0) b[q] -= I;
      };
      for (r = 0; r < n; r++) A[r][r] += GMIN;

      comps.forEach(function (c) {
        var ka = key(c.a), kb = key(c.b);
        switch (c.type) {
          case 'wire': stampG(ka, kb, 1 / WIRE_R); break;
          case 'switch': if (c.closed) stampG(ka, kb, 1 / WIRE_R); break;
          case 'resistor':
          case 'bulb': stampG(ka, kb, 1 / Math.max(+c.resistance || 0, 1e-3)); break;
          case 'inductor': stampG(ka, kb, 1 / WIRE_R); break; // DC steady state: a wire
          case 'led': case 'diode':
            if (ledOn[c.id]) {
              var g = 1 / rsOf(c), vf = vfOf(c);
              stampG(ka, kb, g);
              stampI(ka, kb, g * vf);
            } else stampG(ka, kb, LED_OFF_G);
            break;
        }
      });
      vsrc.forEach(function (c, k) {
        var row = n + k;
        var p = idx[key(c.b)], q = idx[key(c.a)]; // + is b, − is a
        if (p >= 0) { A[p][row] += 1; A[row][p] += 1; }
        if (q >= 0) { A[q][row] -= 1; A[row][q] -= 1; }
        b[row] = +c.voltage || 0;
      });

      x = linsolve(A, b);
      if (!x) {
        result.ok = false; result.status = 'singular';
        result.message = 'This circuit cannot be solved — two batteries may be connected directly in parallel.';
        return result;
      }
      // Check LED states
      changed = false;
      leds.forEach(function (l) {
        var va = vOf(key(l.a)), vb = vOf(key(l.b));
        var vd = va - vb, vf = vfOf(l);
        if (ledOn[l.id]) {
          var i = (vd - vf) / rsOf(l);
          if (i < 0) { ledOn[l.id] = false; changed = true; }
        } else if (vd > vf + 1e-9) { ledOn[l.id] = true; changed = true; }
      });
      if (!changed) break;
    }
    if (changed) result.warnings.push('LED states did not fully converge.');

    function vOf(k) { var i = idx[k]; return i < 0 ? 0 : x[i]; }

    nodeNames.forEach(function (k) { result.nodeVoltages[k] = vOf(k); });

    comps.forEach(function (c) {
      var va = vOf(key(c.a)), vb = vOf(key(c.b)), v = va - vb, i = 0;
      switch (c.type) {
        case 'wire': i = v / WIRE_R; break;
        case 'switch': i = c.closed ? v / WIRE_R : 0; break;
        case 'resistor': case 'bulb': i = v / Math.max(+c.resistance || 0, 1e-3); break;
        case 'inductor': i = v / WIRE_R; break;
        case 'led': case 'diode':
          i = ledOn[c.id] ? (v - vfOf(c)) / rsOf(c) : v * LED_OFF_G;
          break;
        case 'battery':
          // MNA current variable flows into + terminal; delivered current is its negative
          i = -x[n + vsrc.indexOf(c)];
          v = vb - va; // report battery voltage as V(+) − V(−)
          break;
      }
      var info = { voltage: v, current: i, power: Math.abs(v * i) };
      if (c.type === 'led') {
        info.on = !!ledOn[c.id];
        var max = +c.maxCurrent || 0.03;
        info.brightness = info.on ? Math.min(i / 0.02, 1.5) : 0;
        if (info.on && i > max) {
          info.overCurrent = true;
          result.warnings.push('LED ' + c.id + ' carries ' + (i * 1000).toFixed(1) +
            ' mA (max ' + (max * 1000).toFixed(0) + ' mA) — it would burn out. Add a series resistor.');
        }
      }
      if (c.type === 'bulb') {
        var rated = +c.ratedPower || 0.5;
        info.brightness = Math.min(info.power / rated, 1.5);
        if (info.power > rated * 1.2) result.warnings.push('Bulb ' + c.id + ' is over its rated power (' +
          info.power.toFixed(2) + ' W > ' + rated + ' W).');
      }
      if (c.type === 'resistor' && c.powerRating && info.power > c.powerRating) {
        result.warnings.push('Resistor ' + c.id + ' dissipates ' + info.power.toFixed(2) + ' W, above its ' + c.powerRating + ' W rating.');
      }
      result.components[c.id] = info;
    });

    batteries.forEach(function (c) {
      if (Math.abs(result.components[c.id].current) > SHORT_CURRENT) {
        result.ok = false; result.status = 'short';
        result.message = 'Short circuit! Battery ' + c.id + ' is connected across a near-zero resistance path.';
      }
    });
    return result;
  }


  // ---------------- Transient (time-domain) analysis ----------------
  // Backward-Euler companion models: a capacitor becomes G = C/dt in parallel with a current source
  // carrying its previous voltage; an inductor becomes G = dt/L in parallel with its previous current.
  // Capacitors start discharged and inductors with zero current (the circuit is "switched on" at t = 0).
  function sourceValue(c, t) {
    if (c.type === 'battery') return +c.voltage || 0;
    var A = +c.amplitude || 0, f = Math.max(+c.frequency || 0, 1e-6), off = +c.offset || 0;
    var ph = t * f - Math.floor(t * f), w = c.waveform || 'sine';
    if (w === 'square') return off + (ph < (c.duty != null ? +c.duty : 50) / 100 ? A : -A);
    if (w === 'triangle') return off + A * (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph);
    return off + A * Math.sin(2 * Math.PI * f * t);
  }
  var REACTIVE = { acsource: 1, capacitor: 1, inductor: 1 };
  function needsTransient(components) { return (components || []).some(function (c) { return REACTIVE[c.type]; }); }
  function generatorFrequency(components) {
    var f = (components || []).filter(function (c) { return c.type === 'acsource'; }).map(function (c) { return +c.frequency || 0; }).filter(function (x) { return x > 0; });
    return f.length ? Math.min.apply(null, f) : null;
  }

  function transient(components, opts) {
    opts = opts || {};
    var gnd = (components || []).filter(function (c) { return c.type === 'ground'; })[0];
    var comps = (components || []).filter(function (c) { return c.type !== 'ground' && key(c.a) !== key(c.b); });
    var f0 = generatorFrequency(comps);
    var tEnd = +opts.tEnd > 0 ? +opts.tEnd : (f0 ? 4 / f0 : 0.1);
    var N = Math.max(50, Math.min(20000, Math.round(+opts.steps || 1500)));
    var dt = tEnd / N;
    var result = { ok: true, status: 'ok', message: '', ground: null, transient: true, ac: !!f0, f0: f0, tEnd: tEnd, dt: dt, steps: N,
      nodeVoltages: {}, components: {}, warnings: [], t: null, series: {}, compSeries: {} };
    var sources = comps.filter(function (c) { return c.type === 'battery' || c.type === 'acsource'; });
    if (!sources.length) {
      result.ok = false; result.status = 'no-source'; result.message = 'Add a battery or function generator to power the circuit.';
      comps.forEach(function (c) { result.components[c.id] = { voltage: 0, current: 0, power: 0 }; });
      return result;
    }
    var nodeIndex = {}, nodeNames = [];
    comps.forEach(function (c) { [c.a, c.b].forEach(function (t) { var k = key(t); if (!(k in nodeIndex)) { nodeIndex[k] = nodeNames.length; nodeNames.push(k); } }); });
    var groundKey = gnd && (key(gnd.a) in nodeIndex) ? key(gnd.a) : key(sources[0].a);
    result.ground = groundKey;
    var idx = {}, n = 0;
    nodeNames.forEach(function (k) { idx[k] = k === groundKey ? -1 : n++; });
    var m = sources.length, size = n + m;
    var diodes = comps.filter(function (c) { return c.type === 'led' || c.type === 'diode'; });
    var on = {}; diodes.forEach(function (d) { on[d.id] = false; });
    var vC = {}, iL = {};
    comps.forEach(function (c) { if (c.type === 'capacitor') vC[c.id] = 0; if (c.type === 'inductor') iL[c.id] = 0; });
    var T = new Float64Array(N + 1), NV = {}, CV = {}, CI = {};
    nodeNames.forEach(function (k) { NV[k] = new Float64Array(N + 1); });
    comps.forEach(function (c) { CV[c.id] = new Float64Array(N + 1); CI[c.id] = new Float64Array(N + 1); });
    var unconverged = 0, x = null, maxSrcI = 0;

    for (var step = 0; step <= N; step++) {
      var t = step * dt;
      var changed = true, iter;
      for (iter = 0; iter < 40 && changed; iter++) {
        var A = [], b = [], r;
        for (r = 0; r < size; r++) { A.push(new Array(size).fill(0)); b.push(0); }
        var stampG = function (ka, kb, g) {
          var p = idx[ka], q = idx[kb];
          if (p >= 0) A[p][p] += g; if (q >= 0) A[q][q] += g;
          if (p >= 0 && q >= 0) { A[p][q] -= g; A[q][p] -= g; }
        };
        var stampI = function (ka, kb, I) { var p = idx[ka], q = idx[kb]; if (p >= 0) b[p] += I; if (q >= 0) b[q] -= I; };
        for (r = 0; r < n; r++) A[r][r] += GMIN;
        comps.forEach(function (c) {
          var ka = key(c.a), kb = key(c.b), g;
          switch (c.type) {
            case 'wire': stampG(ka, kb, 1 / WIRE_R); break;
            case 'switch': if (c.closed) stampG(ka, kb, 1 / WIRE_R); break;
            case 'resistor': case 'bulb': stampG(ka, kb, 1 / Math.max(+c.resistance || 0, 1e-3)); break;
            case 'capacitor': g = Math.max(+c.capacitance || 0, 1e-15) / dt; stampG(ka, kb, g); stampI(ka, kb, g * vC[c.id]); break;
            case 'inductor': g = dt / Math.max(+c.inductance || 0, 1e-12); stampG(ka, kb, g); stampI(ka, kb, -iL[c.id]); break;
            case 'led': case 'diode':
              if (on[c.id]) { g = 1 / rsOf(c); stampG(ka, kb, g); stampI(ka, kb, g * vfOf(c)); } else stampG(ka, kb, LED_OFF_G);
              break;
          }
        });
        sources.forEach(function (c, k) {
          var row = n + k, p = idx[key(c.b)], q = idx[key(c.a)];
          if (p >= 0) { A[p][row] += 1; A[row][p] += 1; }
          if (q >= 0) { A[q][row] -= 1; A[row][q] -= 1; }
          b[row] = sourceValue(c, t);
        });
        x = linsolve(A, b);
        if (!x) {
          result.ok = false; result.status = 'singular';
          result.message = 'This circuit cannot be solved — two sources may be connected directly in parallel.';
          return result;
        }
        changed = false;
        diodes.forEach(function (d) {
          var vd = vAt(key(d.a)) - vAt(key(d.b)), vf = vfOf(d);
          if (on[d.id]) { if ((vd - vf) / rsOf(d) < 0) { on[d.id] = false; changed = true; } }
          else if (vd > vf + 1e-9) { on[d.id] = true; changed = true; }
        });
      }
      if (changed) unconverged++;
      T[step] = t;
      nodeNames.forEach(function (k) { NV[k][step] = vAt(k); });
      comps.forEach(function (c) {
        var v = vAt(key(c.a)) - vAt(key(c.b)), i = 0, g;
        switch (c.type) {
          case 'wire': i = v / WIRE_R; break;
          case 'switch': i = c.closed ? v / WIRE_R : 0; break;
          case 'resistor': case 'bulb': i = v / Math.max(+c.resistance || 0, 1e-3); break;
          case 'capacitor': g = Math.max(+c.capacitance || 0, 1e-15) / dt; i = g * (v - vC[c.id]); vC[c.id] = v; break;
          case 'inductor': g = dt / Math.max(+c.inductance || 0, 1e-12); i = g * v + iL[c.id]; iL[c.id] = i; break;
          case 'led': case 'diode': i = on[c.id] ? (v - vfOf(c)) / rsOf(c) : v * LED_OFF_G; break;
          case 'battery': case 'acsource': i = -x[n + sources.indexOf(c)]; v = -v; maxSrcI = Math.max(maxSrcI, Math.abs(i)); break;
        }
        CV[c.id][step] = v; CI[c.id][step] = i;
      });
    }
    function vAt(k) { var i = idx[k]; return i < 0 ? 0 : x[i]; }
    if (unconverged) result.warnings.push('Diode states did not fully converge at ' + unconverged + ' time steps.');

    // Measurement window: the last whole generator periods in the second half of the run, else the final value.
    var win = measureWindow(T, f0);
    result.window = win;
    result.t = T; result.series = NV; result.compSeries = { v: CV, i: CI };
    nodeNames.forEach(function (k) { result.nodeVoltages[k] = f0 ? stats(NV[k], win).rms : NV[k][N]; });
    comps.forEach(function (c) {
      var sv = stats(CV[c.id], win), si = stats(CI[c.id], win), p = 0;
      for (var k = win[0]; k <= win[1]; k++) p += CV[c.id][k] * CI[c.id][k];
      p /= (win[1] - win[0] + 1);
      var info = f0 ? { voltage: sv.rms, current: si.rms, power: Math.abs(p), vpp: sv.pp, ipp: si.pp, avgCurrent: si.avg, rms: true }
        : { voltage: CV[c.id][N], current: CI[c.id][N], power: Math.abs(CV[c.id][N] * CI[c.id][N]), rms: false };
      if (c.type === 'led' || c.type === 'diode') {
        var ia = f0 ? si.avg : CI[c.id][N];
        info.on = ia > 1e-4; info.brightness = info.on ? Math.min(ia / 0.02, 1.5) : 0;
        var max = +c.maxCurrent || (c.type === 'led' ? 0.03 : 1);
        var peak = Math.max.apply(null, Array.prototype.slice.call(CI[c.id], win[0], win[1] + 1));
        if (peak > max) { info.overCurrent = true; result.warnings.push((c.type === 'led' ? 'LED ' : 'Diode ') + c.id + ' peaks at ' + (peak * 1000).toFixed(1) + ' mA (max ' + (max * 1000).toFixed(0) + ' mA).'); }
      }
      if (c.type === 'bulb') info.brightness = Math.min(info.power / (+c.ratedPower || 0.5), 1.5);
      result.components[c.id] = info;
    });
    if (maxSrcI > SHORT_CURRENT) {
      result.ok = false; result.status = 'short';
      result.message = 'Short circuit! A source is connected across a near-zero resistance path.';
    }
    return result;
  }

  function measureWindow(T, f0) {
    var N = T.length - 1, tEnd = T[N];
    if (!f0) return [N, N];
    var periods = Math.floor((tEnd / 2) * f0);
    if (periods < 1) return [0, N];
    var t0 = tEnd - periods / f0, k0 = Math.round(t0 / (tEnd / N));
    return [Math.max(0, k0), N - 1]; // N-1: exclude the duplicate end point of the last period
  }
  function stats(arr, win) {
    var lo = win ? win[0] : 0, hi = win ? win[1] : arr.length - 1, mx = -Infinity, mn = Infinity, s = 0, s2 = 0, n = hi - lo + 1;
    for (var k = lo; k <= hi; k++) { var v = arr[k]; if (v > mx) mx = v; if (v < mn) mn = v; s += v; s2 += v * v; }
    return { max: mx, min: mn, pp: mx - mn, avg: s / n, rms: Math.sqrt(s2 / n) };
  }
  // Phase of v2 relative to v1 at f0 (degrees, −180..180; negative = v2 lags v1), via a single-bin DFT.
  function phaseDeg(T, v1, v2, f0, win) {
    if (!f0) return null;
    win = win || measureWindow(T, f0);
    var w = 2 * Math.PI * f0, r1 = 0, i1 = 0, r2 = 0, i2 = 0;
    for (var k = win[0]; k <= win[1]; k++) {
      var c = Math.cos(w * T[k]), s = Math.sin(w * T[k]);
      r1 += v1[k] * c; i1 -= v1[k] * s; r2 += v2[k] * c; i2 -= v2[k] * s;
    }
    if (Math.hypot(r1, i1) < 1e-9 || Math.hypot(r2, i2) < 1e-9) return null;
    var d = (Math.atan2(i2, r2) - Math.atan2(i1, r1)) * 180 / Math.PI;
    while (d > 180) d -= 360; while (d <= -180) d += 360;
    return d;
  }

  return { solve: solve, transient: transient, needsTransient: needsTransient, generatorFrequency: generatorFrequency, sourceValue: sourceValue,
    stats: stats, phaseDeg: phaseDeg, measureWindow: measureWindow, key: key, linsolve: linsolve,
    constants: { WIRE_R: WIRE_R, LED_RS: LED_RS, DIODE_RS: DIODE_RS, SHORT_CURRENT: SHORT_CURRENT } };
});
