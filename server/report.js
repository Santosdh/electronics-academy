// Weekly team report for the module-based curriculum: JSON data + email-ready HTML (inline styles,
// table layout, no scripts). Never sends anything — the CLI and admin endpoint only render it.
const C = require('./curriculum');
const { getProgress } = require('./progress');

const DAY = 86400000;
const AHEAD_HOURS = 24; // credited hours above/below the team average that count as ahead/behind (≈3 full-time days)
const round1 = (x) => Math.round(x * 10) / 10;
const avg = (arr) => arr.length ? round1(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
const modTitle = (id) => { const m = C.modulesById[id]; return m ? (m.track === 'core' ? `M${m.number} ${m.title}` : `Advanced: ${m.title}`) : id; };

function buildWeeklyReport(db, opts = {}) {
  const end = opts.end ? new Date(opts.end) : new Date();
  const start = new Date(end.getTime() - 7 * DAY);
  const S = start.toISOString(), E = end.toISOString();
  const inWeek = (iso) => !!iso && iso >= S && iso <= E;
  const allLearners = db.prepare(`SELECT id, name, email, created_at, password_hash IS NOT NULL AS active
    FROM users WHERE role='learner' ORDER BY name`).all();
  const users = allLearners.filter((u) => u.active); // pending invites are listed separately, excluded from stats
  const pendingInvites = allLearners.filter((u) => !u.active).map((u) => ({ name: u.name, email: u.email, invitedAt: u.created_at }));

  const members = users.map((u) => {
    const p = getProgress(db, u.id);
    const s = p.summary;
    const lessonsThisWeek = Object.entries(p.lessons).filter(([, v]) => inWeek(v.completedAt)).map(([id, v]) => {
      const ls = C.lessonsById[id]; return { lessonId: id, title: ls.title, moduleId: ls.moduleId, module: modTitle(ls.moduleId), method: v.method, at: v.completedAt };
    }).sort((a, b) => a.at.localeCompare(b.at));
    const testsThisWeek = p.attempts.filter((a) => inWeek(a.createdAt) && (a.kind === 'module' || a.kind === 'defect-practice')).map((a) => ({
      kind: a.kind, moduleId: a.moduleId, label: a.kind === 'defect-practice' ? 'M17 seeded-defect practice' : modTitle(a.moduleId) + (a.mode === 'test-out' ? ' — test-out' : ' — written test'),
      mode: a.mode, score: a.score, total: a.total, percent: a.percent, requiredPercent: a.requiredPercent, passed: a.passed, at: a.createdAt
    })).sort((a, b) => a.at.localeCompare(b.at));
    const hoursThisWeek = round1(p.hours.filter((h) => h.workDate >= S.slice(0, 10) && h.workDate <= E.slice(0, 10)).reduce((a, h) => a + h.hours, 0));
    const modulesCompletedThisWeek = s.modules.filter((m) => m.complete && inWeek(m.completedAt)).map((m) => ({ id: m.id, number: m.number, title: m.title, hours: m.hours }));
    const creditedBefore = s.modules.filter((m) => m.complete && m.completedAt < S).reduce((a, m) => a + m.hours, 0);
    const activeThisWeek = lessonsThisWeek.length + testsThisWeek.length > 0 || hoursThisWeek > 0;
    return {
      id: u.id, name: u.name, email: u.email,
      hours: { core: s.coreHours, credited: s.hoursCredited, percent: s.percent, creditedThisWeek: s.hoursCredited - creditedBefore,
        logged: s.loggedHours, loggedThisWeek: hoursThisWeek, advancedLogged: s.advanced.loggedHours },
      modules: { complete: s.modulesComplete, total: s.modulesTotal },
      phases: s.phases.map((ph) => ({ number: ph.number, title: ph.title, hours: ph.hours, credited: ph.hoursCredited, percent: ph.percent, modulesComplete: ph.modulesComplete, modulesTotal: ph.modulesTotal })),
      currentModule: s.currentModule,
      safety: s.safety,
      averageWrittenPercent: s.averageWrittenPercent, firstAttemptPassRate: s.firstAttemptPassRate,
      lessonsThisWeek, testsThisWeek, modulesCompletedThisWeek,
      lastActivity: s.lastActivity, activeThisWeek, enrolledDays: Math.floor((end - new Date(u.created_at)) / DAY)
    };
  });

  const teamCredited = avg(members.map((m) => m.hours.credited));
  members.forEach((m) => {
    const diff = m.hours.credited - (teamCredited || 0);
    m.reasons = [];
    if (diff >= AHEAD_HOURS) m.reasons.push(`${Math.round(diff)} credited hours above team average`);
    if (diff <= -AHEAD_HOURS) m.reasons.push(`${Math.round(-diff)} credited hours below team average`);
    if (!m.activeThisWeek) m.reasons.push('no activity this week');
    if (!m.safety.gateCleared && m.enrolledDays >= 14) m.reasons.push('Level 0 (safety + ESD) not cleared after 2+ weeks');
    m.standing = diff >= AHEAD_HOURS && m.activeThisWeek ? 'ahead' : (diff <= -AHEAD_HOURS || !m.activeThisWeek || (!m.safety.gateCleared && m.enrolledDays >= 14)) ? 'behind' : 'on track';
  });
  const allTests = members.reduce((a, m) => a.concat(m.testsThisWeek.filter((t) => t.kind === 'module')), []);
  const ranked = members.slice().sort((a, b) => b.hours.credited - a.hours.credited || b.hours.logged - a.hours.logged);

  return {
    title: 'Electronics Academy — Weekly Team Report',
    program: { title: C.program.title, coreHours: C.coreHours, phases: C.phases.map((p) => ({ number: p.number, title: p.title, hours: p.hours, modules: p.moduleIds.length })) },
    generatedAt: new Date().toISOString(),
    period: { start: S, end: E },
    rules: { completion: 'A module counts (and its hours are credited) once its written test is passed or tested out.',
      standing: `Ahead/behind = at least ${AHEAD_HOURS} credited hours above/below the team average; no activity in the 7 days, or Level 0 not cleared after 14 days enrolled, also flags a learner as behind.` },
    team: {
      memberCount: members.length,
      activeThisWeek: members.filter((m) => m.activeThisWeek).length,
      averageCreditedHours: teamCredited,
      averagePercent: avg(members.map((m) => m.hours.percent)),
      hoursLoggedThisWeek: round1(members.reduce((a, m) => a + m.hours.loggedThisWeek, 0)),
      hoursCreditedThisWeek: members.reduce((a, m) => a + m.hours.creditedThisWeek, 0),
      modulesCompletedThisWeek: members.reduce((a, m) => a + m.modulesCompletedThisWeek.length, 0),
      lessonsThisWeek: members.reduce((a, m) => a + m.lessonsThisWeek.length, 0),
      writtenTestsThisWeek: allTests.length,
      writtenPassRateThisWeek: allTests.length ? Math.round(allTests.filter((t) => t.passed).length / allTests.length * 100) : null,
      averageWrittenPercentThisWeek: avg(allTests.map((t) => t.percent)),
      firstAttemptPassRate: avg(members.map((m) => m.firstAttemptPassRate).filter((x) => x != null)),
      safety: {
        cleared: members.filter((m) => m.safety.status === 'cleared').length,
        partial: members.filter((m) => m.safety.status === 'partial').length,
        notCleared: members.filter((m) => m.safety.status === 'not-cleared').length,
        members: members.map((m) => ({ name: m.name, status: m.safety.status, m1Complete: m.safety.m1Complete, m2Complete: m.safety.m2Complete }))
      },
      phases: C.phases.map((p, i) => ({ number: p.number, title: p.title, hours: p.hours,
        averagePercent: avg(members.map((m) => m.phases[i].percent)), membersComplete: members.filter((m) => m.phases[i].modulesComplete === m.phases[i].modulesTotal).length })),
      leaderboard: ranked.map((m, i) => ({ rank: i + 1, name: m.name, credited: m.hours.credited, percent: m.hours.percent, logged: m.hours.logged, standing: m.standing })),
      ahead: members.filter((m) => m.standing === 'ahead').map((m) => ({ name: m.name, reasons: m.reasons })),
      behind: members.filter((m) => m.standing === 'behind').map((m) => ({ name: m.name, reasons: m.reasons })),
      pendingInvites
    },
    members
  };
}

// ---------- HTML (email-safe) ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso, tz) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
const fmtDT = (iso, tz) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
const pct = (x) => x == null ? '—' : `${Math.round(x)}%`;
const hrs = (x) => `${round1(x || 0)} h`;
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const STAND = { ahead: ['#065f46', '#d1fae5', 'Ahead'], 'on track': ['#1e40af', '#dbeafe', 'On track'], behind: ['#9a3412', '#ffedd5', 'Behind'] };
const SAFE = { cleared: ['#065f46', '#d1fae5', 'Level 0 cleared'], partial: ['#92400e', '#fef3c7', 'Level 0 partly done'], 'not-cleared': ['#991b1b', '#fee2e2', 'Level 0 not cleared'] };
const pill = ([fg, bg, label]) => `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600;white-space:nowrap;">${esc(label)}</span>`;
const PASS = pill(['#065f46', '#d1fae5', 'Pass']), FAIL = pill(['#991b1b', '#fee2e2', 'Fail']);

function bar(percent, color) {
  const w = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#e5e7eb;border-radius:6px;"><tr>` +
    (w > 0 ? `<td width="${w}%" style="background:${color || '#4f46e5'};height:8px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>` : '') +
    (w < 100 ? `<td style="height:8px;font-size:0;line-height:0;">&nbsp;</td>` : '') + `</tr></table>`;
}
function stat(label, value, sub) {
  return `<td width="25%" valign="top" style="padding:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;${FONT}">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</div>
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-top:4px;">${esc(value)}</div>
    ${sub ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(sub)}</div>` : ''}</td>`;
}
const H2 = (t) => `<div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:22px;${FONT}">${t}</div>`;

function renderReportHtml(r, opts = {}) {
  const tz = opts.timeZone || process.env.REPORT_TZ || 'America/Chicago';
  const t = r.team;
  const th = `style="text-align:left;padding:7px;border-bottom:2px solid #e5e7eb;font-size:11px;color:#64748b;text-transform:uppercase;${FONT}"`;
  const td = `style="padding:7px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;vertical-align:top;${FONT}"`;
  const tbl = (head, rows, empty, cols) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:6px;">
    ${head ? `<tr>${head.map((h) => `<th ${th}>${h}</th>`).join('')}</tr>` : ''}${rows.length ? rows.join('') : `<tr><td ${td} colspan="${cols || (head ? head.length : 1)}"><span style="color:#64748b;">${empty}</span></td></tr>`}</table>`;

  const leaderboard = t.leaderboard.map((m) => `<tr><td ${td}>${m.rank}</td><td ${td}>${esc(m.name)}</td>
    <td ${td} width="40%">${bar(m.percent)}<div style="font-size:12px;color:#64748b;margin-top:2px;">${m.credited} of ${r.program.coreHours} h credited (${pct(m.percent)}) · ${hrs(m.logged)} logged</div></td><td ${td}>${pill(STAND[m.standing])}</td></tr>`);
  const safetyRows = t.safety.members.map((s) => `<tr><td ${td}>${esc(s.name)}</td><td ${td}>${s.m1Complete ? '✔ passed (100%)' : '✘ quiz not passed'}</td>
    <td ${td}>${s.m2Complete ? '✔ passed (100%)' : '✘ quiz not passed'}</td><td ${td}>${pill(SAFE[s.status])}</td></tr>`);
  const phaseRows = t.phases.map((p) => `<tr><td ${td}>Phase ${p.number} · ${esc(p.title)}</td><td ${td}>${p.hours} h</td><td ${td} width="35%">${bar(p.averagePercent, '#0ea5e9')}<div style="font-size:12px;color:#64748b;margin-top:2px;">team avg ${pct(p.averagePercent)}</div></td><td ${td}>${p.membersComplete}/${t.memberCount}</td></tr>`);
  const listPeople = (arr, empty) => arr.length ? arr.map((p) => `<li style="margin:4px 0;"><strong>${esc(p.name)}</strong> — ${esc(p.reasons.join('; ') || 'ahead of team pace')}</li>`).join('') : `<li style="color:#64748b;">${empty}</li>`;

  const memberSections = r.members.map((m) => {
    const phases = m.phases.map((p) => `<td align="center" style="padding:6px;border:1px solid #e5e7eb;${FONT}font-size:12px;color:#334155;">
      <div style="font-weight:700;">P${p.number}</div><div>${p.modulesComplete}/${p.modulesTotal} mod</div><div style="color:#64748b;">${p.credited}/${p.hours} h</div></td>`).join('');
    const tests = m.testsThisWeek.map((q) => `<tr><td ${td}>${esc(q.label)}</td><td ${td}>${q.score}/${q.total} (${pct(q.percent)}; needs ${pct(q.requiredPercent)})</td><td ${td}>${q.passed ? PASS : FAIL}</td></tr>`);
    return `<tr><td style="padding:16px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;border-collapse:separate;">
      <tr><td style="padding:16px;${FONT}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="${FONT}"><div style="font-size:18px;font-weight:700;color:#0f172a;">${esc(m.name)}</div><div style="font-size:13px;color:#64748b;">${esc(m.email)}</div></td>
          <td align="right" style="${FONT}">${pill(STAND[m.standing])}<div style="margin-top:4px;">${pill(SAFE[m.safety.status])}</div></td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
          <td width="50%" valign="top" style="${FONT}font-size:13px;color:#334155;padding-right:8px;line-height:1.5;">
            <div><strong>Hours:</strong> ${m.hours.credited} of ${m.hours.core} h credited (${pct(m.hours.percent)}) · ${hrs(m.hours.logged)} logged${m.hours.advancedLogged ? ` · ${hrs(m.hours.advancedLogged)} advanced` : ''}</div>
            <div><strong>This week:</strong> ${hrs(m.hours.loggedThisWeek)} logged · +${m.hours.creditedThisWeek} h credited · ${m.modulesCompletedThisWeek.length} module${m.modulesCompletedThisWeek.length === 1 ? '' : 's'} completed · ${m.lessonsThisWeek.length} lesson${m.lessonsThisWeek.length === 1 ? '' : 's'}</div>
            <div><strong>Modules:</strong> ${m.modules.complete}/${m.modules.total} complete</div>
            <div><strong>Current:</strong> ${m.currentModule ? `M${m.currentModule.number} ${esc(m.currentModule.title)}` : 'All core modules complete'}</div>
            <div><strong>Written avg:</strong> ${pct(m.averageWrittenPercent)} · first-attempt pass ${pct(m.firstAttemptPassRate)}</div>
            <div><strong>Last active:</strong> ${m.lastActivity ? esc(fmtDT(m.lastActivity, tz)) : 'never'}</div>
          </td>
          <td width="50%" valign="top">${bar(m.hours.percent)}<div style="${FONT}font-size:12px;color:#64748b;margin-top:4px;">${pct(m.hours.percent)} of the ${m.hours.core}-hour core program</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse;"><tr>${phases}</tr></table></td>
        </tr></table>
        ${m.reasons.length ? `<div style="margin-top:10px;font-size:13px;color:#9a3412;${FONT}">⚑ ${esc(m.reasons.join('; '))}</div>` : ''}
        <div style="margin-top:12px;font-size:14px;font-weight:600;color:#0f172a;${FONT}">Written tests this week</div>${tbl(null, tests, 'No written tests this week.', 3)}
      </td></tr></table></td></tr>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;width:100%;background:#ffffff;border-radius:12px;">
  <tr><td style="padding:24px 24px 16px;background:#4f46e5;border-radius:12px 12px 0 0;${FONT}">
    <div style="font-size:13px;color:#c7d2fe;">⚡ Electronics Academy · ${esc(r.program.title)}</div>
    <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">Weekly Team Report</div>
    <div style="font-size:14px;color:#e0e7ff;margin-top:4px;">${esc(fmtDate(r.period.start, tz))} – ${esc(fmtDate(r.period.end, tz))} · ${r.program.coreHours}-hour core program, 4 phases</div>
  </td></tr>
  <tr><td style="padding:20px 24px;">
    <div style="font-size:16px;font-weight:700;color:#0f172a;${FONT}">Team summary</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin-top:8px;"><tr>
      ${stat('Avg hours credited', `${t.averageCreditedHours == null ? '—' : t.averageCreditedHours} h`, `${pct(t.averagePercent)} of ${r.program.coreHours} h · ${t.memberCount} learners`)}
      ${stat('Hours logged (week)', hrs(t.hoursLoggedThisWeek), `+${t.hoursCreditedThisWeek} h credited · ${t.activeThisWeek}/${t.memberCount} active`)}
      ${stat('Modules completed (week)', t.modulesCompletedThisWeek, `${t.lessonsThisWeek} lesson${t.lessonsThisWeek === 1 ? '' : 's'} done`)}
      ${stat('Written tests (week)', t.writtenTestsThisWeek, `${t.writtenPassRateThisWeek == null ? '—' : t.writtenPassRateThisWeek + '% passed'} · avg ${pct(t.averageWrittenPercentThisWeek)}`)}
    </tr></table>
    <div style="font-size:13px;color:#64748b;margin-top:6px;${FONT}">First-attempt written pass rate ${pct(t.firstAttemptPassRate)}</div>

    ${H2('Safety status (Level 0: Module 1 Safety + Module 2 ESD, 100% required)')}
    <div style="font-size:13px;color:#475569;margin-top:4px;${FONT}">${t.safety.cleared} cleared · ${t.safety.partial} partial · ${t.safety.notCleared} not cleared. Hands-on Modules 15–20 stay locked until both Level 0 written tests are passed at 100%.</div>
    ${tbl(['Learner', 'M1 Safety', 'M2 ESD', 'Status'], safetyRows, 'No learners.')}

    ${H2('Phase progress')}
    ${tbl(['Phase', 'Hours', 'Team average', 'Finished'], phaseRows, '')}

    ${H2('Leaderboard (credited hours)')}
    ${tbl(['#', 'Learner', 'Hours', 'Status'], leaderboard, 'No learners.')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
      <td width="50%" valign="top" style="padding:12px;background:#ecfdf5;border-radius:8px;${FONT}font-size:13px;color:#064e3b;">
        <strong>🚀 Ahead</strong><ul style="margin:6px 0 0;padding-left:18px;">${listPeople(t.ahead, 'Nobody is far ahead of the team.')}</ul></td>
      <td width="8"></td>
      <td width="50%" valign="top" style="padding:12px;background:#fff7ed;border-radius:8px;${FONT}font-size:13px;color:#7c2d12;">
        <strong>⚑ Behind / needs attention</strong><ul style="margin:6px 0 0;padding-left:18px;">${listPeople(t.behind, 'Everyone is on track.')}</ul></td>
    </tr></table>

    ${t.pendingInvites.length ? `<div style="font-size:13px;color:#92400e;background:#fef3c7;border-radius:8px;padding:10px 12px;margin-top:14px;${FONT}">✉️ Invite pending (not counted above): ${t.pendingInvites.map((p) => esc(p.name) + ' &lt;' + esc(p.email) + '&gt;').join(', ')}</div>` : ''}
    ${H2('Individual progress')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${memberSections}</table>

    <div style="font-size:12px;color:#94a3b8;margin-top:24px;line-height:1.5;${FONT}">Generated ${esc(fmtDT(r.generatedAt, tz))}. ${esc(r.rules.completion)} ${esc(r.rules.standing)} Hours credited = planned hours of completed modules; hours logged = time entered by learners and admins. Optional advanced modules are not counted toward the ${r.program.coreHours} hours.</div>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

module.exports = { buildWeeklyReport, renderReportHtml, AHEAD_HOURS };
