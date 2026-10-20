// A. Ideation Phase: A1 Empathy Map Canvas, A2 Problem Statements, A3 Brainstorm & Idea Prioritisation.
const path = require('path');
const { p, h1, h2, bullets, note, table, header, image, save } = require('./lib');

const OUT = 'D:/TheStaffSync/project-documentation/A-Ideation';
const DIA = 'D:/TheStaffSync/project-documentation/diagrams';
const ASSUMED = 'Evidence basis: StaffSync has no recorded user interviews, surveys or observation notes. The personas and statements below are assumptions drawn from the problems that StaffSync’s requirements (docs/PHASE-0-REQUIREMENTS.md) and implemented features address. They should be validated with real HR staff, managers and employees.';

const a1 = async () => save(path.join(OUT, 'A1-Empathy-Map-Canvas.docx'), [
  ...header({ phase: 'Ideation Phase', title: 'Empathize & Discover', marks: '4 Marks' }),
  h1('Empathy Map Canvas'),
  p('Understand the needs, frustrations and behaviour of the three groups of people who use an HR management system every day — HR administrators, managers and employees — before defining the problems StaffSync must solve.'),
  note(ASSUMED),
  ...image(path.join(DIA, 'empathy-map.png'), 640, 'Figure 1 — Empathy map canvas for StaffSync’s three user roles'),
  h2('Canvas content by role'),
  p('The same content as the canvas, as a table so it can be read and reviewed line by line.'),
  table(['Canvas area', 'HR Administrator', 'Manager', 'Employee'], [
    ['Goal', 'Keep accurate people records and run attendance and leave for the whole company without chasing paperwork.', 'Decide the team’s leave quickly and know who is working today.', 'Record attendance and apply for leave easily, and know the outcome.'],
    ['What do they need to DO?', 'Add people with roles and reporting lines; see company attendance and every leave request; post announcements and organise training; produce attendance and leave reports.', 'Review and decide team leave; see team attendance at a glance; assign team members to training; share updates with the team.', 'Check in and out; apply for leave and follow its status; read announcements; enrol in training.'],
    ['What do they HEAR?', 'Employees asking whether leave was approved; managers asking who is in; month-end requests for attendance figures.', 'Team members asking about requests; HR asking for overdue decisions; clashes when two people are off together.', 'Announcements second-hand; nothing back after asking for leave; different answers from HR and the manager.'],
    ['THINK & FEEL — Pains', 'Records split across spreadsheets, email and paper; attendance counted by hand; no single list of pending leave.', 'Requests by email and chat get missed; no view of overlapping leave; no quick view of today’s attendance.', 'No confirmation a request was received; no record of why leave was refused; missed announcements and training.'],
    ['THINK & FEEL — Gains', 'One place for people, attendance and leave; reports calculated from the records; control over who sees and changes what.', 'A queue of pending team requests; a notification when one arrives; a “team today” view.', 'Visible status (pending, approved, rejected with reason); a notification on decision; own attendance history.'],
    ['What do they SAY? (illustrative)', '“I spend hours putting attendance together at month end.” “I can’t tell which requests are still waiting.”', '“I found a leave request in my inbox a week late.” “I don’t know who is in until I walk round.”', '“I don’t know if my manager has even seen my request.” “I only heard about the training after it was full.”'],
    ['What do they DO today?', 'Maintains spreadsheets; forwards leave emails; sends notices by email.', 'Replies to leave emails; keeps personal notes of who is off; passes HR notices on by hand.', 'Emails or messages the manager; follows up in person; keeps own record of days off.'],
  ], [16, 28, 28, 28]),
  h2('How the canvas shaped StaffSync'),
  table(['Pain', 'StaffSync response (implemented)', 'Where in the product'], [
    ['Records scattered; counted by hand', 'Attendance recorded at check-in and check-out; reports calculated by the server', 'Attendance pages; HR Reports (`/api/reports/*`)'],
    ['Leave requests lost in email', 'Leave requests stored with status; managers see a pending team queue; the manager (or HR when there is no manager) is notified', 'Leave pages; notifications (`notificationService.leaveRequested`)'],
    ['No outcome or reason for the employee', 'Status shown to the employee; a rejection requires a reason; the employee is notified of every decision', '`PUT /api/leaves/:id/reject` requires `rejectionReason`; `leaveDecided` notification'],
    ['Missed announcements and training', 'Announcements targeted by audience with a notification; training shows seats left and enrolment', 'Announcements and Training pages'],
    ['Unclear who can do what', 'Three roles enforced on the server for every request', '`protect` + `authorize(roles)` middleware'],
  ], [30, 42, 28]),
  p('Reference: https://www.mural.co/templates/empathy-map-canvas'),
]);

const a2 = async () => save(path.join(OUT, 'A2-Problem-Statements.docx'), [
  ...header({ phase: 'Ideation Phase', title: 'Define the Problem Statements', marks: '2 Marks' }),
  h1('Customer Problem Statement Template'),
  p('To define the core problems HR administrators, managers and employees face when attendance, leave and company communication are handled by spreadsheet, email and word of mouth, and to use those problems to guide the development of StaffSync.'),
  note(ASSUMED),
  ...image(path.join(DIA, 'problem-statements.png'), 640, 'Figure 1 — Customer problem statement canvas'),
  p('Reference: https://miro.com/templates/customer-problem-statement/'),
  table(['Problem Statement (PS)', 'I am (Customer)', 'I’m trying to', 'But', 'Because', 'Which makes me feel'], [
    ['PS-1', 'An HR administrator responsible for the whole company’s people records', 'keep attendance and leave records accurate and up to date', 'the records are spread across spreadsheets, emails and paper', 'nothing captures attendance and leave at the moment they happen', 'overloaded, and unsure whether the figures I report are right'],
    ['PS-2', 'A manager with a team of direct reports', 'decide my team’s leave quickly and know who is working today', 'requests reach me by email and chat and are easy to miss', 'there is no shared queue of requests and no status anyone can see', 'frustrated, and blamed for decisions I never saw'],
    ['PS-3', 'An employee', 'apply for leave and know the outcome so I can plan', 'I hear nothing until I chase my manager or HR', 'a request has no visible status and no recorded reason when refused', 'anxious and unable to make plans'],
  ], [12, 18, 18, 18, 17, 17]),
  h2('Traceability to the empathy map and the solution'),
  table(['PS', 'Empathy map pain (A1)', 'StaffSync requirement that answers it (B1)'], [
    ['PS-1', 'HR: records split across tools; totals counted by hand', 'FR-4 Attendance, FR-5 Leave, FR-7 Reports'],
    ['PS-2', 'Manager: requests missed; no view of today', 'FR-5 Leave (team queue, decisions), FR-6 Dashboards, FR-10 Notifications'],
    ['PS-3', 'Employee: no confirmation, no reason', 'FR-5 Leave (status, mandatory rejection reason), FR-10 Notifications'],
  ], [10, 45, 45]),
]);

const a3 = async () => save(path.join(OUT, 'A3-Brainstorm-and-Idea-Prioritisation.docx'), [
  ...header({ phase: 'Ideation Phase', title: 'Brainstorm & Idea Prioritization Template', marks: '4 Marks' }),
  h1('Brainstorm & Idea Prioritisation'),
  p('Brainstorming gives everyone an open space to suggest solutions, favouring volume over value at first and building on each other’s ideas. The ideas are then grouped and ranked by importance and feasibility, so the most valuable, achievable features are built first.'),
  note('Evidence basis: no record of a brainstorming session (participants, date, sticky notes) exists in the project. This document reconstructs the idea set from what was built (git history, phases 1–21, 6–8 October 2026) and what was considered and left open (README “Known limitations”). The importance and feasibility placements are a retrospective judgement, not session votes.'),
  p('Reference: https://www.mural.co/templates/brainstorm-and-idea-prioritization'),
  h2('Step 1 — Team gathering, collaboration and the problem statement'),
  table(['Item', 'Content'], [
    ['Participants', 'Not recorded. The git history has a single author (`sprashasti`).'],
    ['Problem selected', 'PS-2 and PS-3 together (A2): leave and attendance are handled by email and memory, so managers miss requests and employees never learn the outcome.'],
    ['“How might we…”', 'How might we give HR, managers and employees one trustworthy place where attendance and leave are recorded once, decided visibly and reported automatically?'],
    ['Ground rules', 'Stay on topic · defer judgement · go for volume · build on others’ ideas · encourage wild ideas · be visual'],
  ], [25, 75]),
  h2('Step 2 — Brainstorm, idea listing and grouping'),
  table(['Group', 'Ideas'], [
    ['A. People and access', 'Three roles (Employee, Manager, HR) enforced on the server · accounts created by HR, no self-registration · employee profiles with department, designation and reporting line · several companies on one installation, each isolated · last active HR can never be removed'],
    ['B. Daily operations', 'One-click check-in and check-out with server time · half day under 4 hours · leave application with approve / reject workflow · overlap detection · decide-once rule · per-employee time zones · leave balances and allowances · public-holiday calendar · employee cancels own leave · biometric or GPS check-in'],
    ['C. Communication', 'In-app notifications for leave, announcements and training · announcements targeted by audience · training sessions with seats, enrolment and assignment · email notifications · real-time chat'],
    ['D. Insight', 'A dashboard per role · HR reports for attendance, leave, departments and training · exports to spreadsheet · performance reviews'],
    ['E. Adoption and operations', 'Company self sign-up · public demo with sample data reset nightly · platform administrator console with suspend and audit log · plans and billing · native mobile app · payroll'],
  ], [22, 78]),
  h2('Step 3 — Idea prioritisation'),
  p('Each idea is placed by importance (value to HR, managers and employees) and feasibility (effort, complexity, dependencies). Blue ideas have been built; amber ideas have not.'),
  ...image(path.join(DIA, 'idea-priority-grid.png'), 600, 'Figure 1 — Importance × feasibility grid'),
  table(['Priority bucket', 'Ideas', 'Outcome (verified)'], [
    ['High importance, feasible — do first', 'Leave workflow; role-based access; check-in / check-out; HR-managed accounts and reporting lines; notifications; dashboards; HR reports; announcements; training', 'Built in phases 4–13 (7 October 2026)'],
    ['High importance, harder — plan carefully', 'Multi-company isolation', 'Built in phase 19 (8 October 2026), with a written plan (docs/PHASE-19-MULTITENANCY-PLAN.md)'],
    ['Medium importance — when capacity allows', 'Public demo; platform admin console; per-employee time zones', 'Built (phases 8, 20, 21)'],
    ['Next candidates', 'Leave balances and allowances; public-holiday calendar; employee cancels own leave; email notifications', 'Not built — listed in README “Known limitations”'],
    ['Later / not now', 'Plans and billing; performance reviews; native mobile app; payroll; biometric or GPS check-in; real-time chat; spreadsheet export', 'Not built and not started'],
  ], [26, 46, 28]),
]);

(async () => {
  for (const f of [a1, a2, a3]) console.log('wrote', await f());
})().catch((e) => { console.error(e); process.exit(1); });
