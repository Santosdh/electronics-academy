/* Phase 3 — Hands-On Workmanship (Modules 14–18) and Phase 4 (Modules 19–20): new lessons.
   Standards are referenced by name and scope only, as in the curriculum source; this app does not
   reproduce clause numbers or acceptance criteria from IPC or NASA documents. Use the licensed
   standard documents and your instructor for the actual criteria. */
(function (g) {
  var L = (g.EA_LESSON_BANK = g.EA_LESSON_BANK || []);
  var STD_NOTE = '<p class="muted small">Acceptance criteria come from the governing standard (and its revision/class) named by your program and instructor. This app teaches the concepts in general terms and does not reproduce the standard’s criteria.</p>';
  L.push(
  /* ---------------- Module 14 ---------------- */
  {
    id: 'm14-schematics', title: 'Reading Schematics and Wiring Diagrams', minutes: 12,
    summary: 'Symbols, reference designators, net labels, block and interconnect diagrams.',
    body: `
<p>A <strong>schematic</strong> shows electrical connections, not physical layout. Wires that cross without a dot are <em>not</em> connected; a junction dot means they are. Nets with the same <strong>net label</strong> (e.g. “VCC_3V3”, “SDA”) are connected even if no line joins them, including across sheets.</p>
<h3>Reference designators</h3>
<table class="tbl"><tr><th>Prefix</th><th>Part</th><th>Prefix</th><th>Part</th></tr>
<tr><td>R</td><td>Resistor</td><td>U (or IC)</td><td>Integrated circuit</td></tr>
<tr><td>C</td><td>Capacitor</td><td>J / P</td><td>Connector (jack / plug)</td></tr>
<tr><td>L</td><td>Inductor</td><td>K</td><td>Relay</td></tr>
<tr><td>D</td><td>Diode / LED</td><td>F</td><td>Fuse</td></tr>
<tr><td>Q</td><td>Transistor</td><td>T</td><td>Transformer</td></tr>
<tr><td>S / SW</td><td>Switch</td><td>Y / X</td><td>Crystal / oscillator</td></tr>
<tr><td>TP</td><td>Test point</td><td>W</td><td>Wire / cable</td></tr></table>
<p>Exact conventions vary by organization; the drawing’s notes or your site standard govern.</p>
<h3>Other diagram types</h3>
<ul><li><strong>Block diagram</strong> — functional blocks and signal flow; great for planning troubleshooting.</li>
<li><strong>Wiring / interconnect diagram</strong> — which connector pin goes to which pin, wire numbers, gauges and colors.</li>
<li><strong>Pinouts</strong> — connector and IC pin numbering. IC pin 1 is marked by a dot or notch; numbering runs counter-clockwise viewed from the top. Connector pin numbering is shown on the connector drawing — check whether the view is from the mating face or the wire side.</li></ul>
<div class="example"><strong>Correlating:</strong> find R12 on the schematic, look up its location on the assembly drawing, then find the silkscreen label on the board. Confirm value and orientation against the BOM.</div>`,
    keyPoints: ['No dot = no connection at a crossing; same net label = connected.', 'Ref des: R, C, L, D, Q, U, J/P, K, F, T, SW, Y, TP.', 'Check whether a connector view is mating face or wire side.'],
    questions: [
      ['On a schematic, two lines cross without a junction dot. They are…', ['Connected', 'Not connected', 'Connected only if the same color', 'Shorted to ground'], 1, 'Only a junction dot (or the same net label) indicates a connection.'],
      ['What part does reference designator “K3” usually indicate?', ['A capacitor', 'A relay', 'A crystal', 'A connector'], 1, 'K is the conventional prefix for relays.'],
      ['Two pins on different schematic sheets are both labeled “RESET_N”. They are…', ['Unrelated', 'Electrically connected via the net label', 'Connected only if a wire is drawn', 'Test points'], 1, 'Identical net labels denote the same net.']
    ]
  },
  {
    id: 'm14-documents', title: 'Assembly Drawings, BOMs, Travelers and Revision Control', minutes: 10,
    summary: 'Build exactly what the released documentation says and record what you did.',
    body: `
<ul><li><strong>Assembly drawing</strong> — where parts go, orientation, notes (e.g. torque, staking, marking), and which standard/class applies.</li>
<li><strong>Bill of materials (BOM)</strong> — item number, quantity, reference designators, manufacturer part number and description.</li>
<li><strong>Work instruction</strong> — the step-by-step process.</li>
<li><strong>Traveler</strong> (router) — moves with the hardware; each step is stamped or signed when complete, building the record of what was done, by whom and when.</li></ul>
<h3>Revision control</h3>
<p>Drawings carry revision letters. Build only to the <strong>current released revision</strong> referenced by your work order; marked-up or obsolete copies are a common source of errors. Engineering changes arrive through a controlled change process — not verbal instructions.</p>
<h3>Nonconformance</h3>
<p>If something doesn’t match the documentation — wrong part, damaged board, a step you can’t perform as written — <strong>stop</strong>, don’t improvise a fix, and report it through the nonconformance process (often an NCR / discrepancy report). Record what you observed factually, with reference designators and quantities. Dispositions (use-as-is, rework, repair, scrap) are made by the authorized people, not by the technician on the spot.</p>`,
    keyPoints: ['Build to the current released revision only.', 'BOM ties ref des to exact part numbers.', 'Travelers record each completed step.', 'Stop and report nonconformances; don’t improvise fixes.'],
    questions: [
      ['You notice the BOM calls for a 10 kΩ resistor at R7 but the kit contains 1 kΩ. What do you do?', ['Use the 1 kΩ — close enough', 'Stop and report the discrepancy through the nonconformance process', 'Use two 1 kΩ in series', 'Change the BOM yourself'], 1, 'Don’t improvise; document and report so an authorized disposition is made.'],
      ['What is the purpose of a traveler?', ['To ship the board', 'To record each process step as it is completed, with sign-off, building the hardware’s history', 'To list part prices', 'To replace the schematic'], 1, 'The traveler documents what was done, by whom and when.'],
      ['Which drawing revision should you build to?', ['The newest marked-up copy on the bench', 'The current released revision referenced by the work order', 'Any revision you have', 'The original revision A'], 1, 'Only controlled, released documentation should be used.']
    ]
  },
  /* ---------------- Module 15 ---------------- */
  {
    id: 'm15-solder-science', title: 'Solder, Flux, Wetting and Intermetallics', minutes: 12,
    summary: 'What makes a solder joint: alloys, flux chemistry, wetting and the intermetallic bond.',
    body: `
<p>A solder joint is a metallurgical bond: molten solder <strong>wets</strong> the clean metal surfaces and a thin <strong>intermetallic compound</strong> layer (e.g. copper–tin) forms at the interface. Glue doesn’t do that — which is why surfaces must be clean and hot enough.</p>
<h3>Alloys</h3>
<ul><li><strong>Tin-lead (Sn63/Pb37)</strong> — eutectic: melts at a single temperature, 183 °C. Still used in many aerospace and high-reliability programs.</li>
<li><strong>Lead-free (e.g. SAC305: Sn96.5/Ag3.0/Cu0.5)</strong> — melts around 217–220 °C, needs more heat, wets more slowly and typically looks duller.</li>
<li>Don’t mix alloys on one assembly unless the process allows it.</li></ul>
<h3>Flux</h3>
<p>Flux removes oxides from the metals and the solder, and protects the surfaces while hot so solder can wet. Types include rosin, no-clean and water-soluble. Water-soluble (organic acid) fluxes are active and <em>must</em> be cleaned off; follow your process for whether and how to clean other types. Use only the fluxes your process specifies.</p>
<h3>Wetting</h3>
<p>Good wetting looks like solder flowing smoothly onto both surfaces with a low contact angle, forming a concave fillet that feathers out onto the pad and lead. Poor wetting — solder balling up with a high contact angle, or pulling back from the surface (dewetting) — means contamination, oxidation, insufficient heat, or an unsolderable finish.</p>
<h3>Intermetallics and heat</h3>
<p>Some intermetallic growth is necessary; too much heat or time makes the layer thick and brittle, and can lift pads or damage parts. Aim for enough heat to wet quickly — then get off the joint.</p>
${STD_NOTE}`,
    keyPoints: ['A joint is a metallurgical bond via wetting and intermetallic formation.', 'Sn63/Pb37 melts at 183 °C; SAC305 ≈ 217–220 °C.', 'Flux removes oxides; water-soluble flux must be cleaned.', 'Good wetting = low contact angle, smooth concave fillet.'],
    questions: [
      ['Why is Sn63/Pb37 called eutectic?', ['It contains no lead', 'It melts and freezes at a single temperature (183 °C)', 'It needs no flux', 'It is used only for SMT'], 1, 'A eutectic alloy goes straight from solid to liquid at one temperature, with no pasty range.'],
      ['What is the main job of flux?', ['Add strength to the joint', 'Remove oxides and protect surfaces so solder can wet', 'Lower the iron temperature', 'Insulate the joint'], 1, 'Flux chemically cleans oxides and prevents re-oxidation during soldering.'],
      ['Solder sits on the pad in a ball with a high contact angle and does not flow out. This indicates…', ['Good wetting', 'Poor wetting / non-wetting', 'Too much flux cleaning', 'Normal lead-free appearance'], 1, 'A high contact angle means the solder is not wetting the surface.']
    ]
  },
  {
    id: 'm15-tht', title: 'Iron Technique and Through-Hole Joints', minutes: 14,
    summary: 'Tips and temperature, fume extraction, lead forming, heating the joint, and hole fill.',
    body: `
<h3>Tools and setup</h3>
<ul><li>Choose a tip that contacts both the pad and the lead with good thermal contact — usually the largest tip that fits without touching neighbors.</li>
<li>Set temperature per your process; tin-lead work is commonly done with tip temperatures somewhere around 315–370 °C (600–700 °F), lead-free a bit hotter. More heat is not better; a well-matched tip transfers heat faster than a hotter small tip.</li>
<li>Keep the tip tinned and clean (damp sponge or brass wool). An oxidized tip won’t transfer heat.</li>
<li>Use <strong>fume extraction</strong> — flux fumes are respiratory irritants. Wash hands after handling solder, and never eat at the bench.</li>
<li>Wear eye protection when clipping leads.</li></ul>
<h3>Making a through-hole joint</h3>
<ol><li>Form the lead per the drawing: bends away from the component body (no bending at the body seal) and with stress relief where required; the part sits as specified (flush or raised).</li>
<li>Heat the pad and lead together, then feed solder into the joint (not onto the iron tip).</li>
<li>Let solder flow through the hole and form fillets; remove solder, then the iron.</li>
<li>Don’t move the part while the solder solidifies — that makes a disturbed joint.</li>
<li>Clean flux residue if your process requires it, then inspect.</li></ol>
<p>The governing workmanship standard for the program (for aerospace: IPC J-STD-001, with the Space Addendum for flight hardware — this supersedes NASA-STD-8739.3) defines requirements such as minimum hole fill and fillet extent by class. Inspection to those criteria, with a defect log, is part of this module’s assessment.</p>
${STD_NOTE}`,
    keyPoints: ['Pick the tip for heat transfer; keep it tinned.', 'Heat pad and lead together; feed solder into the joint.', 'Don’t disturb a cooling joint.', 'Use fume extraction and eye protection.'],
    questions: [
      ['Where should you feed the solder when making a through-hole joint?', ['Onto the iron tip only', 'Into the joint, where the heated pad and lead meet', 'On top of the component body', 'Before heating anything'], 1, 'Solder should melt on the heated work, so it wets both surfaces. Solder melted on the tip alone can give a cold joint.'],
      ['The joint moved while it was solidifying. What defect is likely?', ['Bridging', 'A disturbed joint', 'Tombstoning', 'Measling'], 1, 'Movement during solidification produces a disturbed (often rough, fractured-looking) joint.'],
      ['Why is fume extraction required when hand soldering?', ['To cool the joint', 'Flux fumes are respiratory irritants', 'To reduce ESD', 'To speed up wetting'], 1, 'Rosin and other flux fumes can irritate and sensitize the respiratory system.']
    ]
  },
  {
    id: 'm15-wires-rework', title: 'Wires, Terminals and Desoldering', minutes: 12,
    summary: 'Stripping and tinning, turret/cup/hook terminals, and removing parts without damage.',
    body: `
<h3>Preparing wire</h3>
<ul><li>Strip with the correct tool and setting — no nicked, cut or stretched strands, and no damaged insulation.</li>
<li>Tin stranded wire before soldering to terminals (when the process calls for it), letting solder penetrate the strands; control wicking under the insulation.</li>
<li>Leave a small, specified insulation gap between the insulation and the solder joint — not so large that bare conductor is exposed beyond what is allowed, and not so small that insulation is melted into the joint.</li></ul>
<h3>Terminals</h3>
<ul><li><strong>Turret</strong> — wire wrapped around the post and soldered.</li>
<li><strong>Bifurcated</strong> — wire routed through the slot.</li>
<li><strong>Hook</strong> — wire wrapped through the hook.</li>
<li><strong>Solder cup</strong> — wire inserted to the bottom of the cup, solder filling the cup.</li></ul>
<p>The wrap amount, direction, and fill requirements come from the governing standard and drawing.</p>
<h3>Desoldering and rework</h3>
<ul><li><strong>Solder wick (braid)</strong> — add flux, press braid onto the joint with the iron, lift both together. Don’t drag braid across pads.</li>
<li><strong>Vacuum desoldering tool / station</strong> — heat the joint, then remove molten solder by suction.</li>
<li>Pads and traces are glued to the board; excessive heat, repeated heating or prying can <strong>lift pads</strong>. Let the tool do the work, and never force a lead out.</li>
<li>Rework and repair on controlled hardware are authorized and documented activities.</li></ul>
${STD_NOTE}`,
    keyPoints: ['Strip without nicked or cut strands.', 'Terminal types: turret, bifurcated, hook, cup.', 'Use flux with wick; lift braid and iron together.', 'Excess heat or force lifts pads.'],
    questions: [
      ['After stripping, you notice two strands are nicked. What should you do?', ['Solder over them', 'Cut back and re-strip (or replace the wire) per the process', 'Twist them tighter', 'Ignore it if it’s stranded wire'], 1, 'Nicked strands are damage that reduces strength and current capacity; re-prepare the wire.'],
      ['What is the most common cause of lifted pads during desoldering?', ['Too little flux', 'Excessive heat, repeated heating or prying on leads', 'Using braid', 'Low iron temperature only'], 1, 'The adhesive under the copper weakens with heat; force then lifts the pad.'],
      ['How should solder wick be removed from a joint?', ['Drag it across the pads', 'Lift the braid and iron together once the solder has wicked', 'Let it cool on the pad first', 'Pull the braid out from under the iron'], 1, 'Removing it while still molten and together with the iron avoids tearing pads or leaving the braid soldered down.']
    ]
  },
  /* ---------------- Module 16 ---------------- */
  {
    id: 'm16-smt', title: 'Surface-Mount Parts and Hand Soldering Technique', minutes: 12,
    summary: 'Chip, gull-wing and J-lead parts; tack-and-reflow; drag soldering fine pitch.',
    body: `
<h3>Package families</h3>
<ul><li><strong>Chip components</strong> (resistors, capacitors) named by size code — an 0805 is about 0.08 × 0.05 inch (2.0 × 1.25 mm).</li>
<li><strong>Gull-wing</strong> leads bend out and down (SOIC, SOT-23, QFP).</li>
<li><strong>J-lead</strong> leads curl under the body (PLCC, SOJ).</li>
<li>Fine-pitch parts have lead spacing of roughly 0.65 mm or less; bottom-terminated parts (QFN, BGA) need hot air or reflow.</li></ul>
<h3>Hand technique</h3>
<ol><li>Flux the pads. Tin <em>one</em> pad lightly.</li>
<li>Place the part with tweezers, reheat the tinned pad to tack it, check alignment, then solder the other terminal(s).</li>
<li>Return to the first joint and reflow it with a touch of fresh solder.</li>
<li>For fine-pitch ICs: tack two opposite corners, check every lead is on its pad, then <strong>drag solder</strong> with plenty of flux. Remove bridges with flux and wick.</li>
<li>Check polarity/pin 1 before soldering the second corner — it is much harder after.</li></ol>
<p>Build up from easy to hard: 0805 → SOIC → fine pitch (the module’s practice board sequence).</p>`,
    keyPoints: ['0805 ≈ 2.0 × 1.25 mm.', 'Gull-wing leads splay out; J-leads tuck under.', 'Tack one pad, align, solder the rest, reflow the first.', 'Fine pitch: tack corners, drag solder with flux, wick bridges.'],
    questions: [
      ['What does “0805” describe on a chip resistor?', ['0.805 Ω', 'Its approximate size: 0.08 × 0.05 inch', 'Its tolerance', 'Its power rating'], 1, 'Imperial chip size codes give length × width in hundredths of an inch.'],
      ['Why tack just one pad before soldering the rest of a chip part?', ['To save solder', 'So the part can be aligned before the other terminal is soldered', 'To prevent ESD', 'Because the second pad doesn’t need solder'], 1, 'Tacking one side holds the part while you check and correct alignment.'],
      ['Which package has leads that curl under the body?', ['SOIC (gull-wing)', 'PLCC / SOJ (J-lead)', 'Axial resistor', 'QFP'], 1, 'J-leads fold back under the package.']
    ]
  },
  {
    id: 'm16-rework', title: 'Hot-Air Rework, Magnification and MSD Handling', minutes: 12,
    summary: 'Remove and replace ICs with hot air, inspect with proper lighting, and protect moisture-sensitive parts.',
    body: `
<h3>Hot-air rework</h3>
<ul><li>Select a nozzle that matches the part; set temperature and airflow per your process. Preheat the board (bottom heater) for large or multilayer boards to reduce thermal shock and the heat needed from above.</li>
<li>Shield neighboring parts (e.g. heat-resistant tape) and keep airflow low enough not to blow small parts away.</li>
<li>Apply flux, heat evenly in a circular motion, and lift the part only when <em>all</em> joints are molten — lifting early tears pads.</li>
<li>Clean the site with flux and wick, then place and solder the replacement.</li></ul>
<h3>Magnification and lighting</h3>
<p>Inspect with the magnification and lighting your inspection standard and process specify; use higher magnification only to confirm a suspected defect. Shadow-free, angled lighting reveals fillet shape, bridges and cracks. Tilt the board to look under leads.</p>
<h3>Moisture-sensitive devices</h3>
<p>Before hot air or reflow, confirm MSDs are within their floor life (see Module 2). Absorbed moisture can crack or delaminate a package when heated. If the label’s exposure time is exceeded, follow your site’s dry-bake procedure.</p>
<h3>Common SMT defects</h3>
<ul><li><strong>Bridging</strong> — solder joining adjacent leads.</li>
<li><strong>Tombstoning</strong> — a chip part standing up on one end (uneven heating or pad imbalance).</li>
<li><strong>Insufficient solder / open</strong> — a lead not soldered to its pad (common with coplanarity problems).</li>
<li><strong>Solder balls</strong> — loose spheres that can move and short.</li>
<li><strong>Misalignment</strong>, <strong>lifted leads</strong>, <strong>wrong polarity</strong>, and <strong>component damage</strong> (cracked chip capacitors from heat or handling).</li></ul>`,
    keyPoints: ['Lift a hot-air part only when all joints are molten.', 'Preheat and shield neighbors.', 'Use specified magnification; higher only to confirm.', 'Know bridging, tombstoning, opens, solder balls, misalignment.'],
    questions: [
      ['A chip resistor is standing upright on one pad after reflow. This defect is called…', ['Bridging', 'Tombstoning', 'Dewetting', 'Head-in-pillow'], 1, 'Tombstoning occurs when one end wets/melts first and surface tension pulls the part up.'],
      ['When removing an SOIC with hot air, when should you lift it?', ['As soon as one side melts', 'Only when all of its joints are molten', 'Before applying heat', 'After the board has cooled'], 1, 'Lifting while some joints are solid tears pads and traces.'],
      ['Why preheat a large multilayer board before hot-air rework?', ['To dry the flux', 'To reduce thermal shock and the heat needed from the nozzle', 'To demagnetize it', 'It is never needed'], 1, 'Large copper planes sink heat; preheating makes rework faster and gentler.']
    ]
  },
  /* ---------------- Module 17 ---------------- */
  {
    id: 'm17-standards', title: 'Product Classes, Standards and Traceability', minutes: 12,
    summary: 'IPC classes 1/2/3, target/acceptable/defect, standards roles and inspection records.',
    body: `
<h3>Product classes</h3>
<table class="tbl"><tr><th>Class</th><th>General meaning</th></tr>
<tr><td>Class 1</td><td>General electronic products — function is the main requirement</td></tr>
<tr><td>Class 2</td><td>Dedicated-service products — extended life and reliable service desired</td></tr>
<tr><td>Class 3</td><td>High-performance / harsh-environment products — continued performance is critical (the program targets Class 3)</td></tr></table>
<p>The class is set by the customer/contract and drawing — not chosen at the bench.</p>
<h3>Target, acceptable, defect</h3>
<ul><li><strong>Target</strong> — the near-ideal condition.</li>
<li><strong>Acceptable</strong> — not perfect, but meets the requirements for the class.</li>
<li><strong>Defect</strong> — fails the requirements for the class and must be dispositioned (rework, repair, use-as-is or scrap) by authorized people.</li></ul>
<p>The same condition can be acceptable for one class and a defect for another.</p>
<h3>Roles of the main documents (scope only)</h3>
<ul><li><strong>IPC J-STD-001</strong> (with Space Addendum for space hardware) — soldering <em>process and materials</em> requirements; for NASA work it replaces NASA-STD-8739.3.</li>
<li><strong>IPC-A-610</strong> — visual <em>acceptability</em> of assemblies (Class 1/2/3), the basis for inspection.</li>
<li><strong>IPC/WHMA-A-620</strong> — cable and wire harness requirements and acceptance.</li>
<li><strong>NASA-STD-8739.6</strong> — implementation requirements for NASA workmanship standards, including training/certification and vision requirements.</li></ul>
<p>When documents conflict there is an <strong>order of precedence</strong>: contract and approved drawings generally take priority over a general workmanship standard. Your program defines the exact order and the revision of each standard in use.</p>
<h3>Inspection records</h3>
<p>Record each finding with the assembly serial number, reference designator / location, defect description, class, inspector and date. A complete <strong>defect log</strong> supports traceability and shows trends (the program tracks workmanship defect rate over time).</p>`,
    keyPoints: ['Class 1 general, Class 2 dedicated service, Class 3 high performance/harsh environment.', 'Target / acceptable / defect — judged per class.', 'J-STD-001 = process; IPC-A-610 = acceptability; A-620 = harnesses; NASA-STD-8739.6 = implementation.', 'Log serial, location, defect, class, inspector, date.'],
    questions: [
      ['Which IPC product class applies to high-performance hardware where continued operation is critical?', ['Class 1', 'Class 2', 'Class 3', 'Class 0'], 2, 'Class 3 covers high-performance/harsh-environment products; this program targets Class 3.'],
      ['A condition that meets the class requirements but is not ideal is…', ['Target', 'Acceptable', 'Defect', 'Nonconforming'], 1, 'Acceptable conditions meet requirements even though they aren’t the ideal (target) condition.'],
      ['Which document is primarily used for visual acceptability inspection of assemblies?', ['IPC J-STD-001', 'IPC-A-610', 'NFPA 70E', 'ANSI/ESD S20.20'], 1, 'IPC-A-610 is the acceptability standard; J-STD-001 covers soldering process and materials requirements.']
    ]
  },
  {
    id: 'm17-defects', title: 'Recognizing Common Solder Defects', minutes: 10,
    summary: 'Visual cues for the common defects you will log — then practice in the seeded-defect exercise.',
    body: `
<p>The curriculum’s common defects are cold joints, bridging, insufficient wetting and damage. Practice recognizing these and a few related conditions:</p>
<table class="tbl"><tr><th>Condition</th><th>What it looks like</th></tr>
<tr><td>Good joint (reference)</td><td>Smooth concave fillet, solder wetted to both lead and pad, lead outline visible</td></tr>
<tr><td>Cold / disturbed joint</td><td>Rough, grainy, lumpy or cracked surface; poor flow onto the pad (note: lead-free joints are normally duller, so judge shape and wetting, not just shine)</td></tr>
<tr><td>Bridging</td><td>Solder connecting conductors that should be separate</td></tr>
<tr><td>Insufficient wetting / non-wetting</td><td>Solder balled up with a high contact angle; bare pad or lead visible where solder should have flowed</td></tr>
<tr><td>Insufficient solder</td><td>Wetted but too little solder to form the required fillet or fill</td></tr>
<tr><td>Excess solder</td><td>Convex ball of solder hiding the lead outline</td></tr>
<tr><td>Solder ball / splash</td><td>Loose spheres or spatter away from the joint</td></tr>
<tr><td>Tombstone</td><td>Chip part standing on one end</td></tr>
<tr><td>Lifted pad</td><td>Pad separated from the laminate</td></tr>
<tr><td>Component damage</td><td>Cracked or chipped body, damaged leads</td></tr></table>
<p>Whether a given condition is acceptable or a defect for your class is decided against the governing standard — this lesson only builds recognition.</p>
<p><strong>Practice:</strong> open the <em>Find the seeded defect</em> exercise on this module’s page. It mimics the module assessment (find at least 90% of seeded defects): inspect each location, then label it with the defect type or mark it as no defect.</p>`,
    keyPoints: ['Judge shape and wetting, not just shine.', 'Bridging = unintended solder connection.', 'Non-wetting = high contact angle, bare metal.', 'Excess solder hides the lead outline.'],
    questions: [
      ['A joint has a convex blob of solder so large the lead outline can’t be seen. This is…', ['Insufficient solder', 'Excess solder', 'Bridging', 'A good joint'], 1, 'Excess solder obscures the lead and prevents inspection of wetting.'],
      ['Lead-free joints look dull compared with tin-lead joints. What should you judge them on?', ['Shine only', 'Fillet shape and wetting', 'Color of the flux', 'Temperature of the board'], 1, 'Lead-free alloys are normally less shiny; wetting and shape are the meaningful indicators.'],
      ['Solder connects two adjacent IC leads that should be separate. This is…', ['Tombstoning', 'Bridging', 'Dewetting', 'Lifted pad'], 1, 'An unintended solder connection between conductors is a bridge.']
    ]
  },
  /* ---------------- Module 18 ---------------- */
  {
    id: 'm18-wire', title: 'Wire Types, Gauge and Stripping', minutes: 10,
    summary: 'AWG, stranding, insulation types and damage-free stripping.',
    body: `
<h3>AWG</h3>
<p>American Wire Gauge: a <strong>smaller number is a larger wire</strong>. Every 3 gauge steps roughly halves (or doubles) the cross-sectional area; every 6 steps roughly halves the diameter. Choose gauge by current, voltage drop, mechanical strength and the drawing.</p>
<h3>Construction</h3>
<ul><li><strong>Solid</strong> wire — cheap, holds shape, but fatigues with flexing; not used where vibration is expected.</li>
<li><strong>Stranded</strong> wire — flexible and fatigue-resistant; strand count and plating (tin, silver, nickel) vary.</li>
<li><strong>Insulation</strong> — PVC, PTFE, ETFE, polyimide composites, silicone, etc., chosen for temperature, abrasion, chemicals and outgassing. The drawing specifies the wire part number.</li>
<li><strong>Shielded cable</strong> — braid or foil around conductors, often with a drain wire; <strong>coax</strong> has a center conductor, dielectric, shield and jacket with a controlled impedance (e.g. 50 Ω).</li></ul>
<h3>Stripping</h3>
<ul><li>Use a precision stripper with the correct die for the gauge, or a thermal stripper where specified.</li>
<li>No nicked, scraped or severed strands; no crushed or burned insulation beyond what the standard permits.</li>
<li>Keep strands in their natural lay — don’t untwist and re-twist excessively.</li>
<li>Strip length is set by the contact or terminal (crimp barrels have a defined length).</li></ul>`,
    keyPoints: ['Smaller AWG number = thicker wire; 3 steps ≈ 2× area.', 'Stranded wire for vibration/flex.', 'Use the correct strip die; no nicked or severed strands.', 'Strip length is set by the contact.'],
    questions: [
      ['Which is the larger conductor?', ['30 AWG', '22 AWG', '26 AWG', '28 AWG'], 1, 'Lower AWG numbers are thicker conductors.'],
      ['Going from 20 AWG to 17 AWG changes the cross-sectional area by roughly…', ['Half', 'Double', 'Four times', 'No change'], 1, 'Three gauge steps ≈ factor of 2 in area; going to a smaller number means larger area.'],
      ['Why is stranded wire preferred over solid wire in harnesses subject to vibration?', ['It is cheaper', 'It resists fatigue from flexing', 'It has lower resistance per strand', 'It needs no insulation'], 1, 'Solid conductors work-harden and crack under repeated flexing.']
    ]
  },
  {
    id: 'm18-crimp', title: 'Crimping, Contacts and Connectors', minutes: 12,
    summary: 'Calibrated tools, die selection, crimp inspection, pull-test concept, insertion/extraction.',
    body: `
<h3>What a good crimp is</h3>
<p>A crimp cold-forms the contact barrel around the strands to make a gas-tight, mechanically strong connection. It depends on the <strong>right combination</strong> of contact, wire gauge, tool, die/positioner and settings — specified by the contact manufacturer and your drawing.</p>
<h3>Tools</h3>
<ul><li>Use <strong>calibrated, controlled</strong> crimp tools with a full-cycle ratchet (the tool won’t release until the crimp is complete). Check the calibration label before use.</li>
<li>Select the die and positioner (or turret setting) for that contact and gauge.</li>
<li>Do not solder crimped contacts unless the process explicitly calls for it — solder wicking stiffens the wire at the crimp.</li></ul>
<h3>Inspection and testing (concepts)</h3>
<ul><li>All strands inside the barrel, wire visible where the contact design provides an inspection hole, insulation positioned as the contact design requires, no cracked or deformed barrels.</li>
<li><strong>Pull test</strong>: sample crimps are pulled to a specified minimum force to verify the tool/die/wire combination — a process check, usually destructive and done on test samples.</li></ul>
<h3>Connectors</h3>
<ul><li>Insert contacts into the correct cavity per the pinout (check whether the drawing shows the mating face or wire-entry side).</li>
<li>Push until the contact locks, then do a gentle <strong>tug test</strong> to confirm retention.</li>
<li>Use the specified <strong>extraction tool</strong> to remove a contact — prying damages retention clips.</li>
<li>Backshells provide strain relief, shield termination and environmental protection.</li></ul>`,
    keyPoints: ['Correct contact + wire + calibrated tool + die/positioner.', 'Full-cycle ratchet; check calibration.', 'Pull test verifies the process on samples.', 'Seat contacts until they lock; tug test; use extraction tools.'],
    questions: [
      ['What does a full-cycle ratchet on a crimp tool ensure?', ['Faster crimps', 'The tool cannot be opened until the crimp cycle is complete', 'Automatic calibration', 'It strips the wire too'], 1, 'It prevents partial (under-crimped) terminations.'],
      ['What is the purpose of a crimp pull test?', ['To test every production crimp non-destructively', 'To verify the tool/die/contact/wire combination produces crimps that meet a specified minimum strength', 'To measure insulation resistance', 'To remove contacts'], 1, 'Pull tests are a process verification, typically on samples.'],
      ['How should you remove a contact from a connector housing?', ['Pull hard on the wire', 'Pry it with a screwdriver', 'Use the specified extraction tool', 'Cut the housing'], 2, 'Extraction tools release the retention clip without damage.']
    ]
  },
  {
    id: 'm18-harness', title: 'Building and Testing a Harness', minutes: 12,
    summary: 'Splices, heat-shrink, shielding, marking, securing, and continuity/insulation-resistance tests.',
    body: `
<h3>Building from a drawing</h3>
<ul><li>Lay out the harness on a formboard to the drawing: branch points, lengths, connector orientation.</li>
<li><strong>Splices</strong> — use the specified splice type (crimped splice, solder sleeve) with insulation over it.</li>
<li><strong>Heat-shrink</strong> — select diameter for the shrink ratio; adhesive-lined types seal. Shrink evenly without scorching.</li>
<li><strong>Shields</strong> — terminate as specified (e.g. drain wire or 360° backshell termination); keep unshielded lengths short.</li>
<li><strong>Marking</strong> — wire and harness IDs per drawing (sleeves, labels).</li>
<li><strong>Securing</strong> — cable ties or lacing at specified spacing, without crushing insulation; respect minimum bend radius.</li></ul>
<h3>Testing</h3>
<ul><li><strong>Continuity / pin-to-pin</strong>: every wire connects the right pins, and no wire connects pins that shouldn’t be connected (check for shorts between adjacent pins and to shields/shell).</li>
<li><strong>Insulation resistance</strong>: a megohmmeter applies a specified DC test voltage between conductors (and to shield/shell) and reads very high resistance (megohms or more) on good insulation.</li>
<li><strong>Hipot (dielectric withstand) awareness</strong>: applies higher voltage to stress the insulation. Both tests use hazardous voltages — only trained, authorized operators run them, with the harness isolated and no one touching it; discharge after testing.</li></ul>
<p>Harness inspection to the program’s IPC/WHMA-A-620 criteria is part of this module’s assessment.</p>`,
    keyPoints: ['Build on a formboard to the drawing.', 'Mark, secure and respect bend radius.', 'Continuity: right pins connected, no unintended connections.', 'Insulation resistance and hipot use hazardous voltages — authorized operators only.'],
    questions: [
      ['A pin-to-pin test should verify…', ['Only that each wire is continuous', 'Correct connections and the absence of unintended connections (shorts)', 'Only insulation color', 'Only connector torque'], 1, 'Both opens/miswires and shorts must be checked.'],
      ['What does an insulation-resistance test measure?', ['Conductor resistance in milliohms', 'Resistance between conductors (or to shield) at a specified DC test voltage — should be very high', 'Crimp pull force', 'Signal rise time'], 1, 'A megohmmeter checks insulation integrity between isolated conductors.'],
      ['Why are insulation-resistance and hipot testing restricted to authorized operators?', ['They are slow', 'They apply hazardous test voltages', 'They require soldering', 'They damage connectors'], 1, 'These tests use elevated voltages that can cause shock.']
    ]
  },
  /* ---------------- Module 19 ---------------- */
  {
    id: 'm19-method', title: 'A Structured Troubleshooting Method', minutes: 14, sim: 'divider',
    summary: 'Symptom → half-split → verify → repair → retest, with signal tracing and input/output checks.',
    body: `
<ol><li><strong>Symptom</strong> — confirm and describe the failure precisely. What works, what doesn’t, under what conditions? Check the obvious: power, fuses, cables, settings.</li>
<li><strong>Analyze</strong> — use the block diagram and schematic to list the sections that could cause the symptom.</li>
<li><strong>Half-split</strong> — measure at the midpoint of the suspect signal path. If the signal is good there, the fault is downstream; if bad, upstream. Repeat.</li>
<li><strong>Verify</strong> — isolate to a component with measurements (compare with expected values), not guesses.</li>
<li><strong>Repair</strong> — replace or rework per the authorized process.</li>
<li><strong>Retest</strong> — confirm the original symptom is gone and nothing else broke; then <strong>document</strong>.</li></ol>
<div class="example"><strong>Why half-splitting is fast:</strong> a path of 8 stages can be narrowed to one stage in 3 measurements (8 → 4 → 2 → 1), versus up to 7 checking stage by stage.</div>
<h3>Other strategies</h3>
<ul><li><strong>Signal tracing</strong> — follow a known input signal stage by stage with the scope.</li>
<li><strong>Input/output checks</strong> — for each block, is the input correct? Is the output correct for that input? A good input with a bad output isolates the block (or its load).</li>
<li><strong>Power first</strong> — check every supply rail at the load, including ripple, before chasing signals.</li></ul>
<p>Use meter and scope together: the meter for DC levels and resistance (power off), the scope for waveforms, timing and noise.</p>`,
    keyPoints: ['Symptom → analyze → half-split → verify → repair → retest → document.', 'Half-splitting needs log₂(N) measurements.', 'Check power rails first.', 'Good input + bad output isolates the block (or its load).'],
    questions: [
      ['A signal path has 16 stages. How many half-split measurements are needed in the best case to isolate one stage?', ['2', '4', '8', '15'], 1, '16 → 8 → 4 → 2 → 1: four measurements (log₂16).'],
      ['An amplifier stage has the correct input signal but no output. What is the next logical step?', ['Replace the input stage', 'Check the stage’s power, components and whether its load is shorting the output', 'Replace the whole board', 'Check the previous stage'], 1, 'Good input/bad output localizes the fault to that stage or its load.'],
      ['After a repair, what must you do before documenting it as fixed?', ['Nothing', 'Retest to confirm the original symptom is gone and no new faults were introduced', 'Order spare parts', 'Repaint the board'], 1, 'Retesting verifies the repair actually fixed the fault.']
    ]
  },
  {
    id: 'm19-failures', title: 'Common Failure Modes and Documenting Findings', minutes: 12,
    summary: 'Opens, shorts, drifted parts, cold joints and connectors — and writing a useful troubleshooting report.',
    body: `
<h3>Common failure modes</h3>
<table class="tbl"><tr><th>Failure</th><th>Typical evidence</th></tr>
<tr><td>Open (broken trace, open resistor, cracked joint)</td><td>Full voltage across the break, no current, signal missing downstream</td></tr>
<tr><td>Short (bridge, failed capacitor, shorted semiconductor)</td><td>0 V across the part, excessive current, hot components, supply in current limit</td></tr>
<tr><td>Drifted part (resistor value change, leaky or low-value capacitor)</td><td>Voltages off from expected but not 0 or full; increased ripple; timing errors</td></tr>
<tr><td>Cold or cracked joint</td><td>Intermittent fault that changes when tapped, flexed, heated or cooled</td></tr>
<tr><td>Connectors and cables</td><td>Intermittents, high contact resistance, bent or recessed pins, miswired pinouts</td></tr></table>
<h3>Using expected values</h3>
<p>Before measuring, know what you <em>should</em> see — from the schematic, test procedure, a known-good unit, or your own calculation. A measurement is only meaningful compared with an expectation.</p>
<h3>Troubleshooting report</h3>
<ul><li>Unit identification (part/serial number) and reported symptom.</li>
<li>Steps taken and key measurements (with test points, values and units).</li>
<li>Root cause, with reference designator.</li>
<li>Corrective action and retest result.</li>
<li>Time spent (the program tracks faults isolated and average time).</li></ul>`,
    keyPoints: ['Opens: full voltage across, no current. Shorts: 0 V across, high current.', 'Drifted parts give “wrong but not extreme” readings.', 'Intermittents → joints and connectors.', 'Report: symptom, steps, measurements, root cause, fix, retest.'],
    questions: [
      ['A fault comes and goes when you flex the board slightly. The most likely cause is…', ['A drifted resistor', 'A cracked/cold solder joint or a connector problem', 'An incorrect firmware version', 'A blown fuse'], 1, 'Mechanically sensitive intermittents point to joints and connections.'],
      ['A resistor in a series circuit has the full supply voltage across it and no current flows. The resistor is likely…', ['Shorted', 'Open', 'Drifted low', 'Fine'], 1, 'An open drops the whole source voltage and stops current.'],
      ['Which belongs in a troubleshooting report?', ['Only “fixed”', 'Symptom, measurements with test points and units, root cause, corrective action and retest result', 'The technician’s opinion of the design', 'Nothing if the fix worked'], 1, 'A complete report lets others verify and learn from the repair.']
    ]
  },
  /* ---------------- Module 20 ---------------- */
  {
    id: 'm20-capstone', title: 'Capstone Overview: Build, Inspect, Test and Present', minutes: 10,
    summary: 'How the capstone integrates every module and how it is scored.',
    body: `
<p>The capstone is a kit build — for example a regulated supply, a digital counter and an interface harness — built to drawings and the workmanship standard. It integrates everything:</p>
<ul><li><strong>Safety and ESD</strong> (Modules 1–2) throughout.</li>
<li><strong>Documentation</strong> (Module 14): build to the released drawings, BOM and work instruction; keep the traveler.</li>
<li><strong>Workmanship</strong> (Modules 15–18): through-hole, SMT and harness work.</li>
<li><strong>Inspection</strong> (Module 17): self-inspect and log defects before final inspection.</li>
<li><strong>Functional test</strong> (Modules 4, 8, 11, 13): verify supply output, ripple and counter operation against the test procedure.</li>
<li><strong>Troubleshooting</strong> (Module 19): find and fix anything that fails, and document it.</li></ul>
<h3>Rubric areas</h3>
<p>Workmanship, functional test, documentation, and a troubleshooting debrief where you present what you found and how.</p>
<h3>Tips</h3>
<ul><li>Read all the documentation before picking up the iron.</li>
<li>Inspect each stage before moving on — rework is easier early.</li>
<li>Power up with a current-limited supply and measure rails before connecting the rest.</li>
<li>Write measurements down as you go; they become your report.</li></ul>`,
    keyPoints: ['Build to released documentation and keep the traveler.', 'Inspect stage by stage; log defects.', 'First power-up with a current limit; check rails.', 'Rubric: workmanship, functional test, documentation, troubleshooting debrief.'],
    questions: [
      ['What is the safest way to power up a newly built capstone assembly for the first time?', ['Plug straight into the final supply at full current', 'Use a current-limited bench supply and check the rails before connecting the rest', 'Skip inspection to save time', 'Power it while still soldering'], 1, 'A current limit prevents damage if there is a build error; checking rails confirms the supply section first.'],
      ['When should you inspect your capstone work?', ['Only at the end', 'At each stage, before moving on, and log defects', 'Never — the instructor will', 'Only if it fails test'], 1, 'Stage-by-stage inspection catches defects when they are easiest to fix.'],
      ['Which of these is one of the capstone rubric areas?', ['Speed of soldering only', 'Troubleshooting debrief', 'Number of parts used', 'Board color'], 1, 'The rubric covers workmanship, functional test, documentation and a troubleshooting debrief.']
    ]
  }
  );
})(typeof window !== 'undefined' ? window : globalThis);
