# StaffSync — Phase 0: Requirements Analysis

> Status: Phase 0 complete. No implementation code exists yet.
> Next step: Phase 1 (project setup) begins only on explicit instruction.

---

## 1. Feature / Module List

| # | Module | Summary |
|---|--------|---------|
| 1 | Authentication | Register (employee self-registration only), login, get current user, JWT issuance |
| 2 | Authorisation (RBAC) | `protect` middleware (valid JWT) + `authorize(...roles)` middleware enforced on the backend |
| 3 | Employee Management | HR creates/updates/deactivates employees and managers; employees view/update own profile |
| 4 | Attendance | Check-in, check-out, own history, team view (manager), company view (HR), server-side duplicate prevention |
| 5 | Leave Management | Apply, view own, view team (manager), view all (HR), approve/reject with state rules, rejection reason |
| 6 | Announcements | HR and managers post (managers edit/delete only their own); everyone reads, filtered by target audience |
| 7 | Training | HR/manager create and manage programmes; employees view and enrol; HR/managers assign people (managers their own team); capacity enforced |
| 8 | Notifications | Stored in MongoDB; created by leave/announcement/training events; list, mark read, mark all read |
| 9 | Dashboards | Role-specific dashboards whose statistics come from backend aggregation endpoints |
| 10 | Reports & Analytics | HR: headcount, department breakdown, attendance summary, leave statistics, training statistics |
| 11 | Health Check | `GET /api/health` reporting API status and MongoDB connection state |

## 2. Roles and Permissions Matrix

Legend: ✅ allowed · 🔒 own/team-scoped only · ❌ forbidden (enforced server-side)

| Capability | Employee | Manager | HR |
|---|---|---|---|
| Register via public endpoint | ✅ (role forced to `employee`) | ❌ (created by HR) | ❌ (created by HR/seed) |
| Login / get own profile | ✅ | ✅ | ✅ |
| Update own personal info (phone, address) | ✅ | ✅ | ✅ |
| Update employment info (department, designation, manager) | ❌ | ❌ | ✅ |
| Create / deactivate employees & managers | ❌ | ❌ | ✅ |
| Check in / check out | ✅ | ✅ | ✅ |
| View own attendance | ✅ | ✅ | ✅ |
| View team attendance | ❌ | 🔒 own team only | ✅ all |
| Apply for leave | ✅ | ✅ | ❌ (out of scope v1) |
| View own leaves | ✅ | ✅ | ✅ |
| View team leaves | ❌ | 🔒 own team only | ✅ all |
| Approve / reject leave | ❌ | 🔒 own team only | ✅ any |
| Create announcements | ❌ | ✅ | ✅ |
| Edit / delete announcements | ❌ | 🔒 own posts | ✅ |
| View announcements | ✅ (audience-filtered) | ✅ (audience-filtered) | ✅ |
| Create / edit / delete training | ❌ | ✅ | ✅ |
| Enrol in training | ✅ | ✅ | ❌ |
| Assign people to training | ❌ | 🔒 own team | ✅ |
| View own notifications / mark read | ✅ | ✅ | ✅ |
| Dashboard stats endpoint | 🔒 own | 🔒 team | ✅ company-wide |
| Reports & analytics | ❌ | ❌ | ✅ |

Key security decisions:
- **Public registration creates `employee` accounts only.** The backend ignores any `role` field on `/register`. Manager and HR accounts are created by HR through the employee-management module. The very first HR account comes from a seed script (documented, never hard-coded credentials).
- **Team scoping** is resolved server-side: a manager's "team" = Employee documents whose `managerId` equals the manager's own Employee `_id`. The frontend never passes "whose data am I allowed to see".

## 3. Database / Entity Relationship Plan

Seven collections. A manager is a `User` with `role: 'manager'` plus an `Employee` document — no separate Manager collection, no duplicated people.

```
User 1───1 Employee ──┬──* Attendance
  │                   ├──* Leave ──── approvedBy ──► User
  │                   └──* Training.participants
  ├──* Notification (recipient)
  ├──* Announcement (createdBy)
  └── Employee.managerId ──► Employee (self-reference)
```

**User** — `name`, `email` (unique, lowercase), `password` (bcrypt hash, `select: false`), `role` (`employee|manager|hr`), `isActive`, timestamps.
**Employee** — `userId` (ref User, unique), `employeeId` (unique, auto-generated e.g. `EMP0001`), `department`, `designation`, `phone`, `joiningDate`, `managerId` (ref Employee, nullable), `address`, `dateOfBirth`, timestamps.
**Attendance** — `employeeId` (ref Employee), `date` (normalised to midnight — stored as a `YYYY-MM-DD` string to avoid timezone drift), `checkIn`, `checkOut`, `status` (`present|half-day|absent`), `workingHours`. **Unique compound index `{ employeeId, date }`** — the database itself blocks double check-in.
**Leave** — `employeeId` (ref Employee), `leaveType` (`casual|sick|earned|unpaid`), `startDate`, `endDate`, `reason`, `status` (`pending|approved|rejected`), `approvedBy` (ref User), `rejectionReason`, timestamps. Index `{ employeeId, status }` and `{ status, createdAt }`.
**Announcement** — `title`, `content`, `createdBy` (ref User), `targetAudience` (`all|employees|managers`), timestamps.
**Training** — `title`, `description`, `trainer`, `startDate`, `endDate`, `capacity`, `createdBy` (ref User), `participants` [ref Employee], timestamps.
**Notification** — `recipient` (ref User), `type` (`leave|announcement|training|system`), `title`, `message`, `relatedEntity` (`{ entityType, entityId }`), `isRead`, `createdAt`. Index `{ recipient, isRead, createdAt }`.

## 4. REST API Architecture

- Base path `/api`, JSON everywhere.
- **Uniform response envelope**: `{ success, message, data }` on success; `{ success: false, message, errors? }` on failure — produced by one central error middleware and shared response helpers, so the frontend can rely on a single shape.
- Middleware chain per request: `cors → express.json → route → protect → authorize(roles) → validation → controller → errorMiddleware`.
- Controllers are async and wrapped so thrown errors reach the central error handler; invalid ObjectIds return 404/400, never a raw 500 stack trace.
- Every route file is mounted in `server.js`; the integration checkpoint (prompt §26) verifies mounting for every module before it is called done.
- Pagination convention: `?page=&limit=` on list endpoints, response `data: { items, page, totalPages, total }`.

## 5. API Endpoint List

**Health & Auth**
| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/api/health` | – | – |
| POST | `/api/auth/register` | – | – (creates employee only) |
| POST | `/api/auth/login` | – | – |
| GET | `/api/auth/me` | ✅ | any |

**Employees** (HR unless noted)
| Method | URL | Role |
|---|---|---|
| GET | `/api/employees` | hr (paginated, filter by department/role) |
| GET | `/api/employees/:id` | hr, or owner |
| POST | `/api/employees` | hr (creates User + Employee, any role) |
| PUT | `/api/employees/:id` | hr (full), owner (personal fields only) |
| DELETE | `/api/employees/:id` | hr (soft delete → `isActive: false`) |
| GET | `/api/employees/me` | any (own profile) |
| GET | `/api/employees/team` | manager (own team) |

**Attendance**
| Method | URL | Role |
|---|---|---|
| POST | `/api/attendance/check-in` | any |
| POST | `/api/attendance/check-out` | any |
| GET | `/api/attendance/my` | any |
| GET | `/api/attendance/team` | manager |
| GET | `/api/attendance` | hr |

**Leaves**
| Method | URL | Role |
|---|---|---|
| POST | `/api/leaves` | employee, manager |
| GET | `/api/leaves/my` | any |
| GET | `/api/leaves/team` | manager |
| GET | `/api/leaves` | hr |
| GET | `/api/leaves/:id` | owner, their manager, hr |
| PUT | `/api/leaves/:id/approve` | manager (team only), hr |
| PUT | `/api/leaves/:id/reject` | manager (team only), hr — requires `rejectionReason` |

**Announcements**
| Method | URL | Role |
|---|---|---|
| GET | `/api/announcements` | any (audience-filtered) |
| POST / PUT `/:id` / DELETE `/:id` | `/api/announcements` | hr, manager (own posts) |

**Training**
| Method | URL | Role |
|---|---|---|
| GET | `/api/trainings` | any |
| POST / PUT `/:id` / DELETE `/:id` | `/api/trainings` | hr, manager |
| POST | `/api/trainings/:id/enroll` | employee, manager (capacity-checked) |
| POST / DELETE `/:employeeId` | `/api/trainings/:id/participants` | hr (anyone), manager (own team) |

**Notifications**
| Method | URL | Role |
|---|---|---|
| GET | `/api/notifications` | any (own only) |
| PUT | `/api/notifications/:id/read` | owner |
| PUT | `/api/notifications/read-all` | owner |

**Dashboards & Reports** (all stats from MongoDB aggregation — nothing hard-coded)
| Method | URL | Role |
|---|---|---|
| GET | `/api/dashboard/employee` | employee |
| GET | `/api/dashboard/manager` | manager |
| GET | `/api/dashboard/hr` | hr |
| GET | `/api/reports/attendance-summary` | hr |
| GET | `/api/reports/leave-summary` | hr |
| GET | `/api/reports/department-stats` | hr |

## 6. Frontend Page List

| Route | Page | Guard |
|---|---|---|
| `/login`, `/register` | Auth pages | public |
| `/employee/dashboard` · `/profile` · `/attendance` · `/leaves` · `/training` · `/announcements` · `/notifications` | Employee area | employee |
| `/manager/dashboard` · `/team` · `/attendance` · `/leaves` · `/training` · `/announcements` · `/notifications` | Manager area | manager |
| `/hr/dashboard` · `/employees` · `/managers` · `/attendance` · `/leaves` · `/announcements` · `/training` · `/reports` · `/notifications` | HR area | hr |
| `/` | Redirect to role dashboard | authenticated |
| `*` | 404 page | public |

A `ProtectedRoute` component checks token + role and redirects; the backend remains the real enforcement layer.

## 7. Backend Folder Structure

As specified in the brief (`server/` with `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `utils/`, `server.js`), with two small additions:
- `controllers/dashboardController.js` + `routes/dashboardRoutes.js` (role dashboards + HR reports)
- `seed/seed.js` — creates the first HR user and optional demo data; clearly marked as seed data, never required in production flow.

## 8. Frontend Folder Structure

As specified (`client/src/` with `components/`, `pages/{auth,employee,manager,hr}/`, `layouts/`, `services/`, `store/`, `routes/`, `hooks/`, `utils/`), built with **Vite**. Additions:
- `services/api.js` — the single Axios instance (baseURL from `VITE_API_URL`, request interceptor attaches the JWT, response interceptor handles 401 → logout/redirect).
- `services/notificationService.js` and `services/dashboardService.js`.
- `store/` holds Redux Toolkit for **auth state only**; page data uses local component state + service calls, which is simpler for a fresher and perfectly adequate here.

## 9. Dependencies

**Backend**: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `express-validator` (declarative request validation). Dev: `nodemon`.
**Frontend**: `react`, `react-dom`, `react-router-dom`, `axios`, `@reduxjs/toolkit`, `react-redux`, **Material UI** (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`) — chosen over Bootstrap for consistent, accessible, professional components with less custom CSS. Dev: `vite`, `@vitejs/plugin-react`.
No other frameworks.

## 10. Phase-by-Phase Roadmap

| Phase | Deliverable | Verified by |
|---|---|---|
| 1 | Repo, server + client scaffolds, `.env`/`.env.example`/`.gitignore`, Express boots, `/api/health` | health check in Postman |
| 2 | MongoDB connection + all 7 Mongoose models with indexes | server boots, indexes visible in MongoDB |
| 3 | Backend foundation: error middleware, response helpers, route mounting pattern | deliberate error returns envelope JSON |
| 4 | Auth: register, login, bcrypt, JWT, `/auth/me` | Postman: all auth test cases |
| 5 | `protect` + `authorize` middleware, RBAC proven | Postman: 401/403 cases |
| 6 | Employee module + seed script (first HR user) | Postman + data in MongoDB |
| 7 | Attendance module | duplicate check-in blocked server-side |
| 8 | Leave module incl. approve/reject state rules | full employee→manager→employee cycle in Postman |
| 9 | HR module: employee/manager management, dashboards, reports aggregation | Postman |
| 10 | Announcements + Training | Postman |
| 11 | Notifications wired into leave/announcement events | Postman |
| 12 | Frontend foundation: Axios instance, auth pages, Redux auth, protected routes | login via real API |
| 13 | Role dashboards + all pages consuming real APIs | UI shows MongoDB data |
| 14 | End-to-end testing of the leave workflow across all three roles | manual E2E checklist |
| 15 | Security hardening pass (checklist §12 below) | checklist audit |
| 16 | Pagination, selective fields, measured optimisation | — |
| 17 | Full integration test against acceptance criteria (brief §44) | all 30 criteria |
| 18 | Deployment configuration + README completion | deployed health check |

Each backend phase ends with the 12-point API Integration Checkpoint (brief §26) before moving on.

## 11. API Testing Strategy

1. **Backend-first rule**: every module is proven in Postman against real MongoDB *before* any frontend touches it.
2. **Postman collection** organised by module, with an environment (`baseUrl`, `employeeToken`, `managerToken`, `hrToken`). Login requests save tokens to environment variables automatically.
3. **Per-endpoint checklist**: happy path, missing/invalid body, unauthenticated (expect 401), wrong role (expect 403), nonexistent id (expect 404), duplicate/conflict (expect 400/409). Expected status code and response body documented per request.
4. **Database verification**: after every write test, confirm the document in MongoDB (Compass or `mongosh`) — a 200 response alone is not proof.
5. **Cross-role workflow test** (the critical one): employee applies → manager sees it in `/leaves/team` → manager approves → employee's `/leaves/my` shows `approved` → HR's `/leaves` shows the same record → notification created for the employee. One record, three dashboards, verified in the database.
6. Honest reporting: anything not actually executed is reported as *"implementation provided, runtime verification still required."*

## 12. Security Checklist

> All items verified in Phase 15 and covered by `server/tests`. See the README *Security* section for how each is met.

- [x] Passwords hashed with bcryptjs (salt ≥ 10); `password` has `select: false` and is stripped from every response
- [x] JWT signed with `JWT_SECRET` from `.env`; payload contains only `{ id }` (role re-read from DB on each request so revocation/role changes take effect)
- [x] Expired/invalid/absent tokens → 401; wrong role → 403
- [x] Public registration cannot create manager/HR accounts
- [x] All ownership and team scoping resolved server-side from the authenticated user, never from request parameters
- [x] Input validation on every write endpoint (express-validator) in addition to Mongoose validation
- [x] Request bodies whitelisted per endpoint — no blind `req.body` spreads into models (blocks privilege-escalation fields and operator injection)
- [x] CORS restricted to `CLIENT_URL`, no blind wildcard
- [x] Central error handler: generic message + no stack traces in production responses
- [x] `.env` in `.gitignore`; `.env.example` with placeholders only; no secrets in frontend code
- [x] Deactivated users (`isActive: false`) cannot log in or use existing tokens
- [x] Soft delete for people records so references (leaves, attendance) stay intact

## 13. Technical Risks and Prevention

| Risk (the ones that killed the previous project first) | Prevention |
|---|---|
| Route file created but never mounted | Mounting is step 2 of every module; checkpoint §26 re-verifies; health-check phase prints mounted routes on boot in dev |
| Frontend URL ≠ backend URL (`/leave` vs `/leaves`) | One Axios instance + per-module service files; endpoint paths live only in services, never inline in components |
| CORS failures mistaken for API failures | CORS configured in Phase 1 from `CLIENT_URL`; documented symptoms in README |
| Timezone bugs → duplicate or missing attendance days | `date` stored as `YYYY-MM-DD` string computed server-side; unique DB index as the final guard |
| Approved leave re-approved / double-processed | Status transition enforced atomically with `findOneAndUpdate({ _id, status: 'pending' }, ...)` — not check-then-save |
| Invalid ObjectId crashes to 500 | Central error handler maps `CastError` → 404/400 |
| Mongoose `populate` on deleted users → null crashes | Soft deletes + defensive population handling |
| No HR account exists to bootstrap the system | Documented seed script (brought forward to Phase 5 so RBAC could be proven) |
| Secrets committed | `.gitignore` written in Phase 1 before any `.env` exists |
| "Looks done" frontend hiding broken APIs | Backend-first order (phases 4–11 before 12–13) + no-mock rule |
