/* Calculators: Ohm's law, resistor colour code, LED resistor, series/parallel. */
(function (g) {
  'use strict';
  var U = g.Units;
  var BANDS = [
    { name: 'Black', hex: '#111111', digit: 0, mult: 0 }, { name: 'Brown', hex: '#7b3f00', digit: 1, mult: 1, tol: 1 },
    { name: 'Red', hex: '#dd1111', digit: 2, mult: 2, tol: 2 }, { name: 'Orange', hex: '#ff7700', digit: 3, mult: 3 },
    { name: 'Yellow', hex: '#ffdd00', digit: 4, mult: 4 }, { name: 'Green', hex: '#11aa11', digit: 5, mult: 5, tol: 0.5 },
    { name: 'Blue', hex: '#1144dd', digit: 6, mult: 6, tol: 0.25 }, { name: 'Violet', hex: '#8822cc', digit: 7, mult: 7, tol: 0.1 },
    { name: 'Grey', hex: '#888888', digit: 8, mult: 8, tol: 0.05 }, { name: 'White', hex: '#ffffff', digit: 9, mult: 9 },
    { name: 'Gold', hex: '#cfa640', mult: -1, tol: 5 }, { name: 'Silver', hex: '#c0c0c0', mult: -2, tol: 10 }
  ];
  var byName = {}; BANDS.forEach(function (b) { byName[b.name] = b; });

  // Ohm's law: given any two of V, I, R, P returns all four.
  function ohm(k) {
    var V = k.V, I = k.I, R = k.R, Pw = k.P, has = function (x) { return x != null && isFinite(x); };
    if (has(V) && has(I)) { R = V / I; Pw = V * I; }
    else if (has(V) && has(R)) { I = V / R; Pw = V * V / R; }
    else if (has(V) && has(Pw)) { I = Pw / V; R = V * V / Pw; }
    else if (has(I) && has(R)) { V = I * R; Pw = I * I * R; }
    else if (has(I) && has(Pw)) { V = Pw / I; R = Pw / (I * I); }
    else if (has(R) && has(Pw)) { V = Math.sqrt(Pw * R); I = Math.sqrt(Pw / R); }
    else return null;
    return { V: V, I: I, R: R, P: Pw };
  }
  function decode(names) {
    var bands = names.map(function (n) { return byName[n]; });
    var nDigits = bands.length === 5 ? 3 : 2, val = 0, i;
    for (i = 0; i < nDigits; i++) { if (bands[i].digit == null) return null; val = val * 10 + bands[i].digit; }
    var m = bands[nDigits]; if (m.mult == null) return null;
    var t = bands[nDigits + 1];
    return { ohms: val * Math.pow(10, m.mult), tolerance: t && t.tol != null ? t.tol : null };
  }
  // value → band names (rounded to 2 or 3 significant figures)
  function encode(ohms, nBands, tolName) {
    var nDigits = nBands === 5 ? 3 : 2;
    if (!(ohms > 0)) return null;
    var exp = Math.floor(Math.log10(ohms)) - (nDigits - 1);
    var sig = Math.round(ohms / Math.pow(10, exp));
    if (sig >= Math.pow(10, nDigits)) { sig = Math.round(sig / 10); exp++; }
    if (exp < -2 || exp > 9) return null;
    var digits = String(sig).split('').map(Number);
    var names = digits.map(function (d) { return BANDS[d].name; });
    names.push(exp === -1 ? 'Gold' : exp === -2 ? 'Silver' : BANDS[exp].name);
    names.push(tolName || (nBands === 5 ? 'Brown' : 'Gold'));
    return { names: names, actual: sig * Math.pow(10, exp), exact: Math.abs(sig * Math.pow(10, exp) - ohms) < ohms * 1e-9 };
  }
  var E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  function nextE12(r) {
    if (!(r > 0)) return null;
    var dec = Math.pow(10, Math.floor(Math.log10(r)) - 1);
    for (var k = 0; k < 3; k++) {
      for (var i = 0; i < E12.length; i++) { var v = E12[i] * dec; if (v >= r * (1 - 1e-9)) return v; }
      dec *= 10;
    }
    return null;
  }

  function resistorSvg(names) {
    var n = names.length, xs = n === 5 ? [62, 80, 98, 116, 146] : [66, 88, 110, 146];
    return '<svg viewBox="0 0 220 70" class="resistor-svg" role="img" aria-label="' + names.join(', ') + ' resistor">' +
      '<line x1="0" y1="35" x2="220" y2="35" stroke="#9ca3af" stroke-width="4"/>' +
      '<rect x="40" y="12" width="140" height="46" rx="20" fill="#e8d4a8" stroke="#b49a6a" stroke-width="2"/>' +
      names.map(function (nm, i) { return '<rect x="' + xs[i] + '" y="12" width="10" height="46" fill="' + byName[nm].hex + '" stroke="rgba(0,0,0,.15)"/>'; }).join('') +
      '</svg>';
  }

  function render(container) {
    container.innerHTML =
      '<div class="tools-grid">' +
      '<section class="card tool-card" id="ohmCard"><h2>⚖️ Ohm’s law calculator</h2>' +
      '<p class="muted small">Enter any two values (SI prefixes OK: 4.7k, 20m, 1M) and press Calculate.</p>' +
      '<div class="form-grid two">' +
      ['V|Voltage|V|9', 'I|Current|A|', 'R|Resistance|Ω|3k', 'P|Power|W|'].map(function (s) {
        var p = s.split('|'); return '<label class="field"><span>' + p[1] + ' (' + p[0] + ')</span><div class="input-unit"><input id="ohm' + p[0] + '" inputmode="decimal" placeholder="—" value="' + p[3] + '"><em>' + p[2] + '</em></div></label>';
      }).join('') + '</div>' +
      '<div class="btn-row"><button class="btn" id="ohmCalc">Calculate</button><button class="btn ghost" id="ohmClear">Clear</button></div>' +
      '<div id="ohmOut" class="tool-out"></div>' +
      '<div class="formula small">V = I·R &nbsp;·&nbsp; P = V·I = I²R = V²/R</div></section>' +

      '<section class="card tool-card" id="ccCard"><h2>🎨 Resistor colour code</h2>' +
      '<div class="seg" role="tablist"><button class="seg-btn active" data-bands="4">4-band</button><button class="seg-btn" data-bands="5">5-band</button></div>' +
      '<div id="ccSvg" class="cc-svg"></div><div id="ccValue" class="cc-value"></div>' +
      '<div id="ccSelects" class="cc-selects"></div>' +
      '<hr/><label class="field"><span>Find bands for a value</span><div class="input-unit"><input id="ccFind" placeholder="e.g. 4.7k" inputmode="decimal"><em>Ω</em></div></label>' +
      '<div id="ccFindOut" class="tool-out"></div></section>' +

      '<section class="card tool-card"><h2>🔴 LED resistor</h2>' +
      '<div class="form-grid two">' +
      '<label class="field"><span>Supply voltage</span><div class="input-unit"><input id="ledVs" value="5" inputmode="decimal"><em>V</em></div></label>' +
      '<label class="field"><span>LED forward voltage</span><div class="input-unit"><input id="ledVf" value="2" inputmode="decimal"><em>V</em></div></label>' +
      '<label class="field"><span>LED current</span><div class="input-unit"><input id="ledI" value="15m" inputmode="decimal"><em>A</em></div></label></div>' +
      '<div id="ledOut" class="tool-out"></div><div class="formula small">R = (V<sub>s</sub> − V<sub>F</sub>) / I</div></section>' +

      '<section class="card tool-card"><h2>🔗 Series / parallel</h2>' +
      '<label class="field"><span>Resistor values (comma separated)</span><input id="spVals" value="1k, 2k, 470"></label>' +
      '<div id="spOut" class="tool-out"></div></section>' +
      '</div>';
    var $ = function (id) { return container.querySelector('#' + id); };

    // Ohm
    function calcOhm() {
      var vals = {}, given = [];
      ['V', 'I', 'R', 'P'].forEach(function (k) { var s = $('ohm' + k).value.trim(); if (s) { vals[k] = U.parseSI(s); given.push(k); } });
      var out = $('ohmOut');
      if (given.some(function (k) { return !isFinite(vals[k]) || vals[k] <= 0; })) { out.innerHTML = '<p class="error-text">Values must be positive numbers.</p>'; return; }
      if (given.length !== 2) { out.innerHTML = '<p class="error-text">Enter exactly two values (you entered ' + given.length + ').</p>'; return; }
      var r = ohm(vals);
      out.innerHTML = '<div class="readout">' + [['V', 'Voltage', 'V'], ['I', 'Current', 'A'], ['R', 'Resistance', 'Ω'], ['P', 'Power', 'W']].map(function (q) {
        return '<div class="' + (given.indexOf(q[0]) >= 0 ? 'given' : 'calc') + '"><span>' + q[1] + '</span><strong>' + U.fmtSI(r[q[0]], q[2], 4) + '</strong></div>';
      }).join('') + '</div>';
    }
    $('ohmCalc').addEventListener('click', calcOhm);
    $('ohmClear').addEventListener('click', function () { ['V', 'I', 'R', 'P'].forEach(function (k) { $('ohm' + k).value = ''; }); $('ohmOut').innerHTML = ''; });
    container.querySelectorAll('#ohmCard input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') calcOhm(); }); });
    calcOhm();

    // Colour code
    var nBands = 4, cur = { 4: ['Yellow', 'Violet', 'Red', 'Gold'], 5: ['Brown', 'Black', 'Black', 'Brown', 'Brown'] };
    function bandOptions(idx) {
      var nd = nBands === 5 ? 3 : 2;
      if (idx < nd) return BANDS.filter(function (b) { return b.digit != null && !(idx === 0 && b.digit === 0); });
      if (idx === nd) return BANDS.filter(function (b) { return b.mult != null; });
      return BANDS.filter(function (b) { return b.tol != null; });
    }
    function drawCC() {
      var names = cur[nBands], nd = nBands === 5 ? 3 : 2;
      var labels = names.map(function (_, i) { return i < nd ? 'Digit ' + (i + 1) : i === nd ? 'Multiplier' : 'Tolerance'; });
      $('ccSelects').innerHTML = names.map(function (nm, i) {
        return '<label class="field"><span>' + labels[i] + '</span><select data-band="' + i + '">' + bandOptions(i).map(function (b) {
          var t = i < nd ? b.digit : i === nd ? '×' + U.fmtSI(Math.pow(10, b.mult), '').trim() : '±' + b.tol + '%';
          return '<option value="' + b.name + '"' + (b.name === nm ? ' selected' : '') + '>' + b.name + ' (' + t + ')</option>';
        }).join('') + '</select></label>';
      }).join('');
      container.querySelectorAll('[data-band]').forEach(function (s) {
        s.addEventListener('change', function () { cur[nBands][+s.getAttribute('data-band')] = s.value; drawCC(); });
      });
      var d = decode(names);
      $('ccSvg').innerHTML = resistorSvg(names);
      $('ccValue').innerHTML = d ? '<strong>' + U.fmtSI(d.ohms, 'Ω', 4) + '</strong> ±' + d.tolerance + '% <span class="muted small">(' +
        U.fmtSI(d.ohms * (1 - d.tolerance / 100), 'Ω', 4) + ' – ' + U.fmtSI(d.ohms * (1 + d.tolerance / 100), 'Ω', 4) + ')</span>' : '';
    }
    container.querySelectorAll('[data-bands]').forEach(function (b) {
      b.addEventListener('click', function () {
        nBands = +b.getAttribute('data-bands');
        container.querySelectorAll('[data-bands]').forEach(function (x) { x.classList.toggle('active', x === b); });
        drawCC();
      });
    });
    drawCC();
    $('ccFind').addEventListener('input', function () {
      var v = U.parseSI(this.value), out = $('ccFindOut');
      if (!this.value.trim()) { out.innerHTML = ''; return; }
      var e = encode(v, nBands);
      if (!e) { out.innerHTML = '<p class="error-text">Enter a value between 0.1 Ω and 99 GΩ.</p>'; return; }
      out.innerHTML = resistorSvg(e.names) + '<p>' + e.names.join(' – ') + (e.exact ? '' : ' <span class="muted">(rounded to ' + U.fmtSI(e.actual, 'Ω', 4) + ')</span>') +
        ' <button class="btn small ghost" id="ccUse">Show above</button></p>';
      $('ccUse').addEventListener('click', function () { cur[nBands] = e.names; drawCC(); });
    });

    // LED
    function calcLed() {
      var vs = U.parseSI($('ledVs').value), vf = U.parseSI($('ledVf').value), i = U.parseSI($('ledI').value), out = $('ledOut');
      if (!(vs > 0 && vf > 0 && i > 0)) { out.innerHTML = '<p class="error-text">Enter positive values.</p>'; return; }
      if (vs <= vf) { out.innerHTML = '<p class="error-text">The supply must be higher than the LED forward voltage.</p>'; return; }
      var r = (vs - vf) / i, std = nextE12(r), iStd = (vs - vf) / std, p = (vs - vf) * iStd;
      out.innerHTML = '<div class="readout"><div class="calc"><span>Exact R</span><strong>' + U.fmtSI(r, 'Ω', 4) + '</strong></div>' +
        '<div class="calc"><span>Next E12 value</span><strong>' + U.fmtSI(std, 'Ω') + '</strong></div>' +
        '<div class="calc"><span>Actual current</span><strong>' + U.fmtSI(iStd, 'A') + '</strong></div>' +
        '<div class="calc"><span>Resistor power</span><strong>' + U.fmtSI(p, 'W') + '</strong></div></div>' +
        '<p class="small muted">Choose a resistor rated ≥ ' + (p * 2 <= 0.125 ? '⅛ W' : p * 2 <= 0.25 ? '¼ W' : p * 2 <= 0.5 ? '½ W' : '1 W+') + ' (2× margin).</p>';
    }
    ['ledVs', 'ledVf', 'ledI'].forEach(function (id) { $(id).addEventListener('input', calcLed); }); calcLed();

    // Series / parallel
    function calcSp() {
      var vals = $('spVals').value.split(/[,;\s]+/).filter(Boolean).map(U.parseSI), out = $('spOut');
      if (!vals.length || vals.some(function (v) { return !(v > 0); })) { out.innerHTML = '<p class="error-text">Enter positive values separated by commas.</p>'; return; }
      var s = vals.reduce(function (a, b) { return a + b; }, 0), p = 1 / vals.reduce(function (a, b) { return a + 1 / b; }, 0);
      out.innerHTML = '<div class="readout"><div class="calc"><span>Series</span><strong>' + U.fmtSI(s, 'Ω', 4) + '</strong></div><div class="calc"><span>Parallel</span><strong>' + U.fmtSI(p, 'Ω', 4) + '</strong></div></div>';
    }
    $('spVals').addEventListener('input', calcSp); calcSp();
  }

  g.Tools = { render: render, ohm: ohm, decode: decode, encode: encode, nextE12: nextE12 };
  if (typeof module === 'object' && module.exports) module.exports = g.Tools;
})(typeof window !== 'undefined' ? window : globalThis);
