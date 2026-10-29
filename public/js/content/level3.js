/* Level 3 — Circuits & Analysis */
(function (g) {
  (g.EA_LEVELS = g.EA_LEVELS || []).push({
    id: 'l3', number: 3, title: 'Circuits & Analysis', icon: '📐', color: '#10b981',
    subtitle: 'Kirchhoff’s laws, voltage dividers, Thevenin equivalents, RC circuits, AC basics',
    lessons: [
      {
        id: 'l3-kirchhoff', title: 'Kirchhoff’s Laws', minutes: 9,
        summary: 'The two conservation laws that let you solve any circuit.',
        body: `
<h3>Kirchhoff’s Current Law (KCL)</h3>
<p>The total current flowing <strong>into</strong> a node equals the total current flowing <strong>out</strong>. Charge doesn’t pile up at a junction.</p>
<div class="formula">Σ I<sub>in</sub> = Σ I<sub>out</sub> &nbsp;&nbsp;(or Σ I = 0 at every node)</div>
<div class="example"><strong>Example:</strong> 50 mA enters a node; one branch carries 20 mA out. The other branch must carry <strong>30 mA</strong> out.</div>
<h3>Kirchhoff’s Voltage Law (KVL)</h3>
<p>Around any closed loop, the voltage rises equal the voltage drops — the sum of all voltages is zero. Energy is conserved.</p>
<div class="formula">Σ V = 0 &nbsp;&nbsp;around any closed loop</div>
<div class="example"><strong>Example:</strong> A 12 V battery drives a resistor and an LED in series. If the LED drops 2 V, the resistor must drop <strong>10 V</strong>.</div>
<h3>Nodal analysis</h3>
<p>The systematic method used by circuit simulators (including the one in this app):</p>
<ol><li>Pick a reference node (ground, 0 V).</li>
<li>Assign an unknown voltage to every other node.</li>
<li>Write KCL at each node, expressing each current with Ohm’s law, e.g. (V<sub>a</sub> − V<sub>b</sub>)/R.</li>
<li>Solve the simultaneous equations.</li></ol>
<p>Always pick a direction for each unknown current. If the answer comes out negative, the current simply flows the other way.</p>`,
        keyPoints: ['KCL: currents into a node = currents out.', 'KVL: voltages around a closed loop sum to zero.', 'Nodal analysis = KCL + Ohm’s law at every node.'],
        sim: 'bridge',
        questions: [
          { id: 'l3-kirchhoff-q1', q: '120 mA enters a node. Two branches leave it; one carries 45 mA. What does the other carry?', options: ['165 mA', '75 mA', '45 mA', '60 mA'], answer: 1, explanation: 'KCL: 120 = 45 + I → I = 75 mA.' },
          { id: 'l3-kirchhoff-q2', q: 'Kirchhoff’s Voltage Law is a consequence of conservation of…', options: ['Charge', 'Energy', 'Momentum', 'Mass'], answer: 1, explanation: 'KVL follows from conservation of energy: a charge taken around a closed loop returns to the same potential. (KCL follows from conservation of charge.)' },
          { id: 'l3-kirchhoff-q3', q: 'A 9 V battery feeds three series resistors. Two drop 2 V and 3 V. What does the third drop?', options: ['5 V', '4 V', '9 V', '14 V'], answer: 1, explanation: 'KVL: 9 = 2 + 3 + V → V = 4 V.' },
          { id: 'l3-kirchhoff-q4', q: 'In nodal analysis you solve for a branch current and get −2 mA. This means…', options: ['You made an error', 'The current is 2 mA in the opposite direction to the one you assumed', 'The resistor is negative', 'The circuit is shorted'], answer: 1, explanation: 'A negative result just means the actual current flows opposite to your assumed direction.' }
        ]
      },
      {
        id: 'l3-dividers', title: 'Voltage Dividers', minutes: 8,
        summary: 'Producing a fraction of a voltage with two resistors — and the loading trap.',
        body: `
<p>Two resistors in series across a supply form a <strong>voltage divider</strong>. The output is taken across the bottom resistor R₂:</p>
<div class="formula">V<sub>out</sub> = V<sub>in</sub> × R₂ / (R₁ + R₂)</div>
<div class="example"><strong>Example:</strong> V<sub>in</sub> = 9 V, R₁ = 1 kΩ, R₂ = 2 kΩ → V<sub>out</sub> = 9 × 2/3 = <strong>6 V</strong>. With R₁ = R₂ the output is exactly half the input.</div>
<h3>Loading</h3>
<p>The formula assumes nothing draws current from V<sub>out</sub>. A load R<sub>L</sub> connected across R₂ is in parallel with it, lowering the effective bottom resistance and pulling V<sub>out</sub> down.</p>
<div class="example"><strong>Example:</strong> In the 9 V / 1 kΩ / 2 kΩ divider, add a 2 kΩ load. R₂ ∥ R<sub>L</sub> = 1 kΩ, so V<sub>out</sub> drops to 9 × 1/2 = <strong>4.5 V</strong>.</div>
<p>Rule of thumb: keep the load at least 10× the divider’s resistance, or buffer the output with an op-amp follower (Module 12).</p>
<p><strong>Intro to Thévenin:</strong> seen from its output, an unloaded divider behaves like a single source V<sub>TH</sub> = V<sub>in</sub>·R2/(R1+R2) in series with R<sub>TH</sub> = R1∥R2. That is why the output sags under load: the load current drops voltage across R<sub>TH</sub>. (The full Thévenin/Norton treatment is in the optional Advanced track.) <strong>Never</strong> use a divider to power a load that draws significant current — use a regulator.</p>
<h3>Common uses</h3>
<ul><li>Scaling a voltage down for an ADC input (e.g. 12 V battery monitoring on a 3.3 V microcontroller).</li>
<li><strong>Potentiometers</strong> — an adjustable divider, e.g. a volume knob.</li>
<li>Reading resistive sensors such as thermistors and LDRs (optional Advanced track).</li>
<li>Biasing transistor amplifiers.</li></ul>`,
        keyPoints: ['Vout = Vin × R₂/(R₁ + R₂).', 'A load in parallel with R₂ pulls Vout down.', 'Dividers are for signals and references, not for powering loads.'],
        sim: 'divider',
        questions: [
          { id: 'l3-dividers-q1', q: 'A divider has R₁ = 3 kΩ (top) and R₂ = 1 kΩ (bottom) from 12 V. What is Vout?', options: ['9 V', '4 V', '3 V', '6 V'], answer: 2, explanation: 'Vout = 12 × 1/(3 + 1) = 3 V.' },
          { id: 'l3-dividers-q2', q: 'Connecting a load across the bottom resistor of a divider causes the output voltage to…', options: ['Rise', 'Fall', 'Stay the same', 'Become negative'], answer: 1, explanation: 'The load is in parallel with R₂, lowering the effective bottom resistance and therefore Vout.' },
          { id: 'l3-dividers-q3', q: 'You need to read up to 15 V on a 3 V-max ADC input. Which divider gives exactly 3 V out at 15 V in?', options: ['R₁ = 10 kΩ, R₂ = 40 kΩ', 'R₁ = 40 kΩ, R₂ = 10 kΩ', 'R₁ = 10 kΩ, R₂ = 10 kΩ', 'R₁ = 50 kΩ, R₂ = 15 kΩ'], answer: 1, explanation: 'Ratio needed = 3/15 = 1/5 = R₂/(R₁ + R₂). With R₂ = 10 k and R₁ = 40 k: 10/50 = 1/5. ✔' },
          { id: 'l3-dividers-q4', q: 'Why shouldn’t a voltage divider power a motor?', options: ['Resistors can’t carry DC', 'The motor’s current would drop the output voltage heavily and waste power in the resistors', 'Dividers only work with AC', 'Motors need negative voltage'], answer: 1, explanation: 'A significant load current collapses the divider output, and the resistors waste power. Use a regulator instead.' }
        ]
      },
      {
        id: 'l3-thevenin', title: 'Thevenin and Norton Equivalents', minutes: 9,
        summary: 'Replacing a complicated network with one source and one resistor.',
        body: `
<p><strong>Thevenin’s theorem:</strong> any linear network of sources and resistors, seen from two terminals, behaves exactly like a single voltage source V<sub>TH</sub> in series with a single resistance R<sub>TH</sub>.</p>
<ol><li><strong>V<sub>TH</sub></strong> = the open-circuit voltage across the terminals.</li>
<li><strong>R<sub>TH</sub></strong> = the resistance seen looking into the terminals with all independent sources turned off (voltage sources replaced by shorts, current sources by opens).</li></ol>
<div class="example"><strong>Example:</strong> The 9 V / 1 kΩ / 2 kΩ divider. V<sub>TH</sub> = 6 V (open-circuit). R<sub>TH</sub> = 1 kΩ ∥ 2 kΩ = 667 Ω. Attach a 2 kΩ load: I = 6 / (667 + 2000) = 2.25 mA, V<sub>L</sub> = 4.5 V — matching the loading example from the previous lesson.</div>
<h3>Norton equivalent</h3>
<p>The same network can be a current source I<sub>N</sub> in parallel with R<sub>N</sub>, where R<sub>N</sub> = R<sub>TH</sub> and I<sub>N</sub> = V<sub>TH</sub>/R<sub>TH</sub> (the short-circuit current).</p>
<h3>Maximum power transfer</h3>
<p>A load receives the most power when R<sub>L</sub> = R<sub>TH</sub>. At that point P<sub>max</sub> = V<sub>TH</sub>² / (4R<sub>TH</sub>) and efficiency is only 50%, so power systems don’t do this — but RF and audio matching often does.</p>
<h3>Superposition</h3>
<p>In a linear circuit with several sources, the response is the sum of the responses to each source acting alone (others turned off).</p>`,
        keyPoints: ['V_TH = open-circuit voltage; R_TH = resistance with sources zeroed.', 'Norton: I_N = V_TH/R_TH in parallel with R_TH.', 'Max power to the load when R_L = R_TH.'],
        sim: 'divider',
        questions: [
          { id: 'l3-thevenin-q1', q: 'When finding R_TH, an ideal voltage source is replaced by…', options: ['An open circuit', 'A short circuit', 'A 1 kΩ resistor', 'A current source'], answer: 1, explanation: 'A turned-off ideal voltage source has 0 V across it for any current — a short circuit.' },
          { id: 'l3-thevenin-q2', q: 'A divider of two 10 kΩ resistors on 10 V. What are V_TH and R_TH at the midpoint?', options: ['10 V, 20 kΩ', '5 V, 5 kΩ', '5 V, 20 kΩ', '10 V, 5 kΩ'], answer: 1, explanation: 'Open-circuit V = 5 V. With the source shorted, the two 10 kΩ are in parallel: 5 kΩ.' },
          { id: 'l3-thevenin-q3', q: 'A source has V_TH = 12 V and R_TH = 6 Ω. What is the maximum power it can deliver to a load?', options: ['24 W', '6 W', '12 W', '2 W'], answer: 1, explanation: 'At R_L = R_TH = 6 Ω: P = V_TH²/(4R_TH) = 144/24 = 6 W.' },
          { id: 'l3-thevenin-q4', q: 'A Thevenin equivalent is 8 V with 2 kΩ. What is the Norton current?', options: ['16 mA', '4 mA', '0.25 mA', '10 mA'], answer: 1, explanation: 'I_N = V_TH/R_TH = 8 V / 2 kΩ = 4 mA.' }
        ]
      },
      {
        id: 'l3-rc', title: 'RC Circuits and Time Constants', minutes: 9,
        summary: 'How capacitors charge and discharge through a resistor.',
        body: `
<p>When a capacitor charges through a resistor, its voltage rises along an exponential curve. The speed is set by the <strong>time constant</strong>:</p>
<div class="formula">τ = R × C &nbsp;&nbsp;(seconds = ohms × farads)</div>
<h3>Charging (from 0 V toward V<sub>s</sub>)</h3>
<div class="formula">v<sub>C</sub>(t) = V<sub>s</sub> · (1 − e<sup>−t/τ</sup>)</div>
<h3>Discharging (from V₀ toward 0 V)</h3>
<div class="formula">v<sub>C</sub>(t) = V₀ · e<sup>−t/τ</sup></div>
<table class="data-table"><tr><th>Time</th><th>Charged to</th></tr>
<tr><td>1τ</td><td>63.2%</td></tr><tr><td>2τ</td><td>86.5%</td></tr><tr><td>3τ</td><td>95.0%</td></tr><tr><td>4τ</td><td>98.2%</td></tr><tr><td>5τ</td><td>99.3% — treated as “fully charged”</td></tr></table>
<div class="example"><strong>Example:</strong> R = 10 kΩ, C = 100 µF → τ = 10 000 × 0.0001 = <strong>1 s</strong>. From a 5 V supply the capacitor reaches ≈ 3.16 V after 1 s and is essentially full after 5 s.</div>
<p>The current is largest at the start (V<sub>s</sub>/R, since the capacitor initially looks like a short) and decays with the same time constant.</p>
<h3>RL circuits</h3>
<p>An inductor with a resistor behaves analogously with <strong>τ = L / R</strong>; here it is the <em>current</em> that rises exponentially.</p>
<p>RC networks are used for timing (e.g. the 555 timer), debouncing switches, power-on reset delays and filters (overview in Module 9; detail in the optional Advanced track).</p>`,
        keyPoints: ['τ = RC (or L/R for RL).', '63.2% after 1τ; ~99% after 5τ.', 'Charging: Vs(1 − e^(−t/τ)); discharging: V₀e^(−t/τ).'],
        questions: [
          { id: 'l3-rc-q1', q: 'What is the time constant of a 4.7 kΩ resistor with a 10 µF capacitor?', options: ['47 ms', '4.7 ms', '470 ms', '0.47 ms'], answer: 0, explanation: 'τ = RC = 4700 × 10×10⁻⁶ = 0.047 s = 47 ms.' },
          { id: 'l3-rc-q2', q: 'After one time constant, a charging capacitor has reached what fraction of the supply voltage?', options: ['50%', '63.2%', '86.5%', '99.3%'], answer: 1, explanation: '1 − e⁻¹ ≈ 0.632.' },
          { id: 'l3-rc-q3', q: 'About how many time constants does it take to consider a capacitor fully charged?', options: ['1', '2', '5', '100'], answer: 2, explanation: 'After 5τ the capacitor is at about 99.3% of its final value.' },
          { id: 'l3-rc-q4', q: 'At the instant charging begins (capacitor at 0 V), the current through the resistor is…', options: ['Zero', 'V_s / R', 'V_s × R', 'V_s / C'], answer: 1, explanation: 'At t = 0 the capacitor has no voltage across it, so the full supply appears across R: I = Vs/R.' }
        ]
      },
      {
        id: 'l3-ac', title: 'AC Basics', minutes: 10,
        summary: 'Sine waves, RMS, frequency, reactance and impedance.',
        body: `
<p><strong>Alternating current (AC)</strong> periodically reverses direction. The standard waveform is a sine wave:</p>
<div class="formula">v(t) = V<sub>p</sub> · sin(2πft + φ)</div>
<ul><li><strong>V<sub>p</sub></strong>: peak amplitude; <strong>V<sub>pp</sub></strong> = 2V<sub>p</sub> (peak-to-peak).</li>
<li><strong>f</strong>: frequency in hertz (cycles per second); <strong>period</strong> T = 1/f.</li>
<li><strong>φ</strong>: phase angle.</li></ul>
<h3>RMS</h3>
<p>The <strong>RMS</strong> (root-mean-square) value is the DC voltage that would deliver the same power to a resistor. For a sine wave:</p>
<div class="formula">V<sub>rms</sub> = V<sub>p</sub> / √2 ≈ 0.707 · V<sub>p</sub></div>
<div class="example"><strong>Example:</strong> North American mains is 120 V<sub>rms</sub> at 60 Hz, so the peak is 120 × √2 ≈ <strong>170 V</strong> and the period is 16.7 ms. (Much of the world uses 230 V at 50 Hz, peaking at ≈ 325 V.) Mains is dangerous — never work on it without proper training.</div>
<h3>Reactance and impedance</h3>
<p>Capacitors and inductors oppose AC in a frequency-dependent way called <strong>reactance</strong> (X, in ohms):</p>
<div class="formula">X<sub>C</sub> = 1 / (2πfC) &nbsp;&nbsp;·&nbsp;&nbsp; X<sub>L</sub> = 2πfL</div>
<p>Capacitors pass high frequencies more easily; inductors pass low frequencies more easily. <strong>Impedance</strong> Z combines resistance and reactance. For a series RC or RL circuit the magnitude is |Z| = √(R² + X²) because the voltages are 90° out of phase. In a capacitor, current <em>leads</em> voltage by 90°; in an inductor, current <em>lags</em> by 90°.</p>`,
        keyPoints: ['Vrms = Vp/√2 for a sine; T = 1/f.', 'X_C = 1/(2πfC); X_L = 2πfL.', 'Series |Z| = √(R² + X²).'],
        questions: [
          { id: 'l3-ac-q1', q: 'A sine wave has a peak of 10 V. What is its RMS value?', options: ['14.1 V', '7.07 V', '5 V', '20 V'], answer: 1, explanation: 'Vrms = Vp/√2 = 10/1.414 ≈ 7.07 V.' },
          { id: 'l3-ac-q2', q: 'What is the period of a 50 Hz signal?', options: ['50 ms', '20 ms', '2 ms', '0.5 s'], answer: 1, explanation: 'T = 1/f = 1/50 = 0.02 s = 20 ms.' },
          { id: 'l3-ac-q3', q: 'As frequency increases, a capacitor’s reactance…', options: ['Increases', 'Decreases', 'Stays the same', 'Becomes negative resistance'], answer: 1, explanation: 'X_C = 1/(2πfC): higher f means lower reactance — capacitors pass high frequencies.' },
          { id: 'l3-ac-q4', q: 'A 30 Ω resistor is in series with an inductor whose reactance is 40 Ω. What is the impedance magnitude?', options: ['70 Ω', '10 Ω', '50 Ω', '1200 Ω'], answer: 2, explanation: '|Z| = √(30² + 40²) = √2500 = 50 Ω. They don’t simply add because they are 90° out of phase.' }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
