// B. Requirement Analysis: B1 Solution Requirements, B2 Technology Stack, B3 DFD & User Stories.
const path = require('path');
const { p, h1, h2, h3, bullets, note, table, header, image, save } = require('./lib');

const OUT = 'D:/TheStaffSync/project-documentation/B-Requirement-Analysis';
const DIA = 'D:/TheStaffSync/project-documentation/diagrams';

const FR = [
  ['FR-1', 'Authentication and sessions', 'Log in with email and password and receive a JWT (`POST /api/auth/login`)\nView the signed-in user, employee profile and organisation (`GET /api/auth/me`)\nChange own password with the current password; older sessions end (`PUT /api/auth/password`)\nForgot / reset password by emailed single-use link, valid 30 minutes (`/api/auth/forgot-password`, `/reset-password`)\nSign out by discarding the token in the browser', 'Implemented'],
  ['FR-2', 'Organisation onboarding and settings', 'A company signs up; the person signing up becomes its first HR user, created in one transaction (`POST /api/organisations/signup`)\nEvery role sees its organisation’s name and settings (`GET /api/organisations/me`)\nHR changes the name, time zone and working days (`PUT /api/organisations/me`)', 'Implemented'],
  ['FR-3', 'People management', 'HR lists, creates, updates, deactivates and reactivates people of any role (`/api/employees`)\nEmployee numbers EMP0001… assigned per organisation\nPeople edit only their own phone and address\nManagers list their direct reports (`GET /api/employees/team`)\nNobody changes their own role or deactivates themselves; the last active HR cannot be removed', 'Implemented'],
  ['FR-4', 'Attendance', 'Check in and check out with server time, once per day (`POST /api/attendance/check-in`, `/check-out`)\nToday’s status (`GET /api/attendance/today`)\nOwn history; team history (manager); company history with filters (HR)\nUnder 4 hours counts as a half day', 'Implemented'],
  ['FR-5', 'Leave management', 'Employees and managers apply: casual, sick, earned or unpaid; dates and reason (`POST /api/leaves`)\nUp to 60 days per request; sick leave may start up to 30 days in the past, other types not in the past; overlapping requests refused (409)\nOwn, team (manager) and all (HR) lists with filters\nThe applicant’s direct manager or HR approves or rejects; rejection needs a reason; nobody decides their own leave\nA request is decided exactly once (atomic update)', 'Implemented'],
  ['FR-6', 'Role dashboards', 'Employee: today’s status, this month’s attendance, pending and upcoming leave, trainings\nManager: team size, team today, pending team leave\nHR: headcount by role, departments, today’s attendance, pending and approved leave, trainings (`/api/dashboard/:role`)', 'Implemented'],
  ['FR-7', 'HR reports', 'Department statistics, attendance summary for a date range, leave summary, training summary (`/api/reports/*`, HR only)', 'Implemented'],
  ['FR-8', 'Announcements', 'Everyone reads announcements meant for their audience (all / employees / managers)\nHR and managers post; managers edit and delete only their own posts (`/api/announcements`)', 'Implemented'],
  ['FR-9', 'Training', 'Browse trainings with seats left; HR and managers create, edit and delete (managers only their own)\nEmployees and managers enrol and withdraw; capacity enforced; enrolment closes when the training starts\nHR assigns anyone; managers assign their direct reports (`/api/trainings`)', 'Implemented'],
  ['FR-10', 'Notifications', 'Stored notifications for leave requested / decided, new announcements, training changes, assignments and cancellations\nList with read filter and pages; mark one or all as read (`/api/notifications`)', 'Implemented (in-app only; no email notifications)'],
  ['FR-11', 'Public demo', 'Visitors sign in to a sample organisation as HR, manager or employee in one click (`/api/demo`)\nDemo guards: no password or settings changes, demo email domain only\nThe demo organisation is reset to its baseline at 03:00 in its time zone', 'Implemented'],
  ['FR-12', 'Platform administration', 'Separate platform-admin accounts, created only from the command line, with their own login\nStatistics, organisation list and detail, rename, suspend with reason, reactivate\nAudit log of every change (`/api/platform/*`)', 'Implemented'],
];

const NFR = [
  ['NFR-1', 'Security', 'Only authenticated, authorised users reach data; credentials and tokens resist common attacks', 'bcrypt cost 12; JWT HS256 with a ≥32-character secret checked at start-up; account, role, organisation status and password changes re-checked on every request; failed-login limit 5 per 15 minutes per account and address; Helmet headers; CORS allow-list; field whitelists refuse unknown fields and operator injection', '`auth.test.js`, `security.test.js` (passed 17 Oct 2026)'],
  ['NFR-2', 'Tenant isolation', 'One organisation can never read or change another’s data', '`tenantScoped` Mongoose plugin scopes every query, update, delete and aggregation; a query with no organisation context throws; organisation taken from the database record, never the request', '`tenant-isolation.test.js` in strict mode (passed)'],
  ['NFR-3', 'Data integrity and reliability', 'Concurrent actions never create duplicate or contradictory records', 'Unique index on employee + day for attendance; atomic status change for leave decisions; transaction for organisation sign-up; capacity check for training; notification failures never block the action', 'Concurrency tests: 5 simultaneous check-ins → 1 success; decide-once race; ten people racing for two seats (passed)'],
  ['NFR-4', 'Performance', 'Proposed target: median response under 500 ms for dashboards, lists and reports with a 500-person company (no target was set during development)', 'Indexes on every main query; one aggregation per request for the signed-in user; paginated lists', 'Benchmark 17 Oct 2026: 20 of 21 endpoints met the target; the 60-day attendance report median was 520 ms (see E2)'],
  ['NFR-5', 'Scalability', 'Lists and reports stay usable as data grows', 'Every growing list paginated with `limit` capped at 100; index-only plans verified with `explain()`; stateless JWT API', 'Benchmark query plans (no collection scans). Limit: rate limits are held in memory, so several server instances would need a shared store'],
  ['NFR-6', 'Usability and accessibility', 'Clear, responsive interface for all three roles', 'Responsive layout (phone, tablet, desktop); light and dark themes; visible keyboard focus; British date format and 24-hour clock; loading, empty and error states', 'Manual checklist `docs/E2E-CHECKLIST.md` section E — not yet executed by users; spot checks in headless Chrome during development'],
  ['NFR-7', 'Availability and deployability', 'The service can be deployed repeatably and monitored', '`/api/health` reports API and database state; Render blueprint with health check; graceful shutdown; start-up configuration checks', 'Configured, not verified live: no deployment URL or uptime measurement exists. Availability target: to be agreed'],
  ['NFR-8', 'Maintainability and testability', 'Changes can be made safely', '170 API tests against a throwaway database; 8 client tests; lint; GitHub Actions CI on every push and pull request', '`npm test` 170/170 and client 8/8 passed on 17 Oct 2026 (saved in `evidence/`)'],
];

const b1 = () => save(path.join(OUT, 'B1-Solution-Requirements.docx'), [
  ...header({ phase: 'Requirement Analysis', title: 'Solution Requirements (Functional & Non-functional)', marks: '4 Marks' }),
  h1('Functional Requirements'),
  p('Following are the functional requirements of StaffSync. Every requirement is taken from the implemented API (65 endpoints in 13 route files under `server/routes`) and the pages in `client/src`. The status column was checked against the code on 17 October 2026.'),
  table(['FR No.', 'Functional Requirement (Epic)', 'Sub Requirement (Story / Sub-Task)', 'Status'], FR, [8, 18, 60, 14]),
  h2('Roles and permissions (summary)'),
  table(['Capability', 'Employee', 'Manager', 'HR'], [
    ['Check in / out, own attendance', '✓', '✓', '✓'],
    ['Team attendance and leave', '—', 'Direct reports', 'Everyone'],
    ['Apply for leave', '✓', '✓', '—'],
    ['Approve / reject leave', '—', 'Direct reports, never own', 'Anyone, never own'],
    ['Create and manage people', '—', '—', '✓'],
    ['Post announcements', '—', '✓ (edit own)', '✓ (edit any)'],
    ['Create trainings', '—', '✓ (edit own)', '✓ (edit any)'],
    ['Enrol in training', '✓', '✓', '—'],
    ['Reports, company settings', '—', '—', '✓'],
  ], [40, 20, 20, 20]),
  p('Full matrix: `docs/RBAC.md` in the repository.'),
  h1('Non-functional Requirements'),
  p('Following are the non-functional requirements. Each one states how StaffSync meets it and what evidence exists. Where no target was agreed or no measurement exists, the table says so.'),
  table(['NFR No.', 'Non-Functional Requirement', 'Description', 'How StaffSync meets it', 'Evidence'], NFR, [8, 13, 22, 33, 24]),
  h2('Out of scope for the current release'),
  bullets(['Leave balances and allowances; leave counts calendar days, weekends included', 'Public-holiday calendar (holidays count as absences in reports)', 'Employee cancellation of a leave request', 'Email notifications (in-app only)', 'Plans and billing', 'Automated browser tests (the interface is checked by a manual checklist)']),
  p('Source: README “Known limitations”.'),
]);

const b2 = () => save(path.join(OUT, 'B2-Technology-Stack.docx'), [
  ...header({ phase: 'Requirement Analysis', title: 'Technology Stack (Architecture & Stack)', marks: '4 Marks' }),
  h1('Technical Architecture'),
  p('StaffSync uses a three-tier MERN architecture. The presentation tier is a React single-page application; the application tier is a Node.js and Express REST API; the data tier is MongoDB, accessed through Mongoose. In production one Render web service runs the API and serves the built React app from the same address. Password-reset emails go through any SMTP provider. Versions below are from `client/package.json`, `server/package.json`, `render.yaml` and `.github/workflows/ci.yml`.'),
  p('The architecture diagram is in D3 — Solution Architecture.'),
  h2('Table-1: Components & Technologies'),
  table(['S.No', 'Component', 'Description', 'Technology'], [
    ['1', 'User Interface', 'Web interface for HR, managers, employees and platform administrators; responsive, light and dark themes', 'React 19, Material UI 9 (Emotion), React Router 7'],
    ['2', 'Client state and API access', 'Session state in Redux; one Axios client per account type attaches the token and normalises errors', 'Redux Toolkit 2, React Redux 9, Axios 1'],
    ['3', 'Build tooling', 'Development server, production build, lint', 'Vite 8 with @vitejs/plugin-react 6; oxlint'],
    ['4', 'Application Logic-1: API', 'REST endpoints for authentication, organisations, people, attendance, leave, dashboards, reports, announcements, training, notifications, demo and platform administration', 'Node.js 24 (CI and Render; server supports ≥ 20.6), Express 5'],
    ['5', 'Application Logic-2: security', 'Token authentication, password hashing, headers, rate limits, input validation', 'jsonwebtoken 9 (HS256), bcryptjs 3, Helmet 8, express-rate-limit 8, express-validator 7, cors'],
    ['6', 'Application Logic-3: services', 'Notifications, statistics, password reset email, nightly demo reset', 'Plain Node.js modules; Nodemailer 10 for SMTP'],
    ['7', 'Database', '11 collections: organisations, users, employees, attendance, leaves, announcements, trainings, notifications, platform admins, platform audit log, counters', 'MongoDB (Atlas; replica set needed for transactions), Mongoose 9'],
    ['8', 'Configuration', 'Secrets and settings outside the code', 'dotenv; `.env.example` templates'],
    ['9', 'Testing', 'API tests over HTTP against throwaway databases; client unit tests', 'Node.js built-in test runner (`node --test`)'],
    ['10', 'CI', 'Lint, tests and build on every push and pull request', 'GitHub Actions; MongoDB 7 replica set in Docker'],
    ['11', 'Hosting', 'One web service: API and static app; health check `/api/health`', 'Render (blueprint `render.yaml`)'],
  ], [7, 20, 43, 30]),
  h2('Table-2: Application Characteristics'),
  table(['S.No', 'Characteristics', 'Description', 'Technology'], [
    ['1', 'Open-Source Frameworks', 'All frameworks and libraries are open source', 'React, Express, Mongoose, Material UI, Vite'],
    ['2', 'Security Implementations', 'Hashed passwords; signed, expiring tokens re-checked on every request; role checks; rate limits; strict headers and CSP; whitelisted input', 'bcryptjs (cost 12), JWT HS256, Helmet, express-rate-limit, express-validator'],
    ['3', 'Multi-tenancy', 'Many companies share one installation; each sees only its own data', 'Mongoose plugin `tenantScoped` with AsyncLocalStorage request context'],
    ['4', 'Scalable Architecture', 'Stateless REST API; indexed queries; paginated lists (max 100 per page)', 'Express, MongoDB indexes'],
    ['5', 'Availability', 'Health endpoint reporting the database state; graceful shutdown; configuration checked at start-up', 'Express, Render health check'],
    ['6', 'Performance', 'Measured with a 500-person benchmark; one aggregation per request to load the user', '`npm run bench` (see E2)'],
  ], [7, 20, 43, 30]),
  h2('References'),
  bullets(['React — https://react.dev', 'Express 5 — https://expressjs.com', 'Mongoose — https://mongoosejs.com/docs/', 'MongoDB Atlas — https://www.mongodb.com/docs/atlas/', 'Material UI — https://mui.com/material-ui/', 'JSON Web Tokens (RFC 7519) — https://datatracker.ietf.org/doc/html/rfc7519', 'Helmet — https://helmetjs.github.io', 'Render blueprints — https://render.com/docs/blueprint-spec']),
]);

const US = [
  ['Visitor', 'FR-2', 'US-01', 'As a company representative, I can sign up my organisation and become its first HR user.', 'Organisation and HR account created together; I land on the HR dashboard; an email already in use is refused (409).', 'High', 'Phase 19'],
  ['All users', 'FR-1', 'US-02', 'As a user, I can log in with my email and password.', 'Valid details return a token and open my role’s dashboard; wrong details show “Invalid email or password”; the 6th failure in 15 minutes is refused (429).', 'High', 'Phase 4'],
  ['All users', 'FR-1', 'US-03', 'As a user, I can reset a forgotten password by email.', 'Same reply whether or not the email exists; the link works once and expires after 30 minutes; all sessions end.', 'Medium', 'Phase 15+'],
  ['All users', 'FR-1', 'US-04', 'As a user, I can change my password.', 'Current password required; other devices are signed out.', 'Medium', 'Phase 15'],
  ['HR', 'FR-3', 'US-05', 'As HR, I can add a person with a role, department, designation and manager.', 'Person created with the next EMP number; duplicate email refused; the manager must be an active manager in my organisation, with no reporting loop.', 'High', 'Phase 6'],
  ['HR', 'FR-3', 'US-06', 'As HR, I can deactivate and reactivate a person.', 'Deactivated users are signed out at once and keep their history; I cannot deactivate myself or the last HR.', 'High', 'Phase 6'],
  ['Employee', 'FR-3', 'US-07', 'As an employee, I can update my phone and address.', 'Only those fields change; other fields are refused.', 'Medium', 'Phase 6'],
  ['Employee', 'FR-4', 'US-08', 'As an employee, I can check in and check out.', 'Server time is used; a second check-in the same day is refused (409); under 4 hours is a half day.', 'High', 'Phase 7'],
  ['Employee', 'FR-4', 'US-09', 'As an employee, I can see my attendance history.', 'Newest first, paginated, filterable by date.', 'Medium', 'Phase 7'],
  ['Manager', 'FR-4', 'US-10', 'As a manager, I can see my team’s attendance.', 'Only direct reports appear.', 'Medium', 'Phase 7'],
  ['Employee', 'FR-5', 'US-11', 'As an employee, I can apply for leave.', 'Request saved as Pending; my manager (or HR) is notified; overlapping, past or over-60-day requests are refused with a reason.', 'High', 'Phase 8'],
  ['Manager', 'FR-5', 'US-12', 'As a manager, I can approve or reject my team’s leave.', 'Only my direct reports’ pending requests; rejection needs a reason; a decided request cannot be decided again (409); never my own.', 'High', 'Phase 8'],
  ['Employee', 'FR-5', 'US-13', 'As an employee, I can see the status of my leave requests.', 'Status, approver and rejection reason shown; I am notified of the decision.', 'High', 'Phase 8'],
  ['HR', 'FR-5', 'US-14', 'As HR, I can see and decide any leave request.', 'All requests with status and department filters; same rules as managers.', 'High', 'Phase 8'],
  ['All roles', 'FR-6', 'US-15', 'As a user, I see a dashboard for my role.', 'Figures come from the API, not fixed values.', 'High', 'Phase 9'],
  ['HR', 'FR-7', 'US-16', 'As HR, I can run attendance, leave, department and training reports.', 'Totals match the underlying records; date range validated.', 'Medium', 'Phase 9'],
  ['HR / Manager', 'FR-8', 'US-17', 'As HR or a manager, I can post an announcement for an audience.', 'Only that audience sees it and is notified; managers edit only their own posts.', 'Medium', 'Phase 10'],
  ['HR / Manager', 'FR-9', 'US-18', 'As HR or a manager, I can create a training with a capacity.', 'Dates and capacity validated; managers edit only their own trainings.', 'Medium', 'Phase 10'],
  ['Employee', 'FR-9', 'US-19', 'As an employee, I can enrol in and withdraw from a training.', 'Refused when full or already started.', 'Medium', 'Phase 10'],
  ['All users', 'FR-10', 'US-20', 'As a user, I can read my notifications and mark them read.', 'Unread count updates; mark all read sets it to zero.', 'Medium', 'Phase 11'],
  ['Visitor', 'FR-11', 'US-21', 'As a visitor, I can try the demo as HR, a manager or an employee without signing up.', 'One click opens that role’s dashboard; demo data resets nightly.', 'Low', 'Phase 20'],
  ['Platform admin', 'FR-12', 'US-22', 'As a platform administrator, I can suspend and reactivate an organisation.', 'A reason is required; its users are refused at once; the action is in the audit log.', 'Medium', 'Phase 21'],
  ['HR', 'FR-2', 'US-23', 'As HR, I can set my company’s time zone and working days.', 'Saved per organisation; other organisations are unaffected.', 'Medium', 'Phase 19'],
];

const b3 = () => save(path.join(OUT, 'B3-Data-Flow-Diagram-and-User-Stories.docx'), [
  ...header({ phase: 'Requirement Analysis', title: 'Data Flow Diagram & User Stories', marks: '4 Marks' }),
  h1('Data Flow Diagrams'),
  p('A Data Flow Diagram (DFD) shows how information moves through StaffSync: who supplies and receives it (external entities), what the system does with it (processes) and where it is kept (data stores). The diagrams use Yourdon–DeMarco notation and were drawn from the API routes, controllers, services and Mongoose models.'),
  h2('DFD Level 0 — Context diagram'),
  p('The whole system as one process, with every external entity and the main flows.'),
  ...image(path.join(DIA, 'dfd-level-0.png'), 640, 'Figure 1 — DFD Level 0 (context diagram)'),
  h2('DFD Level 1'),
  p('The nine main processes inside StaffSync and the MongoDB collections they read and write.'),
  ...image(path.join(DIA, 'dfd-level-1.png'), 640, 'Figure 2 — DFD Level 1'),
  h3('Processes'),
  table(['No.', 'Process', 'Implemented in'], [
    ['1.0', 'Authenticate and manage sessions', '`controllers/authController.js`, `middleware/authMiddleware.js`, `services/passwordResetService.js`, `controllers/demoController.js`'],
    ['2.0', 'Onboard and configure organisation', '`controllers/organisationController.js`'],
    ['3.0', 'Manage people', '`controllers/employeeController.js`'],
    ['4.0', 'Record attendance', '`controllers/attendanceController.js`'],
    ['5.0', 'Process leave', '`controllers/leaveController.js`'],
    ['6.0', 'Publish announcements and training', '`controllers/announcementController.js`, `controllers/trainingController.js`'],
    ['7.0', 'Notify users', '`services/notificationService.js`, `controllers/notificationController.js`'],
    ['8.0', 'Produce dashboards and reports', '`controllers/dashboardController.js`, `controllers/reportController.js`, `services/statsService.js`'],
    ['9.0', 'Administer platform', '`controllers/platformController.js`'],
  ], [8, 32, 60]),
  h3('Data stores'),
  table(['No.', 'Store (collection)', 'Model', 'Scope'], [
    ['D1', 'users', '`models/User.js`', 'Organisation-owned'],
    ['D2', 'organisations', '`models/Organisation.js`', 'Platform-level'],
    ['D3', 'employees', '`models/Employee.js`', 'Organisation-owned'],
    ['D4', 'attendances', '`models/Attendance.js`', 'Organisation-owned'],
    ['D5', 'leaves', '`models/Leave.js`', 'Organisation-owned'],
    ['D6', 'announcements', '`models/Announcement.js`', 'Organisation-owned'],
    ['D7', 'trainings', '`models/Training.js`', 'Organisation-owned'],
    ['D8', 'notifications', '`models/Notification.js`', 'Organisation-owned'],
    ['D9', 'platformadmins', '`models/PlatformAdmin.js`', 'Platform-level'],
    ['D10', 'platformauditlogs', '`models/PlatformAuditLog.js`', 'Platform-level'],
    ['—', 'counters (employee numbers; not drawn)', '`models/Counter.js`', 'Platform-level, keyed per organisation'],
  ], [8, 32, 35, 25]),
  h1('User Stories'),
  p('User story table for StaffSync. Each story is linked to a functional requirement in B1. “Release” is the development phase in which it was delivered, from the git history; there were no separately planned sprints (see C1).'),
  table(['User Type', 'Functional Requirement (Epic)', 'User Story Number', 'User Story / Task', 'Acceptance Criteria', 'Priority', 'Release'], US, [10, 9, 8, 25, 30, 8, 10]),
]);

(async () => {
  for (const f of [b1, b2, b3]) console.log('wrote', await f());
})().catch((e) => { console.error(e); process.exit(1); });

module.exports = { FR, NFR, US };
