# StaffSync — Human Resource Management System

StaffSync is a full-stack MERN (MongoDB, Express, React, Node.js) HR management system covering employees, attendance, leave approval, announcements, training, notifications and role-based dashboards for three roles: **Employee**, **Manager** and **HR**.

StaffSync is multi-tenant: each company is its own **organisation**, signs up at `/signup`, and only ever sees its own data (see *Organisations and tenant isolation*).

Every feature is backed by a real REST API and real MongoDB persistence — no mock data, no fake APIs. The full requirements analysis, permissions matrix, API plan and roadmap are in [docs/PHASE-0-REQUIREMENTS.md](docs/PHASE-0-REQUIREMENTS.md).

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Requirements analysis | ✅ Complete |
| 1 | Project setup, health check, CORS, centralised Axios | ✅ Complete |
| 2 | MongoDB connection + Mongoose models | ✅ Complete |
| 3 | Backend foundation: response helpers, error mapping, validation | ✅ Complete |
| 4 | Authentication (login, JWT) | ✅ Complete |
| 5 | Role-based access control, seed script, employee read endpoints | ✅ Complete |
| 6 | Employee management (create, update, deactivate) | ✅ Complete |
| 7 | Attendance (check-in, check-out, history) | ✅ Complete |
| 8 | Leave management (apply, approve, reject) | ✅ Complete |
| 9 | Role dashboards and HR reports | ✅ Complete |
| 10 | Announcements and training | ✅ Complete |
| 11 | Notifications | ✅ Complete |
| 12 | Frontend foundation: auth pages, session, protected routes, layout | ✅ Complete |
| 13 | Role dashboards and pages using the real API | ✅ Complete |
| 14 | Automated tests and end-to-end leave workflow | ✅ Complete |
| 15 | Security hardening | ✅ Complete |
| 16 | Pagination and measured optimisation | ✅ Complete |
| 17 | Full acceptance check ([docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)) | ✅ 29/30 automated; browser walkthrough pending |
| 18 | Deployment configuration ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) | ✅ Ready; live deployment needs your Render account |
| 19 | Multi-tenant architecture (organisations, isolation, platform admin foundation) ([docs/PHASE-19-MULTITENANCY-PLAN.md](docs/PHASE-19-MULTITENANCY-PLAN.md)) | ✅ Complete |
| 20 | Public demo: one-click sign-in as HR, manager or employee, with a nightly reset (see *Public demo*) | ✅ Complete |
| 21 | Platform admin console: organisations, usage, rename, suspend/reactivate, audit log (see *Platform admins*). Plans and billing come later; StaffSync is free for now | ✅ Complete |

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js (≥ 20.6), Express 5, Mongoose 9, express-validator, jsonwebtoken, bcryptjs, dotenv, cors |
| Database | MongoDB (local or Atlas) |
| Frontend | React 19, Vite 8, Material UI, Axios, React Router, Redux Toolkit |
| Testing | Node.js built-in test runner (`node --test`), Postman / Newman |

## Folder structure

```
TheStaffSync/
├── server/                     Express REST API
│   ├── config/cors.js          CORS allow-list built from CLIENT_URL
│   ├── config/db.js            MongoDB connection
│   ├── controllers/            Request handlers (business logic)
│   ├── middleware/             Error handling, validation, protect / authorize / loadEmployee
│   ├── models/                 Mongoose schemas — models/index.js loads them all
│   ├── models/plugins/         tenantScoped (organisation isolation), withPassword (shared password handling)
│   ├── routes/                 Express routers — each one mounted in app.js
│   ├── scripts/                Maintenance scripts (index sync, test-data clean-up, benchmark, tenancy migration, platform admin)
│   ├── seed/seed.js            Creates an organisation's first HR account (and optional demo data)
│   ├── services/               Shared statistics used by dashboards and reports
│   ├── utils/                  AppError, response helpers, pagination, JWT, password policy, tenant context
│   ├── validators/             express-validator rules per module
│   ├── app.js                  Builds the Express app (middleware + routes)
│   ├── server.js               Loads .env, connects to MongoDB, then starts listening
│   └── .env.example
├── client/                     React (Vite) frontend
│   ├── src/services/api.js     The single Axios instance (adds the token, handles 401)
│   ├── src/services/*.js       One service file per API module; the only place URLs appear
│   ├── src/store/              Redux Toolkit: auth session and display preferences only
│   ├── src/routes/             Route table, role menus, guards, lazy-loaded page map
│   ├── src/layouts/            Signed-in shell (menu, top bar, notification bell)
│   ├── src/pages/              One folder per area: auth, dashboards, attendance, leaves, …
│   ├── src/components/         Shared UI (page header, stat cards, status chips, dialogs)
│   ├── src/hooks/              useApi (load/reload data), useSnackbar (toasts)
│   ├── src/utils/              Formatting (British, 24-hour), labels, safe localStorage
│   ├── src/theme.js            Material UI theme
│   └── .env.example
├── render.yaml                 Render blueprint (one web service)
├── package.json                Root build/start scripts for hosting
├── .github/workflows/ci.yml    Lint, tests and build on every push
└── docs/
    ├── PHASE-0-REQUIREMENTS.md
    ├── ACCEPTANCE.md           Phase 17 acceptance check: 30 criteria with evidence
    ├── E2E-CHECKLIST.md        Manual browser walkthrough for all roles
    ├── RBAC.md                 Permission matrix per role, mapped to the brief
    ├── DEPLOYMENT.md           Step-by-step deployment (Render + Atlas)
    ├── PHASE-19-MULTITENANCY-PLAN.md  Multi-tenant design, migration and decisions
    └── postman/                Postman collection + environment
```

`app.js` is kept separate from `server.js` so automated tests (Phase 14) can import the app without opening a network port.

## Prerequisites

- Node.js 20.6 or newer (developed on Node 24)
- npm
- MongoDB — a local install or a free MongoDB Atlas cluster

## Installation

```bash
# Backend
cd server
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# Frontend
cd ../client
npm install
cp .env.example .env
```

Then edit both `.env` files (see below). Most people need nothing more: start the app and sign up your company at **/signup**. You become HR of a new organisation and add everyone else.

To create an organisation and its first HR account from the command line instead:

```bash
cd server
npm run seed -- --organisation "Company name"        # the organisation (created if new) + HR account from SEED_HR_* in .env
npm run seed:demo -- --organisation "Company name"   # optional: also a demo manager with a team, for testing
```

- `--hr-name "…"` and `--hr-email "…"` override `SEED_HR_NAME` and `SEED_HR_EMAIL`. `SEED_ORGANISATION` in `.env` is the default for `--organisation`.
- Safe to re-run: existing accounts are left alone. An email already used in **another** organisation is refused, because emails are unique across StaffSync.

## Environment variables

**server/.env**

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | `development` or `production` (production hides stack traces) | `development` |
| `PORT` | Port the API listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/staffsync` |
| `JWT_SECRET` | Secret for signing tokens — at least 32 characters; the server refuses to start without it | generate with the command below |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Frontend origin(s) allowed by CORS, comma-separated | `http://localhost:5173` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email server for "Forgot password" (any SMTP provider). Without `SMTP_HOST`, development prints the email in the server terminal and production replies that email reset is unavailable | Microsoft 365: `smtp.office365.com`, `587` |
| `MAIL_FROM` | Sender shown on emails | `StaffSync <no-reply@example.com>` |
| `APP_URL` | Frontend address used in reset links | first `CLIENT_URL` |
| `RESET_TOKEN_MINUTES` | How long a reset link works | `30` |
| `FORGOT_PASSWORD_MAX_PER_HOUR` | Reset emails per address and email per hour | `5` |
| `LOGIN_MAX_FAILURES` | Failed logins (and failed password changes) allowed per account and address before a lock | `5` |
| `RATE_LIMIT_WINDOW_MINUTES` | Length of the rate-limit window | `15` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests allowed per address per window, across the whole API | `1000` |
| `SIGNUP_MAX_PER_HOUR` | Organisation sign-ups allowed per address per hour | `10` in production, `100` otherwise |
| `DEMO_LOGIN_MAX_REQUESTS` | One-click demo sign-ins allowed per address per `RATE_LIMIT_WINDOW_MINUTES` | `30` |
| `TRUST_PROXY` | Number of proxies in front of the API (e.g. `1` on most hosts), so limits see the real client address. Leave unset when running directly | unset |
| `WORKING_DAYS` | **Default for new organisations** (and code outside an organisation): working days used to count absences in reports, comma-separated from `Sun Mon Tue Wed Thu Fri Sat`. Each organisation then has its own, set by its HR. The server will not start with an invalid list | `Mon,Tue,Wed,Thu,Fri` (default); `Mon,Tue,Wed,Thu,Fri,Sat` for a six-day week |
| `TIMEZONE` | **Default for new organisations** (and code outside an organisation): time zone (IANA name) for attendance and leave dates. Each organisation then has its own, set by its HR (see *Time zones*). The server will not start with an invalid one | `Asia/Kolkata` (IST, the default if unset) |
| `SEED_ORGANISATION` | Optional: the default for the seed script's `--organisation` | — |
| `SEED_HR_NAME` | Name of the organisation's first HR account (seed script only) | `StaffSync HR` |
| `SEED_HR_EMAIL` | Email of the first HR account | `hr@example.com` |
| `SEED_HR_PASSWORD` | Its password: 8+ characters with a letter and a number | — |
| `SEED_DEMO_PASSWORD` | Shared password for the `npm run seed:demo` accounts | — |
| `PLATFORM_ADMIN_PASSWORD` | Optional: used only by `npm run platform:create-admin` (see *Platform admins*). Remove it afterwards if you like | — |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**client/.env**

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the API, including `/api` | `http://localhost:5000/api` |

Anything prefixed `VITE_` is bundled into the browser code, so **never put secrets in client/.env**. Both `.env` files are git-ignored; only `.env.example` files are committed.

> Windows note: if you create `.env` with PowerShell 5.1's `Out-File`, it adds an invisible byte-order mark that can break the first variable. Create the file in VS Code or use `Copy-Item` from `.env.example`.

## Running the project

Open two terminals.

```bash
# Terminal 1 — backend (restarts automatically on file changes)
cd server
npm run dev
# → MongoDB connected: <host>/<database>
# → StaffSync API listening on http://localhost:5000 (development)
# → CORS allowed origins: http://localhost:5173
# → Default time zone for new organisations: Asia/Kolkata
# → Default working days: Mon, Tue, Wed, Thu, Fri
# → Mounted routes: /api/health, /api/auth, /api/organisations, /api/platform, /api/demo, /api/employees, /api/attendance, /api/leaves, /api/dashboard, /api/reports, /api/announcements, /api/trainings, /api/notifications

# Terminal 2 — frontend
cd client
npm run dev
# → Local: http://localhost:5173/
```

Open http://localhost:5173 and either sign up a company at **/signup** or log in. With the seed data you can use:

| Role | Email | Password |
|---|---|---|
| HR | `SEED_HR_EMAIL` (e.g. `hr@staffsync.demo`) | `SEED_HR_PASSWORD` from `server/.env` |
| Manager | `manager@staffsync.demo` | `SEED_DEMO_PASSWORD` |
| Employee | `employee1@staffsync.demo` (or `employee2`, `employee3`) | `SEED_DEMO_PASSWORD` |

Employees cannot sign themselves up: HR adds them. `/register` in the browser now redirects to `/signup`, which creates a **new** organisation.

`npm run dev` in the server uses Node's built-in `--watch` mode instead of nodemon (one fewer dependency, and nodemon currently pulls in a vulnerable file-watcher package). It restarts on code changes but **not** on `.env` changes — stop it with Ctrl+C and run it again after editing `.env`. Use `npm start` for production.

The server connects to MongoDB **before** it starts listening. If the connection fails it prints the reason and exits, rather than running an API that cannot reach its data.

## Frontend

The React app has one area per role. Every page reads and writes through the real API; there is no mock data.

| Page | Employee | Manager | HR |
|---|---|---|---|
| Dashboard | Today's check-in, month's attendance, leave, trainings, latest announcements | Same for themselves, plus the team today and the oldest pending leave | Headcount, today across the company, pending leave, trainings, recent joiners |
| Attendance | Check in/out and history | Team history, plus own | Company history (filter by department and status), plus own |
| Leave | Apply and track requests | Approve/reject team requests (pending first), plus own | Approve/reject any request |
| Training | Browse, enrol, withdraw | Same, plus create and manage their own trainings | Create and manage any training, see participants |
| Announcements | Read (own audience) | Read (own audience) | Publish, edit, delete |
| Team / Employees / Managers | — | Direct reports | Directory with filters; add, edit (including time zone and manager), deactivate, reactivate |
| Reports | — | — | Departments, attendance, leave and training reports |
| Company settings | — | — | Organisation name, time zone and working days |
| Notifications | All roles: list, unread filter, mark read, mark all read; the top-bar bell shows the unread count and opens this page |
| My profile | All roles: view, and edit own phone and address |

**Design system**

- **Colours** live in one file, [client/src/theme/tokens.js](client/src/theme/tokens.js): the light palette (ivory, cream, beige, sage, ice blue, sapphire, champagne) and the dark palette (noir, sapphire, ivory, champagne). Both the Material UI theme and the global CSS variables (`--bg-primary`, `--champagne`, `--card-bg`, …) are generated from it. Components use `var(--…)` or theme palette names and never hard-code colours.
- **Light and dark themes:** use the sun/moon button in the top bar or on the login page. The choice is remembered on the device and applied before the page draws, so there is no flash.
- **Champagne metallic** (`variant="premium"` buttons, `var(--metal)`) is an accent only: the logo, the active-menu bar, tab underlines, and at most one main action per page (Check in, Apply for leave, Add person, New training, New announcement).
- **Status colours are muted:** sage means done or good, champagne means waiting, burgundy means a problem, ice blue means in progress, and grey means neutral.
- **Fonts:** Playfair Display for headings and big numbers, Inter for everything else (Google Fonts).
- **Contrast:** every text/background pair in both themes meets WCAG AA (4.5:1 for text, 3:1 for icons and large text). Where a palette colour was too faint for small text on noir, a lighter tint of the same colour is used for text only (`sage-text`, `burgundy-text`).

**Behaviour worth knowing**

- **Session:** the token is kept in `localStorage` so a refresh keeps you signed in. Any 401 from the API (expired token, account deactivated) signs you out and shows the reason on the login page. If the server is unreachable when the app opens, you get a retry screen rather than being logged out.
- **Sign-up:** `/signup` asks for the company name, your name, email and password, and signs you in as HR of the new organisation. The organisation's name is shown in the menu and top bar.
- **Access:** `/employee/…`, `/manager/…` and `/hr/…` pages are only shown to that role, and `/` sends you to your own dashboard. This is for convenience only; the API enforces every permission itself.
- **Times and dates:** everything uses British formatting and 24-hour times. Clock times (check-in, check-out, when something was posted) are shown in the **display time zone** chosen in the top bar. It defaults to India (IST), and the choice is remembered on that device. Calendar dates (leave, attendance days, trainings) never shift with the display zone.
- **Forms** check the obvious rules before sending (for example password strength and date order) and show the API's field errors next to the right field.
- **Loading:** each page's code is downloaded the first time it is opened.

## Database

### MongoDB Atlas connection string

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/staffsync?retryWrites=true&w=majority
```

- Use a **database user** from Atlas → *Database Access*, not your Atlas login.
- Remove the `< >` placeholders entirely.
- The `@` before the cluster host must stay a literal `@`. Only special characters **inside the password** are URL-encoded (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `%` → `%25`).
- Add your IP address in Atlas → *Network Access*.

### Collections

| Model | Collection | Purpose | Indexes |
|---|---|---|---|
| `Organisation` | organisations | A customer company: `name`, `slug`, `status` (`active`, `suspended`), `settings: { timeZone, workingDays }` | `slug` unique |
| `PlatformAdmin` | platformadmins | StaffSync operator accounts; no `organisationId` (see *Platform admins*) | `email` unique |
| `User` | users | Login identity and role (`employee`, `manager`, `hr`) | `email` unique (across all organisations); `{ organisationId, role, isActive }` |
| `Employee` | employees | Employment profile, one per user; `employeeId` auto-assigned per organisation (`EMP0001`…) | `userId` unique; `{ organisationId, employeeId }` unique; `managerId`; `{ organisationId, department }` |
| `Attendance` | attendances | One record per employee per day (`date` is `YYYY-MM-DD`) | `{ employeeId, date }` **unique** — blocks double check-in; `{ organisationId, date, checkIn }` |
| `Leave` | leaves | Leave requests and their approval state | `{ employeeId, status }`; `{ organisationId, status, createdAt }` |
| `Announcement` | announcements | HR announcements with a target audience | `{ organisationId, targetAudience, createdAt }`; `{ createdBy, createdAt }` |
| `Training` | trainings | Training programmes; `participants` cannot exceed `capacity` | `{ organisationId, startDate }`; `participants` |
| `Notification` | notifications | Per-user notifications | `{ recipient, isRead, createdAt }` |
| `Counter` | counters | Atomic `employeeId` sequence, one per organisation (internal) | — |
| — | migrations | Log of the Phase 19 tenancy migration, used by `--rollback` and `clean:test-data` (internal) | — |
| — | demobaselines | The public demo's baseline: a copy of its records that the nightly reset returns to (internal, written by `demo:setup`) | — |
| `PlatformAuditLog` | platformauditlogs | Every change made in the platform console: admin, action, organisation, details, address (append-only) | — |

The organisation-owned collections (users, employees, attendances, leaves, announcements, trainings, notifications) all carry a required, unchangeable `organisationId`.

Rules enforced by the schemas themselves: required fields, enums, maximum lengths, `endDate` not before `startDate`, check-out after check-in, date of birth in the past, whole-number capacity. Passwords use `select: false` and are also stripped from JSON output.

Queries that filter on a field not in the schema throw an error (`strictQuery: 'throw'`) rather than silently matching every document.

### Indexes

Mongoose creates missing indexes automatically when the server starts. To create them explicitly, remove stale ones and print what each collection has:

```bash
cd server
npm run db:indexes
```

You can also see them in Atlas → *Browse Collections* → a collection → *Indexes*.

### Upgrading an existing database to organisations (Phase 19)

A database from before Phase 19 has no organisations. The migration script gives every record one. It is **non-destructive** (it adds `organisationId` and organisation records and changes indexes; it deletes and renames nothing) and safe to re-run.

```bash
cd server
npm run migrate:tenancy -- --plan tenancy-plan.local.json             # dry run (default): prints everything, changes nothing
npm run migrate:tenancy -- --export                                   # JSON copy of every collection into server/backups/
npm run migrate:tenancy -- --plan tenancy-plan.local.json --apply     # exports first, then migrates and verifies
npm run migrate:tenancy -- --plan tenancy-plan.local.json --rollback  # undoes --apply
```

The plan file says which accounts go to which organisation. Exactly one organisation is the `"default"`, which receives every account not listed elsewhere:

```json
{
  "organisations": [
    { "name": "Company A", "default": true },
    { "name": "Company B", "emails": ["someone@example.com", "another@example.com"] }
  ]
}
```

- Records follow their owner: profiles, attendance and leave follow the employee, notifications the recipient, announcements and trainings the author. Manager links that would cross organisations are cleared (and restored by rollback).
- Each organisation's employee codes continue from its own highest one.
- Plan files (`*.local.json`) and `server/backups/` are git-ignored, because they hold personal data.
- `--rollback` refuses, changing nothing, once organisations share employee codes or new organisations have signed up. Restore the export in `server/backups/` instead.

## API response format

Every endpoint returns the same JSON shape so the frontend can handle responses uniformly.

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "Human-readable reason", "errors": [{ "field": "email", "message": "Email is not valid" }] }
```

`errors` appears only when there is something field-specific to report. Submitted values are never echoed back, because they may be passwords.

Paginated lists accept `?page=&limit=` (default 10, maximum 100) and return:

```json
{ "success": true, "message": "…", "data": { "items": [], "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

### Error status codes

All errors go through one handler ([server/middleware/errorMiddleware.js](server/middleware/errorMiddleware.js)):

| Situation | Status | Message |
|---|---|---|
| Request validation failed (express-validator) | 400 | `Validation failed` + `errors` |
| Schema validation failed (Mongoose) | 400 | `Validation failed` + `errors` |
| Malformed JSON body | 400 | `Request body contains invalid JSON` |
| Query on a field not in the schema | 400 | `Request contains an unknown field` |
| Malformed `:id` checked with `validateObjectId()` | 400 | `Validation failed`, field `id` |
| Malformed id that reaches the database unchecked | 404 | `Resource not found` |
| Unknown route | 404 | `Route not found: METHOD /path` |
| Duplicate value on a unique index | 409 | `A record with this email already exists` |
| Body over 10 kB | 413 | `Request body is too large` |
| Anything unexpected | 500 | The real message and `stack` in development; `Internal Server Error` in production |

## Adding a backend module

Each module from Phase 4 onwards follows the same steps:

1. **Controller**: an `async` function per endpoint. Throw `new AppError(message, status)` for expected failures and reply with `sendSuccess` / `sendCreated` from `utils/apiResponse.js`. Express 5 forwards errors from async functions to the error handler, so no try/catch or wrapper is needed.
2. **Routes**: `protect`, then `authorize(...roles)` if only some roles may call it, then express-validator chains and `validate`, then the controller. Use `validateObjectId()` on any `:id` route, and `loadEmployee` when the controller needs the caller's own employee record.
3. **Model** (if new): data that belongs to a company must use `schema.plugin(tenantScoped)`, so it is isolated automatically, and indexes should start with `organisationId`.
4. **Mount**: add one line to the `routes` table in [server/app.js](server/app.js). The dev boot log prints this table, so check your path appears.
5. **Test**: add requests to the Postman collection covering the success case and each error case.

```js
// routes/exampleRoutes.js
router.get('/:id', validateObjectId(), getExample);
router.post('/', body('title').trim().notEmpty().withMessage('Title is required'), validate, createExample);

// controllers/exampleController.js
const getExample = async (req, res) => {
  const example = await Example.findById(req.params.id);
  if (!example) throw new AppError('Example not found', 404);
  sendSuccess(res, { data: example });
};
```

## API reference

| Method | URL | Auth | Role | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/health` | No | – | 200 | – |
| POST | `/api/organisations/signup` | No | – (always creates a new organisation and its HR) | 201 | 400, 409, 429 |
| GET | `/api/organisations/me` | Yes | any | 200 | 401 |
| PUT | `/api/organisations/me` | Yes | hr | 200 | 400, 401, 403 |
| POST | `/api/auth/login` | No | – | 200 | 400, 401, 403 |
| GET | `/api/auth/me` | Yes | any | 200 | 401 |
| PUT | `/api/auth/password` | Yes | any | 200 | 400, 401, 429 |
| POST | `/api/auth/forgot-password` | No | – | 200 | 400, 429, 503 |
| POST | `/api/auth/reset-password` | No | – | 200 | 400, 429 |
| GET | `/api/employees` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/employees/team` | Yes | manager | 200 | 401, 403, 404 |
| GET | `/api/employees/me` | Yes | any | 200 | 401, 404 |
| GET | `/api/employees/:id` | Yes | hr, the employee, their manager | 200 | 400, 401, 403, 404 |
| POST | `/api/employees` | Yes | hr | 201 | 400, 401, 403, 409 |
| PUT | `/api/employees/:id` | Yes | hr (any field); the employee (own phone and address only) | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/employees/:id` | Yes | hr | 200 | 400, 401, 403, 404, 409 |
| POST | `/api/attendance/check-in` | Yes | any | 201 | 400, 401, 409 |
| POST | `/api/attendance/check-out` | Yes | any | 200 | 400, 401, 404, 409 |
| GET | `/api/attendance/today` | Yes | any | 200 | 401 |
| GET | `/api/attendance/my` | Yes | any | 200 | 400, 401 |
| GET | `/api/attendance/team` | Yes | manager | 200 | 400, 401, 403 |
| GET | `/api/attendance` | Yes | hr | 200 | 400, 401, 403 |
| POST | `/api/leaves` | Yes | employee, manager | 201 | 400, 401, 403, 409 |
| GET | `/api/leaves/my` | Yes | any | 200 | 400, 401 |
| GET | `/api/leaves/team` | Yes | manager | 200 | 400, 401, 403 |
| GET | `/api/leaves` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/leaves/:id` | Yes | applicant, their manager, hr | 200 | 400, 401, 403, 404 |
| PUT | `/api/leaves/:id/approve` | Yes | applicant's manager, hr | 200 | 400, 401, 403, 404, 409 |
| PUT | `/api/leaves/:id/reject` | Yes | applicant's manager, hr | 200 | 400, 401, 403, 404, 409 |
| GET | `/api/dashboard/employee` | Yes | employee | 200 | 400, 401, 403 |
| GET | `/api/dashboard/manager` | Yes | manager | 200 | 400, 401, 403 |
| GET | `/api/dashboard/hr` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/reports/department-stats` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/reports/attendance-summary` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/reports/leave-summary` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/reports/training-summary` | Yes | hr | 200 | 400, 401, 403 |
| GET | `/api/announcements` | Yes | any (audience-filtered) | 200 | 400, 401 |
| GET | `/api/announcements/:id` | Yes | any (audience-filtered) | 200 | 400, 401, 404 |
| POST | `/api/announcements` | Yes | hr, manager | 201 | 400, 401, 403 |
| PUT | `/api/announcements/:id` | Yes | hr (any), manager (own) | 200 | 400, 401, 403, 404 |
| DELETE | `/api/announcements/:id` | Yes | hr (any), manager (own) | 200 | 400, 401, 403, 404 |
| GET | `/api/trainings` | Yes | any | 200 | 400, 401 |
| GET | `/api/trainings/:id` | Yes | any | 200 | 400, 401, 404 |
| POST | `/api/trainings` | Yes | hr, manager | 201 | 400, 401, 403 |
| PUT | `/api/trainings/:id` | Yes | hr, the manager who created it | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/trainings/:id` | Yes | hr, the manager who created it | 200 | 400, 401, 403, 404, 409 |
| POST | `/api/trainings/:id/enroll` | Yes | employee, manager | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/trainings/:id/enroll` | Yes | employee, manager | 200 | 400, 401, 403, 404, 409 |
| POST | `/api/trainings/:id/participants` | Yes | hr (anyone), manager (own team) | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/trainings/:id/participants/:employeeId` | Yes | hr (anyone), manager (own team) | 200 | 400, 401, 403, 404, 409 |
| GET | `/api/notifications` | Yes | any (own only) | 200 | 400, 401 |
| PUT | `/api/notifications/:id/read` | Yes | owner | 200 | 400, 401, 404 |
| PUT | `/api/notifications/read-all` | Yes | owner | 200 | 401 |
| POST | `/api/platform/auth/login` | No | – (platform admins only) | 200 | 400, 401 |
| GET | `/api/platform/me` | Platform token | platform admin | 200 | 401 |
| PUT | `/api/platform/auth/password` | Platform token | platform admin | 200 | 400, 401, 429 |
| GET | `/api/platform/stats` | Platform token | platform admin | 200 | 401 |
| GET | `/api/platform/organisations` | Platform token | platform admin (`?q=&status=&page=&limit=`) | 200 | 400, 401 |
| GET | `/api/platform/organisations/:id` | Platform token | platform admin | 200 | 400, 401, 404 |
| PATCH | `/api/platform/organisations/:id` | Platform token | platform admin (`{ name }` only) | 200 | 400, 401, 404 |
| POST | `/api/platform/organisations/:id/suspend` | Platform token | platform admin (`{ reason }`) | 200 | 400, 401, 404, 409 |
| POST | `/api/platform/organisations/:id/reactivate` | Platform token | platform admin | 200 | 401, 404, 409 |
| GET | `/api/platform/audit` | Platform token | platform admin (`?organisationId=&action=&page=&limit=`) | 200 | 400, 401 |
| GET | `/api/demo` | No | – (is a public demo available?) | 200 | – |
| POST | `/api/demo/login` | No | – (`{ role }`: hr, manager or employee) | 200 | 400, 404, 429 |

"Yes" means an organisation user's token. Every endpoint marked "Yes" can also answer **403** when the user's organisation is suspended.

More endpoints are added and documented phase by phase; the full planned list is in [docs/PHASE-0-REQUIREMENTS.md](docs/PHASE-0-REQUIREMENTS.md#5-api-endpoint-list).

### GET /api/health

Reports that the API is alive and the current MongoDB connection state.

```json
{
  "success": true,
  "message": "StaffSync API is running",
  "data": {
    "environment": "development",
    "database": "connected",
    "uptimeSeconds": 11,
    "timestamp": "2026-10-06T17:35:20.213Z"
  }
}
```

`database` is one of `connected`, `connecting`, `disconnected`, `disconnecting`.

### Authentication

Send the token from sign-up or login on every protected request:

```
Authorization: Bearer <token>
```

Tokens last `JWT_EXPIRES_IN` (default `1d`) and contain only the account id and a `scope`: `org` for organisation users, `platform` for platform admins. Role, organisation and active status are read from the database on every request, so if HR deactivates someone or changes their role, it applies straight away, even to tokens already issued.

- The organisation API refuses platform tokens, and the platform API refuses organisation tokens (**401**).
- Tokens issued before Phase 19 have no scope, so everyone has to log in again once.

| Response | Meaning |
|---|---|
| 401 `Not authenticated. Please log in.` | No `Authorization: Bearer …` header |
| 401 `Invalid token. Please log in again.` | Token malformed, tampered with, signed with another secret, or of the wrong scope |
| 401 `Your session has expired. Please log in again.` | Token past its expiry |
| 401 `The account for this token no longer exists.` | User deleted |
| 401 `This account has been deactivated.` | User deactivated by HR |
| 403 `Your organisation's StaffSync account is suspended. Contact StaffSync support.` | The user's organisation is suspended |

### POST /api/organisations/signup

Public. A company starts using StaffSync. Creates a **new** organisation, and the person signing up becomes its **HR**. HR then adds everyone else (`POST /api/employees`). Sign-up can never add anyone to an existing organisation. There is no employee self-registration: `POST /api/auth/register` no longer exists (**404**).

```json
{ "companyName": "Acme Ltd", "name": "Asha Kumar", "email": "asha@example.com", "password": "Passw0rd123" }
```

| Field | Rules |
|---|---|
| `companyName` | Required, 2–100 characters |
| `name` | Required, up to 100 characters |
| `email` | Required, valid email; stored lower-case; must not be used in **any** organisation |
| `password` | 8 characters to 72 bytes, at least one letter and one number |

Any other field, such as `role` or `organisationId`, is refused with **400** `Unknown field`. The 72-byte limit exists because bcrypt ignores anything after it.

The organisation, the HR account and their employee profile are created together in one transaction. The organisation starts with the default time zone and working days from `.env`, and its employee codes start at `EMP0001`.

**201** `Organisation created` with `data: { token, user, employee, organisation }`.

**400** `Validation failed` with `errors` · **409** `An account with this email already exists` · **429** after `SIGNUP_MAX_PER_HOUR` sign-ups from one address

### POST /api/auth/login

```json
{ "email": "asha@example.com", "password": "Passw0rd123" }
```

**200** `Login successful` with `data: { token, user, organisation }`. Users of every organisation log in here; emails are unique across StaffSync, so the email alone identifies the organisation.

**401** `Invalid email or password` for both an unknown email and a wrong password, and both take the same time, so neither reveals whether an account exists. A deactivated account gets **401** `This account has been deactivated. Contact HR.`, and a suspended organisation's users get **403**, but only once the correct password has been given.

### Forgot password (email reset)

1. **`POST /api/auth/forgot-password`** with `{ "email": "…" }` always replies **200** `If an account exists for that email, a reset link has been sent.` The reply is sent before the lookup, so neither the message nor the timing reveals whether the account exists. Deactivated accounts get no email.
2. The email links to `<APP_URL>/reset-password?token=<64 hex characters>`. The token is random (256 bits); only its SHA-256 hash is stored. It expires after `RESET_TOKEN_MINUTES` (30), works **once**, and asking again cancels the previous link.
3. **`POST /api/auth/reset-password`** with `{ "token": "…", "newPassword": "…" }`. The usual password rules apply. **200** `Your password has been reset. Please log in.` **Every existing session is signed out.** An unknown, used, cancelled or expired link gives **400** `This reset link is invalid or has expired. Please request a new one.`

| Limit | Default |
|---|---|
| Reset emails per address and email | 5 per hour → **429** |
| Reset attempts per address | 10 per 15 minutes → **429** |

**Setting up email:** add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` to `server/.env`, then restart the server.

- **Microsoft 365:** use `smtp.office365.com`, port `587`, a mailbox that has *Authenticated SMTP* enabled.
- **Gmail:** use `smtp.gmail.com`, port `587`, and an app password.
- **Until it's set up:** in development the email, link included, is printed in the `npm run dev` terminal so you can test the whole flow. In production the endpoint replies **503** `Password reset by email is not available. Contact HR.`, rather than pretending to have sent anything.

In the app: **Forgot password?** on the login page.

### PUT /api/auth/password

Changes your own password.

```json
{ "currentPassword": "Passw0rd123", "newPassword": "N3wPassword!" }
```

- **200** `Password changed` with `data: { token }`. The new token keeps this session signed in; **every token issued before the change stops working** (401 `Your password was changed. Please log in again.`), which signs out other devices.
- **400** if the current password is wrong (field `currentPassword`), or the new one breaks the password rules or matches the current one.
- **429** after `LOGIN_MAX_FAILURES` wrong current passwords in the rate-limit window.

In the app: **My profile → Change password**.

### GET /api/auth/me

Requires a token. **200** `Current user` with `data: { user, employee, organisation }`.

### GET /api/organisations/me (any role)

**200** `Organisation` with the caller's own organisation: `_id`, `name`, `slug` and `settings: { timeZone, workingDays }`. Platform fields such as `status` are not included. There is no route that takes an organisation id, so one organisation can never address another.

### PUT /api/organisations/me (hr)

Changes the HR user's own organisation. Send only what changes:

```json
{ "name": "Acme Ltd", "settings": { "timeZone": "Europe/London", "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"] } }
```

| Field | Rules |
|---|---|
| `name` | 2–100 characters |
| `settings.timeZone` | IANA name, e.g. `Europe/London` |
| `settings.workingDays` | 1–7 distinct values from `Mon` `Tue` `Wed` `Thu` `Fri` `Sat` `Sun` |

`status` and `slug` are platform-level and refused with **400** `Unknown field`, as is any other field. An empty body gives **400** `Nothing to update`. Other roles get **403**. **200** `Organisation updated`.

In the app: **Company settings** in the HR menu.

### Role-based access

Routes are protected in two layers, both enforced on the server:

- `protect`: a valid token for an active user, otherwise **401**.
- `authorize(...roles)`: the user's role must be listed, otherwise **403** `You do not have permission to perform this action`.

The role always comes from the database, never from the token or the request, so a promotion, demotion or deactivation takes effect on the very next request. "Own" and "team" data are worked out on the server from the logged-in user. The client never sends whose data it wants.

A manager's **team** is every employee whose `managerId` is the manager's own employee record.

The full permission matrix for every feature and role, with the mapping to the project brief, is in [docs/RBAC.md](docs/RBAC.md).

### Organisations and tenant isolation

Every company's data is kept apart in four layers, all on the server:

| Layer | How |
|---|---|
| 1. Organisation from the database | `protect` takes the organisation from the user's database record, never from the token or the request. No endpoint accepts an organisation id |
| 2. Per-request context | The rest of the request runs inside that organisation, carried through every `await` with Node's `AsyncLocalStorage` ([server/utils/tenantContext.js](server/utils/tenantContext.js)) |
| 3. `tenantScoped` plugin | On every organisation-owned model ([server/models/plugins/tenantScoped.js](server/models/plugins/tenantScoped.js)): scopes every query, update, delete and aggregation, including nested `$lookup` joins; stamps new documents with the organisation; makes `organisationId` immutable. A query with no organisation context **throws** rather than returning every company's data. Platform-level code (login, sign-up, password reset, the platform API, scripts) opts out explicitly with `runAsPlatform()` |
| 4. Role and team checks | `authorize(...roles)`, "own" and "team" scoping, as before |

- Another organisation's record, requested by id, gives **404**, so its existence is not revealed.
- Emails are unique across the whole platform, so sign-in needs only the email.
- Employee codes (`EMP0001`…) are numbered per organisation, so two organisations can both have an `EMP0001`.
- Time zone and working days are per organisation (see *Time zones*).
- A **suspended** organisation keeps its data, but its users get **403** at login and on every request.

### Platform admins

A platform admin is a StaffSync operator who manages organisations. It is a separate kind of account, **not a role**:

- It lives in its own collection (`platformadmins`) with no `organisationId`.
- It signs in at `POST /api/platform/auth/login` and gets a `platform` token, which the organisation API refuses. Organisation users, HR included, cannot sign in there.
- No API creates one. The only way is the command line, with the password from `PLATFORM_ADMIN_PASSWORD` in `server/.env` (never on the command line, where it would stay in your shell history):

  ```bash
  cd server
  npm run platform:create-admin -- --name "Your Name" --email "you@example.com"
  ```

**The platform console** is at **`/platform/login`** in the web app: a separate sign-in and session (its own token, kept apart from any company login in the same browser), with its own menu.

| Page | What it does |
|---|---|
| Overview | Organisations (active, suspended, new in the last 30 days), user accounts, the newest sign-ups, when the public demo was last reset |
| Organisations | Search by name, filter by status, pages of 25–100 |
| Organisation | Usage (users by role, check-ins in the last 30 days, pending leave, trainings, announcements), settings, **HR contacts**, its recent platform actions; **Rename**, **Suspend** (reason required) and **Reactivate** |
| Audit log | Every platform action, filterable; append-only |
| My account | Change password (signs out other platform sessions) |

- **Organisations, not people.** Platform admins see counts and the organisation's HR contacts (name and email, for support), never employee records, attendance, leave or anyone else's details.
- **Suspension** takes effect on the organisation's users' **next request** (403, and 403 at sign-in) and deletes nothing. The reason and time are stored and shown; reactivating restores access at once, even to sessions that were open.
- **Audit log** (`platformauditlogs`): who, when, which organisation, what changed (old and new name; suspension reason) and the address. No API edits or deletes entries.
- Organisation **settings** (time zone, working days) remain the organisation's HR's to change; platform admins can only rename.
- **Plans and billing** are not built yet: every organisation is free for now.

### Public demo

One organisation can be the **public demo**, for people who want to try StaffSync without signing up (for example from a link on a CV). The login page then shows **Try the demo: HR · Manager · Employee**, which signs the visitor straight in as that organisation's account for the role, with no password.

| Step | Command (in `server`) |
|---|---|
| Make an organisation the demo, choose the three accounts, take the baseline | `npm run demo:setup -- --organisation "DemoTech Solutions" --hr hr@staffsync.demo --manager manager@staffsync.demo --employee employee1@staffsync.demo` |
| See when it was last reset | `npm run demo:status` |
| Reset now | `npm run demo:reset` |
| Turn it off (data kept) | `npm run demo:disable` |

- **Platform-level only.** No API can make an organisation the demo or choose its accounts; `POST /api/demo/login` accepts only `{ role }`.
- **Nightly reset.** Setup takes a *baseline*, a copy of every record the organisation owns. Every night at **03:00** in the organisation's time zone, the server puts the organisation back to it: records changed since are restored, records created since (visitors' announcements, people, leave, Postman runs…) are removed. No other organisation is ever touched. The server checks every 10 minutes and at start-up, so a server that was asleep at 03:00 (free hosting) resets when it wakes; two servers never reset twice. Run `demo:setup` again to take a new baseline.
- **Guards** (enforced by the API, the app only mirrors them): no password changes (**403**) and no reset emails for demo accounts; company settings are read-only (**403**); the three sign-in accounts' email, role and active status cannot change (**403**, after the usual checks such as "manager still has a team", which answer first); new or changed email addresses must end in `@staffsync.demo` or `@staffsync.test` (**400**), so visitors cannot take real people's addresses.
- Signed-in demo users see a banner explaining that changes are shared and reset nightly; `organisation.isDemo` is `true` in `/auth/me`.

### GET /api/employees (hr)

Paginated list of all employees with their account details. Optional query parameters:

| Parameter | Values |
|---|---|
| `department` | exact department name, e.g. `Engineering` |
| `role` | `employee`, `manager` or `hr` |
| `isActive` | `true` or `false` |
| `page`, `limit` | page number; page size 1–100 (default 10) |

**200** `Employees` with `data: { items, page, limit, total, totalPages }`. Each item includes `userId: { name, email, role, isActive }` and, if set, `managerId` with the manager's name.

### GET /api/employees/team (manager)

**200** `Team members` with `data` as an array of the manager's direct reports, including deactivated ones (`userId.isActive: false`). HR uses `GET /api/employees` instead and gets 403 here.

### GET /api/employees/me (any role)

**200** `Employee profile`, the caller's own employee record with account and manager details. **404** if the account has no employee profile.

`:id` in the endpoints below is the **employee record's** `_id` (as returned in `data._id`), not the user id or the `EMP0001` code.

### GET /api/employees/:id

Allowed for HR, the employee themselves, and their **direct** manager. Anyone else gets **403**. **404** `Employee not found`.

### POST /api/employees (hr)

Creates the login account and the employee profile together, in one transaction. HR can create any role, including `manager` and `hr`.

```json
{
  "name": "Ravi Patel",
  "email": "ravi@example.com",
  "password": "Passw0rd123",
  "role": "employee",
  "department": "Engineering",
  "designation": "Software Engineer",
  "joiningDate": "2026-09-01",
  "managerId": "<manager's employee _id>",
  "phone": "+44 7700 900123",
  "address": "1 High Street, London",
  "dateOfBirth": "1998-04-12"
}
```

| Field | Rules |
|---|---|
| `name`, `email`, `password` | Required; same rules as sign-up |
| `role` | `employee` (default), `manager` or `hr` |
| `department`, `designation` | Required, up to 100 characters |
| `joiningDate` | `YYYY-MM-DD`; defaults to today |
| `dateOfBirth` | `YYYY-MM-DD`, in the past |
| `managerId` | Employee `_id` of an **active manager** |
| `phone` | 7–20 digits, spaces, `-`, optional leading `+` |
| `address` | Up to 300 characters |
| `timeZone` | IANA name such as `Europe/London`; omit or `null` for the organisation's time zone (see *Time zones*) |

Any other field, such as `isActive` or `employeeId`, is rejected with **400** `Unknown field`. **201** `Employee created`, in HR's own organisation · **409** if the email is taken in any organisation.

### PUT /api/employees/:id

Send only the fields to change. `null` clears `phone`, `address`, `dateOfBirth` or `managerId`.

- **HR** may change `name`, `email`, `role`, `isActive` and every profile field above, including `timeZone`. Passwords cannot be changed here.
- **Anyone else** may change only their **own** `phone` and `address`. Sending another field gives **403** `You can only update your own phone and address`, with the disallowed fields listed in `errors`, and nothing is saved.

### DELETE /api/employees/:id (hr)

**Deactivates** the account (`isActive: false`) instead of deleting it, so attendance, leave and other history keep pointing at a real person. The user's tokens stop working immediately and they cannot log in. Running it again on an inactive account is harmless. To reactivate, use `PUT` with `{ "isActive": true }`.

### Employee management rules

| Rule | Response |
|---|---|
| `managerId` must belong to an active user with the `manager` role | 400 |
| Nobody can be their own manager, and reporting lines cannot loop (A → B → A) | 400 |
| HR cannot change their own role or deactivate themselves | 400 |
| There must always be at least one active HR account | 409 |
| A manager cannot be demoted while anyone reports to them, or deactivated while an active employee reports to them; reassign the team first | 409 |
| Email must stay unique across all organisations | 409 |

### Attendance

- **The server decides the date and time.** "Today" is the calendar day in the employee's time zone (see *Time zones*). Check-in and check-out take no body; sending fields such as `checkIn` or `date` gives **400** `Unknown field`. Each record stores the `timeZone` its date was worked out in.
- **One record per employee per day.** A unique database index blocks a second check-in, even if two requests arrive at the same moment.
- **Check-out happens once.** It records `checkOut` and `workingHours` (to two decimal places). It sets `status` to `half-day` for under 4 hours, otherwise `present`.
- **Check-out must be on the same calendar day as check-in.** Night shifts that cross midnight are not supported.

| Request | Response |
|---|---|
| `POST /check-in` | **201** `Checked in` · **409** `You have already checked in today` |
| `POST /check-out` | **200** `Checked out` · **404** `You have not checked in today` · **409** `You have already checked out today` |
| `GET /today` | **200** `data: { date, timeZone, record }`, where `record` is `null` before check-in. Use it to show check-in status on a dashboard |

**History endpoints** are paginated (`data: { items, page, limit, total, totalPages }`) and newest first. They all accept either `?date=YYYY-MM-DD` or `?from=&to=` (either end optional), plus `page` and `limit`. Unknown query parameters give **400**.

| Endpoint | Who | Extra filters |
|---|---|---|
| `GET /api/attendance/my` | any | none; always your own records |
| `GET /api/attendance/team` | manager | `employeeId` (must be a direct report, otherwise **403** `That employee is not in your team`) |
| `GET /api/attendance` | hr | `employeeId`, `department`, `status` (`present`, `half-day`, `absent`) |

Team and HR results include `employeeId: { employeeId, department, designation, userId: { name, email } }`.

### Time zones

Dates for attendance and leave ("which day is today?") are always worked out on the server:

1. **Organisation's time zone:** each organisation's own `settings.timeZone`, set by its HR on the **Company settings** page or with `PUT /api/organisations/me`. `TIMEZONE` in `server/.env` (**`Asia/Kolkata` (IST)** if unset) is only the default given to new organisations.
2. **Per employee:** HR can give an employee their own zone, for example someone working from the UK:

   ```
   PUT /api/employees/:id   { "timeZone": "Europe/London" }
   PUT /api/employees/:id   { "timeZone": null }            ← back to the organisation's time zone
   ```

   That employee's check-in day, check-out and "leave cannot start in the past" rule then follow their own calendar.

- Only HR can set an employee's zone. Employees cannot change their own, which stops anyone moving a check-in to a different day.
- Any IANA name is accepted (`Asia/Kolkata`, `Europe/London`, `America/New_York`, `UTC`…). An invalid name gives **400**.
- `timeZone: null` on an employee means "the organisation's time zone". `GET /api/attendance/today` returns the zone actually in use.
- A change in **Company settings** applies from the next request. Changing `TIMEZONE` in `.env` affects only organisations created afterwards, and needs a server restart. `npm run dev` restarts on code changes and re-reads `.env` then, but not when only `.env` changes.
- Times (`checkIn`, `checkOut`, `createdAt`) are always returned in UTC (`…Z`). Showing them in the viewer's local time is the frontend's job.

### Leave

**Apply**: `POST /api/leaves` (employees and managers; HR cannot apply):

```json
{ "leaveType": "casual", "startDate": "2026-10-20", "endDate": "2026-10-22", "reason": "Family wedding" }
```

| Field / rule | Response if broken |
|---|---|
| `leaveType`: `casual`, `sick`, `earned` or `unpaid` | 400 |
| `startDate`, `endDate`: real dates, `YYYY-MM-DD`, end not before start | 400 |
| `reason`: 1–500 characters | 400 |
| Cannot start in the past, judged by the applicant's own time zone (today is fine). **Sick** leave may start up to **30 days** back | 400 |
| At most **60 calendar days** per request | 400 |
| Cannot overlap your own **pending or approved** leave; rejected leave does not count | 409 `These dates overlap your pending casual leave` |
| Any other field (e.g. `status`) | 400 `Unknown field` |

**201** `Leave request submitted`, `status: "pending"`. Every leave response includes `days`, the number of calendar days counting both ends. Dates come back as `2026-10-20T00:00:00.000Z`.

Overlap checking runs inside a transaction, so two overlapping requests sent at the same moment cannot both be accepted.

**Approve / reject**: `PUT /api/leaves/:id/approve` takes no body. `PUT /api/leaves/:id/reject` takes `{ "rejectionReason": "…" }`, which is required, 1–500 characters.

| Rule | Response |
|---|---|
| HR may decide any request; a manager only requests from their **direct reports** | 403 `This leave request is not from your team` |
| Nobody can decide their own leave. A manager's leave goes to their own manager or HR | 403 `You cannot approve or reject your own leave` |
| Only `pending` requests can be decided, once. Simultaneous approve/reject: exactly one wins | 409 `This leave request has already been approved` (or `rejected`) |

**200** `Leave approved` / `Leave rejected`, with `approvedBy: { name, email, role }` recording who decided. That field is used for both approvals and rejections.

**Lists** are paginated and newest first. They accept `status`, `leaveType`, and `from`/`to` (returns leave that **overlaps** that period).

| Endpoint | Who | Extra filters |
|---|---|---|
| `GET /api/leaves/my` | any | none; always your own |
| `GET /api/leaves/team` | manager | `employeeId` (direct report only, otherwise 403). `?status=pending` is the approval queue |
| `GET /api/leaves` | hr | `employeeId`, `department` |

`GET /api/leaves/:id` is allowed for the applicant, their direct manager and HR.

### Dashboards

Each role has one dashboard endpoint. Every number is calculated from MongoDB on each request; nothing is hard-coded or cached. Dashboards take no query parameters.

**`GET /api/dashboard/employee`** (employee)

| Field | Contents |
|---|---|
| `date`, `timeZone` | Today in the employee's time zone |
| `today` | `status` (`not-checked-in`, `checked-in`, `checked-out`, `on-leave`), today's attendance `record`, and approved `leave` covering today |
| `thisMonth` | `from` (1st) – `to` (today): `present`, `halfDay`, `absent`, `onLeave`, `totalHours` |
| `leave` | `pending` count, `approvedDaysThisYear`, `upcoming` (next 5 approved requests) |
| `trainings` | `enrolled`: up to 5 trainings you are enrolled in that have not finished |

**`GET /api/dashboard/manager`** (manager)

| Field | Contents |
|---|---|
| `me` | The manager's own summary, same shape as the employee dashboard |
| `team` | `size` (active direct reports), `today: { checkedIn, onLeave, notCheckedIn }`, and `members` with each person's status and check-in/out times for their own today |
| `pendingLeave` | `count` and the `oldest` 5 pending requests (longest-waiting first) |

**`GET /api/dashboard/hr`** (hr)

| Field | Contents |
|---|---|
| `headcount` | `active`, `inactive`, `byRole: { employee, manager, hr }`, number of `departments`, `joinedThisMonth` |
| `today` | Company-wide `checkedIn`, `onLeave`, `notCheckedIn`, each judged by that employee's own today |
| `leave` | `pending` requests, `approvedThisMonth` |
| `training` | `upcoming` and `ongoing` training counts |
| `recentJoiners` | 5 most recent active joiners |

### Reports (hr)

**`GET /api/reports/department-stats`**: per department, `total`, `active`, `inactive`, and active `employees`, `managers`, `hr`, plus company `totals`. A single aggregation.

**`GET /api/reports/attendance-summary`**: optional `?from=&to=` (default: 1st of this month to today, at most 366 days), `?department=`, and `page`/`limit` for `byEmployee`. Covers **active** employees.

| Field | Contents |
|---|---|
| `from`, `to`, `workingDays` | The period and the working week used |
| `totals`, `byDepartment[]` | `employees`, `present`, `halfDay`, `absent`, `onLeave`, `totalHours`, `avgHoursPerDay` |
| `byEmployee` | Paginated rows with the same counts per person, sorted by department and name |

How the counts work:

- `present` / `halfDay` / `totalHours` come from attendance records. Working on a non-working day still counts.
- `onLeave`: working days with **approved** leave and no check-in.
- `absent`: working days with neither a check-in nor approved leave. Pending leave does not excuse a day. Counting starts at the employee's `joiningDate` and stops at **yesterday** in their time zone, so today never counts as absent.
- The working week is the organisation's own `settings.workingDays`, set by its HR in **Company settings**. `WORKING_DAYS` in `.env` is only the default for new organisations. Public holidays are not known yet, so they count as absences.

**`GET /api/reports/leave-summary`**: optional `?year=` (default this year) and `?department=`.

| Field | Contents |
|---|---|
| `totals` | `requests`, `approvedDays` |
| `byStatus` | `pending`, `approved`, `rejected`, each with `requests` and `days` |
| `byType[]` | Every leave type with `requests` and `approvedDays` |
| `byDepartment[]` | `requests`, `pending`, `approvedDays` |
| `byMonth[]` | All 12 months with approved `requests` and `approvedDays`, by the month the leave starts |

Days are clipped to the year: leave from 30 December to 2 January counts 2 days in each year.

**`GET /api/reports/training-summary`**: optional `?year=` (default this year). Covers trainings that **start** in that year. Returns `totals` (`trainings`, `upcoming`, `ongoing`, `completed`, `seats`, `enrolments`, `fillRate` %) and `trainings[]` with `title`, `trainer`, dates, `capacity`, `enrolled`, `status` and `fillRate`.

### Announcements

HR and managers publish; everyone reads the announcements meant for them. HR may edit or delete any post, a manager only their own (**403** `You can only change announcements you posted`).

```json
{ "title": "Diwali celebration", "content": "Friday 18:00 on the rooftop.", "targetAudience": "all" }
```

| Field | Rules |
|---|---|
| `title` | Required, up to 150 characters |
| `content` | Required, up to 5000 characters |
| `targetAudience` | `all` (default), `employees` or `managers` |

| Role | Sees |
|---|---|
| employee | `all` and `employees` |
| manager | `all` and `managers` |
| hr | everything |
| any author | always their own posts, whatever the audience |

Anyone may narrow the list with `?targetAudience=`, within what they can see.

- The list is paginated, newest first, and includes the author (`createdBy: { name, email }`).
- Opening an announcement outside your audience gives **404** `Announcement not found`, so its existence is not revealed.
- Changing `targetAudience` changes who can see it straight away.
- `DELETE` removes it permanently. Announcements are not people records, so there is no soft delete.

### Training

HR and managers create trainings; employees and managers enrol themselves; HR and managers can also **assign** people (`POST /api/trainings/:id/participants` with `{ "employeeId": "…" }`) and remove them (`DELETE …/participants/:employeeId`). The person assigned is notified.

```json
{ "title": "Secure coding", "description": "OWASP Top 10", "trainer": "Security team", "startDate": "2026-11-02", "endDate": "2026-11-03", "capacity": 20 }
```

| Field | Rules |
|---|---|
| `title`, `trainer` | Required, up to 150 / 100 characters |
| `description` | Optional, up to 2000 characters |
| `startDate`, `endDate` | `YYYY-MM-DD`, end not before start, start not in the past |
| `capacity` | Whole number 1–1000 |

Every training response adds `status` (`upcoming`, `ongoing`, `completed`), `enrolledCount`, `seatsLeft`, `isEnrolled` (for the caller) and `enrolmentOpen` (true until the end of the start day). The **participant list** is included in full for HR and the manager who created the training; another manager sees only their own team on it; employees do not see it.

| Rule | Response |
|---|---|
| A manager may edit or delete only trainings they created; HR may change any | 403 `You can only change trainings you created` |
| Capacity cannot go below the number already enrolled | 409 `Capacity cannot be less than the N people already enrolled` |
| Completed trainings cannot be edited; trainings that have started cannot be deleted | 409 |
| Enrol once per training | 409 `You are already enrolled in this training` |
| No seats left | 409 `This training is full` |
| Enrolment and withdrawal close once the training starts (the start day itself is still open) | 409 `Enrolment has closed because this training has started` |
| HR cannot enrol themselves | 403 |
| A manager may assign or remove only their direct reports; HR anyone. Deactivated people cannot be assigned | 403 `That employee is not in your team` / 400 |

Enrolment is a single atomic update that checks seats, duplicates and dates together. Ten people racing for two seats get exactly two places.

`GET /api/trainings` is paginated, soonest first, and accepts `?status=upcoming|ongoing|completed` and `?enrolled=true` (only trainings you are enrolled in). Training dates are judged in the organisation's time zone.

### Notifications

Notifications are created automatically by other modules and stored in MongoDB:

| Event | Recipients | Title |
|---|---|---|
| Leave requested | The applicant's manager; if they have none, or the manager is deactivated, every active HR user in the organisation | `New leave request` |
| Leave approved / rejected | The applicant (rejections include the reason) | `Leave approved` / `Leave rejected` |
| Announcement published | Every active user in its audience in the organisation, except the author | `New announcement` |
| Training title, trainer or dates changed | Everyone enrolled | `Training updated` |
| Training deleted | Everyone enrolled | `Training cancelled` |

- Each notification has `type` (`leave`, `announcement`, `training`), `title`, `message`, `isRead`, `createdAt`, and `relatedEntity: { entityType, entityId }` so the frontend can link to the item.
- Deleting an announcement or training also deletes the notifications that point at it, so no link leads nowhere.
- **Notifications never block the action.** If writing them fails, the error is logged and the leave decision, announcement or training change still succeeds.

| Endpoint | Behaviour |
|---|---|
| `GET /api/notifications` | Your own, newest first, paginated. `?isRead=true|false` filters. `data.unreadCount` is always your total unread, for a badge |
| `PUT /api/notifications/:id/read` | Marks one read. Someone else's gives **404** `Notification not found` |
| `PUT /api/notifications/read-all` | Marks all yours read; `data.updated` says how many |

## Performance

Measured, not guessed: `npm run bench` (in `server`) loads a realistic company into a throwaway database (`staffsync_test_perf`), times every main endpoint, checks how MongoDB answers the main queries, then deletes the data.

```bash
cd server
npm run bench              # seed, measure, clean up (about 2 minutes)
npm run bench -- --keep    # keep the data for repeat runs
npm run bench -- --reuse   # measure kept data without re-seeding
```

**Test data:**
- 500 people (40 managers) in 8 departments
- 60 working days of attendance (~18,700 records)
- 1,500 leave requests, 5,000 notifications, 60 trainings

**Results** (median of 11 calls, Atlas free tier, where one database round trip is about 25 ms):

| Endpoint | Before | After |
|---|---|---|
| Manager dashboard | 166 ms | 87 ms |
| HR dashboard | 279 ms | ~200–240 ms |
| Employee dashboard | 79 ms | 56 ms |
| Attendance report, one month | 370 ms | 280 ms |
| Attendance report, 60 days | 560 ms | 432 ms |
| HR "All attendance" list | 149 ms | ~106–137 ms |
| My attendance / My leave | 79 / 104 ms | 55 / 79 ms |
| Team leave / Team attendance | 156 / 156 ms | 134 / 133 ms |

Other endpoints were already 50–140 ms and stayed there. Single runs vary by ±20% on the shared cluster, so compare several runs before drawing conclusions.

**What was changed, and why:**

| Measurement | Change |
|---|---|
| The company-wide attendance list read **all 18,668** records and sorted them in memory to show 25. That would get slower every day, and MongoDB refuses in-memory sorts over 100 MB | Index `{ date, checkIn }` serves the newest-first sort: it now reads exactly 25 |
| Every signed-in request made two round trips before doing any work (user, then employee profile) | One aggregation fetches both; saves ~25 ms on every request that needs the profile |
| Loading active employees for dashboards and reports took 173 ms over three sequential queries | One aggregation returning plain objects |
| The absence calculation rebuilt the calendar for each of 500 people (59 ms) | Working days are worked out once per report |
| Typing in a *Department* filter sent a request per keystroke | The frontend waits for a 350 ms pause |

**Considered and not done:**
- **Response compression:** the largest list responses are 12–15 kB, so the saving would be small next to the CPU cost.
- **An index on `User.isActive`:** with 98% of users active, MongoDB would still read nearly every record; it is 500 small documents.

**Pagination.** Every list that can grow is paginated with `?page=&limit=`: employees, attendance, leave, trainings, announcements, notifications, and the per-person rows of the attendance report. `limit` is capped at 100, so no request can ask for a whole collection. The exceptions are deliberately unpaginated: a manager's own team (`/employees/team`, direct reports only) and the dashboard summaries, which return fixed-size results.

## Security

The requirements checklist (docs/PHASE-0-REQUIREMENTS.md §12) and the extra hardening from Phase 15. Each item is covered by the automated tests in `server/tests`, mostly `security.test.js` and `auth.test.js`.

| Protection | How |
|---|---|
| Passwords | bcrypt cost 12; never selected or returned; 8–72 bytes with a letter and a number |
| Tokens | HS256 pinned, `JWT_SECRET` ≥ 32 characters checked at start-up, payload holds only the account id and its scope (`org` or `platform`), and each API accepts only its own scope; role, organisation, active status and password changes are re-checked on **every** request |
| Password change | Requires the current password; revokes every older token |
| Password reset | Email link with a random single-use token, stored only as a hash, valid 30 minutes; same reply for known and unknown emails; rate-limited; signs out every session; names are escaped in the HTML email |
| Brute force | Failed logins limited per account and address (`LOGIN_MAX_FAILURES`, default 5 per 15 minutes) → **429**; successful logins never count; other accounts are unaffected. Organisation sign-up and the whole API are also rate-limited per address |
| Account enumeration | Same message and timing for an unknown email and a wrong password |
| Privilege escalation | No employee self-registration; sign-up only ever creates a new organisation, and `role`, `isActive`, `organisationId` and similar fields are refused; only HR changes roles; the last active HR cannot be removed |
| Access control | `protect` + `authorize(roles)` on every route; "own" and "team" data resolved on the server from the token, never from request parameters |
| Tenant isolation | Organisation taken from the user's database record; every organisation-owned query scoped by the `tenantScoped` plugin, which throws without an organisation context; another organisation's records give 404; platform admins are separate accounts created only from the command line (see *Organisations and tenant isolation*) |
| Injection | Every write endpoint is validated with a whitelist of fields (unknown fields → 400); values must be the right type, so `{ "$gt": "" }` is rejected; unknown and **repeated** query parameters → 400; queries on fields outside the schema throw |
| Headers | `helmet`: `nosniff`, HSTS, `frame-ancestors 'none'`, a CSP that allows nothing (the API only serves JSON), no `X-Powered-By`; every response is `Cache-Control: no-store` |
| CORS | Only origins in `CLIENT_URL`; the server refuses to start in production without it |
| Errors | One handler; production 500s say only `Internal Server Error`; submitted values are never echoed back |
| Data retention | People are deactivated, never deleted, so history stays intact; deactivation blocks existing tokens immediately |
| Secrets | `.env` files are git-ignored; `.env.example` holds placeholders only; nothing secret is bundled into the frontend |
| Dependencies | `npm audit` reports 0 known vulnerabilities in both apps (checked in Phase 15) |

**Where the login token lives.** The browser keeps the token in `localStorage` and sends it as `Authorization: Bearer …`, as the requirements specify. An HTTP-only cookie was considered. If the frontend and API end up on different domains (common with hosting providers), cookies would need `SameSite=None` plus a separate CSRF-token scheme, which adds risk and complexity. The trade-off accepted instead:

- React escapes all rendered text, and the app never injects raw HTML.
- Tokens expire after `JWT_EXPIRES_IN` (default 1 day), and a password change revokes them.
- When deploying, serve the frontend with a strict Content-Security-Policy (Phase 18) so injected scripts cannot run.

## CORS configuration

The API only accepts browser requests from origins listed in `CLIENT_URL`.

- Development: `CLIENT_URL=http://localhost:5173`
- Production: set it to your deployed frontend, e.g. `CLIENT_URL=https://staffsync.example.com`
- Both: `CLIENT_URL=http://localhost:5173,https://staffsync.example.com`

Requests from other origins receive **403** `Origin … is not allowed by CORS`. Tools such as Postman and curl send no `Origin` header, so they are unaffected — CORS is a browser protection, not authentication.

Symptom of a CORS misconfiguration: the request works in Postman but the browser console shows *"blocked by CORS policy"*. Check that `CLIENT_URL` exactly matches the address in your browser bar (scheme, host and port, no trailing slash), then restart the server.

## Automated tests

There are three layers of tests, from fastest to most realistic.

**1. API test suite** (`server`, 170 tests, about 30 seconds)

```bash
cd server
npm test
```

- Starts the real app on a random port and calls it over HTTP, exactly as the frontend does.
- Each test file uses its own throwaway database on the same cluster as `MONGO_URI` (`staffsync_test_<area>`), emptied before and after, so files run in parallel and **your real data is never touched**. Set `TEST_MONGO_URI` to use a different cluster. The suite refuses to run against a database whose name does not contain `test`.
- Each file runs inside a test organisation by default, so direct database calls in a test need no wrapping. `tenant-isolation.test.js` runs in **strict** mode instead: there is no default organisation, so any code path that forgets its organisation fails.
- No extra packages: it uses Node's built-in test runner.

| File | Covers |
|---|---|
| `foundation.test.js` | Response envelope, error mapping (400/404/409/413/500), validation, pagination |
| `auth.test.js` | No self-registration, organisation sign-up (transactional, unique emails across organisations), password policy, login, tokens (expired, forged, `alg: none`), deactivation |
| `employees.test.js` | Role checks, team scoping, self-edit limits, reporting lines, last-HR rule, time zones |
| `attendance.test.js` | Date helpers, one check-in per day under concurrency, half/full days, filters, per-employee time zones |
| `leave.test.js` | Date rules, overlaps under concurrency, who may decide, decide-once race, list scoping |
| `reports.test.js` | Dashboards and reports against independently calculated numbers |
| `announcements-training.test.js` | Audiences, ten people racing for two seats, capacity, ownership, enrolment closing |
| `notifications.test.js` | Who is notified for each event, read/read-all, failures never blocking the action |
| `password-reset.test.js` | Same reply for unknown emails, emailed single-use link, hashed token, expiry, newer link cancels older, sessions revoked, deactivated accounts, limits, production without email |
| `security.test.js` | Headers, CORS, repeated parameters, operator injection, refused privilege fields on sign-up, sign-up and failed-login limits, password change revoking old tokens, production config, no password hashes in responses |
| `client-app.test.js` | Production page serving: strict page CSP, deep links, asset caching, API kept as JSON |
| `acceptance-endpoints.test.js` | Every endpoint planned in the requirements and the brief, plus the organisation endpoints (45), is mounted, open to the roles allowed and refused to a role that is not |
| `platform.test.js` | **Platform console API (strict):** every endpoint refuses organisation tokens, HR included, and missing tokens; statistics; list search (plain text, not a regular expression), status filter and pages; detail shows usage and HR contacts but no employee details; rename only the name; suspend needs a reason, stops existing sessions and sign-in at once, leaves other organisations alone, 409 if repeated; reactivate restores the same sessions; audit entries for each change, filters, no delete route; password change revokes older platform tokens; a deactivated platform admin is refused at once |
| `demo.test.js` | **Public demo:** unavailable until set up; setup only for accounts in that organisation with the right roles; one-click sign-in per role and nothing else; the guards (passwords, settings, sign-in accounts, email domains, no reset emails); the reset restores edits and deactivations, removes visitors' records, continues employee numbering and leaves other organisations alone; 03:00 in the organisation's time zone (including summer time); only one of two simultaneous resets runs |
| `tenant-isolation.test.js` | **Strict mode.** The `tenantScoped` plugin (throws without context, scopes reads, never writes across organisations); two look-alike organisations through the API (own lists only, 404 for the other's records, no cross-organisation links or notifications, settings per organisation); suspension; sign-in and password reset across organisations; platform-admin separation (own login, tokens refused across APIs, no people's details, no create API) |
| `leave-workflow.e2e.test.js` | **End to end:** HR creates a manager → HR creates an employee → HR places them in the team → employee applies → manager notified and approves → employee notified → HR sees the same record and totals → rejection path → deactivation keeps history |

**2. Client tests** (`client`, a few seconds)

```bash
cd client
npm test
```

Checks date and time formatting (British style, 24-hour clock, calendar dates that never shift a day, time zone conversion) and display labels.

**3. Manual browser checklist:** [docs/E2E-CHECKLIST.md](docs/E2E-CHECKLIST.md) walks through the same leave workflow in the UI with the three demo accounts, plus attendance, people management, training, announcements, light/dark mode, mobile width and keyboard use. About 20 minutes.

The Postman collection below remains the quickest way to exercise a running server by hand.

## Testing with Postman

1. In Postman choose **Import** and select both files in [docs/postman/](docs/postman/).
2. Select the **StaffSync Local** environment (top right).
3. Click the environment's eye icon and fill in **hrPassword** and **managerPassword**. These are `SEED_HR_PASSWORD` and `SEED_DEMO_PASSWORD` from `server/.env`. Run `npm run seed:demo` first if you haven't. The passwords stay in your local Postman only; the committed environment file leaves them blank.
4. Open the collection, choose **Run collection**, and run it with the backend started.

Every request carries automated assertions. Expected result: **189 requests, 469 assertions, 0 failures**. The collection works whether or not the demo organisation is set up; if it is, the next nightly reset removes what the run created there.

**00 Health**

| Request | Expected |
|---|---|
| Health check | 200, `success: true`, `database: connected` |
| Unknown route | 404, `success: false`, message names the route |
| Malformed JSON body | 400, `Request body contains invalid JSON` |
| Disallowed CORS origin | 403, `success: false` |

**01 Auth** (run in order; needs the seeded HR. Saves `hrToken`, `employeeToken` and `otherOrgHrToken` to the environment)

| Request | Expected |
|---|---|
| Setup: log in as HR | 200, `organisation` returned |
| Self-registration has been removed | 404 for `POST /api/auth/register` |
| HR creates employee for auth tests | 201, role `employee`, `EMP…` code, no password in response |
| Sign up a second organisation | 201, signer-up is HR of the new organisation, which starts at `EMP0001`; saves `otherOrgHrToken` |
| Sign-up refuses a role field | 400, `role` reported as an unknown field |
| Sign-up with an email used in another organisation | 409 |
| Sign-up missing fields | 400 |
| Sign-up weak password | 400, password not echoed back |
| Other organisation cannot read this employee | 404 |
| Other organisation lists only its own people | 200, only its own HR, nobody from the demo organisation |
| Login | 200, token |
| Login email is case-insensitive | 200 |
| Login wrong password / unknown email | 401, same `Invalid email or password` |
| Login with operator injection (`{ "$gt": "" }`) | 400 |
| Get current user | 200, user, `Unassigned` employee profile and `organisation` |
| Get my organisation | 200, name and settings, no platform fields |
| Employee cannot change organisation settings | 403 |
| HR cannot change organisation status | 400, `status` reported as an unknown field |
| Organisation token cannot use the platform API | 401 |
| Get current user without token / invalid token / wrong scheme | 401 |
| Demo availability | 200, `available` true or false; the three roles if true |
| Demo sign-in with an unknown role | 400, `role` reported |

Each run creates a few `postman+…@staffsync.test` accounts, and one throwaway organisation from the sign-up request, so the collection can be re-run. To remove them and everything linked to them (attendance, leave, their notifications, other people's notifications about their leave, and the throwaway organisations), run:

```bash
cd server
npm run clean:test-data            # shows what would be deleted
npm run clean:test-data -- --yes   # deletes it
```

It only touches `postman+…@staffsync.test` accounts and organisations left with nobody else in them, and refuses to run when `NODE_ENV=production`. Test accounts that already existed when the Phase 19 migration ran are kept as demo data, unless you add `--include-preserved`.

**02 RBAC** (needs the seeded HR and demo manager; logs in and saves `hrToken` and `managerToken`)

| Request | Expected |
|---|---|
| HR lists employees, filtered by role / department / active status, paginated | 200 with matching items only |
| Invalid role filter | 400 |
| Manager or employee lists all employees | 403 |
| List employees without token | 401 |
| Manager views own team | 200; every member reports to that manager; `employee3@staffsync.demo` (another department) is excluded |
| Employee or HR uses the team view | 403 |
| Each role views own profile | 200 |
| Own profile without token | 401 |

**03 Employees** (creates one `postman+emp<timestamp>@staffsync.test` employee per run in the demo manager's team and deactivates it at the end)

| Request | Expected |
|---|---|
| HR creates employee in manager team | 201, `EMP…` id, manager set, no password |
| Create with duplicate email / unknown fields / non-manager as manager / missing fields | 409 / 400 |
| Manager creates employee | 403 |
| HR, their manager, the employee themselves read by id | 200 |
| Another employee reads by id | 403 |
| Unknown id / malformed id | 404 / 400 |
| Employee updates own phone and address | 200 |
| Employee changes own department or role | 403, fields listed, nothing saved |
| Employee edits someone else | 403 |
| HR updates employment details | 200 |
| HR sets an employee time zone / invalid zone / employee changes own zone / HR resets to default | 200 / 400 / 403 / 200 `null` |
| Manager as own manager | 400 |
| Demote a manager who has a team | 409 |
| HR deactivates own account | 400 |
| Employee deactivates someone | 403 |
| HR deactivates employee | 200, `isActive: false` |
| Deactivated employee's token / login | 401 |

**04 Attendance** (creates one `postman+att<timestamp>@staffsync.test` employee per run in the demo manager's team, so the one-check-in-per-day tests pass on every run)

| Request | Expected |
|---|---|
| Today before check-in | 200, `record: null`, server date saved as `attDate` |
| Check out before check-in | 404 |
| Check in with a client-supplied time | 400 `Unknown field` |
| Check in / again | 201 / 409 |
| Check out / again | 200 `half-day` with working hours / 409 |
| My attendance, date range, bad range, impossible date, someone else's id | 200 / 200 / 400 / 400 / 400 |
| Manager views team, filters to a member, asks for a non-member | 200 / 200 / 403 |
| HR views everyone, filters by department and status | 200 |
| Employee or manager views team/all where not allowed | 403 |
| Check in without token | 401 |

**05 Leaves** (creates one `postman+leave<timestamp>@staffsync.test` employee per run in the demo manager's team; dates are calculated from today so the run works on any day)

| Request | Expected |
|---|---|
| Employee applies | 201 `pending`, 3 days |
| Overlapping request / end before start / casual in the past / `status` in body / invalid type | 409 / 400 / 400 / 400 / 400 |
| HR applies | 403 |
| Second request; request from an employee outside the team | 201 |
| Employee's own pending list; manager's `?status=pending` queue | both contain the request; outside request not in the manager's queue |
| Owner and manager view by id / other employee / unknown id | 200 / 403 / 404 |
| Employee approves / manager approves outside team | 403 |
| **Manager approves team leave** | 200 `approved`, approver recorded |
| Approve again / reject an approved request | 409 |
| Reject without reason / with reason | 400 / 200 `rejected` with reason |
| **Employee sees the outcomes** | first `approved`, second `rejected` with reason |
| Rejected dates requested again | 201 |
| **HR sees the same approved record** | same status and approver |
| HR approves a request from outside any team | 200 |
| Manager lists all / employee lists team | 403 |

**06 Dashboards & Reports** (reads the data the earlier folders created in the same run)

| Request | Expected |
|---|---|
| Employee dashboard for the leave employee | pending request counted, approved leave listed as upcoming |
| Employee dashboard for the attendance employee | today `checked-out`, counted this month |
| Manager dashboard | attendance employee shown `checked-out`; checked in + on leave + not in = team size; pending queue not empty |
| HR dashboard | headcount by role adds up; someone checked in today; pending leave counted |
| Department statistics | Engineering has a manager; active + inactive = total |
| Attendance summary | Engineering has the half day from the attendance test; `byEmployee` paginated |
| Leave summary | every status, type and month present; approved leave counted |
| Reversed range / invalid year | 400 |
| Wrong role on each dashboard or report | 403 |
| Report without token | 401 |

**07 Announcements & Training** (deletes the announcement and training it creates, so nothing piles up between runs)

| Request | Expected |
|---|---|
| HR publishes for managers; invalid announcement; employee publishes | 201 / 400 / 403 |
| Manager publishes; tries to edit HR's post; deletes own | 201 / 404 / 200 |
| Manager sees it; employee does not; employee opens it | listed / not listed / 404 |
| HR widens audience to all; employee opens it | 200 / 200 |
| Manager deletes / HR deletes | 403 / 200 |
| Manager creates a 2-seat training; one in the past; employee creates | 201 / 400 / 403 |
| Employee enrols; enrols again; second employee takes last seat; third finds it full | 200 / 409 / 200 / 409 |
| Capacity below enrolment | 409 |
| Creator sees participants; employee withdraws; employee lists own trainings | 200 with names / seat freed / listed |
| Manager assigns a team member; someone outside the team; employee assigns; manager removes | 200 / 403 / 403 / 200 |
| HR enrols | 403 |
| Training summary report shows 1 of 2 seats (50%); manager opens report | 200 / 403 |
| Creator deletes; training then returns | 200 / 404 |

**08 Notifications** (checks what folders 05 and 07 generated in the same run)

| Request | Expected |
|---|---|
| Applicant's notifications | `Leave approved`, `Leave rejected` with the reason, `Training cancelled`; unread count |
| Manager's notifications | `New leave request` for the team member; none left for the deleted announcement |
| Another user marks it read / owner marks it read | 404 / 200 |
| Unread filter; mark all read; unread count afterwards | excludes it / count / 0 |
| Invalid filter / no token | 400 / 401 |

From the command line (no Postman install needed):

```bash
npx newman run docs/postman/StaffSync.postman_collection.json -e docs/postman/StaffSync.postman_environment.json \
  --env-var "hrPassword=<SEED_HR_PASSWORD>" --env-var "managerPassword=<SEED_DEMO_PASSWORD>"
```

## Deployment

In production StaffSync runs as **one service**: the Express server also serves the built React app (`client/dist`), so the app and API share one address.

| Path | Served as |
|---|---|
| `/api/…` | The API, with its strict "allow nothing" CSP, `no-store` and rate limits. Unknown API paths are JSON 404s |
| `/assets/…` | Built JS/CSS with hashed names, cached for a year |
| Any other address | `index.html` (never cached), so deep links like `/hr/dashboard` work |

Pages get a strict Content-Security-Policy: scripts only from the site itself, no inline scripts (the theme start-up script is a file for this reason), fonts from Google Fonts, `frame-ancestors 'none'`.

**Deploy:** follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). On Render it is *New → Blueprint* from this repository using [render.yaml](render.yaml), then set `MONGO_URI` and sign up your company at `/signup` (or seed the first HR account). Any other Node.js host can use `npm run build` and `npm start` from the repository root.

**Continuous integration:** [.github/workflows/ci.yml](.github/workflows/ci.yml) runs client lint, client tests, the production build, and the full API suite against a throwaway MongoDB on every push.

| Setting | Purpose |
|---|---|
| `SERVE_CLIENT` | `false` to stop serving the frontend (host it elsewhere); `true` to serve it outside production. Default: on in production when `client/dist` exists |
| `APP_URL` | The public address, if it is not the Render one (custom domain). Allowed by CORS and used in reset links |
| `RENDER_EXTERNAL_URL` | Set by Render automatically; used the same way |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `querySrv ECONNREFUSED` | DNS lookup for an Atlas `mongodb+srv://` address failed — `config/db.js` already works around the common Windows cause; otherwise check your internet connection or try a different network |
| `bad auth : Authentication failed` | Wrong database username or password in `MONGO_URI` — reset it in Atlas → Database Access |
| `mongodb+srv URI cannot have port number` | The `@` before the cluster host was URL-encoded, or a `:port` was added — see *Database* above |
| Server exits with a timeout / `ServerSelectionError` | Your IP is not on the Atlas Network Access list, or local MongoDB is not running |
| A new endpoint returns `Route not found` | Its router is not in the `routes` table in `app.js` — check the `Mounted routes` boot log |
| 403 `You do not have permission…` | The logged-in role is not allowed on that endpoint — see the API reference |
| 404 `No employee profile exists for this account` | The user has no Employee record; create people through sign-up, HR's *Add person* (`POST /api/employees`) or the seed script rather than inserting users by hand |
| 404 `Route not found: POST /api/auth/register` | Self-registration was removed in Phase 19. Companies sign up at `/signup` (`POST /api/organisations/signup`); HR adds employees |
| `Seed failed: … is not set` | Add the `SEED_*` variables to `server/.env` |
| `Seed failed: Say which organisation…` | Add `--organisation "Company name"` (or set `SEED_ORGANISATION`) |
| `Seed failed: … already belongs to another organisation` | Emails are unique across StaffSync; use a different `--hr-email` |
| 400 `Unknown field` | The request body has a field that endpoint does not accept; check the field name or remove it |
| 409 `Reassign this manager's … team member(s)…` | Move their reports to another manager with `PUT /api/employees/:id { "managerId": … }` first |
| `TIMEZONE "…" is not a valid IANA time zone` | Use a name such as `Asia/Kolkata` or `Europe/London` in `server/.env` |
| 409 `These dates overlap your …` | You already have pending or approved leave on some of those days |
| 403 `This leave request is not from your team` | Only the applicant's direct manager (or HR) can decide it |
| 404 `You have not checked in today` at check-out | No check-in exists for today in that employee's time zone, e.g. checked in before midnight, or HR changed their zone in between |
| `Port 5000 is already in use` | Another process (or a second server terminal) is using the port — stop it or change `PORT` |
| "Can't reach StaffSync" screen, or "Unable to reach the server" | Backend not running, or `VITE_API_URL` wrong — restart Vite after editing `client/.env` |
| Signed out unexpectedly with "This account has been deactivated" or "session has expired" | The API rejected the token; log in again (or ask HR to reactivate the account) |
| 401 `Invalid token` straight after upgrading to Phase 19 | Tokens from before Phase 19 have no scope; log in again once |
| 403 `Your organisation's StaffSync account is suspended` | The organisation has been suspended; its users cannot sign in until it is reactivated |
| A platform admin token gets 401 on `/api/employees` (or an HR token on `/api/platform/…`) | Each API accepts only its own kind of token — see *Platform admins* |
| `… ran without an organisation context` (500) | New code queried an organisation-owned model outside a signed-in request; run it inside the request, or wrap deliberate platform-level code in `runAsPlatform()` |
| `VITE_API_URL is not set` error in the browser | `client/.env` missing |
| Works in Postman, fails in browser | CORS — see above |

## Known limitations

- Password reset needs an SMTP account in `.env` before it can email anyone outside development.
- No plans or billing yet: every organisation is free. Platform admins are created from the command line only, and there is one level of platform access (no read-only support role).
- Absences are calculated in reports, not stored as records. There is no public-holiday calendar yet, so holidays count as absences.
- Reports cover active employees only; someone deactivated part-way through a period drops out of that period's report.
- Check-in and check-out must fall on the same calendar day.
- Leave counts calendar days (weekends and public holidays included), and there are no leave balances or allowances yet.
- Employees cannot cancel a leave request yet.
- Notifications are in-app only (no email), and old ones are never deleted automatically.
- Rate limits are kept in memory, so they reset when the server restarts and are per server instance. Running several instances would need a shared store such as Redis.
- No logout endpoint: tokens are stateless, so the client logs out by discarding the token. Deactivating a user blocks their tokens immediately.
- The UI itself is checked by the manual checklist rather than automated browser tests, and the notification bell refreshes every minute rather than live.
- The login token is stored in `localStorage` (see *Security* for why, and how the risk is limited).
