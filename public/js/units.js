/* Shared helpers: SI parsing/formatting and HTML escaping. */
(function (g) {
  var PREFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  // Parses "4.7k", "4k7", "220", "20m", "1M", "4R7", "10 kΩ", "3.3V" → number (NaN if invalid)
  function parseSI(str) {
    if (typeof str === 'number') return str;
    var s = String(str || '').trim().replace(/[ΩΩ]|ohms?|[VAWF]|Hz/gi, function (m) { return /^[kKmMuµnpG]$/.test(m) ? m : ''; }).replace(/\s+/g, '');
    if (!s) return NaN;
    var m = s.match(/^([+-]?\d*\.?\d+)([pnuµmkKMGR]?)(\d*)$/);
    if (!m) { var n = Number(s); return isFinite(n) ? n : NaN; }
    var base = m[1], p = m[2], tail = m[3];
    if (tail) { if (!p) return NaN; base = base + '.' + tail; }          // 4k7 → 4.7k, 4R7 → 4.7
    var mult = p === 'R' || !p ? 1 : PREFIX[p];
    return parseFloat(base) * mult;
  }
  function fmtSI(v, unit, digits) {
    if (v == null || !isFinite(v)) return '—';
    digits = digits == null ? 3 : digits;
    var a = Math.abs(v);
    if (a < 1e-12) return '0 ' + unit;
    var steps = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    for (var i = 0; i < steps.length; i++) {
      if (a >= steps[i][0] * 0.9995) {
        var x = v / steps[i][0];
        var s = Number(x.toPrecision(digits)).toString();
        return s + ' ' + steps[i][1] + unit;
      }
    }
    return Number(v.toPrecision(digits)) + ' ' + unit;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  g.Units = { parseSI: parseSI, fmtSI: fmtSI, esc: esc };
  if (typeof module === 'object' && module.exports) module.exports = g.Units;
})(typeof window !== 'undefined' ? window : globalThis);
