# Reference-to-StaffSync Mapping

**Prepared:** 17 October 2026

Every reference file has a decision. All 11 have a StaffSync equivalent, and one extra document (E2) is added because the "Performance Testing" folder contains no performance test.

**Format decision.** The references are Word documents with a header table, headings, tables and embedded images, so the StaffSync documents are produced as **Word (.docx)** files in the same layout. Diagrams are also saved separately as SVG and PNG in `diagrams/`, so they can be reused or edited. Supporting analysis (this file, the reference analysis and the validation report) is in Markdown.

**Header table values used in every document**
- *Date:* the date the document was prepared, 17 October 2026.
- *Team ID:* left blank, as in every reference; it is not recorded anywhere in the project.
- *Project Name:* StaffSync.
- *Maximum Marks:* the same weight as the matching reference.

## 1. Mapping matrix

| Ref | Reference document | Purpose and structure | StaffSync document | Decision | StaffSync information required | Evidence (actual sources) | Diagrams, tables, appendices | Gaps |
|---|---|---|---|---|---|---|---|---|
| R1 | Empathy Map Canvas | Persona canvas: Goal, Do, Hear, Think & Feel (Pains/Gains), Say, Do | `A-Ideation/A1-Empathy-Map-Canvas.docx` | Create equivalent | Needs and pains of HR staff, managers and employees that StaffSync addresses | Role capabilities (`docs/RBAC.md`, `client/src/routes/navigation.js`); problems each feature solves (`docs/PHASE-0-REQUIREMENTS.md` §1) | Empathy canvas diagram (one combined canvas, three role lanes) | No user research is recorded: personas are labelled assumption-based |
| R2 | Define the Problem Statements | Five-column problem canvas + PS table | `A-Ideation/A2-Problem-Statements.docx` | Create equivalent | One problem statement per role, each traced to a StaffSync feature | Same as R1, plus the leave workflow in `leaveController.js` and `notificationService.js` | Five-column canvas diagram; PS-1 to PS-3 table | As R1 |
| R3 | Brainstorm & Idea Prioritization | Three steps: problem framing, idea listing and grouping, importance × feasibility grid | `A-Ideation/A3-Brainstorm-and-Idea-Prioritisation.docx` | Create equivalent | Candidate ideas, grouping, priorities; which were built and which were deferred | Built features (git history phases); deferred items (README *Known limitations*) | Idea groups table; importance × feasibility 2×2 diagram; priority table | Session participants and dates not recorded: no per-person columns |
| R4 | Solution Requirements (FR & NFR) | FR table (epics and sub-requirements) + NFR table | `B-Requirement-Analysis/B1-Solution-Requirements.docx` | Create equivalent | All functional epics with sub-requirements; NFRs with mechanisms and evidence | 65 endpoints in `server/routes/*.js`; validators; `config/security.js`; models; README *Security* and *Performance* | FR table (FR-1…FR-12); NFR table with target, mechanism and evidence | Availability target cannot be evidenced (deployment status unknown) |
| R5 | Technology Stack | Architecture paragraph; Table 1 components; Table 2 characteristics; references | `B-Requirement-Analysis/B2-Technology-Stack.docx` | Create equivalent | Every component with its exact technology and version | `server/package.json`, `client/package.json`, root `package.json`, `render.yaml`, `.github/workflows/ci.yml` | Table 1 and Table 2 (numbered); references list | None |
| R6 | Data Flow Diagram & User Stories | DFD image + user story table (User type, Epic, Story, Acceptance criteria, Priority, Release) | `B-Requirement-Analysis/B3-Data-Flow-Diagram-and-User-Stories.docx` | Create equivalent, corrected | Entities, processes, data stores, flows; user stories with criteria | Models (`server/models`), controllers, services; acceptance criteria from controller rules and tests | DFD Level 0 (context) and Level 1; user story table (US-01…) | None for the DFD; release = development phase |
| R7 | Project Planning Template | Backlog with story points; sprint tracker; velocity and burndown | `C-Project-Planning/C1-Project-Planning.docx` | Create equivalent | Backlog, iterations, dates, completed work | Git history: 30 commits, 6–8 Oct 2026, phases 1–21 | Backlog table; iteration tracker; velocity calculation; burndown chart | Story points were never recorded: estimates are marked retrospective. Team members not recorded (one git author) |
| R8 | Problem – Solution Fit | Overview; Purpose; Problem statement; Solution (prose) | `D-Project-Design/D1-Problem-Solution-Fit.docx` | Create equivalent | Problems and the matching StaffSync solutions | A2 problems; implemented features | Problem-to-solution fit table | Market validation not recorded |
| R9 | Proposed Solution | Six-parameter table | `D-Project-Design/D2-Proposed-Solution.docx` | Create equivalent | Problem, solution, novelty, impact, business model, scalability | README; `docs/PHASE-19-MULTITENANCY-PLAN.md`; demo service; security config | Six-parameter table | No business model exists in the product (README: no plans or billing): stated as a proposal |
| R10 | Solution Architecture | Intro; goals; architecture diagram | `D-Project-Design/D3-Solution-Architecture.docx` | Create equivalent, accurate | Tiers, components, middleware chain, integrations, deployment | `server/app.js`, `server.js`, `middleware/`, `config/`, `render.yaml`, `ci.yml`, client services | Architecture diagram; request-lifecycle diagram; component table | Live deployment not verified |
| R11 | User Acceptance Testing | Overview, scope, environment, test cases, bugs, sign-off | `E-Testing/E1-User-Acceptance-Testing.docx` | Create equivalent | UAT scenarios with steps and expected results; which were executed | `docs/E2E-CHECKLIST.md` (updated to the current interface); automated evidence run on 17 Oct 2026; browser checks made in this session | Test case table; bug table; sign-off block | Manual UAT by people not recorded: those cases are "Not yet executed"; no tester names |
| — | *(none: the folder has no performance document)* | — | `E-Testing/E2-Performance-Test-Report.docx` | Added | Test plan; executed measurements only | `server/scripts/benchmark.js`; run output saved in `evidence/` | Plan table; results table; environment; limitations | Load or stress testing has never been done: stated as not executed |

## 2. Requirement identifiers carried through the set

| ID range | Defined in | Reused in |
|---|---|---|
| FR-1 … FR-12 | B1 | B3 user stories, C1 backlog, E1 test cases, validation traceability matrix |
| NFR-1 … NFR-8 | B1 | B2 characteristics, E2 performance plan, validation report |
| US-01 … | B3 | C1 backlog, E1 test cases |
| UAT-… | E1 | Validation report |
| PERF-… | E2 | Validation report |

## 3. Information gaps that need you

| # | Gap | Where it matters | What the documents do meanwhile |
|---|---|---|---|
| G1 | Team ID | Header table of every document | Left blank, as in the references |
| G2 | Team members' names and roles | C1 backlog "Team Members"; E1 sign-off | Git history shows one author (`sprashasti`); the column says "To be confirmed" |
| G3 | User research (interviews, surveys) | A1, A2, D1 | Personas and problems are marked as assumption-based, drawn from the requirements |
| G4 | Story-point estimates and sprint plan made before development | C1 | Retrospective estimates, clearly labelled |
| G5 | Manual UAT results and tester sign-off | E1 | Cases without a recorded run are "Not yet executed"; sign-off block left empty |
| G6 | Whether StaffSync is deployed, and its URL | B1 NFR availability, D3, E1 environment | Deployment described as configured (Render blueprint), not verified as live |
| G7 | Business model decisions | D2 | Shown as a proposal; the product has no billing |
| G8 | Load or stress testing targets (concurrent users) | E2 | Not executed; listed as recommended future tests |
