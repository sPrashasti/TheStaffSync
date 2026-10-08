# StaffSync — Role-based access control

StaffSync has three roles: **Employee**, **Manager** and **HR**, and every account belongs to exactly one **organisation** (company). Everything below happens inside the user's own organisation: no role, HR included, can see or change another organisation's data. Every permission below is enforced by the API on every request. The React app hides what a role cannot do, but that is a convenience: changing the address bar or calling the API directly gets the same **403** the app would.

## How a role is decided

- A role belongs to an **account**, not to the login screen. Everyone logs in on the same page and is sent to their own dashboard (`/employee/…`, `/manager/…` or `/hr/…`).
- There is **no self-registration**. A company signs up at `/signup`, and the person signing up becomes **HR of that new organisation**. Sign-up refuses any other field, such as `role` or `organisationId`, with 400.
- **Every other account** (employee, manager, further HR) is created by that organisation's HR (Employees → Add person → Role), or by the seed script.
- The role is read from the database on **every request**, never from the token. A promotion, demotion or deactivation takes effect on the next request, even for sessions that are already signed in.

## Permissions

Legend: ✅ allowed · 🔒 only own / own team · ❌ refused with 403

| Capability | Employee | Manager | HR |
|---|---|---|---|
| **Accounts** | | | |
| Sign up a new organisation (public) | — | — | ✅ the person signing up becomes its HR |
| Accounts in their organisation | ❌ created by HR | ❌ created by HR | ✅ creates them |
| Log in, see own profile, change own password, reset by email | ✅ | ✅ | ✅ |
| Update own contact details (phone, address) | ✅ | ✅ | ✅ |
| Create people of any role; change role, department, designation, manager, time zone | ❌ | ❌ | ✅ |
| Deactivate / reactivate accounts | ❌ | ❌ | ✅ (never themselves; at least one HR stays active) |
| View an employee record | 🔒 own | 🔒 own and direct reports | ✅ |
| List all employees, list managers | ❌ | ❌ | ✅ |
| List own team | ❌ | 🔒 direct reports | ❌ (uses the full list) |
| See own organisation's name and settings | ✅ | ✅ | ✅ |
| Change organisation name, time zone, working days | ❌ | ❌ | ✅ (never its status or slug) |
| **Attendance** | | | |
| Check in / check out (own, server time) | ✅ | ✅ | ✅ |
| View attendance | 🔒 own | 🔒 own and team | ✅ company-wide |
| **Leave** | | | |
| Apply for leave | ✅ | ✅ | ❌ |
| View leave | 🔒 own | 🔒 own and team | ✅ all |
| Approve / reject (reason required to reject) | ❌ | 🔒 direct reports only, never own | ✅ any, never own |
| **Announcements** | | | |
| Read | 🔒 audience *all* or *employees* | 🔒 audience *all* or *managers*, plus own posts | ✅ all |
| Post | ❌ | ✅ | ✅ |
| Edit / delete | ❌ | 🔒 own posts | ✅ any |
| **Training** | | | |
| Browse trainings, see seats left and own enrolment | ✅ | ✅ | ✅ |
| Enrol / withdraw (self) | ✅ | ✅ | ❌ |
| Create a training | ❌ | ✅ | ✅ |
| Edit / delete a training | ❌ | 🔒 own trainings | ✅ any |
| See who is enrolled | ❌ | 🔒 everyone on own trainings; own team on others | ✅ |
| Assign / remove a person | ❌ | 🔒 direct reports, any open training | ✅ anyone |
| **Notifications** | 🔒 own | 🔒 own | 🔒 own |
| **Dashboards** | 🔒 own | 🔒 own and team | ✅ company |
| **Reports** (departments, attendance, leave, training) | ❌ | ❌ | ✅ |

Rules that apply to everyone: another organisation's records do not exist for you (**404**, never 403, so their ids reveal nothing); users of a suspended organisation get **403** everywhere; deactivated accounts cannot log in or use existing tokens; a password change or reset signs out every other session; "own" and "team" are always worked out on the server from the signed-in user, never from ids sent by the client.

## Organisations and platform admins

**Platform admins** (StaffSync's own operators) are **not a role**. They are a separate kind of account:

| | Platform admin | Organisation users (Employee, Manager, HR) |
|---|---|---|
| Stored in | `platformadmins`, with no organisation | `users`, always with an `organisationId` |
| Signs in at | `POST /api/platform/auth/login` | `POST /api/auth/login` |
| Token scope | `platform` | `org` |
| Can use `/api/employees`, `/api/leaves`… | ❌ 401 | ✅ by role, inside own organisation |
| Can use `/api/platform/…` | ✅ | ❌ 401, HR included |
| Created by | `npm run platform:create-admin` only; no API | Sign-up or HR |

**The public demo** (README *Public demo*) is one organisation that visitors enter with one click as its HR, manager or employee account. The roles behave exactly as above, with a few extra refusals so visitors cannot spoil it for each other: no password changes, read-only company settings, the three sign-in accounts' email/role/status locked, and email addresses limited to the demo domains. Everything is reset nightly.

The platform console (`/platform/login`) lets platform admins see organisations, their usage and HR contacts, rename them, suspend and reactivate them, and read the platform audit log, where every one of those actions is recorded. It never shows employee records.

## Mapping to the brief

| Brief (Roles and Responsibilities) | Where it is met |
|---|---|
| 1. HR creates, views, updates and deletes employee records | `/api/employees` (delete is a deactivation that keeps history) |
| 2. Employees apply for leave; managers and HR review, approve or reject | `/api/leaves`, `/approve`, `/reject` |
| 3. Employees mark attendance; HR monitors records and generates reports | `/api/attendance/*`, `/api/reports/attendance-summary` |
| 4. Managers create, **assign** and monitor training programmes | `/api/trainings` create/edit, `/participants` assign and remove, participant lists |
| 5. HR **and managers** create and publish announcements | `/api/announcements` for both roles; managers edit only their own |
| 6. Employees maintain their personal information | Profile page: phone and address; everything else is HR's to change |
| 7. Secure access and authentication | JWT, bcrypt, rate limits, see README *Security* |
| 8. Employees review announcements, leave status, attendance and training notifications | Notifications, dashboards, audience-filtered announcements |
| 9. HR generates and monitors reports | `/api/reports/*` |
| 10. Dedicated dashboards per role | `/api/dashboard/employee`, `/manager`, `/hr` |

## How it is enforced in the code

1. **`protect`** ([server/middleware/authMiddleware.js](../server/middleware/authMiddleware.js)) verifies the token (scope `org`) and loads the user, their employee profile and their organisation from the database. Missing, invalid, expired or revoked tokens, platform tokens and deactivated accounts get **401**; a suspended organisation gets **403**. The rest of the request runs inside that organisation.
2. **Tenant isolation** ([server/models/plugins/tenantScoped.js](../server/models/plugins/tenantScoped.js)) limits every query, update, delete and aggregation (joins included) on organisation-owned data to the request's organisation, stamps it on new records and never lets it change. A query with no organisation context throws instead of returning everyone's data; platform-level code (login, sign-up, password reset, scripts) opts out explicitly with `runAsPlatform()`.
3. **`authorize(...roles)`** on each route lists the roles allowed. Any other role gets **403**. A typo such as `authorize('HR')` stops the server at start-up rather than silently letting nobody or everybody in.
4. **Ownership and team checks** happen in the controllers for routes that several roles share: for example `GET /api/leaves/:id` is open to HR, the applicant and their direct manager, and nobody else.
5. Every write endpoint accepts a **whitelist of fields**, so a request cannot smuggle in `role`, `isActive` or someone else's `employeeId`.

## Evidence

- `server/tests/acceptance-endpoints.test.js`: all 45 endpoints are open to the role they are meant for and refuse a role they are not.
- `server/tests/employees.test.js`, `leave.test.js`, `attendance.test.js`, `announcements-training.test.js`: the 🔒 scoping rules above (own team only, own posts only, skip-level managers refused, and so on).
- `server/tests/auth.test.js` and `security.test.js`: role read from the database, deactivation, privilege fields refused on sign-up.
- `server/tests/tenant-isolation.test.js` (runs with no default organisation): two look-alike organisations through every kind of endpoint, joins inside `$facet`, suspension, and platform-admin separation. With the isolation filter removed on purpose, 5 of its tests fail, so it does catch leaks.
- Postman folder **02 RBAC** exercises the matrix against a running server; **01 Auth** signs up a second organisation and checks it cannot see the first.
