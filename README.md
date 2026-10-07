# StaffSync — Human Resource Management System

StaffSync is a full-stack MERN (MongoDB, Express, React, Node.js) HR management system covering employees, attendance, leave approval, announcements, training, notifications and role-based dashboards for three roles: **Employee**, **Manager** and **HR**.

Every feature is backed by a real REST API and real MongoDB persistence — no mock data, no fake APIs. The full requirements analysis, permissions matrix, API plan and roadmap are in [docs/PHASE-0-REQUIREMENTS.md](docs/PHASE-0-REQUIREMENTS.md).

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Requirements analysis | ✅ Complete |
| 1 | Project setup, health check, CORS, centralised Axios | ✅ Complete |
| 2 | MongoDB connection + Mongoose models | ✅ Complete |
| 3 | Backend foundation: response helpers, error mapping, validation | ✅ Complete |
| 4 | Authentication (register, login, JWT) | ✅ Complete |
| 5 | Role-based access control, seed script, employee read endpoints | ✅ Complete |
| 6 | Employee management (create, update, deactivate) | ✅ Complete |
| 7 | Attendance (check-in, check-out, history) | ✅ Complete |
| 8 | Leave management (apply, approve, reject) | ✅ Complete |
| 9 | HR dashboards and reports | ⏳ Next |
| 10–11 | Backend modules (announcements, training, notifications) | Planned |
| 12–13 | Frontend integration + dashboards | Planned |
| 14–18 | Testing, security hardening, optimisation, deployment | Planned |

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js (≥ 20.6), Express 5, Mongoose 9, express-validator, jsonwebtoken, bcryptjs, dotenv, cors |
| Database | MongoDB (local or Atlas) |
| Frontend | React 19, Vite 8, Material UI, Axios, React Router, Redux Toolkit |
| Testing | Postman / Newman |

## Folder structure

```
TheStaffSync/
├── server/                     Express REST API
│   ├── config/cors.js          CORS allow-list built from CLIENT_URL
│   ├── config/db.js            MongoDB connection
│   ├── controllers/            Request handlers (business logic)
│   ├── middleware/             Error handling, validation, protect / authorize / loadEmployee
│   ├── models/                 Mongoose schemas — models/index.js loads them all
│   ├── routes/                 Express routers — each one mounted in app.js
│   ├── scripts/                Maintenance scripts (index sync, test-data clean-up)
│   ├── seed/seed.js            Creates the first HR account (and optional demo data)
│   ├── utils/                  AppError, response helpers, pagination, JWT, password policy
│   ├── validators/             express-validator rules per module
│   ├── app.js                  Builds the Express app (middleware + routes)
│   ├── server.js               Loads .env, connects to MongoDB, then starts listening
│   └── .env.example
├── client/                     React (Vite) frontend
│   ├── src/services/api.js     The single Axios instance
│   ├── src/services/*.js       One service file per API module
│   ├── src/theme.js            Material UI theme
│   └── .env.example
└── docs/
    ├── PHASE-0-REQUIREMENTS.md
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

Then edit both `.env` files (see below), and create the first HR account:

```bash
cd server
npm run seed          # first HR account, from SEED_HR_* in .env
npm run seed:demo     # optional: also a demo manager with a team, for testing
```

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
| `TIMEZONE` | Company **default** time zone (IANA name) for attendance and leave dates. HR can give individual employees their own (see *Time zones*). The server will not start with an invalid one | `Asia/Kolkata` (IST, the default if unset) |
| `SEED_HR_NAME` | Name of the first HR account (seed script only) | `StaffSync HR` |
| `SEED_HR_EMAIL` | Email of the first HR account | `hr@example.com` |
| `SEED_HR_PASSWORD` | Its password: 8+ characters with a letter and a number | — |
| `SEED_DEMO_PASSWORD` | Shared password for the `npm run seed:demo` accounts | — |

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
# → Default time zone: Asia/Kolkata
# → Mounted routes: /api/health, /api/auth, /api/employees, /api/attendance, /api/leaves

# Terminal 2 — frontend
cd client
npm run dev
# → Local: http://localhost:5173/
```

Open http://localhost:5173. The page calls `GET /api/health` through Axios and shows **"StaffSync API is running"**. If the backend is stopped, it shows **"Unable to reach the server. Check that the API is running."**

`npm run dev` in the server uses Node's built-in `--watch` mode instead of nodemon (one fewer dependency, and nodemon currently pulls in a vulnerable file-watcher package). It restarts on code changes but **not** on `.env` changes — stop it with Ctrl+C and run it again after editing `.env`. Use `npm start` for production.

The server connects to MongoDB **before** it starts listening. If the connection fails it prints the reason and exits, rather than running an API that cannot reach its data.

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
| `User` | users | Login identity and role (`employee`, `manager`, `hr`) | `email` unique; `{ role, isActive }` |
| `Employee` | employees | Employment profile, one per user; `employeeId` auto-assigned (`EMP0001`…) | `userId` unique; `employeeId` unique; `managerId`; `department` |
| `Attendance` | attendances | One record per employee per day (`date` is `YYYY-MM-DD`) | `{ employeeId, date }` **unique** — blocks double check-in; `date` |
| `Leave` | leaves | Leave requests and their approval state | `{ employeeId, status }`; `{ status, createdAt }` |
| `Announcement` | announcements | HR announcements with a target audience | `{ targetAudience, createdAt }` |
| `Training` | trainings | Training programmes; `participants` cannot exceed `capacity` | `startDate`; `participants` |
| `Notification` | notifications | Per-user notifications | `{ recipient, isRead, createdAt }` |
| `Counter` | counters | Atomic sequence for `employeeId` (internal) | — |

Rules enforced by the schemas themselves: required fields, enums, maximum lengths, `endDate` not before `startDate`, check-out after check-in, date of birth in the past, whole-number capacity. Passwords use `select: false` and are also stripped from JSON output.

Queries that filter on a field not in the schema throw an error (`strictQuery: 'throw'`) rather than silently matching every document.

### Indexes

Mongoose creates missing indexes automatically when the server starts. To create them explicitly, remove stale ones and print what each collection has:

```bash
cd server
npm run db:indexes
```

You can also see them in Atlas → *Browse Collections* → a collection → *Indexes*.

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

Each module from Phase 4 onwards follows the same four steps:

1. **Controller**: an `async` function per endpoint. Throw `new AppError(message, status)` for expected failures and reply with `sendSuccess` / `sendCreated` from `utils/apiResponse.js`. Express 5 forwards errors from async functions to the error handler, so no try/catch or wrapper is needed.
2. **Routes**: `protect`, then `authorize(...roles)` if only some roles may call it, then express-validator chains and `validate`, then the controller. Use `validateObjectId()` on any `:id` route, and `loadEmployee` when the controller needs the caller's own employee record.
3. **Mount**: add one line to the `routes` table in [server/app.js](server/app.js). The dev boot log prints this table, so check your path appears.
4. **Test**: add requests to the Postman collection covering the success case and each error case.

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
| POST | `/api/auth/register` | No | – (always creates an employee) | 201 | 400, 409 |
| POST | `/api/auth/login` | No | – | 200 | 400, 401 |
| GET | `/api/auth/me` | Yes | any | 200 | 401 |
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

Send the token from register or login on every protected request:

```
Authorization: Bearer <token>
```

Tokens last `JWT_EXPIRES_IN` (default `1d`) and contain only the user's id. Role and active status are read from the database on every request, so if HR deactivates someone or changes their role, it applies straight away, even to tokens already issued.

| Response | Meaning |
|---|---|
| 401 `Not authenticated. Please log in.` | No `Authorization: Bearer …` header |
| 401 `Invalid token. Please log in again.` | Token malformed, tampered with or signed with another secret |
| 401 `Your session has expired. Please log in again.` | Token past its expiry |
| 401 `The account for this token no longer exists.` | User deleted |
| 401 `This account has been deactivated.` | User deactivated by HR |

### POST /api/auth/register

Public sign-up. **Always creates an `employee`**: any `role` or other extra field in the body is ignored. Manager and HR accounts are created by HR (Phase 6).

```json
{ "name": "Asha Kumar", "email": "asha@example.com", "password": "Passw0rd123" }
```

| Field | Rules |
|---|---|
| `name` | Required, up to 100 characters |
| `email` | Required, valid email; stored lower-case |
| `password` | 8 characters to 72 bytes, at least one letter and one number |

The 72-byte limit exists because bcrypt ignores anything after it.

The account and an employee profile are created together in one transaction. The profile's department and designation start as `Unassigned` until HR updates them.

**201**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOi…",
    "user": { "_id": "…", "name": "Asha Kumar", "email": "asha@example.com", "role": "employee", "isActive": true, "createdAt": "…", "updatedAt": "…" },
    "employee": { "_id": "…", "userId": "…", "employeeId": "EMP0001", "department": "Unassigned", "designation": "Unassigned", "managerId": null, "joiningDate": "…" }
  }
}
```

**400** `Validation failed` with `errors` · **409** `An account with this email already exists`

### POST /api/auth/login

```json
{ "email": "asha@example.com", "password": "Passw0rd123" }
```

**200** `Login successful` with `data: { token, user }`.

**401** `Invalid email or password` for both an unknown email and a wrong password, and both take the same time, so neither reveals whether an account exists. A deactivated account gets **401** `This account has been deactivated. Contact HR.`, but only once the correct password has been given.

### GET /api/auth/me

Requires a token. **200** `Current user` with `data: { user, employee }`.

### Role-based access

Routes are protected in two layers, both enforced on the server:

- `protect`: a valid token for an active user, otherwise **401**.
- `authorize(...roles)`: the user's role must be listed, otherwise **403** `You do not have permission to perform this action`.

The role always comes from the database, never from the token or the request, so a promotion, demotion or deactivation takes effect on the very next request. "Own" and "team" data are worked out on the server from the logged-in user. The client never sends whose data it wants.

A manager's **team** is every employee whose `managerId` is the manager's own employee record.

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
| `name`, `email`, `password` | Required; same rules as registration |
| `role` | `employee` (default), `manager` or `hr` |
| `department`, `designation` | Required, up to 100 characters |
| `joiningDate` | `YYYY-MM-DD`; defaults to today |
| `dateOfBirth` | `YYYY-MM-DD`, in the past |
| `managerId` | Employee `_id` of an **active manager** |
| `phone` | 7–20 digits, spaces, `-`, optional leading `+` |
| `address` | Up to 300 characters |
| `timeZone` | IANA name such as `Europe/London`; omit or `null` for the company default (see *Time zones*) |

Any other field, such as `isActive` or `employeeId`, is rejected with **400** `Unknown field`. **201** `Employee created` · **409** if the email is taken.

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
| Email must stay unique | 409 |

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

1. **Company default:** `TIMEZONE` in `server/.env`, **`Asia/Kolkata` (IST)** if unset.
2. **Per employee:** HR can give an employee their own zone, for example someone working from the UK:

   ```
   PUT /api/employees/:id   { "timeZone": "Europe/London" }
   PUT /api/employees/:id   { "timeZone": null }            ← back to the company default
   ```

   That employee's check-in day, check-out and "leave cannot start in the past" rule then follow their own calendar.

- Only HR can set an employee's zone. Employees cannot change their own, which stops anyone moving a check-in to a different day.
- Any IANA name is accepted (`Asia/Kolkata`, `Europe/London`, `America/New_York`, `UTC`…). An invalid name gives **400**.
- `timeZone: null` on an employee means "company default". `GET /api/attendance/today` returns the zone actually in use.
- Changing `TIMEZONE` needs a server restart. `npm run dev` restarts on code changes and re-reads `.env` then, but not when only `.env` changes.
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

## CORS configuration

The API only accepts browser requests from origins listed in `CLIENT_URL`.

- Development: `CLIENT_URL=http://localhost:5173`
- Production: set it to your deployed frontend, e.g. `CLIENT_URL=https://staffsync.example.com`
- Both: `CLIENT_URL=http://localhost:5173,https://staffsync.example.com`

Requests from other origins receive **403** `Origin … is not allowed by CORS`. Tools such as Postman and curl send no `Origin` header, so they are unaffected — CORS is a browser protection, not authentication.

Symptom of a CORS misconfiguration: the request works in Postman but the browser console shows *"blocked by CORS policy"*. Check that `CLIENT_URL` exactly matches the address in your browser bar (scheme, host and port, no trailing slash), then restart the server.

## Testing with Postman

1. In Postman choose **Import** and select both files in [docs/postman/](docs/postman/).
2. Select the **StaffSync Local** environment (top right).
3. Click the environment's eye icon and fill in **hrPassword** and **managerPassword**. These are `SEED_HR_PASSWORD` and `SEED_DEMO_PASSWORD` from `server/.env`. Run `npm run seed:demo` first if you haven't. The passwords stay in your local Postman only; the committed environment file leaves them blank.
4. Open the collection, choose **Run collection**, and run it with the backend started.

Every request carries automated assertions. Expected result: **118 requests, 297 assertions, 0 failures**.

**00 Health**

| Request | Expected |
|---|---|
| Health check | 200, `success: true`, `database: connected` |
| Unknown route | 404, `success: false`, message names the route |
| Malformed JSON body | 400, `Request body contains invalid JSON` |
| Disallowed CORS origin | 403, `success: false` |

**01 Auth** (run in order; register and login save `employeeToken` to the environment)

| Request | Expected |
|---|---|
| Register employee | 201, token, role `employee`, `EMP…` profile, no password in response |
| Register ignores role field | 201, role still `employee` although `"role": "hr"` was sent |
| Register duplicate email | 409 |
| Register missing fields | 400, errors for name, email and password |
| Register weak password | 400, password not echoed back |
| Login | 200, token |
| Login email is case-insensitive | 200 |
| Login wrong password / unknown email | 401, same `Invalid email or password` |
| Login with operator injection (`{ "$gt": "" }`) | 400 |
| Get current user | 200, user and `Unassigned` employee profile |
| Get current user without token / invalid token / wrong scheme | 401 |

Each run creates a few `postman+…@staffsync.test` accounts so the collection can be re-run. To remove them and everything linked to them (attendance, leave, notifications), run:

```bash
cd server
npm run clean:test-data            # shows what would be deleted
npm run clean:test-data -- --yes   # deletes it
```

It only touches `postman+…@staffsync.test` accounts and refuses to run when `NODE_ENV=production`.

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

From the command line (no Postman install needed):

```bash
npx newman run docs/postman/StaffSync.postman_collection.json -e docs/postman/StaffSync.postman_environment.json \
  --env-var "hrPassword=<SEED_HR_PASSWORD>" --env-var "managerPassword=<SEED_DEMO_PASSWORD>"
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `querySrv ECONNREFUSED` | DNS lookup for an Atlas `mongodb+srv://` address failed — `config/db.js` already works around the common Windows cause; otherwise check your internet connection or try a different network |
| `bad auth : Authentication failed` | Wrong database username or password in `MONGO_URI` — reset it in Atlas → Database Access |
| `mongodb+srv URI cannot have port number` | The `@` before the cluster host was URL-encoded, or a `:port` was added — see *Database* above |
| Server exits with a timeout / `ServerSelectionError` | Your IP is not on the Atlas Network Access list, or local MongoDB is not running |
| A new endpoint returns `Route not found` | Its router is not in the `routes` table in `app.js` — check the `Mounted routes` boot log |
| 403 `You do not have permission…` | The logged-in role is not allowed on that endpoint — see the API reference |
| 404 `No employee profile exists for this account` | The user has no Employee record; register through the API or the seed script rather than inserting users by hand |
| `Seed failed: … is not set` | Add the `SEED_*` variables to `server/.env` |
| 400 `Unknown field` | The request body has a field that endpoint does not accept; check the field name or remove it |
| 409 `Reassign this manager's … team member(s)…` | Move their reports to another manager with `PUT /api/employees/:id { "managerId": … }` first |
| `TIMEZONE "…" is not a valid IANA time zone` | Use a name such as `Asia/Kolkata` or `Europe/London` in `server/.env` |
| 409 `These dates overlap your …` | You already have pending or approved leave on some of those days |
| 403 `This leave request is not from your team` | Only the applicant's direct manager (or HR) can decide it |
| 404 `You have not checked in today` at check-out | No check-in exists for today in that employee's time zone, e.g. checked in before midnight, or HR changed their zone in between |
| `Port 5000 is already in use` | Another process (or a second server terminal) is using the port — stop it or change `PORT` |
| Page says "Unable to reach the server" | Backend not running, or `VITE_API_URL` wrong — restart Vite after editing `client/.env` |
| `VITE_API_URL is not set` error in the browser | `client/.env` missing |
| Works in Postman, fails in browser | CORS — see above |

## Known limitations (current phase)

- No password change or reset endpoint yet.
- Attendance has no "absent" records yet; days without a check-in simply have no record. Reports (Phase 9) will count them.
- Check-in and check-out must fall on the same calendar day.
- Leave counts calendar days (weekends and public holidays included), and there are no leave balances or allowances yet.
- Employees cannot cancel a leave request yet.
- No notifications are sent for leave decisions yet (Phase 11).
- No rate limiting on login yet (security hardening, Phase 15).
- No logout endpoint: tokens are stateless, so the client logs out by discarding the token. Deactivating a user blocks their tokens immediately.
- The frontend is a single connection-check page; routing and role dashboards arrive in Phases 12–13.
