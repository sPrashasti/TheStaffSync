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
| 5 | Role-based access control | ⏳ Next |
| 6–11 | Backend modules (employees, attendance, leave, HR, announcements, training, notifications) | Planned |
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
│   ├── middleware/             Error handling, request validation (auth/roles added later)
│   ├── models/                 Mongoose schemas — models/index.js loads them all
│   ├── routes/                 Express routers — each one mounted in app.js
│   ├── scripts/                Maintenance scripts (index sync)
│   ├── utils/                  AppError, response helpers, pagination, JWT
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

Then edit both `.env` files (see below).

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
# → Mounted routes: /api/health, /api/auth

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
2. **Routes**: express-validator chains, then `validate`, then the controller. Use `validateObjectId()` on any `:id` route.
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
3. Open the collection, choose **Run collection**, and run it with the backend started.

Every request carries automated assertions. Expected result: **18 requests, 61 assertions, 0 failures**.

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

Each run registers two new `postman+<timestamp>@staffsync.test` accounts in your database, so the collection can be re-run. Delete them from Atlas whenever you like.

From the command line (no Postman install needed):

```bash
npx newman run docs/postman/StaffSync.postman_collection.json -e docs/postman/StaffSync.postman_environment.json
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `querySrv ECONNREFUSED` | DNS lookup for an Atlas `mongodb+srv://` address failed — `config/db.js` already works around the common Windows cause; otherwise check your internet connection or try a different network |
| `bad auth : Authentication failed` | Wrong database username or password in `MONGO_URI` — reset it in Atlas → Database Access |
| `mongodb+srv URI cannot have port number` | The `@` before the cluster host was URL-encoded, or a `:port` was added — see *Database* above |
| Server exits with a timeout / `ServerSelectionError` | Your IP is not on the Atlas Network Access list, or local MongoDB is not running |
| A new endpoint returns `Route not found` | Its router is not in the `routes` table in `app.js` — check the `Mounted routes` boot log |
| `Port 5000 is already in use` | Another process (or a second server terminal) is using the port — stop it or change `PORT` |
| Page says "Unable to reach the server" | Backend not running, or `VITE_API_URL` wrong — restart Vite after editing `client/.env` |
| `VITE_API_URL is not set` error in the browser | `client/.env` missing |
| Works in Postman, fails in browser | CORS — see above |

## Known limitations (current phase)

- Logged-in users are authenticated, but role checks (`authorize`) arrive in Phase 5.
- No HR account exists yet; the seed script for the first one arrives in Phase 6.
- No rate limiting on login yet (security hardening, Phase 15).
- No logout endpoint: tokens are stateless, so the client logs out by discarding the token. Deactivating a user blocks their tokens immediately.
- The frontend is a single connection-check page; routing and role dashboards arrive in Phases 12–13.
