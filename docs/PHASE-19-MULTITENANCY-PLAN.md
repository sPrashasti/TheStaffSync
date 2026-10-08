# Phase 19 — Multi-tenant architecture plan (for approval)

**Status:** implemented, and the migration applied on 7 Oct 2026 after the dry run was approved. See §11 for what differs from the original proposal.

| Decision | Your answer |
|---|---|
| Email addresses | Unique **across the platform** (login stays email + password) |
| Employee self-registration | **Removed** |
| Platform Admin | Architecture **now**; full console UI in **Phase 21** |
| Organisation for existing data | DemoTech Solutions and DemoTech Corporation (§10) |

## 1. Where "MTS" came from

"MTS" is **not in your code or your database**. I suggested it because your account's email domain is `mtsglobal.uk.com`. Evidence, checked read-only on 7 Oct 2026:

| Where | Result |
|---|---|
| Repository (code, docs, config) | One match only: the suggestion in this plan |
| Server code: any organisation, tenant or company concept | None |
| Database `TheStaffSync`: users, employees, announcements, trainings mentioning "MTS" | 0 |
| Any record with `organisationId`, `organizationId`, `companyId` or `tenantId` | 0 |

So today there is **no organisation concept at all**: the whole database is implicitly one company. No name will be hard-coded. The organisation becomes a database record whose name you choose.

## 2. What is in the database today

Database `TheStaffSync`:

| Collection | Documents | Notes |
|---|---|---|
| `users` | 98 | 5 seeded demo (`@staffsync.demo`), **91 Postman test** (`postman+…@staffsync.test`), 2 real personal accounts, referred to below as **real account A** and **real account B** (both employees) |
| `employees` | 98 | One per user. Departments in use: Development, Engineering, Finance, Human Resources, Unassigned |
| `attendances` | 17 | |
| `leaves` | 54 | Mostly from Postman runs |
| `notifications` | 69 | |
| `counters` | 1 | The `EMP0001…` sequence |
| `announcements`, `trainings` | 0 | Postman deletes what it creates |

Roles: 96 employees, 1 manager, 1 HR.

## 3. Current models and relationships

```
User (users)                     Employee (employees)
  name, email (unique), password    userId ──► User         (unique: one profile per user)
  role: employee|manager|hr         employeeId "EMP0001"    (unique)
  isActive, passwordChangedAt,      department, designation (department is text, not a collection)
  passwordReset…                    managerId ──► Employee  (reporting line)
                                    timeZone, phone, address, dateOfBirth, joiningDate

Attendance ── employeeId ──► Employee      unique { employeeId, date }
Leave ─────── employeeId ──► Employee,  approvedBy ──► User
Announcement ─ createdBy ──► User          targetAudience: all|employees|managers
Training ───── createdBy ──► User,  participants[] ──► Employee
Notification ─ recipient ──► User,  relatedEntity { Leave|Announcement|Training }
Counter ────── { _id: 'employeeId', seq }
```

Global settings that are really per-company: `TIMEZONE` and `WORKING_DAYS` in `.env`.

## 4. Target architecture

```
StaffSync Platform
 ├── Platform Admins          (separate collection; no organisation; separate login and token)
 └── Organisations            (database records)
      └── Users (role hr | manager | employee), each with exactly one organisationId
           └── Employee profile, attendance, leave, training, notifications…
```

**Platform Admin and organisation HR are different kinds of account, not different roles.**

| | Platform Admin | Organisation users (HR, manager, employee) |
|---|---|---|
| Stored in | new `platformadmins` collection | `users` (unchanged) |
| Has `organisationId` | No, never | Always, required |
| Signs in at | `POST /api/platform/auth/login` | `POST /api/auth/login` |
| Token says | `scope: "platform"` | `scope: "org"` |
| Middleware | `protectPlatform` | `protect` (+ `authorize(role)`) |
| Can call organisation APIs (`/api/employees`…) | **No**: `protect` refuses platform tokens | — |
| Can call platform APIs (`/api/platform/…`) | Yes | **No**: `protectPlatform` refuses org tokens, even HR |
| Created by | a command-line script (`npm run platform:create-admin`), never by any API | sign-up, or HR |

The organisation roles stay exactly `hr | manager | employee`. No "superadmin" value is added to them.

## 5. Collections that need `organisationId`

| Collection | Gets `organisationId` | Why |
|---|---|---|
| `users` | ✅ required | A user belongs to exactly one organisation |
| `employees` | ✅ | Employee codes, departments, managers are per company |
| `attendances` | ✅ | Lists and reports query by organisation and date |
| `leaves` | ✅ | |
| `announcements` | ✅ | "Everyone" must mean everyone **in this organisation** |
| `trainings` | ✅ | |
| `notifications` | ✅ | |
| `counters` | ✅ (in `_id`) | Each company numbers from `EMP0001` |
| `organisations` | — (is the tenant) | New |
| `platformadmins` | ❌ never | Platform level |

Future organisation-owned collections (departments, teams, payroll, documents…) get tenant isolation automatically by adding one line to their schema: the `tenantScoped` plugin (section 6).

**Indexes.** Email stays globally unique, as you chose. `employeeId` unique becomes unique per organisation. List and sort indexes gain an `organisationId` prefix. `{ employeeId, date }` is unchanged, because an employee already belongs to one organisation.

## 6. How tenant isolation works

A single forgotten filter would show one company another company's data, so isolation **does not rely on controllers remembering**. There are four layers:

1. **The organisation comes from the database, never the client.** `protect` loads the user (it already does, on every request) and takes their `organisationId` from that record. It also checks the organisation is **active**; a suspended organisation gets **403** for all its users. Tokens, URLs and request bodies can't change it, and any `organisationId` in a request body is refused as an unknown field.
2. **Per-request tenant context.** That id is stored in a per-request context (Node's `AsyncLocalStorage`).
3. **`tenantScoped` Mongoose plugin** on every organisation-owned model:
   - adds `organisationId` to every find, count, distinct, update and delete;
   - prepends `{ $match: { organisationId } }` to every aggregation, and to `$lookup` pipelines;
   - stamps `organisationId` on every new document, and refuses to change it afterwards;
   - **throws** if an organisation-owned query runs with no tenant context. Only code that explicitly declares itself platform-level (login, sign-up, migration, scripts, future platform APIs) may opt out, and every opt-out is listed and reviewed.
4. **Existing role and scope checks stay** exactly as they are (manager's own team, own record, and so on), now operating inside one organisation.

Every place that currently assumes a single company has been found and gets a test:

- "notify all HR"
- announcement audiences
- the last-HR rule
- the manager-with-reports check
- the employee list's role filter
- HR dashboard headcount
- report aggregations
- "today" from the company time zone
- the `EMP` counter
- the seed, clean-up and benchmark scripts

## 7. API changes

| Endpoint | Change |
|---|---|
| `POST /api/organisations/signup` (new, public, rate-limited) | `{ companyName, name, email, password }` → creates the organisation, its first HR user and employee profile in one transaction |
| `GET /api/organisations/me` (any role) / `PUT` (HR) | Organisation name and settings (time zone, working days) |
| `POST /api/auth/register` | **Removed** (employee self-registration) |
| `POST /api/platform/auth/login`, `GET /api/platform/organisations` (read-only) | Minimal platform API to prove the separate path end to end. No UI. Everything else for platform admins is Phase 21 |
| All existing endpoints | Same URLs and responses, limited to the caller's organisation |

## 8. Migration plan (nothing runs until you approve)

**Non-destructive by design:**
- It only **adds** an `organisationId` field to existing records and creates the new organisation record.
- It deletes and renames nothing.
- The one index change (`employeeId` unique → unique per organisation) is listed separately and reversible.

| Step | What happens | Safe because |
|---|---|---|
| 0 | `npm run migrate:tenancy -- --export` writes a JSON copy of every collection to `server/backups/<date>/` (git-ignored) | Atlas free tier has no automatic backups; this is your restore point |
| 1 | `--dry-run` prints exactly what would change: counts per collection, the organisation to be created, the index changes | Read-only |
| 2 | **Optional (your choice):** run `npm run clean:test-data -- --yes` first, removing the 91 Postman test accounts and their records, so they don't move into the real organisation | Only `postman+…@staffsync.test` accounts; already tested |
| 3 | Create one organisation record with **the name you give**, with today's `TIMEZONE` and `WORKING_DAYS` as its settings | New document only |
| 4 | Set `organisationId` on every record that has none | Additive; re-runnable (records that already have it are skipped) |
| 5 | Move the counter to `<organisationId>:employeeId`, keeping the current number | Codes continue from where they are |
| 6 | Build the new indexes; then replace `employeeId_1` (unique) with `{ organisationId, employeeId }` (unique) | Index change only; data untouched |
| 7 | Verify: every record has an `organisationId`, counts match step 1, demo logins work | Printed report |

**Rollback:** `--rollback` removes `organisationId`, deletes the created organisation and restores the old indexes. The JSON export from step 0 covers anything else.

## 9. Tests

- **Isolation suite:** two organisations with deliberately identical data (same names, departments and `EMP` codes). For every endpoint and every role, Organisation A must never receive an id, name or count belonging to B, and B's records requested by id must return 404.
- **Plugin:** an organisation-owned query without tenant context throws; a platform opt-out is required to bypass it.
- **Platform separation:**
  - a platform token gets 401 on `/api/employees`, and an HR token gets 401/403 on `/api/platform/…`;
  - a platform admin can't be created through any API;
  - a suspended organisation's users get 403.
- **Existing suite:** the existing 137 tests run inside a test organisation and must all pass.
- **Postman:** signs up a second organisation and checks cross-organisation requests fail.

## 10. Your decisions on existing data (approved 7 Oct 2026)

Nothing is deleted or recreated. Every account keeps its role, password, profile and history.

| Organisation | Accounts | Count |
|---|---|---|
| **DemoTech Solutions** (demo and test organisation) | `hr@staffsync.demo`, `manager@staffsync.demo`, `employee1–3@staffsync.demo` and all `postman+…@staffsync.test` accounts | 96 |
| **DemoTech Corporation** | The 2 real personal accounts (listed in the git-ignored `server/tenancy-plan.local.json`) | 2 |

Records follow their owner: profiles, attendance and leave follow the employee; notifications follow the recipient; announcements and trainings follow the author.

**Cross-company links found by inspection, and how each is handled:**

| Link | Handling |
|---|---|
| 44 test employees report to `manager@staffsync.demo`; 40 of their leave decisions were made by the demo HR or manager; 32 related notifications | All stay intact: they are in the same organisation |
| Real account B reports to `manager@staffsync.demo` | Manager link **cleared** (the only data change besides adding `organisationId`) |
| Real account A: 2 leave requests approved by `hr@staffsync.demo` | Kept as history; the approver shows as "—" because they are in another organisation |
| 2 notifications to `hr@staffsync.demo` about those requests | Kept with their recipient in DemoTech Solutions |

**DemoTech Corporation has no HR yet.** After migration, create one with the organisation-aware seed command (`npm run seed -- --organisation "DemoTech Corporation"`), using an email address that isn't already in use.

Step 2 (deleting test data) is **not** run.

## 11. As built

| Item | Result |
|---|---|
| Migration | Dry run approved, then `--apply` on 7 Oct 2026 with a full JSON export first (`server/backups/`, git-ignored). Verified: every record has an organisation; DemoTech Solutions 96 accounts, DemoTech Corporation 2; one manager link cleared |
| Rehearsal | Full apply → re-apply (no-op) → app logins → rollback rehearsed on a throwaway database first; rollback restored the records byte-for-byte |
| Rollback | `--rollback` restores the cleared manager link and old indexes. It refuses, changing nothing, once organisations share employee codes or new organisations have signed up; then the export is the way back |
| Test accounts | The 91 Postman accounts are kept in DemoTech Solutions. `clean:test-data` now leaves accounts that existed at the migration alone (unless `--include-preserved`), and removes the throwaway organisations Postman signs up |
| Mapping file | `server/tenancy-plan.local.json` (git-ignored: it holds real email addresses), not hard-coded |
| Tests | Server 155 (was 137) with a strict two-organisation isolation suite; Postman 187 requests / 464 assertions (was 178 / 434); client 8 |

**Differences from the proposal**

- Employee numbering: each organisation **continues from its own highest code**, not the shared sequence, so codes can never clash within an organisation.
- `TIMEZONE` and `WORKING_DAYS` in `.env` remain, as defaults for new organisations.
- Tokens issued before Phase 19 carry no scope, so everyone logs in again once.
