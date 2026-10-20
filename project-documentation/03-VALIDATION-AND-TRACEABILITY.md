# Validation and Traceability Report

**Prepared:** 17 October 2026

This report checks the generated StaffSync documents against their reference templates, against the code, and against each other. It also lists what could not be verified.

## 1. Coverage: every reference file accounted for

| Ref | Reference file | StaffSync document | Decision |
|---|---|---|---|
| R1 | Empathy Map Canvas(1).docx | `A-Ideation/A1-Empathy-Map-Canvas.docx` | Equivalent created |
| R2 | Define the Problem Statements (2).docx | `A-Ideation/A2-Problem-Statements.docx` | Equivalent created |
| R3 | Brainstorm & Idea Prioritization Template(3).docx | `A-Ideation/A3-Brainstorm-and-Idea-Prioritisation.docx` | Equivalent created |
| R4 | Solution Requirements (Functional & Non-functional).docx | `B-Requirement-Analysis/B1-Solution-Requirements.docx` | Equivalent created |
| R5 | technology stack.docx | `B-Requirement-Analysis/B2-Technology-Stack.docx` | Equivalent created |
| R6 | DataFlow Diagram.docx | `B-Requirement-Analysis/B3-Data-Flow-Diagram-and-User-Stories.docx` | Equivalent created, DFD levels corrected |
| R7 | Project Planning Template.docx | `C-Project-Planning/C1-Project-Planning.docx` | Equivalent created |
| R8 | Problem – Solution Fit Template (1).docx | `D-Project-Design/D1-Problem-Solution-Fit.docx` | Equivalent created |
| R9 | Proposed Solution.docx | `D-Project-Design/D2-Proposed-Solution.docx` | Equivalent created |
| R10 | Solution Architecture.docx | `D-Project-Design/D3-Solution-Architecture.docx` | Equivalent created |
| R11 | User Acceptance Testing (UAT) Template.docx | `E-Testing/E1-User-Acceptance-Testing.docx` | Equivalent created |
| — | (no performance document in the reference folder) | `E-Testing/E2-Performance-Test-Report.docx` | Added |

11 of 11 reference files analysed and mapped. No reference file was inaccessible.

## 2. Structure compared with each reference

| Doc | Reference structure kept | Added for StaffSync | Deliberately changed |
|---|---|---|---|
| A1 | Header table (4 marks); purpose sentence; canvas with Goal, Need to do, Hear, Think & Feel (Pains / Gains), Say, Do; template reference link | Same content as a table; pain-to-feature table | One canvas with three role columns instead of one persona; evidence note (assumption-based) |
| A2 | Header (2 marks); purpose; five-column canvas; reference link; PS table with the same columns | Traceability to A1 and B1 | Three statements (one per role); every cell filled |
| A3 | Header (4 marks); explanation; reference link; Step 1 / Step 2 / Step 3 | Grouped idea table; outcome column showing what was built | Grid is populated (the reference grid was empty); no per-person columns because participants are not recorded |
| B1 | Header (4 marks); FR table (FR No., Epic, Sub-requirement); NFR table (NFR No., requirement, description) | Status column; roles summary; how each NFR is met and its evidence; out-of-scope list | No unverified targets presented as achieved |
| B2 | Header (4 marks); architecture paragraph; Table 1 components; Table 2 characteristics; references | Numbered rows (blank in the reference); versions | — |
| B3 | Header (4 marks); DFD explanation and diagram; user story table with the same seven columns | Process and data-store tables linking the diagram to the code | True Level 0 (context) plus Level 1; the reference labelled a Level 1 diagram as Level 0 |
| C1 | Header (5 marks); backlog table with the same columns; tracker table with the same columns; velocity and burndown | Commit column; velocity calculation; burndown chart (missing in the reference); work-after section | Retrospective points clearly labelled; planned dates shown as "Not recorded" |
| D1 | Header (2 marks); Overview; Purpose; Problem statement; Solution | Problem-to-solution fit table including gaps | — |
| D2 | Header (2 marks); six-parameter table | — | Business model stated as not implemented, with a proposal |
| D3 | Header (4 marks); intro; goal bullets; architecture diagram | Component table; request-lifecycle sequence; deployment view; decisions | Diagram drawn from the code |
| E1 | Header; project overview; scope; requirements to be tested; environment; test cases; bug tracking; sign-off; notes | Automated-evidence column; known limitations; development browser checks | No passwords in the document; results left as "Not yet executed" |
| E2 | — | Test plan and execution report | — |

## 3. Technical claims checked against the code

Each claim below appears in the documents and was confirmed in the repository on 17 October 2026.

| Claim | Where stated | Verified in |
|---|---|---|
| 65 endpoints in 13 route files | B1, D3 diagram | `grep` of `router.(get|post|put|patch|delete)` in `server/routes` |
| 11 collections; 7 organisation-owned | B2, B3, D3 | `server/models` (tenantScoped on User, Employee, Attendance, Leave, Announcement, Training, Notification; Counter is platform-level, keyed per organisation) |
| bcrypt cost 12 | B1, B2 | `models/plugins/withPassword.js` `SALT_ROUNDS = 12` |
| JWT HS256, ≥ 32-character secret checked at start-up | B1, D3 | `utils/token.js`, `server.js` `assertJwtConfig()` |
| Failed logins limited to 5 per 15 minutes per account and address | B1, E1 | `config/security.js` (`LOGIN_MAX_FAILURES` default 5, window 15) |
| Half day under 4 hours | B1, E1 | `attendanceController.js` `FULL_DAY_MIN_HOURS = 4` |
| Leave up to 60 days; sick leave backdated up to 30 days | B1, B3 | `leaveController.js` `MAX_LEAVE_DAYS = 60`, `SICK_LEAVE_BACKDATE_DAYS = 30` |
| Leave decided once (atomic) | B1, D2, D3 | `leaveController.js` `findOneAndUpdate({ _id, status: 'pending' })` |
| Leave request notifies the manager, or HR when there is none | A1, B3 | `notificationService.js` `leaveApproverIds` |
| Reset link single-use, 30 minutes | B1, E1 | `passwordResetService.js` `RESET_TOKEN_MINUTES` default 30 |
| Sign-up runs in a transaction | B1, B2 | `organisationController.js` `mongoose.connection.transaction` |
| Demo reset at 03:00 in the organisation's time zone | B1, D3 | `demoService.js` `RESET_HOUR = 3` |
| Notifications refresh every minute | D2, E1 | `client/src/components/NotificationBell.jsx` `POLL_MS = 60000` |
| Pagination limit capped at 100 | B1, D2 | validators (`limit` max 100) and README |
| Render: one web service, Node 24, free plan, Singapore, health check | B2, D3 | `render.yaml` |
| CI: client lint, tests, build; server tests on MongoDB 7 replica set | B2, D3 | `.github/workflows/ci.yml` |
| Role permissions | B1 | `docs/RBAC.md` and route `authorize()` calls |

Corrections made during this check: D3 first named a `roleMiddleware.js` file that does not exist (`authorize()` is in `authMiddleware.js`); US-05's manager rule was tightened to match the code (active manager, no reporting loop); E2's bundle-size sentence was corrected to "main JavaScript chunk".

## 4. Evidence executed for this documentation

| Evidence | Result | File |
|---|---|---|
| Server API test suite (`npm test`) | 170 tests, 20 suites, **170 passed, 0 failed** (01:41–01:42 IST) | `evidence/server-tests-2026-10-17.txt` |
| Client tests, lint, build | 8 / 8 passed; lint clean; build succeeded | `evidence/client-tests-2026-10-17.txt` |
| Performance benchmark (`npm run bench`) | 21 endpoints measured; 20 under 500 ms median; all queries indexed | `evidence/benchmark-2026-10-17.txt` |
| Diagrams | 8 diagrams drawn from the code, rendered and visually checked | `diagrams/` |
| Generated documents | All 12 re-read after generation: every table and image present | — |

Not verified: how the documents look when opened in Microsoft Word. Word automation stalled on this computer (probably a first-run prompt), so the documents were checked by re-reading their structure, not by viewing rendered pages. Open each file once in Word to confirm the layout.

## 5. Traceability matrix

| Requirement | User stories (B3) | Backlog iteration (C1) | UAT cases (E1) | Automated tests (passed 17 Oct 2026) |
|---|---|---|---|---|
| FR-1 Authentication | US-02, US-03, US-04 | 2, 3, 4 | UAT-03 – UAT-07 | `auth`, `security`, `password-reset` |
| FR-2 Organisations | US-01, US-23 | 4 | UAT-01, UAT-02, UAT-28 | `auth`, `tenant-isolation` |
| FR-3 People | US-05 – US-07 | 2, 4 | UAT-19 – UAT-23 | `employees` |
| FR-4 Attendance | US-08 – US-10 | 2 | UAT-16 – UAT-18 | `attendance` |
| FR-5 Leave | US-11 – US-14 | 2 | UAT-08, 09, 11 – 15 | `leave`, `leave-workflow.e2e` |
| FR-6 Dashboards | US-15 | 2 | UAT-29 | `reports` |
| FR-7 Reports | US-16 | 2 | UAT-13, UAT-29 | `reports` |
| FR-8 Announcements | US-17 | 2 | UAT-24 | `announcements-training` |
| FR-9 Training | US-18, US-19 | 2 | UAT-25, UAT-26 | `announcements-training` |
| FR-10 Notifications | US-20 | 2 | UAT-10, 12, 26, 27 | `notifications` |
| FR-11 Demo | US-21 | 4 | UAT-30 | `demo` |
| FR-12 Platform | US-22 | 4 | UAT-31 | `platform` |
| NFR-1 Security | — | 3 | UAT-05, UAT-23 | `security`, `auth`, `acceptance-endpoints` |
| NFR-2 Tenant isolation | — | 4 | UAT-28 | `tenant-isolation` |
| NFR-3 Integrity | — | 2 | UAT-15 | concurrency tests in `attendance`, `leave`, `announcements-training` |
| NFR-4 Performance | — | 3 | — | E2 PERF-01 – PERF-21 |
| NFR-5 Scalability | — | 3 | — | E2 query plans |
| NFR-6 Usability | — | 3 | UAT-32 – UAT-35 | none (manual only) |
| NFR-7 Availability | — | 3 | — | **none: not verified** |
| NFR-8 Maintainability | — | 3 | — | full suites and CI |

Every FR has at least one user story, backlog item, UAT case and automated test. NFR-6 has no automated evidence, and NFR-7 has no evidence at all.

## 6. Consistency checks

| Check | Result |
|---|---|
| FR numbers in B1 match those used in A2, B3, C1, D1, E1 | Consistent (FR-1 – FR-12) |
| User story numbers in B3 match C1 and E1 | Consistent (US-01 – US-23) |
| Problem statements PS-1 – PS-3 in A2 match D1 | Consistent |
| Burndown chart totals match the C1 backlog | Consistent (5 + 56 + 47 + 30 = 138); the generator refuses to run if they diverge |
| Performance figures in B1 (NFR-4) match E2 | Consistent (20 of 21; 60-day summary 520 ms) |
| Test totals quoted (170 server, 8 client) match the evidence files | Consistent |
| Data stores in the DFD (B3) match the architecture diagram (D3) | Consistent (same collections) |

## 7. Statements that rest on assumptions (labelled in the documents)

| Statement | Document | Label used |
|---|---|---|
| Personas, pains, gains and quotes | A1, A2, D1 | "Assumption-based"; quotes marked "illustrative" |
| Brainstorm participants and placements on the grid | A3 | "Retrospective judgement, not session votes" |
| Story points, velocity, burndown | C1 | "Retrospective estimates" |
| Performance target of 500 ms | B1, E2 | "Proposed target" |
| Business model | D2 | "Proposed, not implemented" |
| Social impact | D2 | "Intended outcomes; no survey" |

## 8. Open information gaps

| # | Gap | Affects | Needed from you |
|---|---|---|---|
| G1 | Team ID | Every header table | The ID, if one was assigned |
| G2 | Team members and roles | C1, E1 sign-off | Names (git shows one author) |
| G3 | User research | A1, A2, D1 | Interview or survey notes, if any exist |
| G4 | Original estimates and sprint dates | C1 | Planning records, if any exist |
| G5 | UAT execution and sign-off | E1 | Run the 35 cases; record results; sign |
| G6 | Deployment URL and uptime | B1 NFR-7, D3, E1 | Whether StaffSync is deployed, and where |
| G7 | Business model | D2 | A decision on pricing |
| G8 | Load-test targets | E2 | Expected number of concurrent users |
| G9 | Word layout check | All `.docx` files | Open each file once in Word |
