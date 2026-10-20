// C. Project Planning Phase: C1 Project Planning (backlog, iterations, tracker, velocity, burndown).
const path = require('path');
const { p, h1, h2, bullets, note, table, header, image, save } = require('./lib');

const OUT = 'D:/TheStaffSync/project-documentation/C-Project-Planning';
const DIA = 'D:/TheStaffSync/project-documentation/diagrams';
const TEAM = 'sprashasti¹';

// [iteration, epic, story no., story/task, points, priority, team, commit]
const BACKLOG = [
  ['Iteration-1', 'Foundation', 'T-01', 'Requirements analysis: modules, roles, API plan, roadmap (Phase 0)', 2, 'High', '24441d0'],
  ['', 'Foundation', 'T-02', 'Project set-up: Express server, React client, health check, CORS, single Axios client (Phase 1)', 3, 'High', 'b9bbf6b, 4b19169'],
  ['Iteration-2', 'Foundation', 'T-03', 'MongoDB connection and Mongoose models (Phase 2)', 5, 'High', '1ddd65a'],
  ['', 'Foundation', 'T-04', 'Backend foundation: response envelope, error mapping, validation (Phase 3)', 3, 'High', '7b7a6c3'],
  ['', 'FR-1 Authentication', 'US-02', 'As a user, I can log in with my email and password (Phase 4)', 3, 'High', '2656b86'],
  ['', 'FR-3 People', 'T-05', 'Role-based access control, seed script, employee read endpoints (Phase 5)', 5, 'High', '3320edb'],
  ['', 'FR-3 People', 'US-05–07', 'HR adds, updates, deactivates people; people edit own contact details (Phase 6)', 8, 'High', '57ac44d'],
  ['', 'FR-4 Attendance', 'US-08–10', 'Check-in / check-out and attendance history for self, team and company (Phase 7)', 5, 'High', '1891fc6'],
  ['', 'FR-5 Leave', 'US-11–14', 'Apply, approve, reject; decide-once; per-employee time zones (Phase 8)', 8, 'High', 'f6167d8'],
  ['', 'FR-6/7 Insight', 'US-15–16', 'Role dashboards and HR reports (Phase 9)', 8, 'High', 'd56df40'],
  ['', 'FR-8/9 Content', 'US-17–19', 'Announcements and training with enrolment and capacity (Phase 10)', 8, 'Medium', 'c07661d'],
  ['', 'FR-10 Notifications', 'US-20', 'Notifications for leave, announcements and training (Phase 11)', 3, 'Medium', 'be224c0'],
  ['Iteration-3', 'Frontend', 'T-06', 'Frontend foundation: auth pages, session, protected routes, layout (Phase 12)', 5, 'High', '6595301'],
  ['', 'Frontend', 'T-07', 'Role dashboards and every page on the real API (Phase 13)', 13, 'High', '320ace4'],
  ['', 'Frontend', 'T-08', 'StaffSync design system: light and dark themes', 3, 'Medium', '3acf109'],
  ['', 'Quality', 'T-09', 'API test suite, end-to-end leave workflow, manual UI checklist (Phase 14)', 8, 'High', '1ab07ac'],
  ['', 'FR-1 Authentication', 'US-04', 'Security hardening, including password change (Phase 15)', 5, 'High', '1856819'],
  ['', 'FR-1 Authentication', 'US-03', 'Forgot-password email reset', 3, 'Medium', '778ac14'],
  ['', 'Quality', 'T-10', 'Pagination and measured optimisation (Phase 16)', 5, 'Medium', 'ca19cab'],
  ['', 'Quality', 'T-11', 'Acceptance check against the requirements (Phase 17)', 2, 'Medium', '5ea528f'],
  ['', 'Operations', 'T-12', 'Deployment configuration and production page serving (Phase 18)', 3, 'Medium', '9be2131'],
  ['Iteration-4', 'FR-3 People', 'T-13', 'Align role permissions with the brief', 2, 'High', '60da258'],
  ['', 'FR-1 Authentication', 'T-14', 'Fix: refuse unknown fields on login', 1, 'High', 'f067b80'],
  ['', 'FR-2 Organisations', 'US-01, US-23', 'Multi-tenant organisations: sign-up, isolation, settings (Phase 19)', 13, 'High', 'ef38f5d'],
  ['', 'FR-11 Demo', 'US-21', 'Public demo with one-click sign-in and nightly reset (Phase 20)', 5, 'Low', '187cd38'],
  ['', 'FR-12 Platform', 'US-22', 'Platform admin console: organisations, suspend, audit log (Phase 21)', 8, 'Medium', '0bdd696'],
  ['', 'Frontend', 'T-15', 'Fix: layout properties no longer read by MUI 9', 1, 'Medium', 'f90515c'],
];
const sum = (it) => {
  let current = '';
  return BACKLOG.reduce((acc, row) => { if (row[0]) current = row[0]; return current === it ? acc + row[4] : acc; }, 0);
};
const ITER = ['Iteration-1', 'Iteration-2', 'Iteration-3', 'Iteration-4'];
const totals = ITER.map(sum);
const TOTAL = totals.reduce((a, b) => a + b, 0);
if (TOTAL !== 138 || totals.join() !== '5,56,47,30') throw new Error(`Backlog totals changed: ${totals} = ${TOTAL}; update the burndown chart`);

const c1 = () => save(path.join(OUT, 'C1-Project-Planning.docx'), [
  ...header({ phase: 'Project Planning Phase', title: 'Project Planning Template (Product Backlog, Sprint Planning, Stories, Story points)', marks: '5 Marks' }),
  note('Evidence basis: StaffSync was built in numbered development phases rather than formally planned sprints, and no story-point estimates or planned dates were recorded. The four iterations below group those phases by when they were committed (git history, 6–8 October 2026). Story points are retrospective estimates on a Fibonacci scale, made when this document was written, so velocity and the burndown are illustrative of relative effort, not a record of planning accuracy.'),
  h1('Product Backlog, Sprint Schedule, and Estimation (4 Marks)'),
  table(['Sprint', 'Functional Requirement (Epic)', 'User Story Number', 'User Story / Task', 'Story Points', 'Priority', 'Team Members', 'Delivered in commit'],
    BACKLOG.map((r) => [r[0], r[1], r[2], r[3], String(r[4]), r[5], TEAM, r[6]]), [10, 13, 9, 34, 7, 7, 10, 10]),
  p('¹ Team members: the git history records one author, `sprashasti`. Every commit also records an AI coding assistant (Claude) as co-author. Any other team members are not recorded and are to be confirmed.'),
  p('Story numbers US-xx are the user stories in B3; T-xx are technical tasks with no user-facing story.'),
  h1('Project Tracker, Velocity & Burndown Chart (1 Mark)'),
  table(['Sprint', 'Total Story Points', 'Duration (first to last commit)', 'Sprint Start Date', 'Sprint End Date (Planned)', 'Story Points Completed (as on Planned End Date)', 'Sprint Release Date (Actual)'], [
    ['Iteration-1', String(totals[0]), 'Single commit batch', '6 Oct 2026', 'Not recorded', `${totals[0]} (by actual end)`, '6 Oct 2026, 23:13'],
    ['Iteration-2', String(totals[1]), '12:32–14:50 (2 h 18 min)', '7 Oct 2026', 'Not recorded', `${totals[1]} (by actual end)`, '7 Oct 2026, 14:50'],
    ['Iteration-3', String(totals[2]), '14:55–17:05 (2 h 10 min)', '7 Oct 2026', 'Not recorded', `${totals[2]} (by actual end)`, '7 Oct 2026, 17:05'],
    ['Iteration-4', String(totals[3]), '7 Oct 20:09 – 8 Oct 13:18', '7 Oct 2026', 'Not recorded', `${totals[3]} (by actual end)`, '8 Oct 2026, 13:18'],
  ], [11, 10, 17, 12, 12, 20, 18]),
  p('Commit times show when work was saved, not how long it took; work before the first commit of an iteration is not visible in the history. Planned end dates were never set, so completion “as on planned end date” cannot be stated; the column shows points completed by the actual end.'),
  h2('Velocity'),
  p(`Velocity is the number of story points completed per iteration. Across four iterations the team completed ${TOTAL} points, so the average velocity is ${TOTAL} ÷ 4 = ${(TOTAL / 4).toFixed(1)} points per iteration. The iterations differ greatly in length (from one commit batch to most of a day), so per-iteration velocity varies from ${Math.min(...totals)} to ${Math.max(...totals)} points and should not be used to forecast future work until iterations have a fixed length.`),
  table(['Iteration', 'Points completed', 'Cumulative', 'Remaining'], (() => {
    let cum = 0;
    return ITER.map((it, i) => { cum += totals[i]; return [it, String(totals[i]), String(cum), String(TOTAL - cum)]; });
  })(), [25, 25, 25, 25]),
  h2('Burndown chart'),
  ...image(path.join(DIA, 'burndown.png'), 620, 'Figure 1 — Release burndown (retrospective story points)'),
  h2('Work after Iteration 4'),
  bullets([
    'Since 8 October 2026 further work has been done on the public pages (landing page design, an inline log-in / sign-up panel, a redesigned demo section, office-scene backgrounds, and fixes to the login dialog). At the time of writing (17 October 2026) this work is not committed, so it is not counted in the backlog or burndown above.',
    'Open backlog candidates (not scheduled): leave balances and allowances, public-holiday calendar, employee cancellation of leave, email notifications, plans and billing (README “Known limitations”).',
  ]),
]);

(async () => console.log('wrote', await c1()))().catch((e) => { console.error(e); process.exit(1); });
