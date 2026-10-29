/* Level 5 — Advanced */
(function (g) {
  (g.EA_LEVELS = g.EA_LEVELS || []).push({
    id: 'l5', number: 5, title: 'Advanced', icon: '🚀', color: '#ef4444',
    subtitle: 'Op-amps, filters, power supplies, PCB design basics, signal integrity',
    lessons: [
      {
        id: 'l5-opamps', title: 'Operational Amplifiers', minutes: 10,
        summary: 'The universal analog building block and its golden rules.',
        body: `
<p>An <strong>op-amp</strong> is a high-gain differential amplifier with a non-inverting input (+), an inverting input (−) and an output. Open-loop it amplifies (V₊ − V₋) by 10⁵ or more, so it is almost always used with <strong>negative feedback</strong> from output to the − input.</p>
<h3>The golden rules (ideal op-amp with negative feedback)</h3>
<ol><li>No current flows into the inputs.</li>
<li>The output does whatever it takes to make V₋ = V₊.</li></ol>
<h3>Standard circuits</h3>
<div class="formula">Inverting: V<sub>out</sub> = −(R<sub>f</sub> / R<sub>in</sub>) · V<sub>in</sub></div>
<div class="formula">Non-inverting: V<sub>out</sub> = (1 + R<sub>f</sub> / R<sub>g</sub>) · V<sub>in</sub></div>
<ul><li><strong>Voltage follower (buffer)</strong>: output tied to − input, gain = 1. Very high input impedance, low output impedance — perfect for buffering a voltage divider.</li>
<li><strong>Summing amplifier</strong>: several inputs into the inverting node, V<sub>out</sub> = −R<sub>f</sub>(V₁/R₁ + V₂/R₂ + …).</li>
<li><strong>Comparator</strong>: no feedback — the output swings to a rail depending on which input is higher (dedicated comparator chips are better at this).</li></ul>
<div class="example"><strong>Example:</strong> Non-inverting amp with R<sub>f</sub> = 9 kΩ, R<sub>g</sub> = 1 kΩ → gain 10. A 0.2 V input gives 2 V out.</div>
<h3>Real-world limits</h3>
<ul><li><strong>Output swing</strong>: the output can’t exceed the supply rails; “rail-to-rail” parts get close.</li>
<li><strong>Gain-bandwidth product</strong> (GBW): gain × bandwidth ≈ constant. A 1 MHz GBW op-amp at gain 10 has ≈ 100 kHz bandwidth.</li>
<li><strong>Slew rate</strong> (V/µs), input offset voltage and bias currents also matter.</li></ul>`,
        keyPoints: ['With negative feedback: no input current, V₋ = V₊.', 'Inverting gain −Rf/Rin; non-inverting gain 1 + Rf/Rg.', 'Bandwidth ≈ GBW / closed-loop gain.'],
        questions: [
          { id: 'l5-opamps-q1', q: 'An inverting amplifier has R_in = 2 kΩ and R_f = 10 kΩ. What is its gain?', options: ['+5', '−5', '+6', '−0.2'], answer: 1, explanation: 'Gain = −Rf/Rin = −10k/2k = −5.' },
          { id: 'l5-opamps-q2', q: 'A non-inverting amplifier has R_f = 47 kΩ and R_g = 10 kΩ. What is its gain?', options: ['4.7', '5.7', '−4.7', '0.21'], answer: 1, explanation: 'Gain = 1 + Rf/Rg = 1 + 4.7 = 5.7.' },
          { id: 'l5-opamps-q3', q: 'What is the gain of a voltage follower?', options: ['0', '1', '−1', 'Infinite'], answer: 1, explanation: 'The output is tied directly to the inverting input, so Vout = Vin: gain 1.' },
          { id: 'l5-opamps-q4', q: 'An op-amp has a 3 MHz gain-bandwidth product. Configured for a gain of 30, its bandwidth is about…', options: ['3 MHz', '90 MHz', '100 kHz', '1 MHz'], answer: 2, explanation: 'Bandwidth ≈ GBW/gain = 3 MHz / 30 = 100 kHz.' }
        ]
      },
      {
        id: 'l5-filters', title: 'Filters', minutes: 10,
        summary: 'Letting some frequencies through and blocking others.',
        body: `
<p>A <strong>filter</strong> passes some frequencies and attenuates others. Types: <strong>low-pass</strong>, <strong>high-pass</strong>, <strong>band-pass</strong> and <strong>band-stop</strong> (notch).</p>
<h3>First-order RC filters</h3>
<p>A resistor in series with a capacitor to ground, output across the capacitor, is a <strong>low-pass</strong> filter. Swap the positions (capacitor in series, resistor to ground) for a <strong>high-pass</strong>. Both have a cutoff frequency:</p>
<div class="formula">f<sub>c</sub> = 1 / (2π · R · C)</div>
<p>At f<sub>c</sub> the output is <strong>−3 dB</strong> (≈ 70.7% of the input amplitude, half the power) with a 45° phase shift. Beyond it, a first-order filter rolls off at <strong>−20 dB per decade</strong> (−6 dB per octave).</p>
<div class="example"><strong>Example:</strong> R = 1.6 kΩ, C = 100 nF → f<sub>c</sub> = 1 / (2π × 1600 × 100×10⁻⁹) ≈ <strong>995 Hz</strong> (≈ 1 kHz). A 10 kHz signal is attenuated by about 20 dB — to roughly one tenth of its amplitude.</div>
<h3>Decibels</h3>
<div class="formula">Gain(dB) = 20 · log₁₀(V<sub>out</sub> / V<sub>in</sub>)</div>
<p>−3 dB ≈ ×0.707, −6 dB ≈ ×0.5, −20 dB = ×0.1, −40 dB = ×0.01.</p>
<h3>Higher order and active filters</h3>
<p>Each additional order adds another −20 dB/decade. <strong>Active filters</strong> use op-amps (e.g. the Sallen-Key topology) to get second-order responses without inductors, with gain and buffering. Response families trade off characteristics: <strong>Butterworth</strong> (flattest passband), <strong>Chebyshev</strong> (steeper roll-off with passband ripple) and <strong>Bessel</strong> (best pulse shape / linear phase).</p>
<p>An <strong>RLC</strong> circuit resonates at f₀ = 1 / (2π√(LC)), the basis of band-pass filters and radio tuning.</p>`,
        keyPoints: ['fc = 1/(2πRC); −3 dB and 45° at fc.', 'First-order roll-off = −20 dB/decade.', 'dB = 20·log₁₀(Vout/Vin).'],
        questions: [
          { id: 'l5-filters-q1', q: 'What is the cutoff frequency of an RC low-pass filter with R = 10 kΩ and C = 10 nF?', options: ['≈ 1.59 kHz', '≈ 15.9 kHz', '≈ 159 Hz', '100 kHz'], answer: 0, explanation: 'fc = 1/(2π × 10 000 × 10×10⁻⁹) = 1/(6.283×10⁻⁴) ≈ 1592 Hz.' },
          { id: 'l5-filters-q2', q: 'At the cutoff frequency, a first-order filter’s output amplitude is about what fraction of the input?', options: ['50%', '70.7%', '90%', '10%'], answer: 1, explanation: 'The −3 dB point corresponds to 1/√2 ≈ 0.707 of the amplitude (half the power).' },
          { id: 'l5-filters-q3', q: 'A second-order low-pass filter rolls off at…', options: ['−20 dB/decade', '−40 dB/decade', '−6 dB/decade', '−3 dB/decade'], answer: 1, explanation: 'Each order contributes −20 dB/decade, so second order gives −40 dB/decade.' },
          { id: 'l5-filters-q4', q: 'A filter reduces a signal from 2 V to 0.2 V. What is the gain in dB?', options: ['−10 dB', '−20 dB', '−3 dB', '−40 dB'], answer: 1, explanation: '20 × log₁₀(0.2/2) = 20 × log₁₀(0.1) = −20 dB.' }
        ]
      },
      {
        id: 'l5-power-supplies', title: 'Power Supplies', minutes: 11,
        summary: 'Rectifiers, linear regulators and switching converters.',
        body: `
<h3>From AC to DC</h3>
<p>A transformer steps mains down, a <strong>bridge rectifier</strong> (four diodes) makes it full-wave DC, and a large <strong>reservoir capacitor</strong> smooths it. The remaining ripple is approximately:</p>
<div class="formula">ΔV ≈ I<sub>load</sub> / (f<sub>ripple</sub> · C)</div>
<p>For full-wave rectification the ripple frequency is twice the mains frequency (120 Hz on 60 Hz mains). A bridge also costs two diode drops (≈ 1.4 V).</p>
<div class="example"><strong>Example:</strong> 1 A load, 120 Hz ripple, 4700 µF → ΔV ≈ 1 / (120 × 0.0047) ≈ <strong>1.8 V</strong> peak-to-peak.</div>
<h3>Linear regulators</h3>
<p>A linear regulator (e.g. 7805, AMS1117, LDOs) acts like an automatically adjusted resistor. Simple and quiet, but the voltage difference is burned as heat:</p>
<div class="formula">P<sub>diss</sub> = (V<sub>in</sub> − V<sub>out</sub>) × I<sub>load</sub> &nbsp;&nbsp;·&nbsp;&nbsp; η ≈ V<sub>out</sub> / V<sub>in</sub></div>
<div class="example"><strong>Example:</strong> 12 V → 5 V at 0.5 A: P = 7 × 0.5 = <strong>3.5 W</strong> of heat, efficiency ≈ 42%. That needs a heatsink.</div>
<p>The input must exceed the output by at least the <strong>dropout voltage</strong> (≈ 2 V for a 7805; as little as 0.1–0.3 V for an LDO).</p>
<h3>Switching regulators</h3>
<p>Switching converters rapidly switch a transistor and store energy in an inductor, typically reaching 85–95% efficiency. In continuous conduction, ideally:</p>
<div class="formula">Buck (step-down): V<sub>out</sub> = D · V<sub>in</sub> &nbsp;&nbsp;·&nbsp;&nbsp; Boost (step-up): V<sub>out</sub> = V<sub>in</sub> / (1 − D)</div>
<p>D is the switch duty cycle. Trade-offs: switching noise (EMI), more parts, careful layout.</p>
<h3>Decoupling</h3>
<p>Place a ~100 nF ceramic capacitor right at each IC’s power pins, plus bulk capacitance (e.g. 10 µF) nearby, to supply fast current spikes and keep the rails clean.</p>`,
        keyPoints: ['Ripple ≈ I/(f·C); full-wave ripple is at 2× mains frequency.', 'Linear: P = (Vin − Vout)·I; efficiency ≈ Vout/Vin.', 'Buck Vout = D·Vin; boost Vout = Vin/(1 − D).'],
        questions: [
          { id: 'l5-power-supplies-q1', q: 'A linear regulator outputs 3.3 V at 200 mA from a 5 V input. How much power does it dissipate?', options: ['0.66 W', '0.34 W', '1 W', '0.2 W'], answer: 1, explanation: 'P = (5 − 3.3) × 0.2 = 0.34 W.' },
          { id: 'l5-power-supplies-q2', q: 'An ideal buck converter runs from 24 V with a 25% duty cycle. What is the output voltage?', options: ['6 V', '18 V', '32 V', '96 V'], answer: 0, explanation: 'Vout = D × Vin = 0.25 × 24 = 6 V.' },
          { id: 'l5-power-supplies-q3', q: 'An ideal boost converter must produce 12 V from 5 V. What duty cycle is needed?', options: ['42%', '58%', '70%', '240%'], answer: 1, explanation: 'Vout = Vin/(1 − D) → 1 − D = 5/12 → D ≈ 0.583 (58%).' },
          { id: 'l5-power-supplies-q4', q: 'Why is a 100 nF capacitor placed close to each IC’s power pins?', options: ['To raise the supply voltage', 'To supply fast transient current locally and suppress noise on the rail', 'To block DC from reaching the IC', 'To act as a fuse'], answer: 1, explanation: 'Decoupling capacitors provide local charge for fast current spikes; trace inductance would otherwise cause voltage dips and noise.' }
        ]
      },
      {
        id: 'l5-pcb', title: 'PCB Design Basics', minutes: 10,
        summary: 'From schematic to a manufacturable printed circuit board.',
        body: `
<h3>The workflow</h3>
<ol><li><strong>Schematic capture</strong> — draw the circuit with symbols (KiCad, Altium, Eagle/Fusion).</li>
<li><strong>Footprints</strong> — assign each part its physical land pattern; double-check against the datasheet.</li>
<li><strong>Placement</strong> — place connectors and mechanical parts first, then group by function; keep critical loops short.</li>
<li><strong>Routing</strong> — draw copper traces; use vias to change layers.</li>
<li><strong>DRC / ERC</strong> — run design-rule and electrical-rule checks against your fab’s capabilities.</li>
<li><strong>Outputs</strong> — Gerber files (copper, mask, silkscreen), drill files, BOM and pick-and-place data.</li></ol>
<h3>Layers and stack-up</h3>
<p>Simple boards are 2-layer; 4-layer boards (signal / ground / power / signal) make routing and noise control much easier. Standard copper is 1 oz/ft² (≈ 35 µm) on 1.6 mm FR-4.</p>
<h3>Trace width</h3>
<p>Wider traces carry more current with less heating. IPC-2221 gives the relationship; as a rough guide, an outer 1 oz trace needs roughly 0.3 mm (12 mil) per amp for a 10 °C rise — but always use a trace-width calculator for power paths. Internal layers need wider traces because they shed heat less easily.</p>
<h3>Good habits</h3>
<ul><li>Use a solid <strong>ground plane</strong> — it gives every signal a low-impedance return path.</li>
<li>Put <strong>decoupling capacitors</strong> as close as possible to IC power pins, with short vias to ground.</li>
<li>Keep high-current switching loops (e.g. a buck converter’s input capacitor, switch and diode) as small as possible.</li>
<li>Separate noisy (switching, digital) and sensitive (analog) sections.</li>
<li>Label connectors, polarity and pin 1 on the silkscreen; add test points.</li></ul>`,
        keyPoints: ['Schematic → footprints → placement → routing → DRC → Gerbers.', 'Use a solid ground plane and place decoupling caps at the pins.', 'Size power traces with an IPC-2221 calculator.'],
        questions: [
          { id: 'l5-pcb-q1', q: 'Which files are sent to a PCB manufacturer to describe copper, solder mask and silkscreen layers?', options: ['STEP files', 'Gerber files', 'SPICE netlists', 'BOM spreadsheets'], answer: 1, explanation: 'Gerber files (plus drill files) describe each manufacturing layer.' },
          { id: 'l5-pcb-q2', q: 'What is a via?', options: ['A plated hole that connects traces on different layers', 'A type of surface-mount resistor', 'A silkscreen label', 'A copper pour on the top layer'], answer: 0, explanation: 'Vias are plated-through holes that carry a connection between layers.' },
          { id: 'l5-pcb-q3', q: 'Why is a continuous ground plane recommended?', options: ['It makes the board lighter', 'It provides a low-impedance return path and reduces noise and EMI', 'It is required for vias to work', 'It increases trace resistance'], answer: 1, explanation: 'A solid plane gives return currents a short, low-inductance path directly beneath their signals.' },
          { id: 'l5-pcb-q4', q: 'Compared with an outer-layer trace, an inner-layer trace carrying the same current should generally be…', options: ['Narrower', 'Wider', 'The same width', 'Routed only with vias'], answer: 1, explanation: 'Inner layers are surrounded by insulating laminate and dissipate heat less well, so IPC-2221 calls for wider traces.' }
        ]
      },
      {
        id: 'l5-signal-integrity', title: 'Signal Integrity', minutes: 11,
        summary: 'When wires stop being wires: reflections, impedance and crosstalk.',
        body: `
<p>At high speeds, PCB traces behave as <strong>transmission lines</strong>. What matters is usually the signal’s <strong>rise time</strong>, not just its clock frequency.</p>
<h3>Rise time and bandwidth</h3>
<div class="formula">BW ≈ 0.35 / t<sub>r</sub></div>
<p>A 1 ns edge contains significant energy up to ≈ 350 MHz, even if the clock is only 10 MHz.</p>
<h3>When is a trace a transmission line?</h3>
<p>Signals travel on FR-4 at roughly half the speed of light — about <strong>15 cm/ns</strong> (≈ 6 in/ns). A common rule of thumb: treat a trace as a transmission line when its length exceeds about <strong>1/6</strong> of the distance the edge travels during its rise time. For a 1 ns edge: 15 cm / 6 ≈ 2.5 cm.</p>
<h3>Characteristic impedance and reflections</h3>
<p>A transmission line has a <strong>characteristic impedance</strong> Z₀ set by its geometry and dielectric (commonly 50 Ω single-ended, 90–100 Ω differential). When a signal meets a different impedance, part of it reflects:</p>
<div class="formula">Γ = (Z<sub>L</sub> − Z₀) / (Z<sub>L</sub> + Z₀)</div>
<p>Γ = 0 for a matched load, +1 for an open circuit and −1 for a short. Reflections cause <strong>ringing</strong>, overshoot and false triggering.</p>
<h3>Termination</h3>
<ul><li><strong>Series</strong>: a resistor at the driver so driver impedance + R ≈ Z₀ (typically 22–33 Ω).</li>
<li><strong>Parallel</strong>: a resistor equal to Z₀ at the receiver.</li>
<li>Differential pairs use a resistor across the pair (e.g. 100 Ω for LVDS).</li></ul>
<h3>Crosstalk, return paths and ground bounce</h3>
<p>Adjacent traces couple through capacitance and mutual inductance (<strong>crosstalk</strong>): increase spacing (a “3W” rule of thumb) and keep traces close to their reference plane. Every signal’s return current flows in the plane directly beneath it — never route a fast signal across a split in the plane. Many outputs switching at once through shared ground inductance produce <strong>ground bounce</strong>; good decoupling and multiple ground vias help.</p>`,
        keyPoints: ['BW ≈ 0.35/t_r; edges matter more than clock rate.', 'Γ = (Z_L − Z₀)/(Z_L + Z₀); match to stop reflections.', 'Keep return paths continuous; don’t cross plane splits.'],
        questions: [
          { id: 'l5-signal-integrity-q1', q: 'A signal has a 0.5 ns rise time. Its approximate bandwidth is…', options: ['70 MHz', '350 MHz', '700 MHz', '2 GHz'], answer: 2, explanation: 'BW ≈ 0.35 / 0.5 ns = 0.7 GHz = 700 MHz.' },
          { id: 'l5-signal-integrity-q2', q: 'A 50 Ω line is terminated in an open circuit. What is the reflection coefficient?', options: ['0', '+1', '−1', '+0.5'], answer: 1, explanation: 'Γ = (∞ − 50)/(∞ + 50) → +1: the whole wave reflects with the same polarity.' },
          { id: 'l5-signal-integrity-q3', q: 'A 50 Ω trace drives a 150 Ω load. What is Γ?', options: ['+0.5', '−0.5', '+0.33', '0'], answer: 0, explanation: 'Γ = (150 − 50)/(150 + 50) = 100/200 = 0.5.' },
          { id: 'l5-signal-integrity-q4', q: 'Why should a high-speed trace not cross a gap in the ground plane beneath it?', options: ['It increases DC resistance', 'The return current must detour around the gap, creating a large loop that causes EMI and crosstalk', 'Gerber files cannot represent it', 'It makes the trace narrower'], answer: 1, explanation: 'High-frequency return current follows directly under the signal. A split forces a detour, increasing loop inductance, radiation and noise.' }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
