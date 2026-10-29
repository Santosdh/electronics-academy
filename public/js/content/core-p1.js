/* Phase 1 — Foundations: new lessons for Modules 1–4.
   Questions use the compact form [question, [options], answerIndex, explanation]. */
(function (g) {
  var L = (g.EA_LESSON_BANK = g.EA_LESSON_BANK || []);
  L.push(
  /* ---------------- Module 1: Electrical Safety ---------------- */
  {
    id: 'm1-shock', title: 'How Electric Shock Hurts You', minutes: 12,
    summary: 'Why current through the body is the hazard, what changes it, and why “low voltage” is not automatically safe.',
    body: `
<p>Electricity injures people by driving <strong>current through the body</strong>. Voltage matters because it is what pushes that current through your body’s resistance (I = V / R). Dry, intact skin can measure many kilohms; wet, broken or sweaty skin, a firm grip or a large contact area can drop body resistance to around 1 kΩ or lower — so the same voltage can drive far more current.</p>
<h3>Typical effects of 50/60 Hz current hand-to-hand or hand-to-foot</h3>
<table class="tbl"><tr><th>Current (approx.)</th><th>Typical effect</th></tr>
<tr><td>about 1 mA</td><td>Threshold of feeling — a tingle</td></tr>
<tr><td>roughly 5–10 mA</td><td>Painful; still able to let go</td></tr>
<tr><td>roughly 10–30 mA</td><td>“Let-go” threshold — muscles clamp and you may not be able to release the conductor; breathing can be affected</td></tr>
<tr><td>roughly 50–100 mA and above</td><td>Ventricular fibrillation (heart stops pumping effectively) becomes possible — potentially fatal</td></tr></table>
<p>These are approximate, widely quoted figures; individuals vary and the path matters. Current that crosses the chest (hand-to-hand, hand-to-foot) is the most dangerous.</p>
<h3>Other electrical hazards</h3>
<ul><li><strong>Arc flash / arc blast</strong> — a fault can create an arc hot enough to cause severe burns, eye damage and pressure injuries, even without contact.</li>
<li><strong>Burns</strong> — from current flow, from arcs, and from components or tools that overheat (resistors, regulators, soldering irons).</li>
<li><strong>Stored energy</strong> — capacitors, batteries, springs and charged cables can deliver energy after the equipment is switched off.</li>
<li><strong>Secondary injuries</strong> — a startle reaction can make you fall or hit something.</li></ul>
<h3>Low voltage is not a free pass</h3>
<p>Even when a voltage is too low to drive dangerous current through skin, a low-voltage source with a high current capability (a car battery, a bench supply, a lithium pack) can heat a ring, watch band or wrench red-hot in seconds when it shorts across terminals. Remove metal jewelry at the bench.</p>
<div class="callout warn"><strong>Program rule:</strong> nothing is powered at the bench until you have passed the Module 1 safety quiz at 100%.</div>`,
    keyPoints: ['Current through the body causes the injury; voltage drives it through body resistance.', 'Roughly 1 mA is felt, 10–30 mA can prevent let-go, and 50–100 mA across the chest can cause fibrillation.', 'Wet skin and large contact areas lower body resistance.', 'Low-voltage, high-current sources can still burn via shorted jewelry or tools.'],
    questions: [
      ['What actually causes injury in an electric shock?', ['The voltage alone, regardless of current', 'Current flowing through the body', 'Static magnetic fields', 'The frequency of the supply only'], 1, 'Voltage is what drives current through the body’s resistance, but it is the current that causes the physiological effect.'],
      ['Roughly what range of AC current through the body is commonly quoted as the “let-go” threshold, beyond which a person may not be able to release the conductor?', ['About 1 µA', 'About 10–30 mA', 'About 1–2 A', 'About 0.1 mA'], 1, 'Around 10–30 mA (varies by person) muscles can clamp onto the conductor. About 1 mA is merely perceptible; 50–100 mA across the chest can cause fibrillation.'],
      ['Why is wet skin more dangerous than dry skin?', ['Water raises body resistance', 'Water lowers body resistance, so the same voltage drives more current', 'Water blocks AC but not DC', 'It isn’t — skin condition has no effect'], 1, 'I = V/R. Lower skin resistance means more current for the same voltage.'],
      ['A 12 V, high-current battery cannot push dangerous current through dry skin. What is still a real hazard?', ['None — 12 V is always safe', 'A ring or wrench shorting the terminals and heating red-hot', 'It will cause ventricular fibrillation through the fingers', 'Radio interference'], 1, 'High-current sources can deliver hundreds of amps into a short, heating metal jewelry or tools enough to cause severe burns.']
    ]
  },
  {
    id: 'm1-loto', title: 'Lockout/Tagout, PPE and Stored Energy', minutes: 14, sim: 'rc-charge',
    summary: 'Isolate, lock, release stored energy, verify zero energy — and the PPE that backs it up.',
    body: `
<p><strong>Lockout/tagout (LOTO)</strong> is the controlled process for making equipment safe before you work on it. It exists because people get hurt when someone else re-energizes equipment they are working on, or when “off” equipment still holds energy. The curriculum follows the NFPA 70E / OSHA LOTO framework; your site’s written LOTO procedure is the one you follow.</p>
<h3>Typical LOTO sequence</h3>
<ol><li><strong>Prepare and notify</strong> — identify every energy source (mains, batteries, UPS, capacitors, pneumatics) and tell affected people.</li>
<li><strong>Shut down</strong> the equipment normally.</li>
<li><strong>Isolate</strong> — open the disconnect, unplug the cord, remove the battery.</li>
<li><strong>Apply your lock and tag</strong> — your own lock, your own key. The tag says who, why and when.</li>
<li><strong>Release stored energy</strong> — discharge capacitors with an approved discharge tool or resistor, not a screwdriver.</li>
<li><strong>Verify zero energy</strong> — test with a meter: check the meter on a known live source, test the isolated circuit, then re-check the meter on the known source (“live–dead–live”). Also try the normal start controls.</li></ol>
<p>Removal is the reverse: tools out, guards on, people clear, then the person who applied the lock removes it.</p>
<h3>Stored energy in capacitors</h3>
<p>The energy in a capacitor is E = ½CV². A 470 µF capacitor at 400 V (typical of an off-line power supply’s bulk capacitor) stores ½ × 470×10⁻⁶ × 400² ≈ 38 J — enough to cause a serious shock long after the plug is pulled. Bleeder resistors are not guaranteed to work; always measure.</p>
<div class="example"><strong>Discharge time:</strong> through a resistor the voltage falls as V·e<sup>−t/RC</sup>. After 5 time constants (5RC) less than 1% remains. Try the RC-charging example in the simulator to see the curve.</div>
<h3>PPE and bench practice</h3>
<ul><li><strong>Safety glasses</strong> whenever soldering, cutting leads, or powering untested circuits — capacitors and leads can fail violently.</li>
<li>Insulated tools and properly rated test leads; inspect leads for cracks before use.</li>
<li>Arc-rated clothing, gloves and face protection are selected by the site’s hazard assessment for energized work — trainees do not perform energized mains work.</li>
<li><strong>One-hand rule</strong> when probing anything that might be hazardous: keep the other hand away so current cannot take a hand-to-hand path across the chest.</li></ul>`,
    keyPoints: ['LOTO: notify, shut down, isolate, lock & tag, release stored energy, verify zero energy.', 'Use live–dead–live: prove the meter works before and after testing the isolated circuit.', 'Capacitor energy E = ½CV²; discharge with an approved tool and verify by measurement.', 'Only the person who applied a lock removes it.'],
    questions: [
      ['After isolating equipment and applying your lock and tag, what must you do before touching the circuit?', ['Nothing — the lock makes it safe', 'Release stored energy and verify zero energy with a tested meter', 'Ask a coworker if it is off', 'Remove the tag so it isn’t lost'], 1, 'Isolation does not remove stored energy (capacitors, batteries). You must release it and prove zero energy by measurement.'],
      ['What does the “live–dead–live” check accomplish?', ['It discharges the capacitors', 'It proves the meter is working before and after it reads “dead”, so a dead reading can be trusted', 'It measures insulation resistance', 'It satisfies ESD requirements'], 1, 'A broken meter or blown fuse reads 0 V on a live circuit. Checking a known source before and after proves the meter actually works.'],
      ['How much energy is stored in a 470 µF capacitor charged to 400 V?', ['About 0.09 J', 'About 38 J', 'About 188 J', 'About 3.8 kJ'], 1, 'E = ½CV² = 0.5 × 470×10⁻⁶ × 160 000 ≈ 37.6 J.'],
      ['Who should remove a lockout lock?', ['Any supervisor', 'The person who applied it (following the site procedure)', 'Whoever needs the machine next', 'Anyone with a bolt cutter'], 1, 'Each worker controls their own lock and key; removal follows the site’s procedure, normally by the person who applied it.']
    ]
  },
  {
    id: 'm1-protection', title: 'Fuses, Breakers, Fire and Emergency Response', minutes: 12,
    summary: 'Overcurrent protection, ground faults, fire classes and what to do if someone is shocked.',
    body: `
<h3>Overcurrent protection</h3>
<ul><li>A <strong>fuse</strong> melts open when current exceeds its rating for long enough. Replace only with the <em>same rating and type</em> (current, voltage, fast/slow-blow). A bigger fuse removes the protection.</li>
<li>A <strong>circuit breaker</strong> trips on overcurrent and can be reset — but find the cause first.</li>
<li>A <strong>GFCI / RCD</strong> compares the current going out and coming back; if some current leaks elsewhere (possibly through a person) it trips within milliseconds. It protects people; a fuse mainly protects wiring and equipment.</li>
<li>The <strong>protective earth</strong> (ground pin) gives fault current a low-resistance path so the fuse or breaker opens. Never remove or defeat the ground pin — including on oscilloscopes.</li></ul>
<h3>Fire classes (US) and extinguishers</h3>
<table class="tbl"><tr><th>Class</th><th>Fuel</th></tr>
<tr><td>A</td><td>Ordinary combustibles (paper, wood, cloth)</td></tr>
<tr><td>B</td><td>Flammable liquids and gases (solvents, IPA)</td></tr>
<tr><td>C</td><td>Energized electrical equipment</td></tr>
<tr><td>D</td><td>Combustible metals (e.g. lithium metal, magnesium)</td></tr>
<tr><td>K</td><td>Cooking oils and fats</td></tr></table>
<p>Never use water on energized equipment. De-energize if you can do so safely; CO₂ or dry-chemical extinguishers rated for class C are typical in electronics labs. Lithium-ion battery fires are a special case — follow your site’s battery-fire procedure and evacuate if in doubt.</p>
<h3>If someone is being shocked</h3>
<ol><li><strong>Do not touch them</strong> while they are in contact with the source — you will become part of the circuit.</li>
<li>Cut the power (emergency off, breaker, unplug) or separate them with a dry non-conductive object.</li>
<li>Call emergency services / your site emergency number.</li>
<li>If trained, start CPR and use an AED if they are not breathing normally. Anyone who received a significant shock should get medical evaluation.</li></ol>
<h3>Lab rules and FOD</h3>
<p>Keep the bench clean and orderly. <strong>Foreign object debris (FOD)</strong> — clipped leads, solder balls, wire strands, screws — can short circuits or end up inside hardware. Clean as you go, account for tools, and never leave a powered circuit unattended.</p>`,
    keyPoints: ['Replace fuses with the same rating and type only.', 'GFCI/RCD trips on leakage current and protects people.', 'Class C = energized electrical; never use water on it.', 'Never touch a person still in contact with the source — kill the power first.', 'Control FOD: clipped leads and solder debris cause shorts.'],
    questions: [
      ['A 1 A fuse keeps blowing. What is the correct action?', ['Fit a 5 A fuse', 'Bridge the fuse holder with wire', 'Find and fix the cause, then replace it with the same rating and type', 'Replace it with a slow-blow fuse of any rating'], 2, 'The fuse is doing its job. Up-rating or bypassing it removes the protection. Find the fault first.'],
      ['Which fire class covers energized electrical equipment?', ['Class A', 'Class B', 'Class C', 'Class K'], 2, 'Class C is energized electrical equipment; use an extinguisher rated for it (e.g. CO₂ or dry chemical), never water.'],
      ['A coworker is gripping a live conductor and cannot let go. What do you do first?', ['Pull them away by the arm', 'Throw water on them', 'Cut the power or separate them with a dry non-conductive object without touching them', 'Wait for them to let go'], 2, 'Touching them puts you in the circuit. Remove the source of current first, then call for help and give first aid if trained.'],
      ['What does a GFCI/RCD detect?', ['Overvoltage on the line', 'A difference between outgoing and returning current (leakage to ground)', 'Excess temperature in the wiring', 'Low battery voltage'], 1, 'If current leaves on one conductor but does not all return on the other, some is leaking elsewhere — possibly through a person — and the device trips.']
    ]
  },
  /* ---------------- Module 2: ESD ---------------- */
  {
    id: 'm2-esd-basics', title: 'ESD: How Static Damages Electronics', minutes: 10,
    summary: 'Triboelectric charging, why you can’t feel most damaging discharges, and latent damage.',
    body: `
<p><strong>Electrostatic discharge (ESD)</strong> is the sudden flow of charge between two objects at different potentials. Walking across a floor, peeling tape or sliding off a chair separates charge — the <strong>triboelectric effect</strong> — and can leave a person or object at thousands of volts.</p>
<h3>Why it matters</h3>
<ul><li>Most people only <em>feel</em> a discharge of a few thousand volts (commonly quoted around 3 kV). Many semiconductor devices can be damaged by discharges of only tens to hundreds of volts — far below what you can feel, see or hear.</li>
<li>Thin gate oxides in MOSFETs and CMOS ICs, small-geometry junctions, and RF parts are especially sensitive.</li>
<li><strong>Charged objects</strong> matter too: a charged plastic tray or a charged device can discharge into a grounded pin.</li></ul>
<h3>Catastrophic vs latent damage</h3>
<p>A <strong>catastrophic</strong> failure is immediate — the part is dead or out of spec and test catches it. <strong>Latent</strong> damage weakens the part (e.g. a partially punctured oxide or increased leakage) so it passes test but fails later in service. Latent failures are why ESD control matters for reliability, not just yield.</p>
<h3>The control principle</h3>
<p>Keep everything in the work area at the <strong>same potential</strong> (grounded through controlled resistance), keep insulators that can’t be grounded away from sensitive parts or neutralize them with ionizers, and move parts only in protective packaging. The program’s ESD control is based on an ANSI/ESD S20.20-style site plan; your site’s ESD program document defines the specific requirements.</p>`,
    keyPoints: ['Triboelectric charging can put a person at thousands of volts.', 'Damage can occur far below the ~3 kV you can feel.', 'Latent damage passes test but fails later.', 'Control by grounding conductors, neutralizing insulators, and using protective packaging.'],
    questions: [
      ['Why can’t you rely on feeling a static shock to know a part was zapped?', ['Parts are only damaged above 10 kV', 'Many devices are damaged by discharges far below the few-thousand-volt level people can feel', 'Static never damages modern parts', 'You can always see a spark'], 1, 'Discharges of tens to hundreds of volts can damage sensitive parts; people typically feel only a few kilovolts.'],
      ['What is “latent” ESD damage?', ['Damage that destroys the part instantly', 'Damage that weakens a part so it passes test but fails later', 'Damage to the packaging only', 'Damage that heals itself'], 1, 'Latent damage degrades the device without immediate failure, causing early field failures.'],
      ['Charge separation from rubbing or peeling materials is called…', ['The Peltier effect', 'The triboelectric effect', 'Electromigration', 'The skin effect'], 1, 'Triboelectric charging occurs when materials contact and separate.'],
      ['What is the basic principle of an ESD-protected area?', ['Keep the air as dry as possible', 'Keep people, surfaces and conductive items at the same potential through controlled grounding, and control insulators', 'Ground parts directly with zero-ohm straps only', 'Wear rubber gloves to insulate the part'], 1, 'Equalize potential with controlled-resistance grounding, remove or neutralize insulators, and use protective packaging.']
    ]
  },
  {
    id: 'm2-esd-practice', title: 'Working in an EPA: Straps, Mats, Packaging and MSD', minutes: 12,
    summary: 'Wrist strap checks, mats, ionizers, shielding bags, and moisture-sensitive device awareness.',
    body: `
<h3>The ESD-protected area (EPA)</h3>
<ul><li><strong>Wrist strap</strong> — worn snug on bare skin and connected to the ground point. The cord contains a current-limiting resistor (commonly about 1 MΩ) so that if you touch a live voltage, the strap doesn’t become a low-resistance path through you.</li>
<li><strong>Daily wrist-strap check</strong> — test the strap on the wrist-strap tester before each shift and record it in the log. A strap that fails (open or too low resistance) must be replaced before work.</li>
<li><strong>Dissipative mats and flooring</strong> drain charge slowly and safely to ground; footwear grounders work with grounded floors.</li>
<li><strong>Ionizers</strong> neutralize charge on insulators that can’t be grounded (plastic housings, tape, some tools).</li>
<li>Keep ordinary plastics, foam cups, paper and tape dispensers out of the area near sensitive parts.</li></ul>
<h3>Packaging</h3>
<table class="tbl"><tr><th>Type</th><th>What it does</th></tr>
<tr><td>Static-shielding (metallized) bag</td><td>Low-charging <em>and</em> blocks external fields/discharges — use for transporting sensitive parts and assemblies</td></tr>
<tr><td>Pink “antistatic” (low-charging) bag</td><td>Doesn’t generate much charge itself but does <strong>not</strong> shield — not adequate on its own for sensitive items outside the EPA</td></tr>
<tr><td>Conductive containers / black foam</td><td>Hold parts at one potential</td></tr></table>
<p>Only open protective packaging inside the EPA while grounded. Look for the ESD-sensitive symbol on labels.</p>
<h3>Moisture-sensitive devices (MSD)</h3>
<p>Many plastic IC packages absorb moisture from the air. During reflow or hot-air rework that moisture can turn to steam and crack the package or delaminate it internally (“popcorning”). MSDs ship sealed in moisture-barrier bags with desiccant and a humidity indicator card; the label states the moisture-sensitivity level and how long the parts may be exposed (floor life). Track exposure time, reseal unused parts, and follow your site procedure (which may require baking) when floor life is exceeded.</p>`,
    keyPoints: ['Test your wrist strap every day and log it.', 'Strap cords include a current-limiting resistor (often ~1 MΩ) for personnel safety.', 'Shielding bags block discharges; pink bags only reduce charging.', 'Ionizers handle insulators that can’t be grounded.', 'MSDs have a floor life; moisture can crack packages during heating.'],
    questions: [
      ['Why does a wrist-strap cord contain a resistor (commonly about 1 MΩ)?', ['To make the strap more comfortable', 'To limit current through the wearer if they contact a live voltage', 'To increase charge build-up', 'To filter radio noise'], 1, 'The resistor still drains static but prevents the strap from becoming a low-resistance path for hazardous current.'],
      ['Which package should you use to carry a sensitive board outside the EPA?', ['A pink antistatic bag', 'A static-shielding (metallized) bag', 'A regular zip-lock bag', 'Bubble wrap'], 1, 'Shielding bags protect against external fields and discharges; pink bags only reduce charge generation.'],
      ['What is an ionizer used for in an EPA?', ['Grounding the operator', 'Neutralizing charge on insulators that cannot be grounded', 'Measuring humidity', 'Cooling soldering irons'], 1, 'Insulators can’t drain charge through ground, so ionized air neutralizes them.'],
      ['Why do moisture-sensitive devices have a limited “floor life” out of their dry bag?', ['They lose solderability instantly', 'Absorbed moisture can turn to steam during soldering heat and crack or delaminate the package', 'The labels fade', 'They become magnetized'], 1, 'Rapid heating vaporizes absorbed moisture, which can crack the package (“popcorning”).']
    ]
  },
  /* ---------------- Module 3: Technician Math ---------------- */
  {
    id: 'm3-notation', title: 'SI Prefixes, Scientific and Engineering Notation', minutes: 10,
    summary: 'Read and convert pico to mega quickly and correctly.',
    body: `
<table class="tbl"><tr><th>Prefix</th><th>Symbol</th><th>Multiplier</th></tr>
<tr><td>giga</td><td>G</td><td>10⁹</td></tr><tr><td>mega</td><td>M</td><td>10⁶</td></tr><tr><td>kilo</td><td>k</td><td>10³</td></tr>
<tr><td>milli</td><td>m</td><td>10⁻³</td></tr><tr><td>micro</td><td>µ (u)</td><td>10⁻⁶</td></tr><tr><td>nano</td><td>n</td><td>10⁻⁹</td></tr><tr><td>pico</td><td>p</td><td>10⁻¹²</td></tr></table>
<p><strong>Scientific notation</strong> writes a number as a × 10ⁿ with 1 ≤ a &lt; 10 (4.7 × 10³). <strong>Engineering notation</strong> uses exponents that are multiples of 3 so they map straight onto prefixes (4.7 × 10³ = 4.7 k; 0.000 022 = 22 × 10⁻⁶ = 22 µ).</p>
<h3>Converting</h3>
<ul><li>Moving to a <em>smaller</em> unit makes the number <em>bigger</em>: 0.47 µF = 470 nF = 470 000 pF.</li>
<li>Each prefix step is ×1000: 2.2 kΩ = 2200 Ω = 0.0022 MΩ.</li>
<li>Case matters: <strong>m</strong> (milli, 10⁻³) vs <strong>M</strong> (mega, 10⁶) differ by 10⁹!</li></ul>
<h3>Units in formulas</h3>
<p>Volts ÷ kilohms = milliamps, and milliamps × kilohms = volts — so 12 V across 4.7 kΩ is 12/4.7 ≈ 2.55 mA without writing any powers of ten. For R × C, kΩ × µF = milliseconds: 10 kΩ × 100 µF = 1000 ms = 1 s.</p>
<div class="example"><strong>Significant figures:</strong> report results to the precision the measurement supports. A reading of 4.98 V from a 3½-digit meter shouldn’t become 4.983 471 V after a calculation.</div>`,
    keyPoints: ['k = 10³, M = 10⁶, m = 10⁻³, µ = 10⁻⁶, n = 10⁻⁹, p = 10⁻¹².', 'Engineering notation uses powers of 10 that are multiples of 3.', 'V/kΩ = mA; kΩ × µF = ms.', 'm (milli) and M (mega) are a factor of 10⁹ apart.'],
    questions: [
      ['0.047 µF is the same as…', ['47 pF', '47 nF', '4.7 nF', '470 nF'], 1, '0.047 × 10⁻⁶ = 47 × 10⁻⁹ F = 47 nF.'],
      ['Write 0.000 33 A in engineering notation with a prefix.', ['33 mA', '330 µA', '3.3 µA', '0.33 kA'], 1, '0.000 33 = 330 × 10⁻⁶ A = 330 µA.'],
      ['What is the time constant of 10 kΩ and 47 µF?', ['47 ms', '470 ms', '4.7 s', '0.47 ms'], 1, 'kΩ × µF = ms: 10 × 47 = 470 ms.']
    ]
  },
  {
    id: 'm3-ratios', title: 'Formulas, Ratios, Percent and Tolerance', minutes: 12,
    summary: 'Rearranging formulas, percent change, tolerance bands and percent error.',
    body: `
<h3>Rearranging formulas</h3>
<p>Do the same thing to both sides. From P = V²/R: multiply by R → PR = V²; divide by P → R = V²/P. Check by units: V²/W = V²/(V·A) = V/A = Ω ✓.</p>
<h3>Ratios and proportion</h3>
<p>A divider output is a ratio: V<sub>out</sub>/V<sub>in</sub> = R2/(R1+R2). Transformers use turns ratios: V<sub>s</sub>/V<sub>p</sub> = N<sub>s</sub>/N<sub>p</sub>.</p>
<h3>Percent and tolerance</h3>
<ul><li>A 1 kΩ ±5% resistor may be anywhere from 950 Ω to 1050 Ω and still be in spec.</li>
<li>A supply rated 5.00 V ±2% is acceptable between 4.90 V and 5.10 V.</li></ul>
<div class="formula">Percent error = (measured − expected) / expected × 100%</div>
<div class="example"><strong>Example:</strong> Expected 3.30 V, measured 3.24 V → (3.24 − 3.30)/3.30 × 100 ≈ −1.8%. Inside a ±3% tolerance, outside ±1%.</div>
<h3>Worst case</h3>
<p>Tolerances stack. For a divider made of two ±5% resistors, the worst-case output occurs with one resistor at its high limit and the other at its low limit — always calculate both extremes when a specification matters.</p>
<h3>Square roots and RMS</h3>
<p>For a sine wave V<sub>rms</sub> = V<sub>peak</sub> / √2 ≈ 0.707 V<sub>peak</sub>; and P = I²R means doubling the current quadruples the power.</p>`,
    keyPoints: ['Rearrange by doing the same operation to both sides; check with units.', 'Tolerance gives an acceptable band: nominal × (1 ± tol).', 'Percent error = (measured − expected)/expected × 100%.', 'Check worst-case extremes when tolerances stack.'],
    questions: [
      ['A 2.2 kΩ ±10% resistor measures 2.35 kΩ. Is it in tolerance?', ['No, the maximum is 2.31 kΩ', 'Yes, the maximum is 2.42 kΩ', 'No, the maximum is 2.2 kΩ', 'Yes, any value is fine'], 1, '2.2 kΩ × 1.10 = 2.42 kΩ, so 2.35 kΩ is within the 1.98–2.42 kΩ band.'],
      ['Expected 12.0 V, measured 11.4 V. What is the percent error?', ['−0.6%', '−5%', '+5%', '−11.4%'], 1, '(11.4 − 12.0)/12.0 × 100 = −5%.'],
      ['Solve P = V²/R for R.', ['R = P/V²', 'R = V²/P', 'R = √(PV)', 'R = V/P²'], 1, 'Multiply both sides by R and divide by P: R = V²/P.']
    ]
  },
  {
    id: 'm3-trig', title: 'Sine Waves, Angles and Phase (Intro Trig)', minutes: 10,
    summary: 'Just enough trigonometry to read AC: angles, sine, phase and right-triangle impedance.',
    body: `
<p>An AC voltage is described as v(t) = V<sub>p</sub> · sin(2πft + φ): peak amplitude V<sub>p</sub>, frequency f, and phase angle φ.</p>
<ul><li>One full cycle = 360° = 2π radians. 90° = π/2.</li>
<li>Period T = 1/f. At 60 Hz, T ≈ 16.7 ms; at 1 kHz, T = 1 ms.</li>
<li><strong>Phase</strong> is how far one wave is shifted relative to another: shift in time Δt corresponds to Δt/T × 360°.</li></ul>
<div class="example"><strong>Example:</strong> Two 1 kHz waves have zero crossings 0.25 ms apart. Phase difference = 0.25/1 × 360° = 90°.</div>
<h3>Right triangles</h3>
<p>For a right triangle with sides a (adjacent), b (opposite) and hypotenuse c: c = √(a² + b²), tan θ = b/a. In AC circuits, resistance and reactance combine this way: |Z| = √(R² + X²) and the phase angle θ = arctan(X/R). When X = R, θ = 45°.</p>
<p>Try the RC phase example in the simulator: when the capacitor’s reactance equals the resistance, current leads the source voltage by about 45°.</p>`,
    keyPoints: ['v(t) = Vp·sin(2πft + φ).', 'T = 1/f; phase = Δt/T × 360°.', '|Z| = √(R² + X²), θ = arctan(X/R).'],
    sim: 'rc-phase',
    questions: [
      ['What is the period of a 50 Hz waveform?', ['50 ms', '20 ms', '5 ms', '2 ms'], 1, 'T = 1/f = 1/50 = 0.02 s = 20 ms.'],
      ['Two 500 Hz signals are offset by 0.5 ms. What is the phase difference?', ['45°', '90°', '180°', '360°'], 1, 'T = 1/500 Hz = 2 ms; 0.5 ms is a quarter of a period: 0.5/2 × 360° = 90°.'],
      ['R = 300 Ω and X = 400 Ω. What is |Z|?', ['700 Ω', '500 Ω', '100 Ω', '350 Ω'], 1, '√(300² + 400²) = √250 000 = 500 Ω.']
    ]
  },
  /* ---------------- Module 4: Test Equipment I ---------------- */
  {
    id: 'm4-dmm', title: 'Using a Digital Multimeter Safely', minutes: 14,
    summary: 'Voltage, current, resistance, continuity and diode modes; input impedance; CAT ratings.',
    body: `
<h3>Functions and connections</h3>
<table class="tbl"><tr><th>Measure</th><th>How</th></tr>
<tr><td>Voltage</td><td>Leads in COM and V; probe <strong>across</strong> the component (parallel)</td></tr>
<tr><td>Current</td><td>Leads in COM and A or mA; <strong>break the circuit</strong> and put the meter in series</td></tr>
<tr><td>Resistance / continuity</td><td><strong>Power off</strong> and capacitors discharged; ideally lift one end of the part</td></tr>
<tr><td>Diode test</td><td>Forward-biased silicon junction typically reads about 0.5–0.7 V; reverse reads OL</td></tr></table>
<h3>Common mistakes</h3>
<ul><li>Leaving the leads in the A jack and then touching a voltage source: in current mode the meter is nearly a short circuit — it blows the fuse, or worse.</li>
<li>Measuring resistance in a powered circuit — wrong reading and possible meter damage.</li>
<li>In-circuit resistance readings include parallel paths, so they often read low.</li></ul>
<h3>Meter loading</h3>
<p>A typical DMM has about 10 MΩ input impedance on voltage ranges. Measuring a node fed through very high resistances (hundreds of kΩ to MΩ) draws enough current to change the voltage you are measuring.</p>
<h3>AC readings</h3>
<p>Average-responding meters are calibrated to display RMS correctly only for sine waves. For square waves, PWM or distorted waveforms use a <strong>true-RMS</strong> meter.</p>
<h3>CAT ratings</h3>
<p>Meters and leads are rated by measurement category for the transient energy available where they are used: <strong>CAT II</strong> receptacle-connected equipment, <strong>CAT III</strong> building distribution (panels, fixed wiring), <strong>CAT IV</strong> the origin of the installation (utility service). Use a meter and leads rated at or above the category and voltage of the circuit, and inspect leads before use.</p>`,
    keyPoints: ['Voltage: in parallel. Current: break the circuit, in series. Resistance: power off.', 'Never connect a meter set to current across a voltage source.', 'DMM input impedance ≈ 10 MΩ can load high-impedance circuits.', 'Use true-RMS for non-sine AC.', 'Match CAT rating and voltage to where you measure.'],
    questions: [
      ['To measure the current through a resistor with a DMM you must…', ['Place the probes across the resistor', 'Break the circuit and insert the meter in series', 'Remove power and use the Ω range', 'Use the diode test'], 1, 'Current must flow through the meter, so it goes in series with the circuit.'],
      ['Why should resistance be measured with the circuit unpowered?', ['The meter’s own test current is what produces the reading; external voltage corrupts it and can damage the meter', 'Resistors change value when powered', 'Only to save battery', 'It is required for AC only'], 0, 'The ohmmeter injects a small current and measures the resulting voltage; any circuit voltage makes the reading meaningless and can harm the meter.'],
      ['A DMM reads about 2.4 V across the lower 1 MΩ resistor of a 1 MΩ/1 MΩ divider from 5 V. Why not 2.5 V?', ['The meter’s ~10 MΩ input resistance is in parallel with the resistor and loads the divider', 'The resistors are out of tolerance', 'DMMs read 15% low on DC', 'The battery is weak'], 0, '1 MΩ ∥ 10 MΩ ≈ 0.91 MΩ, so V ≈ 5 × 0.91/1.91 ≈ 2.38 V. High-impedance nodes are loaded by the meter.']
    ]
  },
  {
    id: 'm4-psu', title: 'Bench Power Supplies, Measurement Uncertainty and Records', minutes: 12,
    summary: 'Constant-voltage vs constant-current, setting a current limit, accuracy specs and recording results.',
    body: `
<h3>Bench supply modes</h3>
<ul><li><strong>Constant voltage (CV)</strong>: the supply holds the set voltage while the load draws less than the current limit.</li>
<li><strong>Constant current (CC)</strong>: if the load tries to draw more than the limit, the supply reduces its voltage to hold the current at the limit. The CC indicator lights.</li></ul>
<p><strong>Safe practice:</strong> with the output off, set the voltage, then set the current limit just above what the circuit should draw (many supplies let you short the output terminals to set the limit, or display it directly). Connect the circuit, observing polarity, then enable the output. If the supply jumps into CC unexpectedly, turn it off and look for a fault.</p>
<h3>Accuracy and uncertainty</h3>
<p>DMM accuracy is usually specified as <strong>±(% of reading + counts)</strong>. A count is one unit of the last displayed digit.</p>
<div class="example"><strong>Example:</strong> ±(0.5% + 2 counts) reading 5.000 V on a range with 1 mV resolution: 0.5% × 5 V = 25 mV, plus 2 × 1 mV = 2 mV, so the true value is within about ±27 mV.</div>
<p>Choose the lowest range that doesn’t overload for the best resolution, and note that the supply’s own display is usually less accurate than a good DMM.</p>
<h3>Recording measurements</h3>
<p>Record what you measured, where (test point or reference designator), the value <em>with units</em>, the instrument (and its calibration status), and the expected value and tolerance. A measurement with no units or no reference point is not useful to anyone else.</p>`,
    keyPoints: ['CV until the current limit is reached; then CC.', 'Set the current limit before connecting the circuit.', 'Accuracy ±(% reading + counts).', 'Record value, units, location, instrument and expected value.'],
    questions: [
      ['A bench supply set to 12 V with a 100 mA limit shows 3.1 V and its CC light is on. What does that mean?', ['The supply is broken', 'The load is trying to draw more than 100 mA, so the supply reduced its voltage to limit current', 'The circuit needs only 3.1 V', 'The supply is in CV mode'], 1, 'In CC mode the supply holds current at the limit and the voltage falls — usually a sign of a fault or an incorrect limit.'],
      ['A meter specified ±(1% + 3 counts) reads 2.000 V with 1 mV resolution. What is the uncertainty?', ['±3 mV', '±20 mV', '±23 mV', '±0.23 V'], 2, '1% of 2.000 V = 20 mV, plus 3 counts × 1 mV = 3 mV → ±23 mV.'],
      ['When should you set the bench supply’s current limit?', ['After the circuit starts smoking', 'Before connecting the circuit and enabling the output', 'Never — leave it at maximum', 'Only for AC loads'], 1, 'Setting the limit first protects the circuit and the supply if there is a wiring error or fault.']
    ]
  }
  );
})(typeof window !== 'undefined' ? window : globalThis);
