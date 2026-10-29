# ⚡ Electronics Academy (v2)

A team training app for electronics technicians, built from the program in `/workspace/electronics-curriculum`.

* **4 phases · 20 core modules · 304 core hours** (Foundations 34 h · Circuit Theory & Devices 146 h · Hands-On Workmanship 88 h ·
  Troubleshooting & Capstone 36 h). Every module shows its objectives, topics and written test from the curriculum doc.
* **Level 0 gate**: Modules 1 (Safety) and 2 (ESD) need **100%** on the written test (test-out also only at 100%). Modules 15–20 stay locked until Level 0 is complete.
* **Module completion = written test passed (or tested out).** Everything is self-checked: lessons, quizzes, the simulator
  and the simulator exercises. There are no practical items for an admin to sign off (removed Oct 2026, see below).
* **Hours tracking** per module (learner self-log or admin log), compared with the planned hours.
* **Optional advanced track** (A1–A9) shown separately; it is **not** part of the 304 core hours. Power supplies stay in core (M11).
* **Seeded-defect inspection exercise** (M17 practice): a virtual board with randomised defects to classify.
* **Circuit simulator** – DC (nodal analysis) plus AC/transient: function generator (sine/square/triangle), capacitors,
  inductors, diodes and a 2-channel scope with Vpp/Vrms/avg/frequency/phase. Linked from M8 (AC & scope), M9 (RC/RL) and
  M11 (rectifiers). Phone layouts (portrait and landscape) supported.
* **Accounts & roles**, team dashboard with per-person drill-down, invites, and a **weekly team report** (HTML + JSON) with
  phase, hours, modules completed and Level 0 safety status. The app never sends email.

## Run it

Requires Node.js 22 LTS or 24 (`.node-version` pins 22 for hosting). `better-sqlite3` ^12 ships prebuilt binaries for both,
so `npm install` needs no compiler. On other Node versions it may try to compile and fail; switch to 22 or 24.

```bash
cd /workspace/electronics-academy
npm install
npm start            # http://localhost:4321   (PORT=8080 npm start to change the port)
```

The database lives at `data/academy.db` (override with `DB_PATH`). On first start with an empty database, demo accounts with
sample progress are created (set `NO_DEMO=1` to start empty).

```bash
node scripts/seed.js --demo-progress   # re-create sample progress for the @example.com demo accounts only (others untouched)
npm run seed                           # = seed.js --reset: WIPES every account and all progress, then seeds (destructive)
node scripts/create-admin.js ...       # create an admin account
```

### Migration from v1

Opening an existing v1 database migrates it automatically (`PRAGMA user_version`): all accounts, roles, passwords and sessions
are kept; v1 lesson completions whose lessons still exist are carried over; old quiz attempts are kept as legacy history.
New tables: `checkoffs` (legacy, unused since Oct 2026) and `hour_logs`. Back up `data/academy.db` before upgrading.
Schema v3 (the guide) adds only a `guide_state` table (one row per user, deleted with the user). The v2 → v3 upgrade happens on
start and leaves existing users, passwords, progress and hours untouched.
Schema v4 adds only one column, `guide_state.fx_enabled` (default 1 = on), for the "Lightning effects" switch. The v3 → v4
upgrade also happens on start and changes no existing data.
Schema v5 adds only a `game_plays` table (one row per finished game: user, game, score, level, right/wrong counts,
duration; deleted with the user). The v4 → v5 upgrade happens on start and changes no existing data.

### Practical sign-offs removed (Oct 2026)

The instructor/admin practical sign-off items (labs and practical assessments; 70 items across the 20 core modules) were
removed from the curriculum data, learner pages, admin pages, the API and the weekly report. A module is now complete as
soon as its written test is passed or tested out. Completion is computed when it is read, so **no migration was needed**:
existing learners whose written tests were already passed show those modules as complete straight away. The `checkoffs`
table is kept with its rows (nothing is deleted) but the app no longer reads or writes it, and the old
`POST /api/admin/users/:id/checkoffs` endpoint now answers `410 Gone`.

## Volt, the guide companion

A small animated helper sits in the bottom-right corner of every signed-in page (`public/js/guide.js`, `public/css/guide.css`).

- **Dashboard:** recommends the next module. Level 0 (M1 + M2 at 100%) comes first. It respects locks, offers a test-out when
  lessons are not all studied.
- **Module page:** what the module covers, a ✅/⬜ checklist of what completes it (written test at the module's pass mark,
  planned hours), a tip, a common mistake, and a link to a matching simulator challenge.
- **Quiz:** encouragement. A wrong answer adds a link to the lesson that covers the question (it opens in a new tab).
  The result lists the lessons to review.
- **Simulator:** a challenge tied to the current module and preset.
- **Celebrations:** a short full-screen celebration when Level 0 safety is cleared, a module is completed or a phase is finished
  (see *Effects* below; this replaces the old confetti).
- **Tour:** 7 steps on first login. It can be skipped (Skip or Esc) and replayed from the guide's ⋯ menu.

**Layout and controls:** the bubble opens by itself only on the desktop dashboard. Elsewhere a dot on the avatar means there is a
tip; tap the avatar to read it. × minimises the guide and "Hide Volt" in the ⋯ menu dismisses it, leaving a "⚡ Bring back Volt" button
in the footer. Both choices are saved per user on the server. On phones the bubble opens as a bottom sheet. In portrait the
simulator moves the avatar under the top bar, and the guide hides while the ☰ menu is open.

**Rename it** in one place: `GUIDE_CONFIG` at the top of `public/js/guide.js` (`name`, `tagline`).

**Restyle it** with CSS variables in `public/css/guide.css`:
- `--guide-accent`, `--guide-bg`, `--guide-text`;
- `--guide-phase-1` … `--guide-phase-4`: the glow colour per curriculum phase, chosen from the module being viewed or the
  learner's current module;
- `--guide-size`, `--guide-z`.

By default these follow the cyberpunk theme's `--cp-*` colours. The avatar is an inline SVG placeholder inside `guide.js`
(`AVATAR`), so it can be swapped out without touching anything else.

**Per-module lines:** if `curriculum-source/guide-lines.json` exists (override the path with `GUIDE_LINES_PATH`), its lines replace
the built-in defaults module by module. The file is re-read when it changes, with no restart needed. If it is missing or invalid,
the defaults are used. Format:

```json
{ "m1": { "intro": "…", "tips": ["…"], "mistakes": ["…"], "celebrate": "…" }, "m2": "just an intro string" }
```
`celebrate` (optional) is the line Volt cheers when that module is completed. Without it, a built-in line is used.
Wrapping the modules as `{ "modules": { … } }` also works. `summary` / `introduction` are accepted for `intro`, and
`commonMistakes` for `mistakes`.

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin (team, hours, invites, reports) | `admin@example.com` | `AdminDemo!2026` |
| Learner – Level 0 cleared, Phase 1 done, Phase 2 under way | `alex.rivera@example.com` | `LearnerDemo!2026` |
| Learner – M1 passed, M2 written test not taken, so Level 0 partial (M15–M20 locked) | `sam.chen@example.com` | `LearnerDemo!2026` |
| Learner – Phase 1 complete | `morgan.lee@example.com` | `LearnerDemo!2026` |
| Learner – M1 written passed, M2 not yet (Level 0 partial) | `priya.patel@example.com` | `LearnerDemo!2026` |
| Invited, not yet accepted | `jordan.kim@example.com` | — (invite link printed by `npm run seed`) |
**Change or remove these before using the app with real people.** Demo accounts are never created when `NO_DEMO=1`, and
`scripts/seed.js` refuses to run when `NODE_ENV=production` or `NO_DEMO=1`, as on Render.

### Password resets

The app never sends email, so resets go through an admin. Open **Team → a member → Reset password** to get a one-time link
(valid 14 days) to copy and send to that person privately. It works for any user, whether they are still pending or active.
- Each new link replaces any earlier invite or reset link.
- The person's current password keeps working until they set a new one through the link.
- Setting the new password signs them out of all their other sessions.
- For a pending user, the link simply completes their invite.

From a shell, `npm run admin-invite -- someone@company.com` prints a fresh link for an existing user (it uses `DB_PATH` and
`PUBLIC_URL`). Use this if the only admin is locked out.

## Deploy to Render

The repo includes a Blueprint, `render.yaml`, that defines one Node web service:
- **Service:** `starter` plan, region `oregon`, exactly one instance (SQLite on a disk can't be scaled out).
- **Build and start:** `npm ci --omit=dev`, then `npm start`.
- **Health check:** `/healthz` (it also pings the database).
- **Disk:** 1 GB persistent disk mounted at `/var/data`. The database lives there (`DB_PATH=/var/data/academy.db`), so it
  survives deploys and restarts.
- **Node:** 22 LTS, from `.node-version`.

**Environment** (set by the Blueprint):

| Variable | Value | Purpose |
|---|---|---|
| `DB_PATH` | `/var/data/academy.db` | SQLite file on the persistent disk |
| `NODE_ENV` | `production` | Secure cookies (HTTPS only) |
| `NO_DEMO` | `1` | Never create demo accounts or sample progress |
| `SESSION_SECRET` | generated by Render | Reserved. Sessions are random server-side tokens, so nothing reads it today; keep it secret anyway |
| `ADMIN_EMAIL` / `ADMIN_NAME` | `dwight.santos@spacex.com` / `Dwight Santos` | The first admin, created on first boot |
| `PUBLIC_URL` | *you enter it* (`sync: false`) | Public address used in the first-boot invite link, e.g. `https://electronics-academy.onrender.com` or your custom domain, with no trailing slash |
| `PORT` | set by Render | The server listens on it |

**Steps:**
1. Push this repo to GitHub or GitLab. `.gitignore` keeps databases, backups, logs, screenshots and `node_modules` out.
2. In Render, choose **New → Blueprint**, pick the repo, and enter `PUBLIC_URL` when asked. The `starter` plan is needed
   for the disk and is billed. Apply.
3. **First boot:** the database is empty and has no admin, so the server creates `ADMIN_EMAIL` as an admin with **no
   password** and writes one line to the log:
   ```
   ADMIN INVITE: https://<your-app>/#/invite/<token>
   ```
   Open that link within 14 days and choose the admin password. Later boots don't create anyone. While the admin is still
   pending, a later boot only prints "already issued". After the link expires, the next boot prints a fresh one. If the line
   is lost, run `npm run admin-invite -- dwight.santos@spacex.com` from the Render **Shell** tab.
4. Sign in, then add team members under **Team → Add member**. Each gets an invite link to send them.

**Production behaviour:**
- `trust proxy` is set to one hop (Render's proxy), so the client IP used for login throttling is correct.
- Session cookies are `Secure`, `HttpOnly` and `SameSite=Lax`.
- On a deploy or restart Render sends `SIGTERM`, and the server stops cleanly and closes SQLite.

**Backups:** Render takes automatic snapshots of persistent disks. For your own copy, run `npm run backup-db` from the
Render Shell tab. This takes a consistent copy, safe while the app is running, at `/var/data/backup-<time>.db`, which you can
then copy off with Render's SSH (`scp`).

**Moving the existing local database:** this is optional. Production normally starts empty. To carry over current users and
progress, make a backup locally (`npm run backup-db -- /tmp/academy.db`), copy it to `/var/data/academy.db` with Render's
SSH (`scp`), and restart the service. The schema migrates automatically. Skip the `ADMIN_EMAIL` bootstrap in that case; it
does nothing anyway once an admin with a password exists.

## Weekly report

```bash
node scripts/weekly-report.js --out report.html --json report.json
node scripts/weekly-report.js --end 2026-10-28 --tz America/Chicago --out report.html
npm run report                                                  # → reports/weekly-report.html
```

Covers the 7 days ending at `--end`: team summary (learners, active, average completion, hours this week, modules completed),
**Level 0 safety status** per learner, phase progress, leaderboard, modules completed this week, and one section per learner
(current phase/module, hours logged vs planned, written results).
Email-safe HTML (tables + inline styles). Admins can also use `GET /api/admin/reports/weekly?format=html|json|both&end=&tz=`
or **Team → Weekly report**. Nothing is emailed.

## Games

**Games** (top nav, and the ☰ menu on phones) lists the lesson games; module M5 shows a **Play** card on the Ohm's law and
power lessons. The first game is the **Ohm's Law Shooter** (`#/games/ohms-shooter`):

- A problem card at the top (for example `V = 16 V · R = 8 Ω · I = ?`); four answer bubbles fall. Shoot the right one:
  click/tap a bubble, or move Volt with ← → and fire with Space (P pauses).
- Hitting a wrong bubble, or letting the right one land, costs one of 3 lives, and Volt says a one-line hint.
- Each right answer scores 100 × level × streak multiplier (×1, +1 for every 3 in a row, up to ×5). Levels (5 right answers each) speed up: L1 find I, L2 find V or R,
  L3 adds prefixes (mA, kΩ, …), L4+ power (P = V·I, I²R, V²/R).
- Answers are exact; wrong bubbles come from common mistakes (upside-down ratio, multiplied instead of divided, prefix slips).
- Reaching level 4 (clearing level 3) marks the *Ohm's law* lesson as studied, if it wasn't already. Test and completion
  rules are unchanged.
- Each player's best score and play count are stored (`game_plays`).
- Honours `prefers-reduced-motion` and the "Lightning effects" switch (no bolt, pops or shake). Sound is off by default.

Code: `public/js/games/ohm-problems.js` (problem generator, shared with the server), `public/js/games/ohm-shooter.js`
(the game), `public/css/games.css`, `server/games.js`. API: `GET /api/games` · `GET /api/games/:id/stats` ·
`GET /api/games/:id/art` · `POST /api/games/:id/plays {score, level, correct, wrong, durationMs}`.

**Art.** The visuals come from the artist's cartoon kit (`public/css/game-cartoon.css`, `public/img/game/*.svg`; not
edited by the game code). The game builds the kit's markup (`gc-stage`, `gc-hud`, `gc-target gc-a|gc-v|gc-ohm`,
`gc-volt is-shoot|is-hit|is-miss`, `gc-pop`, …) and adds its own `osg-*` classes for layout. Notes:
- The kit has no power bubble: **W answers reuse the yellow volt bubble** (`gc-v`) with a "W" tab (`.osg-unit-w`).
- The falling motion is driven by the game loop (`--x`/`--y`), not the kit's `.gc-fall` animation.
- If the kit files are missing, `/api/games/:id/art` reports that and the game uses a plain built-in look.
- Test hooks: `window.OHM_SHOOTER` (`state()`, `targets()`, `hit(label)`, `speed`, `config`).

`node tests/game-capture.js` records the demo videos and stills (temp DB, port 4391). It shortens levels to 3 right answers
and runs the game clock at 1.8× so a clip reaches level 4 in under 30 s.

## API summary

Auth: `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/change-password` · `GET /api/auth/invite/:token` · `POST /api/auth/accept-invite`
Learner: `GET /api/me` · `GET /api/progress` · `POST|DELETE /api/lessons/:id/complete` · `POST /api/quiz/start`
(`kind`: `lesson`, `testout-lesson`, `module`, `defect-practice`) · `POST /api/quiz/:sessionId/submit` ·
`POST /api/hours {moduleId, hours, workDate, note}` · `DELETE /api/hours/:id`
Games: `GET /api/games` · `GET /api/games/:id/stats` · `GET /api/games/:id/art` · `POST /api/games/:id/plays`
Admin: `GET /api/admin/users` · `GET /api/admin/users/:id` · `POST /api/admin/users` · `POST /api/admin/users/:id/invite` ·
`POST /api/admin/users/:id/reset-password` ·
`POST /api/admin/users/:id/hours` · `GET /api/admin/reports/weekly`
Guide: `GET /api/guide` returns `{state, lines, linesSource}`. `PUT /api/guide {collapsed?, dismissed?, tourDone?, milestones?}`
returns `{state}`.

Grading happens on the server; each quiz session accepts one submission. A module test with not all lessons studied counts as a
test-out (pass mark per module; 100% for M1/M2).

## Effects

All of these honour `prefers-reduced-motion`. The bolt and the celebrations can also be turned off by each learner with
**⚡ Lightning effects** in Volt's ⋯ menu. The setting is saved per user on the server (`guide_state.fx_enabled`, sent as
`effects` by `GET/PUT /api/guide`).

**Lightning navigation** (`public/js/volt-fx.js`, `public/css/volt-fx.css`). When a learner clicks, taps or presses Enter on a
module or lesson link (dashboard phase cards and module links, Program rows, lesson links and prev/next, Advanced-track cards),
Volt fires a jagged bolt at it. The bolt starts at the avatar, or at the top-left logo when Volt is dismissed. The target's
outline glows in its phase colour (`--guide-phase-N`) and then bursts open into the new page, in about 0.8 s.
- Navigation always happens, exactly once: it is scheduled up front with a failsafe timer, and a guard blocks a second
  navigation.
- **Locked module:** the bolt fizzles, the outline flashes red, Volt explains what unlocks it, and nothing navigates.
- **Reduced motion:** a quick outline fade (about 150 ms), then navigation.
- **Effects off:** plain links.
- The back button and phone portrait/landscape work as normal.

**Module-complete celebrations** (`public/js/celebrate.js`, `public/css/celebrate.css`). Effects A–E are lifted from the
artist's concepts in `public/demo/celebrations.html`; design and code credit belongs to the artist.
- Every module completion shows the glitch banner (B), Volt's cheer, and one of: A neon fireworks, C circuit power-up,
  D Volt victory lap, or E scope pulse. The effect is chosen by module number and is never the same twice in a row.
- A module celebration lasts under 2.5 s. Finishing a phase plays the finale: everything at once, about 4 s.
- Tap, click or Esc skips it.
- **Reduced motion:** a calm fade.
- **Effects off:** no overlay, but Volt's cheer still shows in the bubble.

**Sign-in entrance** (`voltWelcome()` / `startVoltWelcome()` in `public/js/app.js`, styles at the end of `public/css/volt-fx.css`).
Artwork credit: the artist (`public/img/volt-welcome.jpg`, plus `volt-welcome-wave.jpg` for the raised hand). This is a real
element that replaces the theme's old CSS `::before` portrait, and its layout rules moved here from `cyberpunk.css`. It plays
once per page load:
1. Volt flies in from the right (about 1.2 s) with a cyan/magenta afterimage trail.
2. He lands with a squash and bounce, and the platform ring pulses.
3. A "HELLO, I'M VOLT" bubble pops up.
4. He waves: the raised-hand frame alternates with the base frame about every 250 ms, three times, while the whole figure
   rocks ±3° about its bottom centre. He then settles on `volt-welcome.jpg`.
5. He switches to the idle hover bob. The whole entrance takes about 3.5 s.

Details:
- Volt sits behind the sign-in card and never takes clicks, so the form is usable straight away.
- **Phones:** the same fly-in, with Volt above the card. **Short landscape screens:** Volt is hidden.
- **Reduced motion:** a static Volt with the bubble.
- **Missing wave frame:** he only rocks.

**Captures:** `node tests/volt-fx-capture.js`, `node tests/celebrate-capture.js` and `node tests/welcome-capture.js` each use
a throwaway database and write their PNG and MP4 files to `screenshots/`. Video needs Playwright's ffmpeg:
`npx playwright-core install ffmpeg`.

## Layout

```
server/   app.js (REST API + static), db.js (schema + migration), progress.js (gating, grading, completion, hours),
          report.js (weekly report), curriculum.js (loads the browser's curriculum files), auth.js, guide.js (guide state + lines)
public/   index.html, css/styles.css, css/cyberpunk.css (theme), css/guide.css, css/volt-fx.css, css/celebrate.css, js/app.js (router + views), js/content/ (program.js + module content),
          js/circuit-solver.js (DC MNA + backward-Euler transient), js/simulator.js, js/defects.js, js/tools.js, js/guide.js (companion),
          js/volt-fx.js (lightning navigation), js/celebrate.js (celebrations), img/ (artist's Volt artwork)
scripts/  seed.js, weekly-report.js, create-admin.js, build-curriculum.js
render.yaml (Render Blueprint) · .node-version · server/bootstrap.js (first-boot admin invite) · scripts/admin-invite.js · scripts/backup-db.js
tests/    solver.test.js, content.test.js, api.test.js, e2e.js, mobile.js, *-capture.js (effect screenshots/videos)
```

## Simulator model

Ideal batteries and generator; wires/closed switches 0.1 mΩ; LEDs are V<sub>F</sub> + 2 Ω, diodes 0.7 V + 0.5 Ω (solved
iteratively); bulbs are fixed resistors. Capacitors start discharged and inductors at zero current; reactive circuits are solved
step by step in time (backward Euler). AC readings are RMS over the last whole generator periods; DC transients show the end value
in the table and min/max over the run on the scope. Presets include series, parallel, divider, LED, bridge, AC sine, PWM,
RC/RL phase, RC charging, half- and full-wave rectifiers.

## Tests

```bash
npm test               # solver maths, curriculum structure, game problems, full API flow (temp DB)
npm run test:browser   # tests/e2e.js + tests/mobile.js: headless Chrome on a throwaway DB, screenshots → screenshots/
```
Browser tests use `/usr/bin/google-chrome` (`CHROME_PATH` to override; `SHOTS_DIR` to change the screenshot folder).
