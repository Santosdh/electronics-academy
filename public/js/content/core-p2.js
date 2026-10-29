/* Phase 2 — Circuit Theory & Devices: new lessons that complement the reused lessons. */
(function (g) {
  var L = (g.EA_LESSON_BANK = g.EA_LESSON_BANK || []);
  L.push(
  {
    id: 'm5-opens-shorts', title: 'Opens, Shorts and What You Measure', minutes: 10, sim: 'series',
    summary: 'Predict how an open or a short changes voltages and currents in series and parallel circuits.',
    body: `
<p>Most DC faults are an <strong>open</strong> (a break: infinite resistance, no current) or a <strong>short</strong> (an unintended near-zero-resistance path).</p>
<h3>Series circuit</h3>
<ul><li><strong>Open anywhere</strong>: current stops everywhere. The full source voltage appears across the open; every intact resistor reads 0 V.</li>
<li><strong>One resistor shorted</strong>: it reads ≈ 0 V, total resistance drops, current rises and the other resistors drop more voltage (and dissipate more power).</li></ul>
<h3>Parallel circuit</h3>
<ul><li><strong>One branch open</strong>: that branch carries no current; the others are unaffected (with an ideal source). Total current drops.</li>
<li><strong>One branch shorted</strong>: the source is shorted — very high current; a fuse should blow or the supply goes into current limit. All branches read ≈ 0 V.</li></ul>
<div class="example"><strong>Example:</strong> 9 V across 1 kΩ + 2 kΩ in series normally gives 3 mA, 3 V and 6 V. If the 2 kΩ opens: 0 mA, 0 V across the 1 kΩ and 9 V across the open 2 kΩ. If the 2 kΩ shorts: 9 mA, 9 V across the 1 kΩ (now dissipating 81 mW instead of 9 mW).</div>
<p>Use the simulator: build the series circuit, then delete a resistor (open) or replace it with a wire (short) and compare the readings with your prediction.</p>`,
    keyPoints: ['Series open: no current, full voltage across the open.', 'Series short: shorted part reads 0 V, current rises.', 'Parallel open: other branches unaffected; total current falls.', 'Parallel short: shorts the source.'],
    questions: [
      ['In a series string of three resistors across 12 V, one resistor opens. What will a voltmeter across the open resistor read?', ['0 V', 'About 4 V', '12 V', 'It depends on the other resistors’ values'], 2, 'No current flows, so the intact resistors drop 0 V and the entire source voltage appears across the open.'],
      ['Three lamps are in parallel on a battery. One lamp’s filament opens. What happens to the other two (ideal battery)?', ['They go out', 'They stay at the same brightness', 'They get brighter', 'They get dimmer'], 1, 'Each parallel branch sees the full source voltage independently; the total current just drops.'],
      ['In a series circuit, one resistor becomes shorted. What happens to the current?', ['It increases', 'It decreases', 'It stays the same', 'It becomes zero'], 0, 'Total resistance falls, so current (V/R) increases.']
    ]
  },
  {
    id: 'm6-bridge-sources', title: 'Bridges, Potentiometers and Real Sources', minutes: 12, sim: 'bridge',
    summary: 'Balanced bridges, potentiometers as dividers, and battery internal resistance.',
    body: `
<h3>Wheatstone bridge</h3>
<p>Two dividers fed from the same source, with a meter between their midpoints. The bridge is <strong>balanced</strong> (0 V between midpoints) when R1/R2 = R3/R4. Small changes in one arm (e.g. a strain gauge or sensor) produce a small, measurable imbalance voltage.</p>
<h3>Potentiometers</h3>
<p>A potentiometer is an adjustable divider: the wiper divides the track resistance. Used as a two-terminal variable resistor it is called a rheostat. Watch power ratings — the full current can flow through a small part of the track at one end.</p>
<h3>Real sources and internal resistance</h3>
<p>A real battery behaves like an ideal voltage source in series with an <strong>internal resistance</strong> r. Under load, terminal voltage V = E − I·r.</p>
<div class="example"><strong>Example:</strong> A battery reads 9.0 V open-circuit and 8.4 V with a 100 mA load. r = (9.0 − 8.4)/0.1 = 6 Ω. A battery’s internal resistance rises as it discharges or gets cold, which is why an “OK” no-load voltage can still mean a weak battery.</div>
<h3>Series and parallel cells</h3>
<p>Cells in series add voltage (same capacity, mAh). Identical cells in parallel keep the voltage and add capacity — but mismatched cells in parallel can drive large currents between them.</p>
<h3>Predict, then measure</h3>
<p>Before powering a lab circuit, calculate the node voltages you expect (KVL/KCL, divider rule). Then measure and record the difference. A large disagreement is a wiring error, a wrong part, or a misunderstanding — find out which before moving on.</p>`,
    keyPoints: ['Bridge balanced when R1/R2 = R3/R4.', 'Terminal voltage V = E − I·r.', 'Series cells add voltage; parallel cells add capacity.', 'Always predict node voltages before measuring.'],
    questions: [
      ['A Wheatstone bridge has R1 = 1 kΩ, R2 = 2 kΩ on one side and R3 = 3 kΩ on the other. What R4 balances it?', ['1.5 kΩ', '6 kΩ', '3 kΩ', '2 kΩ'], 1, 'Balance requires R1/R2 = R3/R4 → 1/2 = 3/R4 → R4 = 6 kΩ.'],
      ['A cell reads 1.50 V open-circuit and 1.30 V while supplying 0.5 A. What is its internal resistance?', ['0.1 Ω', '0.4 Ω', '2.6 Ω', '3.0 Ω'], 1, 'r = (1.50 − 1.30)/0.5 = 0.4 Ω.'],
      ['Two identical 3.7 V cells connected in series give…', ['3.7 V, double capacity', '7.4 V, same capacity', '7.4 V, double capacity', '1.85 V'], 1, 'Series adds voltage; capacity (mAh) stays that of one cell.']
    ]
  },
  {
    id: 'm7-components', title: 'Identifying Capacitors, Inductors, Switches, Relays and Fuses', minutes: 12,
    summary: 'Read capacitor codes, recognize polarized parts, and identify common electromechanical parts.',
    body: `
<h3>Capacitor markings</h3>
<ul><li><strong>Three-digit code</strong> (pF): two significant digits then the number of zeros. 104 = 10 × 10⁴ pF = 100 nF; 472 = 4.7 nF; 220 = 22 pF.</li>
<li>Tolerance letters: J = ±5%, K = ±10%, M = ±20%.</li>
<li><strong>Electrolytic and tantalum capacitors are polarized.</strong> Aluminium electrolytics mark the <em>negative</em> lead with a stripe and the negative lead is usually shorter; tantalum capacitors usually mark the <em>positive</em> end. Reverse polarity or over-voltage can make them vent, burn or explode.</li>
<li>Always check the voltage rating; use parts rated comfortably above the circuit voltage.</li></ul>
<h3>Inductors and transformers</h3>
<p>Inductors are marked in µH/mH (sometimes with a color code like resistors). Check current rating — exceeding it saturates the core.</p>
<h3>Electromechanical parts</h3>
<ul><li><strong>Switches</strong>: poles (separate circuits) and throws (positions) — SPST, SPDT, DPDT; momentary vs latching; NO (normally open) vs NC (normally closed).</li>
<li><strong>Relays</strong>: a coil (rated voltage and current) operates contacts (rated voltage and current). A flyback diode across a DC coil protects the driving transistor.</li>
<li><strong>Fuses</strong>: current rating, voltage rating, speed (fast/slow-blow), and breaking capacity.</li>
<li><strong>Connectors</strong>: identify by series/family, pin count, pitch, gender, and keying.</li></ul>
<h3>Semiconductor polarity</h3>
<p>Diodes: band = cathode. LEDs: longer lead / flat on the body = cathode side marking. ICs: pin 1 by dot or notch, then counted counter-clockwise viewed from the top.</p>`,
    keyPoints: ['Capacitor code: 2 digits + multiplier in pF (104 = 100 nF).', 'Electrolytics mark the negative lead; tantalums usually mark positive.', 'Switch poles = circuits, throws = positions.', 'IC pin 1 by dot/notch, count counter-clockwise from the top.'],
    questions: [
      ['A ceramic capacitor is marked “473K”. What is it?', ['47 pF ±5%', '47 nF ±10%', '473 µF ±20%', '4.7 nF ±10%'], 1, '47 × 10³ pF = 47 000 pF = 47 nF; K = ±10%.'],
      ['How is the polarity of a typical aluminium electrolytic capacitor marked?', ['The positive lead has a stripe', 'The negative lead is marked with a stripe (and is usually shorter)', 'It isn’t polarized', 'By the color of the sleeve only'], 1, 'Aluminium electrolytics mark the negative side; tantalum parts usually mark the positive end.'],
      ['A DPDT switch has…', ['One pole, two throws', 'Two poles, two throws', 'Two poles, one throw', 'Four poles'], 1, 'Double pole (two independent circuits), double throw (two positions each).']
    ]
  },
  {
    id: 'm7-datasheets', title: 'Part Numbers, Data Sheets and Counterfeit Awareness', minutes: 12,
    summary: 'Find what matters on a data sheet and recognize warning signs of suspect parts.',
    body: `
<h3>Reading a data sheet</h3>
<ul><li><strong>Absolute maximum ratings</strong> — limits that must never be exceeded, even briefly. They are not operating conditions.</li>
<li><strong>Recommended operating conditions</strong> — where the part is intended to run.</li>
<li><strong>Electrical characteristics</strong> — min/typical/max values under stated test conditions. Design to min/max, not typical.</li>
<li><strong>Pinout and package drawing</strong> — pin numbering, dimensions, recommended land pattern.</li>
<li><strong>Ordering information</strong> — how suffixes encode package, temperature grade, tape-and-reel, and lead-free finish.</li></ul>
<div class="example"><strong>Example:</strong> Two parts with the same base number but different suffixes can differ in package, temperature range or pin count. Always match the full part number on the bill of materials.</div>
<h3>Part numbers and markings</h3>
<p>Manufacturer part numbers (MPN) identify a specific part; the marking on a small package is often an abbreviated code that you look up in the data sheet. Date codes and lot codes support traceability.</p>
<h3>Counterfeit awareness</h3>
<p>Counterfeit and recycled parts enter supply chains, especially through unauthorized sources. Warning signs:</p>
<ul><li>Markings that are smudged, inconsistent between parts in the same lot, or show signs of sanding/re-coating (blacktopping).</li>
<li>Leads that look previously soldered, bent, oxidized or re-tinned.</li>
<li>Logos, fonts, date codes or packaging that don’t match the manufacturer’s.</li>
<li>Paperwork that doesn’t trace back to the manufacturer or an authorized distributor.</li></ul>
<p>Report suspect parts through your quality process and quarantine them — don’t use them “just this once”.</p>`,
    keyPoints: ['Never exceed absolute maximum ratings; they are not operating points.', 'Design to min/max values, not typical.', 'Match the full part number including suffix.', 'Quarantine and report suspect/counterfeit parts.'],
    questions: [
      ['What are “absolute maximum ratings” on a data sheet?', ['Typical operating values', 'Limits that must never be exceeded; the part is not guaranteed to work at them', 'Recommended design targets', 'Test conditions'], 1, 'Absolute maximums are stress limits beyond which damage may occur; normal operation should be within the recommended conditions.'],
      ['Which data-sheet values should a design rely on?', ['Typical values', 'Guaranteed minimum/maximum values', 'Absolute maximum ratings', 'Values from the marketing summary'], 1, 'Typical values are not guaranteed; worst-case design uses min/max.'],
      ['Which is a warning sign of a counterfeit part?', ['Markings consistent with the manufacturer’s data sheet', 'Signs of sanding or re-coating on the package top', 'Parts in sealed manufacturer packaging from an authorized distributor', 'A date code on the label'], 1, 'Sanding/re-marking (blacktopping) is a classic counterfeit indicator.']
    ]
  },
  {
    id: 'm8-scope', title: 'Oscilloscope Operation and Probes', minutes: 15, sim: 'rc-phase',
    summary: 'Vertical, horizontal and trigger controls; 10× probes and compensation; ground-lead hazards.',
    body: `
<p>An oscilloscope plots voltage (vertical) against time (horizontal). The screen is divided into a grid of divisions.</p>
<h3>Controls</h3>
<ul><li><strong>Vertical</strong>: volts/div per channel, position (offset), and coupling — DC shows the full signal; AC blocks the DC component so you can zoom in on ripple.</li>
<li><strong>Horizontal</strong>: time/div and position. A 1 kHz wave (1 ms period) at 0.2 ms/div shows 2 cycles across 10 divisions.</li>
<li><strong>Trigger</strong>: source, level and slope pick the point where each sweep starts so a repetitive waveform stands still. Auto mode sweeps even without a trigger; Normal waits for one; Single captures one event.</li></ul>
<h3>Measurements</h3>
<p>Count divisions or use cursors / automatic measurements: peak-to-peak, amplitude, RMS, period, frequency, rise time, duty cycle, and phase between channels.</p>
<div class="example"><strong>Example:</strong> A sine wave spans 3.4 divisions peak-to-peak at 2 V/div → 6.8 V<sub>pp</sub>, 3.4 V<sub>peak</sub>, ≈ 2.4 V<sub>rms</sub>. One cycle spans 4 divisions at 0.5 ms/div → T = 2 ms, f = 500 Hz.</div>
<h3>Probes</h3>
<ul><li>A <strong>10× passive probe</strong> divides the signal by 10 and presents a higher impedance (commonly 10 MΩ with a few pF) so it loads the circuit less than a 1× probe. Make sure the scope channel knows the probe ratio.</li>
<li><strong>Compensation</strong>: connect the probe to the scope’s calibration square wave and adjust the probe’s trimmer until the corners are square — overshoot means over-compensated, rounded corners mean under-compensated.</li>
<li>Keep the ground lead short for fast edges; long ground leads cause ringing.</li></ul>
<h3>Ground-lead hazard</h3>
<div class="callout warn">A bench scope’s probe ground clips are connected to <strong>protective earth</strong> through the power cord. Clipping a ground lead to a point that is not at earth potential (for example anywhere on a mains-referenced circuit) creates a short circuit through the scope. Never defeat the scope’s ground pin to “float” it. Use a differential probe or an isolated-input instrument, as directed by your instructor.</div>`,
    keyPoints: ['Vertical = V/div, horizontal = time/div, trigger stabilizes the display.', 'AC coupling removes DC to view ripple.', 'Compensate 10× probes on the cal signal.', 'Probe grounds are earthed — never clip them to non-earth-referenced points; never float the scope.'],
    questions: [
      ['A waveform shows one full cycle every 5 divisions at 0.1 ms/div. What is its frequency?', ['500 Hz', '2 kHz', '5 kHz', '20 kHz'], 1, 'T = 5 × 0.1 ms = 0.5 ms → f = 1/T = 2 kHz.'],
      ['Probe compensation on the calibrator signal shows overshoot at each edge. The probe is…', ['Under-compensated', 'Over-compensated', 'Correctly compensated', 'Set to 1×'], 1, 'Overshoot/peaked corners indicate over-compensation; rounded corners indicate under-compensation.'],
      ['Why must you not clip a standard scope probe’s ground lead to an arbitrary point in a mains-powered circuit?', ['It reduces bandwidth', 'The ground lead is connected to earth, so it can short that point to earth through the scope', 'It will blow the probe’s tip', 'Only because the reading will be noisy'], 1, 'The probe ground is earth-referenced. Connecting it to a non-earth point creates a fault path — damaging equipment and creating a hazard.']
    ]
  },
  {
    id: 'm8-generator', title: 'Function Generators, Duty Cycle and PWM', minutes: 10, sim: 'rc-charge',
    summary: 'Generator settings, output impedance, and measuring duty cycle.',
    body: `
<h3>Generator settings</h3>
<ul><li><strong>Waveform</strong>: sine, square, triangle, pulse.</li>
<li><strong>Frequency</strong> and <strong>amplitude</strong> (check whether the display shows peak, peak-to-peak or RMS).</li>
<li><strong>DC offset</strong> shifts the whole waveform up or down. A 0–5 V square wave is 5 V<sub>pp</sub> with a 2.5 V offset.</li>
<li><strong>Duty cycle</strong> (square/pulse).</li></ul>
<h3>Output impedance</h3>
<p>Most function generators have a 50 Ω output impedance. Many let you tell them the load: set to “50 Ω” the displayed amplitude assumes a 50 Ω load; into a high-impedance circuit the actual voltage is then about <strong>twice</strong> the displayed value. Set the generator to “High Z” when driving high-impedance circuits, and confirm with the scope.</p>
<h3>Duty cycle and PWM</h3>
<div class="formula">Duty cycle = t<sub>on</sub> / T × 100%</div>
<p>The average (DC) value of a 0-to-V<sub>high</sub> pulse train is V<sub>high</sub> × duty. Pulse-width modulation varies the duty cycle to control average power — motor speed, LED brightness, switching supplies.</p>
<div class="example"><strong>Example:</strong> A 5 V, 1 kHz PWM signal is high for 0.25 ms each period → duty = 0.25/1 = 25%, average ≈ 1.25 V.</div>
<p>In the simulator, the function generator offers sine or square output with frequency, amplitude, offset and duty cycle; the virtual oscilloscope shows the waveforms.</p>`,
    keyPoints: ['Offset shifts the waveform; Vpp vs peak vs RMS matter.', 'Generator output impedance is typically 50 Ω; “50 Ω” setting reads double into High-Z loads.', 'Duty = t_on/T; average = V_high × duty.'],
    questions: [
      ['A pulse is high for 2 µs every 10 µs. What is the duty cycle?', ['2%', '20%', '50%', '80%'], 1, '2/10 × 100% = 20%.'],
      ['A generator set to 1 Vpp with its load setting at “50 Ω” drives a 1 MΩ scope input. The scope shows about…', ['0.5 Vpp', '1 Vpp', '2 Vpp', '0 V'], 2, 'With a 50 Ω source impedance, the generator assumes half its open-circuit voltage appears at a matched load; into high impedance you see about double.'],
      ['What is the average voltage of a 0–12 V PWM signal at 75% duty?', ['3 V', '6 V', '9 V', '12 V'], 2, '12 V × 0.75 = 9 V.']
    ]
  },
  {
    id: 'm9-filters-transformers', title: 'Filter Response, Resonance and Transformer Isolation', minutes: 12, sim: 'rc-phase',
    summary: 'Low/high-pass overview, cutoff frequency, LC resonance and isolation transformers.',
    body: `
<h3>RC filters (overview)</h3>
<p>Because X<sub>C</sub> = 1/(2πfC) falls as frequency rises, an RC divider passes some frequencies and attenuates others:</p>
<ul><li><strong>Low-pass</strong>: R in series, C to ground, output across C. Passes low frequencies.</li>
<li><strong>High-pass</strong>: C in series, R to ground, output across R. Passes high frequencies.</li></ul>
<div class="formula">f<sub>c</sub> = 1 / (2πRC)</div>
<p>At the cutoff frequency X<sub>C</sub> = R, the output is 1/√2 ≈ 70.7% of the input (−3 dB) and shifted by 45°. A single RC section rolls off at about 20 dB per decade beyond f<sub>c</sub>. (Filter design is covered in the optional Advanced track.)</p>
<h3>Resonance</h3>
<p>An inductor and capacitor together resonate where X<sub>L</sub> = X<sub>C</sub>:</p>
<div class="formula">f<sub>0</sub> = 1 / (2π√(LC))</div>
<p>A series LC has minimum impedance at f<sub>0</sub>; a parallel LC has maximum impedance. Tuned circuits select frequencies in radios and oscillators.</p>
<h3>Transformers and isolation</h3>
<p>A transformer couples AC through a magnetic core: V<sub>s</sub>/V<sub>p</sub> = N<sub>s</sub>/N<sub>p</sub> and (ideally) power in = power out, so stepping voltage down steps current up. It does not pass DC. An <strong>isolation transformer</strong> separates the circuit from the mains earth reference — but voltage between its two output terminals is still fully dangerous, and it changes how fault and probe-ground paths behave. Use one only as your instructor directs.</p>`,
    keyPoints: ['fc = 1/(2πRC); output 70.7% and 45° at fc.', 'Low-pass: output across C; high-pass: output across R.', 'f0 = 1/(2π√LC).', 'Transformers: Vs/Vp = Ns/Np; isolation does not make the secondary safe to touch.'],
    questions: [
      ['What is the cutoff frequency of R = 1 kΩ and C = 0.1 µF?', ['159 Hz', '1.59 kHz', '15.9 kHz', '10 kHz'], 1, '1/(2π × 1000 × 0.1×10⁻⁶) ≈ 1592 Hz.'],
      ['In an RC low-pass filter, the output is taken across…', ['The resistor', 'The capacitor', 'The source', 'Neither'], 1, 'The capacitor’s reactance falls at high frequency, shunting high frequencies to ground.'],
      ['A 120 V primary with a 10:1 step-down transformer gives about what secondary voltage?', ['1.2 V', '12 V', '120 V', '1200 V'], 1, 'Vs = Vp × Ns/Np = 120 × 1/10 = 12 V.']
    ]
  },
  {
    id: 'm10-rectifiers-testing', title: 'Rectifiers, Zeners and Testing Semiconductors', minutes: 12, sim: 'half-wave',
    summary: 'Half- and full-wave rectifiers, Zener regulation, and DMM checks of diodes and BJTs.',
    body: `
<h3>Rectifiers</h3>
<ul><li><strong>Half-wave</strong>: one diode passes one half of each cycle. Output pulses at the input frequency.</li>
<li><strong>Full-wave bridge</strong>: four diodes route both halves to the output in the same polarity. Output pulses at twice the input frequency; two diode drops (≈ 1.4 V) are lost.</li>
<li>A <strong>reservoir capacitor</strong> charges to near the peak and supplies the load between peaks. Ripple ≈ I<sub>load</sub> / (f<sub>ripple</sub> × C).</li></ul>
<div class="example"><strong>Example:</strong> Half-wave from a 60 Hz source, load 10 mA, C = 470 µF: ripple ≈ 0.010 / (60 × 470×10⁻⁶) ≈ 0.35 V<sub>pp</sub>. A full-wave bridge would halve that (120 Hz ripple). Try the half-wave rectifier example in the simulator.</div>
<h3>Zener regulation</h3>
<p>A Zener diode in reverse breakdown holds a nearly constant voltage. With a series resistor from a higher supply, the Zener voltage appears across the load as long as enough current still flows in the Zener. Series resistor: R = (V<sub>in</sub> − V<sub>Z</sub>) / (I<sub>load</sub> + I<sub>Z</sub>).</p>
<h3>DMM checks</h3>
<ul><li><strong>Diode</strong> (diode-test mode): forward ≈ 0.5–0.7 V for silicon (LEDs higher, Schottky lower), reverse OL. Low reading both ways → shorted; OL both ways → open.</li>
<li><strong>BJT</strong>: two junctions sharing the base. For NPN, red lead on the base reads a diode drop to both collector and emitter; black on the base reads OL. Collector–emitter reads OL both ways. For PNP the polarities reverse.</li>
<li>In-circuit readings can be affected by parallel parts; lift a lead if results are ambiguous.</li></ul>`,
    keyPoints: ['Half-wave ripple at f; full-wave at 2f.', 'Ripple ≈ I/(f·C).', 'Zener: R = (Vin − Vz)/(I_load + I_z).', 'Diode test: ~0.6 V forward, OL reverse; NPN reads two diodes from base.'],
    questions: [
      ['A full-wave bridge rectifier on a 60 Hz supply produces ripple at…', ['30 Hz', '60 Hz', '120 Hz', '240 Hz'], 2, 'Both half-cycles are used, so the output pulses twice per input cycle.'],
      ['A diode reads 0.002 V in both directions on diode test. It is most likely…', ['Good', 'Open', 'Shorted', 'A Schottky'], 2, 'Near-zero both ways indicates a shorted junction.'],
      ['Testing an out-of-circuit NPN transistor with the red lead on the base, you expect…', ['OL to both collector and emitter', 'About 0.6 V to both collector and emitter', '0 V to collector, OL to emitter', 'About 0.6 V collector to emitter'], 1, 'Base–emitter and base–collector are both forward-biased junctions with the red (positive) lead on an NPN base.']
    ]
  },
  {
    id: 'm11-supply-testing', title: 'Measuring Ripple and Regulation; Supply Faults', minutes: 12, sim: 'half-wave',
    summary: 'Verify a supply against its spec and recognize typical failure symptoms.',
    body: `
<h3>Verifying a supply meets spec</h3>
<ol><li>Measure the <strong>no-load</strong> output voltage with a DMM.</li>
<li>Apply the rated load (a power resistor or electronic load) and measure again.</li>
<li>Measure <strong>ripple</strong> with the scope: AC coupling, a sensitive V/div setting, short ground lead. Report peak-to-peak.</li>
<li>Check the regulator’s temperature at full load.</li></ol>
<div class="formula">Load regulation (%) = (V<sub>no-load</sub> − V<sub>full-load</sub>) / V<sub>full-load</sub> × 100</div>
<div class="example"><strong>Example:</strong> 5.05 V no-load, 4.98 V at full load → (5.05 − 4.98)/4.98 × 100 ≈ 1.4%.</div>
<h3>Linear regulator basics</h3>
<p>A linear regulator needs its input above the output by at least the <strong>dropout voltage</strong>. It dissipates P = (V<sub>in</sub> − V<sub>out</sub>) × I<sub>out</sub> as heat — 12 V in, 5 V out at 0.5 A is 3.5 W, which needs a heat sink. Many regulators include current limiting and thermal shutdown.</p>
<h3>Typical fault symptoms</h3>
<table class="tbl"><tr><th>Symptom</th><th>Likely causes</th></tr>
<tr><td>Large ripple, low average output under load</td><td>Reservoir capacitor dried out/open, or one diode of a bridge open (ripple at line frequency instead of 2×)</td></tr>
<tr><td>Fuse blows immediately</td><td>Shorted rectifier diode or capacitor, or a short on the output</td></tr>
<tr><td>Output equals input (or near it)</td><td>Regulator failed shorted</td></tr>
<tr><td>Output cuts out after warming up</td><td>Regulator in thermal shutdown — overload or inadequate heat sinking</td></tr>
<tr><td>No output, input present</td><td>Regulator open, output shorted (current limit), or enable/feedback fault</td></tr></table>
<h3>Switching supplies — hazards</h3>
<p>Switch-mode supplies are efficient (they switch a transistor rapidly and filter the result), but off-line types contain rectified mains — hundreds of volts — on their primary side, and the bulk capacitor can stay charged after unplugging. Treat them as Module 1 hazards; trainees work only on low-voltage secondary circuits unless an instructor directs otherwise.</p>`,
    keyPoints: ['Measure no-load and full-load voltage, and ripple (AC-coupled scope).', 'Load regulation = (Vnl − Vfl)/Vfl × 100%.', 'Linear regulator heat = (Vin − Vout) × I.', 'Off-line switchers hold dangerous voltages on the primary side.'],
    questions: [
      ['A supply reads 12.30 V unloaded and 12.00 V at rated load. What is the load regulation?', ['0.3%', '2.5%', '25%', '0.025%'], 1, '(12.30 − 12.00)/12.00 × 100 = 2.5%.'],
      ['A bridge-rectified supply suddenly shows ripple at 60 Hz instead of 120 Hz. A likely cause is…', ['A shorted regulator', 'One bridge diode has opened', 'The load was removed', 'The fuse is the wrong type'], 1, 'With one diode open the bridge behaves like a half-wave rectifier, so ripple appears at the line frequency and is larger.'],
      ['How much power does a linear regulator dissipate dropping 15 V to 5 V at 200 mA?', ['1 W', '2 W', '3 W', '0.2 W'], 1, '(15 − 5) × 0.2 = 2 W.']
    ]
  },
  {
    id: 'm12-gain-db', title: 'Gain, Decibels and Op-Amp Troubleshooting', minutes: 10,
    summary: 'Express gain in dB, recognize clipping, and check an op-amp stage with a meter and scope.',
    body: `
<h3>Gain in decibels</h3>
<div class="formula">Voltage gain (dB) = 20 · log₁₀(V<sub>out</sub> / V<sub>in</sub>)</div>
<div class="formula">Power gain (dB) = 10 · log₁₀(P<sub>out</sub> / P<sub>in</sub>)</div>
<table class="tbl"><tr><th>Voltage ratio</th><th>dB</th></tr><tr><td>×10</td><td>+20 dB</td></tr><tr><td>×2</td><td>≈ +6 dB</td></tr><tr><td>×1</td><td>0 dB</td></tr><tr><td>×0.707</td><td>≈ −3 dB</td></tr><tr><td>×0.1</td><td>−20 dB</td></tr></table>
<p>Stage gains in dB simply add: +20 dB followed by +6 dB is +26 dB (×20).</p>
<h3>Clipping</h3>
<p>The output can’t swing beyond (roughly) the supply rails. A gain-of-10 amplifier on ±5 V rails with a 1 V<sub>peak</sub> input would “want” 10 V<sub>peak</sub> but clips flat near ±5 V (or less, unless rail-to-rail). Flat-topped waveforms on the scope mean clipping or saturation.</p>
<h3>Checking an op-amp stage</h3>
<ul><li>Check both supply pins first.</li>
<li>With negative feedback working, the two inputs sit at (nearly) the same voltage. If they differ by more than a few millivolts while the output is stuck at a rail, the stage is saturated: an input is out of range, feedback is open, or the part is damaged.</li>
<li>Compare measured gain to the calculated gain from the resistor values.</li></ul>`,
    keyPoints: ['dB = 20·log(Vout/Vin); ×10 = 20 dB, ×2 ≈ 6 dB.', 'Gains in dB add.', 'Outputs clip near the rails.', 'Working negative feedback holds V+ ≈ V−.'],
    questions: [
      ['An amplifier has a voltage gain of 100. In dB that is…', ['20 dB', '40 dB', '100 dB', '10 dB'], 1, '20 × log₁₀(100) = 20 × 2 = 40 dB.'],
      ['An op-amp with negative feedback has its output stuck at the positive rail and its inputs 1.2 V apart. What does this suggest?', ['Normal operation', 'The stage is saturated — input out of range, open feedback or a fault', 'The gain is exactly 1', 'The supply is too high'], 1, 'With working feedback, the inputs are within millivolts of each other. A large difference means the loop is not controlling the output.'],
      ['Two stages of +20 dB and −6 dB in cascade give a total of…', ['+14 dB', '+26 dB', '−120 dB', '+3.3 dB'], 0, 'dB values add: 20 + (−6) = +14 dB.']
    ]
  },
  {
    id: 'm13-digital-practice', title: 'Logic Levels, Families and Digital Troubleshooting', minutes: 12,
    summary: 'Input/output thresholds, pull-ups, A/D and D/A basics, and stuck-node faults.',
    body: `
<h3>Logic levels</h3>
<p>A logic family defines voltage windows. For classic 5 V TTL: inputs read LOW at ≤ 0.8 V and HIGH at ≥ 2.0 V; outputs guarantee LOW ≤ 0.4 V and HIGH ≥ 2.4 V. The gap between output guarantee and input requirement is the <strong>noise margin</strong>. CMOS thresholds scale with supply (roughly 30% and 70% of V<sub>DD</sub>). Mixing 3.3 V and 5 V logic needs care: a 5 V output can damage a 3.3 V input that is not 5 V-tolerant.</p>
<h3>Pull-ups and floating inputs</h3>
<p>An unconnected CMOS input floats and can read randomly, oscillate and draw extra current. Tie unused inputs high or low; use pull-up or pull-down resistors on switches and open-drain/open-collector outputs.</p>
<h3>A/D and D/A</h3>
<p>An n-bit ADC divides its reference into 2ⁿ steps: a 10-bit ADC with a 5 V reference resolves about 5/1024 ≈ 4.9 mV per count. A DAC does the reverse — a digital code sets an output voltage.</p>
<h3>Troubleshooting digital circuits</h3>
<ul><li>Check power and ground at the IC pins, then clock and reset.</li>
<li>A node <strong>stuck</strong> HIGH or LOW that should toggle suggests a shorted output/input, a solder bridge, or a damaged driver.</li>
<li>A voltage in the forbidden region (e.g. 1.5 V on 5 V logic) suggests contention (two outputs fighting), a floating node or a weak/missing pull-up.</li>
<li>Use a logic probe, the scope, or a logic analyzer to see activity and timing.</li></ul>`,
    keyPoints: ['TTL: VIL ≤ 0.8 V, VIH ≥ 2.0 V; VOL ≤ 0.4 V, VOH ≥ 2.4 V.', 'Never leave CMOS inputs floating.', 'ADC step = Vref/2ⁿ.', 'Stuck or mid-level nodes point to shorts, contention or floating inputs.'],
    questions: [
      ['On 5 V TTL, an input measuring 1.4 V is…', ['A valid LOW', 'A valid HIGH', 'In the undefined region', 'Always read as HIGH by spec'], 2, 'TTL guarantees LOW ≤ 0.8 V and HIGH ≥ 2.0 V; 1.4 V is between them.'],
      ['What is the resolution of a 12-bit ADC with a 4.096 V reference?', ['1 mV', '4 mV', '16 mV', '0.25 mV'], 0, '4.096 V / 4096 = 1 mV per count.'],
      ['A CMOS gate input is left unconnected. The likely result is…', ['It reads a solid LOW', 'Unpredictable behavior and possibly higher current draw', 'The chip turns off', 'Nothing — unused inputs never matter'], 1, 'Floating CMOS inputs pick up noise, may oscillate and can cause excess supply current. Tie them to a defined level.']
    ]
  }
  );
})(typeof window !== 'undefined' ? window : globalThis);
