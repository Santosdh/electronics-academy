#!/usr/bin/env node
// Generates the weekly team report from the database. Never sends email.
//
//   node scripts/weekly-report.js --out report.html            # HTML file
//   node scripts/weekly-report.js --json report.json           # JSON file
//   node scripts/weekly-report.js --out r.html --json r.json --end 2026-10-21 --tz America/Chicago
//   node scripts/weekly-report.js                              # prints JSON summary to stdout
//
// Options: --db <path> (default data/academy.db or $DB_PATH), --end <ISO date/time> (week = 7 days ending here, default now),
//          --tz <IANA zone for displayed dates, default America/Chicago>
const fs = require('fs');
const path = require('path');
const { openDb } = require('../server/db');
const { buildWeeklyReport, renderReportHtml } = require('../server/report');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };
if (args.includes('--help') || args.includes('-h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 11).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const db = openDb(opt('db'));
let end = new Date();
if (opt('end')) {
  end = new Date(opt('end'));
  if (/^\d{4}-\d{2}-\d{2}$/.test(opt('end'))) end = new Date(end.getTime() + 86400000 - 1); // include the whole end day (UTC)
  if (isNaN(end)) { console.error('Invalid --end date'); process.exit(1); }
}
const report = buildWeeklyReport(db, { end });
const write = (file, data) => { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, data); console.log('Wrote ' + path.resolve(file)); };
if (opt('out')) write(opt('out'), renderReportHtml(report, { timeZone: opt('tz') }));
if (opt('json')) write(opt('json'), JSON.stringify(report, null, 2));
if (!opt('out') && !opt('json')) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
else {
  const t = report.team;
  console.log(`Team: ${t.memberCount} learners, ${t.activeThisWeek} active this week, avg ${t.averageCreditedHours} of ${report.program.coreHours} h credited, ` +
    `${t.hoursLoggedThisWeek} h logged, ${t.checkoffsThisWeek.signed} check-offs signed and ${t.writtenTestsThisWeek} written tests this week; ` +
    `safety: ${t.safety.cleared} cleared / ${t.safety.partial} partial / ${t.safety.notCleared} not cleared.`);
}
