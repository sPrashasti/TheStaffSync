# StaffSync — Acceptance check (Phase 17)

**Date:** 7 Oct 2026
**Commit checked:** Phase 16 (`ca19cab`) plus the Phase 17 acceptance test
**Criteria:** the original brief (§44) is not in the repository, so the 30 criteria below are derived from [PHASE-0-REQUIREMENTS.md](PHASE-0-REQUIREMENTS.md): its module list, permissions matrix, endpoint list, page list, security checklist and testing strategy.

## Result

**29 of 30 criteria pass on automated evidence.** Criterion 29 is pending: what each role sees and clicks in the browser has to be confirmed by a person using [E2E-CHECKLIST.md](E2E-CHECKLIST.md), because no automated browser tests exist. Everything that page relies on (routes, guards, API calls, data shapes, build) is verified.

| Evidence run on 7 Oct 2026 | Result |
|---|---|
| Server test suite (`cd server && npm test`) | **129 / 129 passed**, 13 suites |
| Endpoint acceptance test ([acceptance-endpoints.test.js](../server/tests/acceptance-endpoints.test.js)) | **41 / 41** planned endpoints mounted, open to the right role, refusing the wrong one |
| Client tests (`cd client && npm test`) | **8 / 8 passed** |
| Client lint (`oxlint`) and production build | 0 warnings, 0 errors; build succeeds |
| Postman collection against the running server | **171 requests, 421 assertions, 0 failures** |
| `npm audit` (server and client) | 0 known vulnerabilities |
| Live health check | API running, database `connected` |
| Frontend code checks | All planned pages present for every role; no mock data; all HTTP only in `src/services/` |

## Criteria

Legend: ✅ pass · 🟡 pass on code and API evidence, browser walkthrough still to do

### Authentication and access control

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Self-registration creates an **employee** only; a `role` in the request is ignored | ✅ | `auth.test.js` "registers an employee…"; `security.test.js` "ignores privilege fields"; Postman *Register ignores role field* |
| 2 | Login issues a JWT; `GET /api/auth/me` returns the user and employee profile | ✅ | `auth.test.js` login and `/auth/me` tests; Postman *Login*, *Get current user* |
| 3 | Passwords are bcrypt-hashed (cost ≥ 10) and never returned | ✅ | Cost 12 asserted in `auth.test.js`; `security.test.js` "never returns password hashes" |
| 4 | Missing, invalid or expired tokens → 401; wrong role → 403, enforced on the server for every protected route | ✅ | `auth.test.js` token tests (expired, forged, `alg:none`); `acceptance-endpoints.test.js` 403 check on every role-restricted endpoint |
| 5 | Deactivated users cannot log in or keep using existing tokens | ✅ | `auth.test.js` "applies deactivation…"; `employees.test.js` "deactivates softly…"; workflow test final step |
| 6 | Manager and HR accounts are created only by HR or the seed script; the first HR comes from the seed | ✅ | `npm run seed` (Phase 5); `employees.test.js` "lets HR create people of any role" and manager → 403 |

### Employees

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 7 | HR creates, updates and deactivates employees and managers; deactivation is a soft delete | ✅ | `employees.test.js`; Postman *03 Employees* |
| 8 | People update only their own personal fields (phone, address) | ✅ | `employees.test.js` "lets people edit only their own phone and address" |
| 9 | A manager's team is resolved on the server from `managerId`; managers see only their own direct reports | ✅ | `employees.test.js` "scopes reads"; `attendance.test.js` and `leave.test.js` team scoping |

### Attendance

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 10 | Check-in/out use server time; a second check-in on the same day is blocked by the database even under concurrency | ✅ | `attendance.test.js` "checks in once, even when requests arrive together" (5 simultaneous → 1 success); unique index `{ employeeId, date }` |
| 11 | Own history for everyone; team view for managers; company view for HR | ✅ | `attendance.test.js` "filters history and keeps managers to their team"; Postman *04 Attendance* |

### Leave

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 12 | Leave requests are validated (type, real dates, end after start, reason) | ✅ | `leave.test.js` "enforces date rules" |
| 13 | Own leave for everyone; team leave for managers; all leave for HR | ✅ | `leave.test.js` "scopes lists" |
| 14 | Managers decide only their own team's requests; HR decides any; rejection requires a reason | ✅ | `leave.test.js` "lets only the direct manager or HR decide…", "requires a rejection reason…" |
| 15 | A request is decided exactly once (atomic status transition) | ✅ | `leave.test.js` "decides a request exactly once, even under a race" |
| 16 | **Cross-role workflow:** one request looks the same to the employee, manager and HR, with notifications along the way | ✅ | `leave-workflow.e2e.test.js` (10 steps, API only); Postman *05 Leaves* |

### Announcements, training, notifications

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 17 | HR and managers create announcements (managers edit or delete only their own); everyone reads those for their audience | ✅ | `announcements-training.test.js` "shows each role only the announcements meant for it", "lets managers post announcements and change only their own" |
| 18 | HR and managers create and manage trainings; employees and managers enrol; HR and managers assign people (managers their own team); capacity is enforced | ✅ | `announcements-training.test.js` (10 people racing for 2 seats → exactly 2; "lets managers assign their own team and HR assign anyone") |
| 19 | Notifications are stored and created by leave, announcement and training events; list, mark read, mark all read | ✅ | `notifications.test.js`; Postman *08 Notifications* |

### Dashboards and reports

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 20 | Each role has a dashboard whose numbers come from the database | ✅ | `reports.test.js` "shows today's team and company picture"; workflow test checks dashboard counts change |
| 21 | HR reports: headcount by department, attendance summary, leave statistics, training statistics | ✅ | `reports.test.js` (checked against independently calculated numbers); `announcements-training.test.js` fill rate |

### API quality

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 22 | One response envelope; one error handler; no stack traces in production | ✅ | `foundation.test.js` envelope and production tests; `acceptance-endpoints.test.js` asserts the envelope on all 41 endpoints |
| 23 | Malformed ids give 400/404, never a raw 500 | ✅ | `foundation.test.js` "handles ids…"; `auth.test.js` bad id in token |
| 24 | Lists are paginated with `?page=&limit=` → `{ items, page, total, totalPages }`, limit capped | ✅ | `foundation.test.js` pagination; README *Performance* lists every paginated endpoint |
| 25 | **Every planned endpoint is implemented and mounted** (integration checkpoint) | ✅ | `acceptance-endpoints.test.js`: 43/43 |
| 26 | Every write endpoint validates input and accepts only listed fields | ✅ | Route audit in Phase 15 (all 21 write routes); `security.test.js` injection and unknown-field tests |

### Security and configuration

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 27 | CORS limited to `CLIENT_URL`; secrets only in git-ignored `.env`; `.env.example` holds placeholders | ✅ | `security.test.js` CORS test; secret scans before every push; requirements checklist §12 all ticked |

### Frontend

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 28 | Pages for every role as planned, protected by role, with `/` → own dashboard and a 404 page; one Axios instance; URLs only in service files; Redux for auth state | ✅ | Code check: all 7 / 7 / 9 planned pages present; `/login`, `/register`, `/`, `*` routes present; no HTTP outside `src/services/`; Redux holds auth plus one display preference (see deviations) |
| 29 | Every screen shows real data from the API, and each role can complete its tasks in the browser | 🟡 | No mock data found in `client/src`; every field the pages read checked against live API responses (Phase 13); build and lint clean. **Still to do:** a person runs [E2E-CHECKLIST.md](E2E-CHECKLIST.md) (about 20 minutes) |

### Testing and documentation

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 30 | Postman collection covering success and failure per endpoint, and a README that documents setup, every endpoint, errors and testing | ✅ | 171 requests / 421 assertions passing; README sections for each module, *Automated tests*, *Performance*, *Security*, *Troubleshooting* |

## Deviations from the original plan

All of these are documented in the README.

| Planned | Delivered | Why |
|---|---|---|
| Seven collections | Eight: a small `counters` collection | Atomic `EMP0001`-style ids that can never collide |
| Seed script in Phase 6 | Phase 5 | Needed HR and manager accounts to prove access control |
| Registration creates a user | User **and** employee profile (`Unassigned`) in one transaction | Every feature depends on the profile |
| `GET /api/employees/:id`: HR or owner | Also the person's **direct manager** | Managers need it when deciding leave |
| No time zone handling | Company default `TIMEZONE` (IST) plus per-employee zones set by HR | Requested during Phase 8 |
| Announcements posted by HR only (Phase 0 summary) | HR **and managers**, as the brief's Features 4 and Responsibilities 5 say; managers change only their own posts | Matches the brief |
| Employees enrol themselves in training | Also: HR and managers **assign** people (`/participants`), as Responsibilities 4 says | Matches the brief |
| Endpoints in §5 only | Additional: `GET /attendance/today`, `DELETE /trainings/:id/enroll`, `GET /reports/training-summary`, `PUT /auth/password`, `POST /auth/forgot-password`, `POST /auth/reset-password` | Dashboard check-in state; undoing an enrolment; promised training statistics; security hardening; requested feature |
| Redux for auth only | Auth plus the display time zone preference | A UI preference, not page data |
| Profile page for employees | For every role | Everyone can update contact details and change password |
| nodemon in development | `node --watch` | One less dependency, and nodemon pulled in a vulnerable package |

## Known limitations (accepted for this version)

- No leave balances or allowances; leave counts calendar days.
- No public-holiday calendar, so holidays count as absences in reports.
- Check-in and check-out must fall on the same calendar day (no night shifts).
- Notifications are in-app only and refresh every minute.
- Password reset emails need SMTP settings in `.env` outside development.
- Rate limits are kept in memory, per server instance.
- The UI has no automated browser tests; it relies on the manual checklist.

## To finish acceptance

1. Run [E2E-CHECKLIST.md](E2E-CHECKLIST.md) sections A–F with the demo accounts.
2. If everything passes, mark criterion 29 ✅ here. If not, note the failing step numbers and they will be fixed before deployment (Phase 18).
