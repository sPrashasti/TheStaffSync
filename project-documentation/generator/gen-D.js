// D. Project Design Phase: D1 Problem–Solution Fit, D2 Proposed Solution, D3 Solution Architecture.
const path = require('path');
const { p, h1, h2, h3, bullets, note, table, header, image, save } = require('./lib');

const OUT = 'D:/TheStaffSync/project-documentation/D-Project-Design';
const DIA = 'D:/TheStaffSync/project-documentation/diagrams';

const d1 = () => save(path.join(OUT, 'D1-Problem-Solution-Fit.docx'), [
  ...header({ phase: 'Project Design Phase', title: 'Problem – Solution Fit Template', marks: '2 Marks' }),
  h1('Problem – Solution Fit Overview'),
  p('The Problem–Solution Fit checks that StaffSync addresses the real day-to-day problems of HR administrators, managers and employees before more features are added. Each problem below is paired with the part of StaffSync that answers it, so the fit can be checked rather than only claimed.'),
  note('The problems come from the assumption-based personas in A1 and A2. They have not been validated with users; that validation, and evidence of adoption, is the next step needed to confirm the fit.'),
  h2('Purpose'),
  bullets([
    'Give HR, managers and employees one place where attendance and leave are recorded once and seen by everyone who needs them.',
    'Replace leave by email with a visible workflow: request, decision by the right person, notification, recorded reason.',
    'Let HR answer “who is in today?” and “how much leave was taken?” from live records instead of spreadsheets.',
    'Keep each company’s data separate and each role within its permissions, so the system can be trusted with personal data.',
    'Let a company start without a sales process: sign up, or try a demo first.',
  ]),
  h3('Problem Statement'),
  p('HR teams, managers and employees commonly face these problems:'),
  bullets([
    'Attendance and leave records spread across spreadsheets, email and paper, with totals counted by hand.',
    'Leave requests lost in inboxes and chat, with no shared queue and no status.',
    'Employees left without confirmation, decision or reason.',
    'Announcements and training reaching people second-hand or too late.',
    'No clear control over who can see or change personal records.',
  ]),
  h3('Solution'),
  p('StaffSync, a full-stack MERN HR management system, offers:'),
  bullets([
    'Server-timed check-in and check-out, one record per person per day, with half days worked out automatically.',
    'A leave workflow with validation (overlaps, past dates, length), decision by the direct manager or HR, a mandatory rejection reason and a decide-once guarantee.',
    'In-app notifications for every leave request and decision, new announcements and training changes.',
    'Role dashboards and HR reports calculated from the stored records.',
    'Three roles enforced by the server on every request, and complete data separation between organisations.',
    'Company self sign-up, a public demo reset every night, and a platform console for StaffSync operators.',
  ]),
  h2('Problem-to-solution fit table'),
  table(['Problem (A2)', 'Root cause', 'StaffSync feature', 'Evidence it works', 'Fit'], [
    ['PS-1 HR: records scattered, counted by hand', 'Nothing captures events when they happen', 'Check-in / check-out; leave stored with status; HR reports', '`attendance.test.js`, `reports.test.js` (reports checked against independently calculated totals)', 'Strong'],
    ['PS-2 Manager: requests missed', 'No shared queue or status', 'Team leave queue; notification to the manager; manager dashboard “pending leave”', '`leave.test.js`, `notifications.test.js`, `leave-workflow.e2e.test.js`', 'Strong'],
    ['PS-3 Employee: no outcome or reason', 'Requests have no visible status', 'Status on every request; rejection requires a reason; decision notification', '`leave.test.js` (“requires a rejection reason”), E2E workflow steps 6–8', 'Strong'],
    ['Missed announcements and training', 'Communication by word of mouth', 'Audience-targeted announcements; training with seats and enrolment; notifications', '`announcements-training.test.js`', 'Good'],
    ['Unclear access to personal data', 'No role model', 'Server-enforced roles; tenant isolation', '`acceptance-endpoints.test.js`, `tenant-isolation.test.js`', 'Strong'],
    ['Leave entitlement tracking', 'Allowances held elsewhere', 'Not covered: no leave balances yet', '—', 'Gap'],
    ['Holidays counted as absences', 'No holiday calendar', 'Not covered yet', '—', 'Gap'],
  ], [20, 16, 26, 26, 12]),
]);

const d2 = () => save(path.join(OUT, 'D2-Proposed-Solution.docx'), [
  ...header({ phase: 'Project Design Phase', title: 'Proposed Solution Template', marks: '2 Marks' }),
  h1('Proposed Solution for StaffSync'),
  table(['S. No.', 'Parameter', 'Description'], [
    ['1', 'Problem Statement (Problem to be solved)', 'Small and medium organisations run attendance, leave and staff communication through spreadsheets, email and chat. Records are scattered and counted by hand, leave requests are missed or decided late, employees rarely learn the outcome or the reason, and there is little control over who sees personal data.'],
    ['2', 'Idea / Solution Description', 'StaffSync is a web-based HR management system (React front end, Node.js and Express REST API, MongoDB). Employees check in and out and apply for leave; managers decide their team’s requests and see who is working; HR manages people, company settings, announcements and training and runs reports. Every action goes through the API, is validated on the server and is stored in MongoDB. Several companies can use one installation, each completely separated.'],
    ['3', 'Novelty / Uniqueness', '• Tenant isolation enforced in the data layer: every query is scoped to the caller’s organisation, and an unscoped query fails instead of leaking data\n• Leave decisions are atomic: a request can only ever be decided once, even if two people click at the same moment\n• Per-employee time zones decide which calendar day attendance and leave fall on\n• A public demo organisation with one-click sign-in as each role, reset to its baseline every night\n• A separate platform-operator console with suspension and an audit log'],
    ['4', 'Social Impact / Customer Satisfaction', '• Employees get a clear, recorded answer to every leave request, with a reason when refused\n• Managers spend less time chasing requests and know who is available\n• HR reports come from records, not manual counts\n• Personal data is protected by role checks, hashed passwords and strict separation between companies\n(These are intended outcomes; no customer-satisfaction survey has been carried out.)'],
    ['5', 'Business Model (Revenue Model)', 'Current state: StaffSync has no plans, prices or billing; every organisation is free (README “Known limitations”).\nProposed model (not implemented, for discussion): a free tier for small teams, with a per-employee monthly subscription for larger organisations and for features such as leave balances, email notifications and exports. The platform console’s organisation and headcount figures would support usage-based pricing.'],
    ['6', 'Scalability of the Solution', 'In place: stateless JWT API; indexed queries confirmed with explain(); every growing list paginated (maximum 100 per page); one database round trip to load the signed-in user; MongoDB Atlas can scale independently.\nKnown limits: rate-limit counters are kept in memory, so running several server instances needs a shared store (e.g. Redis); notifications refresh every minute rather than live; no load test has been run yet (see E2).\nNext steps: leave balances, holiday calendar, email notifications, a mobile-friendly progressive web app.'],
  ], [8, 22, 70]),
]);

const d3 = () => save(path.join(OUT, 'D3-Solution-Architecture.docx'), [
  ...header({ phase: 'Project Design Phase', title: 'Solution Architecture', marks: '4 Marks' }),
  h1('Solution Architecture'),
  p('StaffSync is a three-tier web application: a React single-page app in the browser, an Express 5 REST API on Node.js, and MongoDB. In production one Render web service runs the API and also serves the built React app, so both share one address. Every request passes the same ordered chain of middleware before it reaches business logic, and every database query is limited to the caller’s organisation. The architecture aims for:'),
  bullets([
    'One trustworthy record of people, attendance and leave, written only through validated API calls',
    'Security on every request: authentication, role checks and organisation status re-checked each time',
    'Complete separation of each organisation’s data',
    'Correct results under concurrency (one check-in per day, one decision per leave request)',
    'Simple, repeatable deployment with automated tests on every change',
  ]),
  h2('Solution architecture diagram'),
  ...image(path.join(DIA, 'solution-architecture.png'), 640, 'Figure 1 — StaffSync solution architecture'),
  h2('Components'),
  table(['Tier / component', 'Responsibility', 'Source'], [
    ['React SPA', 'Pages for each role; session in Redux; route guards for convenience (the API enforces access)', '`client/src` (routes, pages, store)'],
    ['API clients', 'Two Axios instances (organisation users, platform admins); attach the token; turn errors into readable messages', '`client/src/services/api.js`'],
    ['Security middleware', 'CORS allow-list, Helmet headers, rate limits, no-store caching, repeated-query rejection', '`server/config/cors.js`, `server/config/security.js`'],
    ['Authentication', 'Verify JWT; load user, employee and organisation in one aggregation; enter the organisation context', '`server/middleware/authMiddleware.js`'],
    ['Authorisation', 'Role check per route; ownership and team checks in controllers', '`authorize()` in `server/middleware/authMiddleware.js`; controllers'],
    ['Validation', 'Whitelist of fields and types per endpoint', '`server/validators/*.js`, `server/middleware/validate.js`'],
    ['Controllers and services', 'Business rules; notifications; statistics; password reset; demo reset', '`server/controllers`, `server/services`'],
    ['Data access', 'Mongoose models; `tenantScoped` plugin scopes every operation', '`server/models`'],
    ['Errors', 'One handler; consistent JSON; no internal details in production', '`server/middleware/errorMiddleware.js`'],
    ['Database', 'MongoDB Atlas; replica set required for the sign-up transaction', '`MONGO_URI`'],
    ['Email', 'Password-reset emails through SMTP', '`services/passwordResetService.js`'],
    ['Delivery', 'GitHub Actions CI (lint, tests, build); Render blueprint with health check and auto-deploy', '`.github/workflows/ci.yml`, `render.yaml`'],
  ], [20, 52, 28]),
  h2('Request lifecycle example — approving a leave request'),
  p('The sequence below follows one request through the architecture, showing where authentication, authorisation, validation, the atomic update and the notification happen.'),
  ...image(path.join(DIA, 'leave-approval-sequence.png'), 640, 'Figure 2 — Sequence for PUT /api/leaves/:id/approve'),
  h2('Deployment view'),
  table(['Item', 'Configuration (from render.yaml)'], [
    ['Service', 'One Render web service, Node.js 24, free plan, region Singapore'],
    ['Build', 'Install server production dependencies; install client and build it with Vite'],
    ['Start', '`npm start --prefix server`; the server also serves the built client'],
    ['Health check', '`/api/health` (reports API status and database connection)'],
    ['Secrets', '`JWT_SECRET` generated by Render; `MONGO_URI` and SMTP settings entered in the dashboard'],
    ['Deployment status', 'Configured, not verified live: no deployment URL is recorded in the project'],
  ], [25, 75]),
  h2('Architecture decisions'),
  table(['Decision', 'Reason', 'Trade-off'], [
    ['Token in localStorage, sent as a Bearer header', 'Works when the app and API are on different domains without CSRF tokens', 'Exposed to XSS; mitigated by React escaping, a strict script CSP on served pages and token expiry'],
    ['Isolation in a Mongoose plugin, not in each controller', 'A forgotten filter cannot leak another company’s data; unscoped queries throw', 'Platform-level code must opt out explicitly with runAsPlatform()'],
    ['Atomic findOneAndUpdate for leave decisions', 'Guarantees one decision even under simultaneous clicks', 'A second decider gets 409 instead of a silent overwrite'],
    ['Single service for API and app', 'One address, simpler CORS and deployment', 'The API and front end scale together'],
    ['In-memory rate limiting', 'No extra infrastructure', 'Limits reset on restart and are per instance'],
  ], [28, 40, 32]),
]);

(async () => { for (const f of [d1, d2, d3]) console.log('wrote', await f()); })().catch((e) => { console.error(e); process.exit(1); });
