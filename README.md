# StaffSync — Human Resource Management System

StaffSync is a full-stack MERN (MongoDB, Express, React, Node.js) HR management system covering employees, attendance, leave approval, announcements, training, notifications and role-based dashboards for three roles: **Employee**, **Manager** and **HR**.

Every feature is backed by a real REST API and real MongoDB persistence — no mock data, no fake APIs. The full requirements analysis, permissions matrix, API plan and roadmap are in [docs/PHASE-0-REQUIREMENTS.md](docs/PHASE-0-REQUIREMENTS.md).

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Requirements analysis | ✅ Complete |
| 1 | Project setup, health check, CORS, centralised Axios | ✅ Complete |
| 2 | MongoDB connection + Mongoose models | ⏳ Next |
| 3–11 | Backend modules (auth, RBAC, employees, attendance, leave, HR, announcements, training, notifications) | Planned |
| 12–13 | Frontend integration + dashboards | Planned |
| 14–18 | Testing, security hardening, optimisation, deployment | Planned |

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js (≥ 20.6), Express 5, Mongoose 9, dotenv, cors |
| Database | MongoDB (local or Atlas) |
| Frontend | React 19, Vite 8, Material UI, Axios, React Router, Redux Toolkit |
| Testing | Postman / Newman |

Planned later: `jsonwebtoken`, `bcryptjs` (Phase 4), `express-validator` (Phase 3–4).

## Folder structure

```
TheStaffSync/
├── server/                     Express REST API
│   ├── config/cors.js          CORS allow-list built from CLIENT_URL
│   ├── controllers/            Request handlers (business logic)
│   ├── middleware/             Error handling (auth/role/validation added later)
│   ├── models/                 Mongoose schemas (Phase 2)
│   ├── routes/                 Express routers — each one mounted in app.js
│   ├── utils/                  Shared helpers
│   ├── app.js                  Builds the Express app (middleware + routes)
│   ├── server.js               Loads .env and starts listening
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
- MongoDB — required from Phase 2 onwards (local install or a free MongoDB Atlas cluster)

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
| `MONGO_URI` | MongoDB connection string (Phase 2) | `mongodb://127.0.0.1:27017/staffsync` |
| `JWT_SECRET` | Secret for signing tokens (Phase 4) — long and random | generate with the command below |
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
# → StaffSync API listening on http://localhost:5000 (development)
# → CORS allowed origins: http://localhost:5173

# Terminal 2 — frontend
cd client
npm run dev
# → Local: http://localhost:5173/
```

Open http://localhost:5173. The page calls `GET /api/health` through Axios and shows **"StaffSync API is running"**. If the backend is stopped, it shows **"Unable to reach the server. Check that the API is running."**

`npm run dev` in the server uses Node's built-in `--watch` mode instead of nodemon (one fewer dependency, and nodemon currently pulls in a vulnerable file-watcher package). Use `npm start` for production.

## API response format

Every endpoint returns the same JSON shape so the frontend can handle responses uniformly.

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "Human-readable reason" }
```

## API reference

| Method | URL | Auth | Role | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/health` | No | – | 200 | – |

More endpoints are added and documented phase by phase; the full planned list is in [docs/PHASE-0-REQUIREMENTS.md](docs/PHASE-0-REQUIREMENTS.md#5-api-endpoint-list).

### GET /api/health

Reports that the API is alive and the current MongoDB connection state.

```json
{
  "success": true,
  "message": "StaffSync API is running",
  "data": {
    "environment": "development",
    "database": "disconnected",
    "uptimeSeconds": 11,
    "timestamp": "2026-10-06T17:35:20.213Z"
  }
}
```

`database` is one of `connected`, `connecting`, `disconnected`, `disconnecting`. It reads `disconnected` until the MongoDB connection is added in Phase 2.

## CORS configuration

The API only accepts browser requests from origins listed in `CLIENT_URL`.

- Development: `CLIENT_URL=http://localhost:5173`
- Production: set it to your deployed frontend, e.g. `CLIENT_URL=https://staffsync.example.com`
- Both: `CLIENT_URL=http://localhost:5173,https://staffsync.example.com`

Requests from other origins receive **403** `Origin … is not allowed by CORS`. Tools such as Postman and curl send no `Origin` header, so they are unaffected — CORS is a browser protection, not authentication (that arrives in Phase 4).

Symptom of a CORS misconfiguration: the request works in Postman but the browser console shows *"blocked by CORS policy"*. Check that `CLIENT_URL` exactly matches the address in your browser bar (scheme, host and port, no trailing slash), then restart the server.

## Testing with Postman

1. In Postman choose **Import** and select both files in [docs/postman/](docs/postman/).
2. Select the **StaffSync Local** environment (top right).
3. Open the collection, choose **Run collection**, and run it with the backend started.

Every request carries automated assertions. Expected Phase 1 result: **4 requests, 11 assertions, 0 failures**.

| Request | Expected |
|---|---|
| Health check | 200, `success: true`, message `StaffSync API is running` |
| Unknown route | 404, `success: false`, message names the route |
| Malformed JSON body | 400, `Request body contains invalid JSON` |
| Disallowed CORS origin | 403, `success: false` |

From the command line (no Postman install needed):

```bash
npx newman run docs/postman/StaffSync.postman_collection.json -e docs/postman/StaffSync.postman_environment.json
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Port 5000 is already in use` | Another process (or a second server terminal) is using the port — stop it or change `PORT` |
| Page says "Unable to reach the server" | Backend not running, or `VITE_API_URL` wrong — restart Vite after editing `client/.env` |
| `VITE_API_URL is not set` error in the browser | `client/.env` missing |
| Works in Postman, fails in browser | CORS — see above |

## Known limitations (current phase)

- No database connection yet (Phase 2); the health check honestly reports `disconnected`.
- No authentication yet (Phase 4).
- The frontend is a single connection-check page; routing and role dashboards arrive in Phases 12–13.
