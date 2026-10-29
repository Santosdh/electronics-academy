/* Level 4 — Digital & Microcontrollers */
(function (g) {
  (g.EA_LEVELS = g.EA_LEVELS || []).push({
    id: 'l4', number: 4, title: 'Digital & Microcontrollers', icon: '💻', color: '#f59e0b',
    subtitle: 'Binary, logic gates, sequential logic, Arduino basics, sensors & I/O',
    lessons: [
      {
        id: 'l4-binary', title: 'Binary and Number Systems', minutes: 8,
        summary: 'How digital systems represent numbers with 1s and 0s.',
        body: `
<p>Digital circuits use two states: <strong>0</strong> (low) and <strong>1</strong> (high). One binary digit is a <strong>bit</strong>; 8 bits make a <strong>byte</strong>. With <em>n</em> bits you can represent <strong>2ⁿ</strong> different values — 0 to 2ⁿ − 1 for unsigned numbers.</p>
<h3>Binary to decimal</h3>
<p>Each position is a power of two. For 1011₂:</p>
<div class="formula">1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 8 + 0 + 2 + 1 = 11</div>
<h3>Decimal to binary</h3>
<p>Repeatedly divide by 2 and record the remainders (read bottom-up), or subtract the largest powers of two. 25 = 16 + 8 + 1 = <strong>11001₂</strong>.</p>
<h3>Hexadecimal</h3>
<p>Hex (base 16) uses 0–9 and A–F. Each hex digit is exactly 4 bits, so it’s a compact way to write binary: 1111 1010₂ = <strong>0xFA</strong> = 250. One byte is two hex digits (0x00–0xFF).</p>
<h3>Signed numbers: two’s complement</h3>
<p>To negate a number, invert all bits and add 1. In 8 bits, the range is −128 to +127. Example: +5 = 0000 0101 → invert 1111 1010 → add 1 → <strong>1111 1011</strong> = −5. The top bit acts as a sign bit.</p>
<table class="data-table"><tr><th>Bits</th><th>Unsigned range</th><th>Typical use</th></tr>
<tr><td>8</td><td>0–255</td><td>byte, PWM duty on Arduino</td></tr>
<tr><td>10</td><td>0–1023</td><td>Arduino Uno ADC reading</td></tr>
<tr><td>16</td><td>0–65 535</td><td>timers, int on AVR</td></tr>
<tr><td>32</td><td>0–4 294 967 295</td><td>ARM registers</td></tr></table>`,
        keyPoints: ['n bits → 2ⁿ values (0 to 2ⁿ − 1).', 'One hex digit = 4 bits; one byte = two hex digits.', 'Two’s complement: invert and add 1.'],
        questions: [
          { id: 'l4-binary-q1', q: 'What is 1101₂ in decimal?', options: ['11', '13', '14', '1101'], answer: 1, explanation: '8 + 4 + 0 + 1 = 13.' },
          { id: 'l4-binary-q2', q: 'How many different values can 10 bits represent?', options: ['100', '512', '1024', '1000'], answer: 2, explanation: '2¹⁰ = 1024 values (0 to 1023).' },
          { id: 'l4-binary-q3', q: 'What is 0x3C in decimal?', options: ['60', '312', '36', '48'], answer: 0, explanation: '3 × 16 + 12 = 60.' },
          { id: 'l4-binary-q4', q: 'What is −1 as an 8-bit two’s complement number?', options: ['1000 0001', '1111 1111', '0000 0001', '1111 1110'], answer: 1, explanation: '+1 = 0000 0001 → invert 1111 1110 → add 1 → 1111 1111.' }
        ]
      },
      {
        id: 'l4-logic-gates', title: 'Logic Gates', minutes: 9,
        summary: 'AND, OR, NOT and friends — the building blocks of digital circuits.',
        body: `
<table class="data-table"><tr><th>A</th><th>B</th><th>AND</th><th>OR</th><th>NAND</th><th>NOR</th><th>XOR</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
<tr><td>0</td><td>1</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td></tr></table>
<ul><li><strong>NOT</strong> (inverter): output is the opposite of the input.</li>
<li><strong>AND</strong>: 1 only if all inputs are 1. <strong>OR</strong>: 1 if any input is 1.</li>
<li><strong>NAND / NOR</strong>: AND / OR followed by NOT. Both are <strong>universal</strong> — any logic function can be built from NAND gates alone (or NOR alone).</li>
<li><strong>XOR</strong>: 1 when the inputs differ; the heart of binary adders (a half adder is SUM = A XOR B, CARRY = A AND B).</li></ul>
<h3>Boolean algebra</h3>
<p>Written with · for AND, + for OR and an overbar or ′ for NOT. <strong>De Morgan’s theorems</strong>:</p>
<div class="formula">(A · B)′ = A′ + B′ &nbsp;&nbsp;·&nbsp;&nbsp; (A + B)′ = A′ · B′</div>
<h3>Logic levels</h3>
<p>Physical gates represent 0 and 1 as voltage ranges, not exact values. For 5 V CMOS a “high” input is roughly above 3.5 V and a “low” below 1.5 V; 3.3 V logic uses lower thresholds. Feeding 5 V into a 3.3 V-only input can damage it — use a level shifter or divider.</p>
<p>Unconnected (“floating”) inputs pick up noise and read randomly. Tie them high or low with a <strong>pull-up</strong> or <strong>pull-down</strong> resistor (commonly 4.7–10 kΩ).</p>`,
        keyPoints: ['AND = all, OR = any, XOR = different.', 'NAND and NOR are universal gates.', 'Never leave CMOS inputs floating — use pull-ups/pull-downs.'],
        questions: [
          { id: 'l4-logic-gates-q1', q: 'Which gate outputs 1 only when its inputs are different?', options: ['AND', 'OR', 'XOR', 'NAND'], answer: 2, explanation: 'XOR (exclusive OR) is 1 when exactly one input is 1.' },
          { id: 'l4-logic-gates-q2', q: 'What is the output of a NAND gate when both inputs are 1?', options: ['0', '1', 'Undefined', 'It depends on the supply'], answer: 0, explanation: 'AND of 1 and 1 is 1; NAND inverts it to 0. It is the only input combination that gives NAND = 0.' },
          { id: 'l4-logic-gates-q3', q: 'By De Morgan’s theorem, (A + B)′ equals…', options: ['A′ + B′', 'A′ · B′', 'A · B', '(A · B)′'], answer: 1, explanation: 'NOT(A OR B) = (NOT A) AND (NOT B).' },
          { id: 'l4-logic-gates-q4', q: 'Why use a pull-up resistor on a pushbutton input?', options: ['To increase the button’s current rating', 'So the input reads a defined high level when the button is open instead of floating', 'To make the button debounce itself', 'To convert the signal to analog'], answer: 1, explanation: 'Without a pull-up (or pull-down) the input floats and reads random values when the switch is open.' }
        ]
      },
      {
        id: 'l4-sequential', title: 'Flip-Flops, Clocks and Counters', minutes: 8,
        summary: 'Adding memory to logic: sequential circuits.',
        body: `
<p><strong>Combinational</strong> logic’s output depends only on the current inputs. <strong>Sequential</strong> logic also depends on past inputs — it has <em>memory</em>.</p>
<h3>Latches and flip-flops</h3>
<ul><li><strong>SR latch</strong>: two cross-coupled NOR (or NAND) gates; Set and Reset inputs store one bit.</li>
<li><strong>D flip-flop</strong>: on the active (usually rising) clock edge, output Q takes the value of input D and holds it until the next edge. It is the basic storage element of registers and processors.</li>
<li><strong>T / JK flip-flops</strong>: can toggle on each clock edge — the basis of counters.</li></ul>
<h3>Clocks</h3>
<p>A clock is a square wave that synchronizes a system. Frequency f and period T = 1/f: a 16 MHz clock has a period of 62.5 ns. <strong>Duty cycle</strong> = time high ÷ period.</p>
<h3>Counters and frequency division</h3>
<p>Chaining toggle flip-flops gives a binary <strong>ripple counter</strong>. Each stage divides the frequency by 2, so an n-bit counter counts 0 to 2ⁿ − 1 and its last stage outputs f/2ⁿ.</p>
<div class="example"><strong>Example:</strong> A 32.768 kHz watch crystal (2¹⁵ Hz) feeding a 15-stage divider produces exactly <strong>1 Hz</strong> — one tick per second.</div>
<h3>Timing rules</h3>
<p>A flip-flop’s D input must be stable for its <strong>setup time</strong> before the clock edge and its <strong>hold time</strong> after. Violating them can cause metastability, which is why signals from outside a clock domain (like a button) are passed through synchronizer flip-flops.</p>`,
        keyPoints: ['Sequential logic has memory; combinational does not.', 'A D flip-flop captures D on the clock edge.', 'Each counter stage divides frequency by 2.'],
        questions: [
          { id: 'l4-sequential-q1', q: 'When does a positive-edge-triggered D flip-flop update its output?', options: ['Continuously while the clock is high', 'At the rising edge of the clock', 'Whenever D changes', 'Only at power-up'], answer: 1, explanation: 'An edge-triggered flip-flop samples D at the active clock edge and holds Q otherwise.' },
          { id: 'l4-sequential-q2', q: 'What is the period of a 16 MHz clock?', options: ['16 ns', '62.5 ns', '625 ns', '6.25 µs'], answer: 1, explanation: 'T = 1/f = 1/16 000 000 s = 62.5 ns.' },
          { id: 'l4-sequential-q3', q: 'A 1 kHz clock drives a 4-bit binary ripple counter. What frequency does the most significant bit output?', options: ['250 Hz', '62.5 Hz', '125 Hz', '4 kHz'], answer: 1, explanation: 'Each stage divides by 2: 1000 / 2⁴ = 62.5 Hz.' },
          { id: 'l4-sequential-q4', q: 'Which of these is a sequential circuit?', options: ['A 2-input AND gate', 'A half adder', 'A shift register', 'A multiplexer'], answer: 2, explanation: 'A shift register is built from flip-flops and stores state. The others are purely combinational.' }
        ]
      },
      {
        id: 'l4-arduino', title: 'Arduino Basics', minutes: 10,
        summary: 'Programming a microcontroller to read inputs and drive outputs.',
        body: `
<p>A <strong>microcontroller</strong> is a small computer on one chip: CPU, memory and I/O peripherals. The <strong>Arduino Uno</strong> uses the ATmega328P running at 16 MHz with 5 V logic, 32 KB of flash and 2 KB of RAM. It has 14 digital I/O pins (6 with PWM) and 6 analog inputs (A0–A5).</p>
<h3>Program structure</h3>
<pre><code>const int LED_PIN = 13;
const int BUTTON_PIN = 2;

void setup() {                 // runs once at power-up/reset
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP); // internal pull-up: pressed = LOW
}

void loop() {                  // runs forever
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
}</code></pre>
<h3>Key functions</h3>
<ul><li><code>pinMode(pin, OUTPUT | INPUT | INPUT_PULLUP)</code></li>
<li><code>digitalWrite(pin, HIGH/LOW)</code> and <code>digitalRead(pin)</code></li>
<li><code>analogRead(pin)</code> → 0–1023 (10-bit ADC)</li>
<li><code>analogWrite(pin, 0–255)</code> → PWM duty cycle, not a true analog voltage</li>
<li><code>delay(ms)</code> blocks; <code>millis()</code> lets you time things without blocking.</li></ul>
<h3>Electrical limits</h3>
<p>An Uno I/O pin has an absolute maximum of 40 mA; design for <strong>20 mA or less</strong> per pin, and keep total chip current within spec. That is enough for an LED with a resistor, but motors, relays and long LED strips need a transistor or driver. Many newer boards (ESP32, Raspberry Pi Pico, Arduino Due) use <strong>3.3 V</strong> logic and are not 5 V-tolerant.</p>
<p>Use <code>Serial.begin(9600)</code> and <code>Serial.println()</code> to print debug information to your computer.</p>`,
        keyPoints: ['setup() runs once; loop() repeats forever.', 'INPUT_PULLUP enables the internal pull-up: pressed reads LOW.', 'Keep pin current ≤ 20 mA; use transistors for bigger loads.'],
        sim: 'led',
        questions: [
          { id: 'l4-arduino-q1', q: 'Which Arduino function runs exactly once after reset?', options: ['loop()', 'setup()', 'main()', 'init()'], answer: 1, explanation: 'setup() runs once for initialization; loop() then runs repeatedly.' },
          { id: 'l4-arduino-q2', q: 'A button is wired from pin 2 to GND with pinMode(2, INPUT_PULLUP). What does digitalRead(2) return while the button is pressed?', options: ['HIGH', 'LOW', 'It alternates', '1023'], answer: 1, explanation: 'The internal pull-up holds the pin HIGH; pressing connects it to ground, so it reads LOW.' },
          { id: 'l4-arduino-q3', q: 'What does analogWrite(9, 127) produce on an Uno?', options: ['A steady 2.5 V', 'A PWM square wave with ~50% duty cycle', 'An analog reading of pin 9', '127 mA'], answer: 1, explanation: 'analogWrite outputs PWM; 127/255 ≈ 50% duty. Averaged (e.g. by an LED’s perceived brightness or an RC filter) it acts like ~2.5 V.' },
          { id: 'l4-arduino-q4', q: 'Why shouldn’t you drive a small DC motor directly from an Arduino pin?', options: ['Motors need AC', 'The motor draws more current than a pin can safely supply, and its back-EMF can damage the pin', 'Pins can only output 1 V', 'Arduino pins are input-only'], answer: 1, explanation: 'Motors draw hundreds of mA and are inductive. Use a transistor or motor driver plus a flyback diode.' }
        ]
      },
      {
        id: 'l4-sensors', title: 'Sensors, ADCs and PWM', minutes: 10,
        summary: 'Turning the physical world into numbers, and numbers back into action.',
        body: `
<h3>Analog-to-digital conversion</h3>
<p>An <strong>ADC</strong> converts a voltage into a number. With an n-bit ADC and reference voltage V<sub>ref</sub>:</p>
<div class="formula">reading ≈ V<sub>in</sub> × 2ⁿ / V<sub>ref</sub> &nbsp;&nbsp;⇒&nbsp;&nbsp; V<sub>in</sub> ≈ reading × V<sub>ref</sub> / 2ⁿ</div>
<p>On an Uno (10 bits, 5 V reference) each step is 5/1024 ≈ <strong>4.9 mV</strong>. A reading of 512 means about 2.5 V. Inputs must stay between 0 V and V<sub>ref</sub>.</p>
<h3>Resistive sensors</h3>
<p>Thermistors (temperature) and LDRs (light) change resistance. Put the sensor in a <strong>voltage divider</strong> with a fixed resistor and read the midpoint with the ADC. Choosing the fixed resistor near the sensor’s mid-range resistance gives the best sensitivity. An NTC thermistor’s resistance <em>falls</em> as temperature rises.</p>
<h3>Digital sensors and buses</h3>
<ul><li><strong>I²C</strong>: two wires (SDA, SCL) with pull-up resistors, many devices each with an address.</li>
<li><strong>SPI</strong>: faster, uses MOSI, MISO, SCK plus a chip-select per device.</li>
<li><strong>UART</strong>: asynchronous serial (TX/RX), e.g. GPS modules.</li></ul>
<h3>PWM output</h3>
<p><strong>Pulse-width modulation</strong> switches a pin fully on and off quickly. The average voltage is:</p>
<div class="formula">V<sub>avg</sub> = D × V<sub>high</sub> &nbsp;&nbsp;(D = duty cycle, 0–1)</div>
<p>PWM dims LEDs and controls motor speed efficiently. On an Uno, analogWrite runs at about 490 Hz (≈ 980 Hz on pins 5 and 6).</p>
<h3>Debouncing</h3>
<p>A button’s contacts bounce for a few ms. Ignore changes for ~10–50 ms after an edge in software, or use an RC filter with a Schmitt-trigger input.</p>`,
        keyPoints: ['V ≈ reading × Vref / 2ⁿ (Uno: ~4.9 mV per step).', 'Read resistive sensors with a voltage divider.', 'PWM average = duty × V_high.'],
        sim: 'divider',
        questions: [
          { id: 'l4-sensors-q1', q: 'An Uno (10-bit ADC, 5 V reference) reads 307 on A0. What is the approximate input voltage?', options: ['1.5 V', '3.07 V', '0.3 V', '2.5 V'], answer: 0, explanation: 'V ≈ 307 × 5 / 1024 ≈ 1.50 V.' },
          { id: 'l4-sensors-q2', q: 'A 5 V PWM signal has a 30% duty cycle. What is its average voltage?', options: ['3.5 V', '1.5 V', '0.3 V', '5 V'], answer: 1, explanation: 'V_avg = 0.30 × 5 V = 1.5 V.' },
          { id: 'l4-sensors-q3', q: 'Which bus uses just two shared signal lines (data and clock) with pull-up resistors?', options: ['SPI', 'I²C', 'UART', 'USB 3.0'], answer: 1, explanation: 'I²C uses SDA and SCL, both open-drain with pull-ups.' },
          { id: 'l4-sensors-q4', q: 'An NTC thermistor gets warmer. Its resistance…', options: ['Rises', 'Falls', 'Stays the same', 'Becomes infinite'], answer: 1, explanation: 'NTC = negative temperature coefficient: resistance decreases as temperature increases.' }
        ]
      }
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
