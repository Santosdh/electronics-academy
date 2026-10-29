/* Level 2 — Components */
(function (g) {
  (g.EA_LEVELS = g.EA_LEVELS || []).push({
    id: 'l2', number: 2, title: 'Components', icon: '🧩', color: '#8b5cf6',
    subtitle: 'Resistors & color codes, capacitors, inductors, diodes & LEDs, transistors & switches',
    lessons: [
      {
        id: 'l2-resistors', title: 'Resistors and Color Codes', minutes: 8,
        summary: 'Reading resistor values, tolerances and standard values.',
        body: `
<p>Through-hole resistors are marked with coloured bands. On a <strong>4-band</strong> resistor: band 1 and 2 are digits, band 3 is the <strong>multiplier</strong>, band 4 is the <strong>tolerance</strong>. A <strong>5-band</strong> resistor has three digits, then multiplier, then tolerance.</p>
<table class="color-table">
<tr><th>Colour</th><th>Digit</th><th>Multiplier</th><th>Tolerance</th></tr>
<tr><td><span class="sw" style="background:#111"></span>Black</td><td>0</td><td>×1</td><td></td></tr>
<tr><td><span class="sw" style="background:#7b3f00"></span>Brown</td><td>1</td><td>×10</td><td>±1%</td></tr>
<tr><td><span class="sw" style="background:#d00"></span>Red</td><td>2</td><td>×100</td><td>±2%</td></tr>
<tr><td><span class="sw" style="background:#f60"></span>Orange</td><td>3</td><td>×1k</td><td></td></tr>
<tr><td><span class="sw" style="background:#fd0"></span>Yellow</td><td>4</td><td>×10k</td><td></td></tr>
<tr><td><span class="sw" style="background:#0a0"></span>Green</td><td>5</td><td>×100k</td><td>±0.5%</td></tr>
<tr><td><span class="sw" style="background:#00c"></span>Blue</td><td>6</td><td>×1M</td><td>±0.25%</td></tr>
<tr><td><span class="sw" style="background:#80c"></span>Violet</td><td>7</td><td>×10M</td><td>±0.1%</td></tr>
<tr><td><span class="sw" style="background:#888"></span>Grey</td><td>8</td><td></td><td>±0.05%</td></tr>
<tr><td><span class="sw" style="background:#fff;border:1px solid #ccc"></span>White</td><td>9</td><td></td><td></td></tr>
<tr><td><span class="sw" style="background:#cfa640"></span>Gold</td><td></td><td>×0.1</td><td>±5%</td></tr>
<tr><td><span class="sw" style="background:#c0c0c0"></span>Silver</td><td></td><td>×0.01</td><td>±10%</td></tr>
</table>
<p>Mnemonic for 0–9: <em>“Black Bears Roam Over Yellow Grass, Bring Very Good Weather.”</em></p>
<div class="example"><strong>Example:</strong> Yellow–Violet–Red–Gold = 4, 7, ×100 → 4700 Ω = <strong>4.7 kΩ ±5%</strong> (anywhere from 4465 Ω to 4935 Ω).<br/>Brown–Black–Orange–Gold = 10 × 1000 = <strong>10 kΩ ±5%</strong>.</div>
<p>Resistors come in <strong>E-series</strong> standard values (E12: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 × powers of ten). Surface-mount (SMD) resistors use number codes instead: “472” means 47 × 10² = 4.7 kΩ; “4R7” means 4.7 Ω.</p>
<p>Variable resistors include <strong>potentiometers</strong> (three terminals, adjustable divider), thermistors (temperature-dependent) and LDRs (light-dependent).</p>`,
        keyPoints: ['4-band: digit, digit, multiplier, tolerance.', 'Gold = ±5%, Silver = ±10%; gold multiplier = ×0.1.', 'SMD “472” = 47 × 10² = 4.7 kΩ.'],
        questions: [
          { id: 'l2-resistors-q1', q: 'What is the value of a Brown–Black–Red–Gold resistor?', options: ['102 Ω ±5%', '1 kΩ ±5%', '10 kΩ ±5%', '100 Ω ±10%'], answer: 1, explanation: 'Brown = 1, Black = 0, Red multiplier ×100 → 10 × 100 = 1000 Ω, Gold = ±5%.' },
          { id: 'l2-resistors-q2', q: 'Which colour bands would mark a 330 Ω ±5% resistor?', options: ['Orange–Orange–Brown–Gold', 'Orange–Orange–Red–Gold', 'Orange–Orange–Black–Silver', 'Red–Red–Brown–Gold'], answer: 0, explanation: '33 × 10 = 330 Ω: Orange (3), Orange (3), Brown (×10), Gold (±5%).' },
          { id: 'l2-resistors-q3', q: 'An SMD resistor is marked “103”. Its value is…', options: ['103 Ω', '1.03 kΩ', '10 kΩ', '100 kΩ'], answer: 2, explanation: 'The last digit is the power of ten: 10 × 10³ = 10 000 Ω = 10 kΩ.' },
          { id: 'l2-resistors-q4', q: 'A 1 kΩ ±10% resistor could measure anywhere between…', options: ['990 Ω and 1010 Ω', '900 Ω and 1100 Ω', '950 Ω and 1050 Ω', 'Exactly 1000 Ω'], answer: 1, explanation: '10% of 1000 Ω is 100 Ω, so the range is 900–1100 Ω.' }
        ]
      },
      {
        id: 'l2-capacitors', title: 'Capacitors', minutes: 9,
        summary: 'Storing charge in an electric field.',
        body: `
<p>A <strong>capacitor</strong> is two conductive plates separated by an insulator (the <em>dielectric</em>). Applying a voltage stores charge on the plates. <strong>Capacitance</strong> (C) is measured in <strong>farads (F)</strong>:</p>
<div class="formula">C = Q / V &nbsp;&nbsp;·&nbsp;&nbsp; C = ε · A / d</div>
<p>ε is the dielectric’s permittivity, A the plate area, d the separation. A farad is huge; practical values are pF (10⁻¹²), nF (10⁻⁹) and µF (10⁻⁶).</p>
<h3>Energy and behaviour</h3>
<div class="formula">E = ½ · C · V²</div>
<p>The current into a capacitor is proportional to how fast its voltage changes: <strong>i = C · dv/dt</strong>. So a capacitor’s voltage cannot change instantly. Once charged in a DC circuit, no steady current flows — capacitors <strong>block DC</strong> but pass changing (AC) signals.</p>
<h3>Combining capacitors</h3>
<p>The rules are the <em>opposite</em> of resistors:</p>
<div class="formula">Parallel: C = C₁ + C₂ &nbsp;&nbsp;·&nbsp;&nbsp; Series: 1/C = 1/C₁ + 1/C₂</div>
<h3>Types</h3>
<ul><li><strong>Ceramic</strong> — small, non-polarized, pF to tens of µF; ideal for decoupling.</li>
<li><strong>Electrolytic</strong> — large values (1 µF to many mF), <strong>polarized</strong>: connecting them backwards can make them fail, sometimes violently.</li>
<li><strong>Film</strong>, <strong>tantalum</strong>, and <strong>supercapacitors</strong> for special uses.</li></ul>
<p>Always respect the <strong>voltage rating</strong>; choose a part rated comfortably above the maximum voltage it will see. Common uses: power-supply smoothing, decoupling, timing (RC circuits) and filters.</p>`,
        keyPoints: ['C = Q/V; energy = ½CV².', 'Capacitors block steady DC and pass AC; voltage can’t change instantly.', 'Parallel capacitors add; series combine like parallel resistors.'],
        questions: [
          { id: 'l2-capacitors-q1', q: 'What is the total capacitance of 10 µF and 22 µF in parallel?', options: ['6.9 µF', '32 µF', '12 µF', '220 µF'], answer: 1, explanation: 'Capacitors in parallel add: 10 + 22 = 32 µF.' },
          { id: 'l2-capacitors-q2', q: 'How much energy is stored in a 100 µF capacitor charged to 10 V?', options: ['5 mJ', '1 mJ', '10 mJ', '0.5 J'], answer: 0, explanation: 'E = ½CV² = 0.5 × 100×10⁻⁶ × 100 = 0.005 J = 5 mJ.' },
          { id: 'l2-capacitors-q3', q: 'Once a capacitor has fully charged from a DC source, the current through it is…', options: ['Maximum', 'Zero (ideally)', 'Equal to V/C', 'Alternating'], answer: 1, explanation: 'i = C·dv/dt. With a steady voltage dv/dt = 0, so no current flows — capacitors block DC.' },
          { id: 'l2-capacitors-q4', q: 'Which capacitor type is polarized and must be inserted the right way round?', options: ['Ceramic', 'Electrolytic', 'Polypropylene film', 'Mica'], answer: 1, explanation: 'Aluminium electrolytic capacitors are polarized; reverse voltage can damage them.' }
        ]
      },
      {
        id: 'l2-inductors', title: 'Inductors', minutes: 8,
        summary: 'Storing energy in a magnetic field and resisting changes in current.',
        body: `
<p>An <strong>inductor</strong> is a coil of wire, often wound on a magnetic core. Current through it creates a magnetic field. <strong>Inductance</strong> (L) is measured in <strong>henries (H)</strong>; typical parts range from nH to mH.</p>
<div class="formula">v = L · di/dt</div>
<p>An inductor opposes <em>changes</em> in current. Its current cannot change instantly. Try to stop the current suddenly (for example by opening a switch) and di/dt becomes very large, producing a large voltage spike called <strong>back-EMF</strong> (inductive kick).</p>
<div class="formula">E = ½ · L · I²</div>
<h3>Practical points</h3>
<ul><li>In steady DC an ideal inductor is just a wire (only its small winding resistance remains).</li>
<li>Motors, relays and solenoids are inductive. Put a <strong>flyback diode</strong> across the coil (reverse-biased) to give the current a safe path when it is switched off.</li>
<li>Inductors are central to switching power supplies, filters and RF circuits.</li>
<li>Combining (with no magnetic coupling between them) works like resistors: series L adds, parallel uses reciprocals.</li></ul>
<p>Two coupled coils form a <strong>transformer</strong>: V<sub>s</sub>/V<sub>p</sub> = N<sub>s</sub>/N<sub>p</sub>. Transformers only work with AC because they need a changing magnetic field.</p>`,
        keyPoints: ['v = L·di/dt — inductors oppose changes in current.', 'Energy stored = ½LI².', 'Use a flyback diode across relay and motor coils.'],
        questions: [
          { id: 'l2-inductors-q1', q: 'What does an inductor oppose?', options: ['Any voltage', 'Changes in current', 'DC current', 'Changes in resistance'], answer: 1, explanation: 'v = L·di/dt: an inductor develops a voltage that opposes a change in its current.' },
          { id: 'l2-inductors-q2', q: 'Why is a diode placed across a relay coil?', options: ['To make the relay faster to turn on', 'To safely absorb the back-EMF spike when the coil is switched off', 'To rectify AC to DC', 'To limit the coil current'], answer: 1, explanation: 'When the driving transistor turns off, the coil’s current continues through the flyback diode instead of creating a damaging voltage spike.' },
          { id: 'l2-inductors-q3', q: 'A 10 mH inductor carries 2 A. How much energy is stored?', options: ['20 mJ', '10 mJ', '40 mJ', '0.2 J'], answer: 0, explanation: 'E = ½LI² = 0.5 × 0.01 × 4 = 0.02 J = 20 mJ.' },
          { id: 'l2-inductors-q4', q: 'A transformer has 1000 primary turns and 100 secondary turns. With 120 V AC on the primary, the secondary voltage is about…', options: ['1200 V', '12 V', '120 V', '1.2 V'], answer: 1, explanation: 'Vs = Vp × Ns/Np = 120 × 100/1000 = 12 V (a step-down transformer).' }
        ]
      },
      {
        id: 'l2-diodes-leds', title: 'Diodes and LEDs', minutes: 9,
        summary: 'One-way valves for current, and how to drive an LED safely.',
        body: `
<p>A <strong>diode</strong> is a PN junction that conducts easily in one direction (anode → cathode) and blocks the other. The cathode is marked with a band. A diode needs a <strong>forward voltage</strong> V<sub>F</sub> before it conducts significantly:</p>
<ul><li>Silicon diode (e.g. 1N4148, 1N4007): ≈ 0.6–0.7 V</li>
<li>Schottky diode: ≈ 0.2–0.45 V (faster, but more reverse leakage)</li>
<li>Zener diode: designed to conduct in <em>reverse</em> at a precise breakdown voltage — used as a simple voltage reference.</li></ul>
<p>Uses: rectifying AC to DC, reverse-polarity protection, flyback protection and clamping.</p>
<h3>LEDs</h3>
<p>A <strong>light-emitting diode</strong> emits light when forward biased. Its V<sub>F</sub> depends on colour: roughly 1.8–2.2 V for red, 2.0–2.2 V for yellow, about 2–3.2 V for green (depending on type) and 2.8–3.4 V for blue and white. Typical indicator LEDs run at 2–20 mA.</p>
<p>Because current rises very steeply once V<sub>F</sub> is reached, an LED must have its current <strong>limited</strong>, usually with a series resistor:</p>
<div class="formula">R = (V<sub>supply</sub> − V<sub>F</sub>) / I<sub>LED</sub></div>
<div class="example"><strong>Example:</strong> 5 V supply, red LED (V<sub>F</sub> = 2 V), target 15 mA: R = 3 V / 0.015 A = 200 Ω. Choose the next standard value up, <strong>220 Ω</strong>, giving ≈ 13.6 mA. Resistor power = 3 V × 13.6 mA ≈ 41 mW — a ¼ W part is fine.</div>
<p>The longer leg of a through-hole LED is usually the anode (+); the flat side of the rim marks the cathode.</p>`,
        keyPoints: ['Current flows anode → cathode; the band marks the cathode.', 'Silicon V_F ≈ 0.7 V; LED V_F ≈ 1.8–3.4 V by colour.', 'LED resistor: R = (Vs − V_F)/I.'],
        sim: 'led',
        questions: [
          { id: 'l2-diodes-leds-q1', q: 'What is the approximate forward voltage of a standard silicon diode?', options: ['0.1 V', '0.7 V', '1.5 V', '3.3 V'], answer: 1, explanation: 'Silicon PN junctions conduct at about 0.6–0.7 V.' },
          { id: 'l2-diodes-leds-q2', q: 'You drive a white LED (V_F = 3 V) at 10 mA from 5 V. What series resistor do you need?', options: ['500 Ω', '300 Ω', '200 Ω', '800 Ω'], answer: 2, explanation: 'R = (5 − 3) / 0.010 = 200 Ω.' },
          { id: 'l2-diodes-leds-q3', q: 'Which kind of diode is normally used in reverse breakdown as a voltage reference?', options: ['Schottky', 'Zener', 'LED', 'Photodiode'], answer: 1, explanation: 'Zener diodes are designed to break down at a specified reverse voltage.' },
          { id: 'l2-diodes-leds-q4', q: 'What happens if you connect an LED directly to a 9 V battery with no resistor?', options: ['It glows dimly', 'Nothing — LEDs regulate their own current', 'Excessive current flows and the LED is likely destroyed', 'It only works if reversed'], answer: 2, explanation: 'Above V_F the LED’s current rises steeply; with nothing to limit it, current far exceeds the rating and the LED burns out.' }
        ]
      },
      {
        id: 'l2-transistors-switches', title: 'Transistors and Switches', minutes: 10,
        summary: 'Electronic switches and amplifiers: BJTs, MOSFETs and mechanical switches.',
        body: `
<h3>Mechanical switches</h3>
<p>Switches are described by <strong>poles</strong> (separate circuits) and <strong>throws</strong> (positions): SPST (on/off), SPDT (changeover), DPDT, and so on. Pushbuttons may be normally-open (NO) or normally-closed (NC). Mechanical contacts <strong>bounce</strong> for a few milliseconds, which digital circuits must <em>debounce</em>. A <strong>relay</strong> is a switch operated by an electromagnet.</p>
<h3>Bipolar junction transistors (BJT)</h3>
<p>A BJT (NPN or PNP) has a <strong>base</strong>, <strong>collector</strong> and <strong>emitter</strong>. A small base current controls a much larger collector current:</p>
<div class="formula">I<sub>C</sub> ≈ β · I<sub>B</sub> &nbsp;&nbsp;·&nbsp;&nbsp; I<sub>E</sub> = I<sub>B</sub> + I<sub>C</sub></div>
<p>β (or h<sub>FE</sub>) is typically 100–300 for small transistors like the 2N3904. The base-emitter junction behaves like a diode with V<sub>BE</sub> ≈ 0.7 V.</p>
<p><strong>As a switch</strong> (“low-side”, NPN emitter to ground, load between supply and collector): drive enough base current to <strong>saturate</strong> the transistor (V<sub>CE(sat)</sub> ≈ 0.1–0.3 V). A common rule is to provide I<sub>B</sub> ≈ I<sub>C</sub>/10.</p>
<div class="example"><strong>Example:</strong> Switch a 100 mA load from a 5 V microcontroller pin. I<sub>B</sub> ≈ 10 mA. R<sub>B</sub> = (5 − 0.7) / 0.010 = 430 Ω → use 430 Ω or 470 Ω (≈ 9 mA).</div>
<h3>MOSFETs</h3>
<p>A MOSFET is <strong>voltage-controlled</strong>: the gate draws essentially no steady current. It turns on when V<sub>GS</sub> exceeds the threshold V<sub>GS(th)</sub>; for a hard switch, drive it well above threshold (check the R<sub>DS(on)</sub> spec at your gate voltage). “Logic-level” MOSFETs are specified to switch fully at 4.5 V or lower. Conduction loss is P = I² · R<sub>DS(on)</sub>. MOSFETs dominate power switching today.</p>
<p>Transistors also act as <strong>amplifiers</strong> when biased in their active region — the basis of analog electronics.</p>`,
        keyPoints: ['BJT: I_C ≈ β·I_B, V_BE ≈ 0.7 V; saturate it for switching.', 'MOSFET: voltage-controlled; conduction loss = I²·R_DS(on).', 'Switches bounce — debounce in hardware or software.'],
        sim: 'bulb-switch',
        questions: [
          { id: 'l2-transistors-switches-q1', q: 'A BJT has β = 100 and a base current of 0.2 mA, operating in its active region. What is the collector current?', options: ['2 mA', '20 mA', '0.2 mA', '200 mA'], answer: 1, explanation: 'I_C = β × I_B = 100 × 0.2 mA = 20 mA.' },
          { id: 'l2-transistors-switches-q2', q: 'What controls a MOSFET?', options: ['Gate-source voltage', 'Base current', 'Collector temperature', 'Drain resistance'], answer: 0, explanation: 'MOSFETs are voltage-controlled: V_GS sets whether the channel conducts. The gate draws almost no DC current.' },
          { id: 'l2-transistors-switches-q3', q: 'What does SPDT stand for?', options: ['Single Pole, Double Throw', 'Switched Power, Direct Transfer', 'Single Pulse, Dual Trigger', 'Standard Pin, Double Terminal'], answer: 0, explanation: 'SPDT is Single Pole, Double Throw — one common terminal that connects to either of two others.' },
          { id: 'l2-transistors-switches-q4', q: 'A MOSFET with R_DS(on) = 0.05 Ω switches 4 A. How much power does it dissipate while on?', options: ['0.2 W', '0.8 W', '80 W', '0.0125 W'], answer: 1, explanation: 'P = I² × R_DS(on) = 16 × 0.05 = 0.8 W.' }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
