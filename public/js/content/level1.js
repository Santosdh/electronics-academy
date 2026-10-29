/* Level 1 — Fundamentals */
(function (g) {
  (g.EA_LEVELS = g.EA_LEVELS || []).push({
    id: 'l1', number: 1, title: 'Fundamentals', icon: '🔋', color: '#3b82f6',
    subtitle: 'Charge, voltage, current, resistance, Ohm’s law, power, series & parallel',
    lessons: [
      {
        id: 'l1-charge-current', title: 'Charge and Current', minutes: 6,
        summary: 'What electric charge is and how its flow becomes current.',
        body: `
<p>All matter is made of atoms, and atoms contain charged particles: <strong>protons</strong> (positive) and <strong>electrons</strong> (negative). Electric <strong>charge</strong> (symbol <em>Q</em>) is measured in <strong>coulombs (C)</strong>. One electron carries about <strong>−1.602 × 10⁻¹⁹ C</strong>, so one coulomb is the charge of roughly 6.24 × 10¹⁸ electrons.</p>
<p><strong>Current</strong> (symbol <em>I</em>) is the rate at which charge flows past a point. It is measured in <strong>amperes (A)</strong>, where 1 A = 1 coulomb per second.</p>
<div class="formula">I = Q / t</div>
<p>In metal wires the moving charges are electrons. By historical convention, <strong>conventional current</strong> is drawn flowing from the positive terminal to the negative terminal — the opposite of the electrons’ actual drift. Circuit diagrams and nearly all formulas use conventional current, and so does this course.</p>
<h3>Conductors and insulators</h3>
<p><strong>Conductors</strong> (copper, aluminium, gold) have loosely bound electrons that move easily. <strong>Insulators</strong> (rubber, glass, most plastics) hold their electrons tightly. <strong>Semiconductors</strong> such as silicon sit in between, and their conductivity can be controlled — the basis of diodes and transistors.</p>
<div class="example"><strong>Example:</strong> 3 C of charge passes through a wire in 2 s. I = 3 C / 2 s = <strong>1.5 A</strong>.</div>
<p>Common scales: 1 mA = 0.001 A (an LED), 1 µA = 10⁻⁶ A (a sleeping microcontroller), and several amps for a motor or a phone fast-charger.</p>`,
        keyPoints: ['Charge is measured in coulombs (C).', 'Current I = Q/t, measured in amperes (1 A = 1 C/s).', 'Conventional current flows from + to −; electrons drift the other way.'],
        questions: [
          { id: 'l1-charge-current-q1', q: 'What is one ampere?', options: ['One coulomb per second', 'One volt per ohm squared', 'One joule per second', 'One electron per second'], answer: 0, explanation: 'Current is charge per unit time: 1 A = 1 C/s. (A joule per second is a watt.)' },
          { id: 'l1-charge-current-q2', q: '6 C of charge flows past a point in 3 seconds. What is the current?', options: ['18 A', '2 A', '0.5 A', '9 A'], answer: 1, explanation: 'I = Q/t = 6 C / 3 s = 2 A.' },
          { id: 'l1-charge-current-q3', q: 'In which direction does conventional current flow in a circuit diagram?', options: ['From − to +, the same as electrons', 'From + to − through the external circuit', 'It alternates every half second', 'It has no defined direction'], answer: 1, explanation: 'Conventional current is defined as flowing from the positive terminal through the circuit to the negative terminal, opposite to electron drift in metals.' },
          { id: 'l1-charge-current-q4', q: 'Which material is a semiconductor?', options: ['Copper', 'Rubber', 'Silicon', 'Glass'], answer: 2, explanation: 'Silicon is the most common semiconductor. Copper is a conductor; rubber and glass are insulators.' }
        ]
      },
      {
        id: 'l1-voltage', title: 'Voltage', minutes: 6,
        summary: 'Voltage is the “push” — energy per unit of charge between two points.',
        body: `
<p><strong>Voltage</strong> (symbol <em>V</em>, also called potential difference or EMF for a source) is the energy given to, or used by, each coulomb of charge moving between two points. It is measured in <strong>volts (V)</strong>, where 1 V = 1 joule per coulomb.</p>
<div class="formula">V = W / Q</div>
<p>Voltage is always measured <strong>between two points</strong>. When we say “the node is at 5 V” we mean 5 V relative to a chosen reference point called <strong>ground</strong> (0 V), usually the negative terminal of the supply.</p>
<h3>The water analogy</h3>
<p>Think of a water system: voltage is like <em>pressure</em>, current is like the <em>flow rate</em>, and a narrow pipe is like a resistor. Higher pressure pushes more water through the same pipe. The analogy has limits, but it is a good starting intuition.</p>
<h3>Sources of voltage</h3>
<ul><li>Batteries (chemical): an AA cell is ~1.5 V, a Li-ion cell ~3.7 V nominal, a “9 V” battery 9 V.</li>
<li>Bench power supplies and USB (5 V).</li>
<li>Generators and the mains supply (AC, covered in Module 8).</li></ul>
<div class="example"><strong>Example:</strong> A 9 V battery moves 2 C of charge through a circuit. The energy delivered is W = V × Q = 9 × 2 = <strong>18 J</strong>.</div>
<p>A voltmeter is connected <strong>in parallel</strong> (across) the part you are measuring; it has a very high internal resistance so it barely disturbs the circuit.</p>`,
        keyPoints: ['Voltage = energy per charge (1 V = 1 J/C).', 'Voltage is always between two points; ground is the 0 V reference.', 'Measure voltage across a component, with the meter in parallel.'],
        sim: 'series',
        questions: [
          { id: 'l1-voltage-q1', q: 'One volt is equal to…', options: ['One joule per coulomb', 'One coulomb per second', 'One watt per ampere squared', 'One ohm per ampere'], answer: 0, explanation: 'V = W/Q, so 1 V = 1 J/C. (One watt per ampere also equals one volt, but “per ampere squared” does not.)' },
          { id: 'l1-voltage-q2', q: 'How is a voltmeter connected to measure the voltage across a resistor?', options: ['In series with the resistor', 'In parallel (across) the resistor', 'Between the resistor and ground only', 'It replaces the resistor'], answer: 1, explanation: 'Voltage is a difference between two points, so the meter probes go across the component — in parallel.' },
          { id: 'l1-voltage-q3', q: 'A 12 V source moves 0.5 C of charge. How much energy is transferred?', options: ['24 J', '6 J', '12.5 J', '0.04 J'], answer: 1, explanation: 'W = V × Q = 12 V × 0.5 C = 6 J.' },
          { id: 'l1-voltage-q4', q: 'In the water analogy, voltage corresponds to…', options: ['Flow rate', 'Pipe width', 'Pressure', 'The amount of water'], answer: 2, explanation: 'Voltage is the “push”, like water pressure. Current is like flow rate, and resistance like a narrow pipe.' }
        ]
      },
      {
        id: 'l1-ohms-law', title: 'Resistance and Ohm’s Law', minutes: 8,
        summary: 'How resistance limits current, and the most-used formula in electronics.',
        body: `
<p><strong>Resistance</strong> (symbol <em>R</em>) is opposition to current flow, measured in <strong>ohms (Ω)</strong>. A conductor’s resistance depends on its material and shape:</p>
<div class="formula">R = ρ · L / A</div>
<p>where ρ (rho) is the material’s resistivity, L the length and A the cross-sectional area. Longer, thinner wires have more resistance; copper has very low resistivity (≈1.7 × 10⁻⁸ Ω·m).</p>
<h3>Ohm’s law</h3>
<p>For a resistor, the current through it is proportional to the voltage across it:</p>
<div class="formula">V = I × R &nbsp;&nbsp;·&nbsp;&nbsp; I = V / R &nbsp;&nbsp;·&nbsp;&nbsp; R = V / I</div>
<p>A handy memory aid is the <strong>V-over-I-R triangle</strong>: cover the quantity you want and the other two show the operation.</p>
<div class="example"><strong>Example 1:</strong> 9 V across 3 kΩ → I = 9 / 3000 = <strong>3 mA</strong>.<br/><strong>Example 2:</strong> 20 mA flows through 220 Ω → V = 0.02 × 220 = <strong>4.4 V</strong>.<br/><strong>Example 3:</strong> 5 V gives 25 mA → R = 5 / 0.025 = <strong>200 Ω</strong>.</div>
<p>Watch the units: volts ÷ kilohms gives milliamps, which is a convenient shortcut. <strong>Conductance</strong> G = 1/R is measured in siemens (S).</p>
<p>Ohm’s law holds for “ohmic” components like resistors. Diodes, LEDs and bulbs (whose resistance rises as they heat) are <em>non-linear</em> — their V/I ratio changes with operating point.</p>`,
        keyPoints: ['V = I × R (and its rearrangements).', 'R = ρL/A — longer and thinner means more resistance.', 'Volts ÷ kΩ = mA is a quick mental shortcut.'],
        sim: 'series',
        questions: [
          { id: 'l1-ohms-law-q1', q: 'What current flows when 12 V is applied across 4 kΩ?', options: ['3 A', '48 mA', '3 mA', '0.33 mA'], answer: 2, explanation: 'I = V/R = 12 V / 4000 Ω = 0.003 A = 3 mA.' },
          { id: 'l1-ohms-law-q2', q: 'A resistor carries 10 mA with 5 V across it. What is its resistance?', options: ['50 Ω', '500 Ω', '2 Ω', '5 kΩ'], answer: 1, explanation: 'R = V/I = 5 / 0.010 = 500 Ω.' },
          { id: 'l1-ohms-law-q3', q: 'If you double the length of a wire (same material and thickness), its resistance…', options: ['Halves', 'Doubles', 'Stays the same', 'Quadruples'], answer: 1, explanation: 'R = ρL/A is proportional to length, so doubling L doubles R.' },
          { id: 'l1-ohms-law-q4', q: 'Which component does NOT follow Ohm’s law with a fixed resistance?', options: ['A carbon-film resistor', 'A metal-film resistor', 'An LED', 'A wire-wound resistor at constant temperature'], answer: 2, explanation: 'An LED is a non-linear device: almost no current flows until its forward voltage is reached, then current rises steeply.' }
        ]
      },
      {
        id: 'l1-power', title: 'Power and Energy', minutes: 7,
        summary: 'How fast energy is used, and why components get hot.',
        body: `
<p><strong>Power</strong> (symbol <em>P</em>) is the rate of energy transfer, measured in <strong>watts (W)</strong>, where 1 W = 1 J/s. For any component:</p>
<div class="formula">P = V × I</div>
<p>Combining with Ohm’s law gives two more forms that are useful for resistors:</p>
<div class="formula">P = I² × R &nbsp;&nbsp;·&nbsp;&nbsp; P = V² / R</div>
<div class="example"><strong>Example:</strong> A 100 Ω resistor across 5 V: I = 50 mA, so P = 5 × 0.05 = <strong>0.25 W</strong> (check: V²/R = 25/100 = 0.25 W).</div>
<h3>Power ratings</h3>
<p>Resistors have a power rating (commonly ⅛ W, ¼ W, ½ W). A good rule of thumb is to keep dissipation at or below <strong>half</strong> the rating for reliability. The 0.25 W example above should use at least a ½ W resistor.</p>
<h3>Energy</h3>
<div class="formula">E = P × t</div>
<p>Energy is in joules (W·s). Utilities bill in <strong>kilowatt-hours</strong>: 1 kWh = 1000 W for 1 hour = 3.6 MJ. Battery capacity is often given in mAh; multiply by the nominal voltage to get energy (e.g. 2000 mAh × 3.7 V = 7.4 Wh).</p>
<h3>Efficiency</h3>
<p>Efficiency η = P<sub>out</sub> / P<sub>in</sub>. Whatever is not delivered to the load becomes heat.</p>`,
        keyPoints: ['P = VI = I²R = V²/R.', 'Keep resistors at or below ~50% of their power rating.', '1 kWh = 3.6 MJ; mAh × V = mWh.'],
        sim: 'bulb-switch',
        questions: [
          { id: 'l1-power-q1', q: 'What power does a 1 kΩ resistor dissipate with 10 V across it?', options: ['10 W', '0.1 W', '1 W', '0.01 W'], answer: 1, explanation: 'P = V²/R = 100 / 1000 = 0.1 W.' },
          { id: 'l1-power-q2', q: 'If the current through a resistor doubles, its power dissipation…', options: ['Doubles', 'Halves', 'Quadruples', 'Stays the same'], answer: 2, explanation: 'P = I²R, so doubling I multiplies P by 2² = 4.' },
          { id: 'l1-power-q3', q: 'A 60 W lamp runs for 5 hours. How much energy does it use?', options: ['0.3 kWh', '12 kWh', '300 kWh', '3 kWh'], answer: 0, explanation: 'E = P × t = 60 W × 5 h = 300 Wh = 0.3 kWh.' },
          { id: 'l1-power-q4', q: 'A resistor will dissipate 0.2 W. Which rating is the most sensible choice?', options: ['⅛ W (0.125 W)', '¼ W (0.25 W)', '½ W (0.5 W)', 'Any — ratings don’t matter at low voltage'], answer: 2, explanation: '⅛ W is below 0.2 W and ¼ W is barely above it. Derating to ~50% means choosing ½ W.' }
        ]
      },
      {
        id: 'l1-series-parallel', title: 'Series and Parallel Circuits', minutes: 9,
        summary: 'How resistances combine, and how current and voltage split.',
        body: `
<h3>Series</h3>
<p>Components in <strong>series</strong> are connected end-to-end in one path. The <strong>same current</strong> flows through each, and the voltages add up to the supply voltage. Resistances add:</p>
<div class="formula">R<sub>total</sub> = R₁ + R₂ + R₃ + …</div>
<div class="example"><strong>Example:</strong> 9 V across 1 kΩ + 2 kΩ in series: R = 3 kΩ, I = 9 V / 3 kΩ = <strong>3 mA</strong>. V₁ = 3 mA × 1 kΩ = 3 V, V₂ = 6 V. Check: 3 + 6 = 9 V. ✔</div>
<h3>Parallel</h3>
<p>Components in <strong>parallel</strong> share the same two nodes, so each has the <strong>same voltage</strong>. The currents add. Resistances combine by reciprocals:</p>
<div class="formula">1 / R<sub>total</sub> = 1/R₁ + 1/R₂ + …</div>
<p>For exactly two resistors there is a shortcut, “product over sum”:</p>
<div class="formula">R<sub>total</sub> = (R₁ × R₂) / (R₁ + R₂)</div>
<div class="example"><strong>Example:</strong> 1 kΩ ∥ 1 kΩ = 500 Ω. 3 kΩ ∥ 6 kΩ = 18/9 = <strong>2 kΩ</strong>. The total parallel resistance is always <em>less than the smallest branch</em>.</div>
<h3>Series-parallel combinations</h3>
<p>Simplify step by step: combine the obvious series or parallel groups, redraw, and repeat. Then work back out to find individual currents and voltages.</p>
<p>Household outlets are wired in parallel so every appliance gets the full mains voltage and can be switched independently.</p>`,
        keyPoints: ['Series: same current, voltages add, R = R₁ + R₂ + …', 'Parallel: same voltage, currents add, 1/R = 1/R₁ + 1/R₂ + …', 'Parallel total is always smaller than the smallest branch.'],
        sim: 'parallel',
        questions: [
          { id: 'l1-series-parallel-q1', q: 'What is the total resistance of 220 Ω, 330 Ω and 470 Ω in series?', options: ['1020 Ω', '99 Ω', '470 Ω', '1.02 Ω'], answer: 0, explanation: 'Series resistances add: 220 + 330 + 470 = 1020 Ω.' },
          { id: 'l1-series-parallel-q2', q: 'What is 4 kΩ in parallel with 4 kΩ?', options: ['8 kΩ', '4 kΩ', '2 kΩ', '1 kΩ'], answer: 2, explanation: 'Two equal resistors in parallel give half the value: (4×4)/(4+4) = 2 kΩ.' },
          { id: 'l1-series-parallel-q3', q: 'In a parallel circuit, what is the same for every branch?', options: ['Current', 'Voltage', 'Power', 'Resistance'], answer: 1, explanation: 'Parallel branches connect to the same two nodes, so they all have the same voltage across them.' },
          { id: 'l1-series-parallel-q4', q: '12 V is applied to 2 kΩ in series with 4 kΩ. What is the voltage across the 4 kΩ resistor?', options: ['4 V', '6 V', '8 V', '12 V'], answer: 2, explanation: 'I = 12 / 6 kΩ = 2 mA, so V = 2 mA × 4 kΩ = 8 V. (Voltage divides in proportion to resistance.)' }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
