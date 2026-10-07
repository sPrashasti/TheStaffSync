# StaffSync — Role-based access control

StaffSync has three roles: **Employee**, **Manager** and **HR**. Every permission below is enforced by the API on every request. The React app hides what a role cannot do, but that is a convenience: changing the address bar or calling the API directly gets the same **403** the app would.

## How a role is decided

- A role belongs to an **account**, not to the login screen. Everyone logs in on the same page and is sent to their own dashboard (`/employee/…`, `/manager/…` or `/hr/…`).
- Self-registration always creates an **Employee**. Any `role` sent with the request is ignored.
- **Manager** and **HR** accounts are created by HR (Employees → Add person → Role), or by the seed script for the first HR account.
- The role is read from the database on **every request**, never from the token. A promotion, demotion or deactivation takes effect on the next request, even for sessions that are already signed in.

## Permissions

Legend: ✅ allowed · 🔒 only own / own team · ❌ refused with 403

| Capability | Employee | Manager | HR |
|---|---|---|---|
| **Accounts** | | | |
| Register (public) | ✅ creates an employee | ❌ created by HR | ❌ created by HR or seed |
| Log in, see own profile, change own password, reset by email | ✅ | ✅ | ✅ |
| Update own contact details (phone, address) | ✅ | ✅ | ✅ |
| Create people of any role; change role, department, designation, manager, time zone | ❌ | ❌ | ✅ |
| Deactivate / reactivate accounts | ❌ | ❌ | ✅ (never themselves; at least one HR stays active) |
| View an employee record | 🔒 own | 🔒 own and direct reports | ✅ |
| List all employees, list managers | ❌ | ❌ | ✅ |
| List own team | ❌ | 🔒 direct reports | ❌ (uses the full list) |
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

Rules that apply to everyone: deactivated accounts cannot log in or use existing tokens; a password change or reset signs out every other session; "own" and "team" are always worked out on the server from the signed-in user, never from ids sent by the client.

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

1. **`protect`** ([server/middleware/authMiddleware.js](../server/middleware/authMiddleware.js)) verifies the token and loads the user and their employee profile from the database. Missing, invalid, expired or revoked tokens and deactivated accounts get **401**.
2. **`authorize(...roles)`** on each route lists the roles allowed. Any other role gets **403**. A typo such as `authorize('HR')` stops the server at start-up rather than silently letting nobody or everybody in.
3. **Ownership and team checks** happen in the controllers for routes that several roles share: for example `GET /api/leaves/:id` is open to HR, the applicant and their direct manager, and nobody else.
4. Every write endpoint accepts a **whitelist of fields**, so a request cannot smuggle in `role`, `isActive` or someone else's `employeeId`.

## Evidence

- `server/tests/acceptance-endpoints.test.js`: all 43 endpoints are open to the role they are meant for and refuse a role they are not.
- `server/tests/employees.test.js`, `leave.test.js`, `attendance.test.js`, `announcements-training.test.js`: the 🔒 scoping rules above (own team only, own posts only, skip-level managers refused, and so on).
- `server/tests/auth.test.js` and `security.test.js`: role read from the database, deactivation, privilege fields ignored.
- Postman folder **02 RBAC** exercises the matrix against a running server.
