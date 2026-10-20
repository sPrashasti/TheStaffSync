# Reference Document Analysis

**Prepared:** 17 October 2026
**Reference source:** `D:\TheStaffSync\New folder` (a local copy of the reference folder; the Google Drive folder itself was not accessed)

This document records what each reference file contains, how it is built, and what evidence a StaffSync equivalent needs. The references belong to a different project ("Freelance Finder"). They are used only as examples of structure and presentation, never as a source of StaffSync facts.

## 1. Reference file inventory

The folder holds **11 files, all Microsoft Word (.docx)**. Every file was opened and read in full: every paragraph in document order, every table cell, text boxes, headers and footers, and every embedded image was viewed. No file was inaccessible.

| # | Reference folder | Exact file name | Type | Size | Embedded images |
|---|---|---|---|---|---|
| R1 | Ideation Phase-(1)/Ideation Phase | Empathy Map Canvas(1).docx | .docx | 78,690 B | 1 (canvas) |
| R2 | Ideation Phase-(1)/Ideation Phase | Define the Problem Statements (2).docx | .docx | 142,832 B | 1 (canvas) |
| R3 | Ideation Phase-(1)/Ideation Phase | Brainstorm & Idea Prioritization Template(3).docx | .docx | 215,318 B | 4 (canvas steps) |
| R4 | Requirement Analysis(3) | Solution Requirements (Functional & Non-functional).docx | .docx | 10,654 B | 0 |
| R5 | Requirement Analysis(3) | technology stack.docx | .docx | 10,372 B | 0 |
| R6 | Requirement Analysis(3) | DataFlow Diagram.docx | .docx | 1,042,953 B | 2 (one is a 1×1 transparent placeholder) |
| R7 | Project Planning Phase(2) | Project Planning Template.docx | .docx | 10,931 B | 0 |
| R8 | Project Design Phase(4)/Problem - Solution Fit Template | Problem – Solution Fit Template (1).docx | .docx | 8,753 B | 0 |
| R9 | Project Design Phase(4)/Proposed Solution | Proposed Solution.docx | .docx | 9,717 B | 0 |
| R10 | Project Design Phase(4)/Solution Architecture | Solution Architecture.docx | .docx | 767,780 B | 1 (diagram) |
| R11 | Performance Testing | User Acceptance Testing (UAT) Template.docx | .docx | 199,801 B | 0 |

The brief expected about 3–4 files per folder. The actual counts are 3, 3, 1, 3 and 1.

## 2. Shared conventions across all references

- **Header block.** Every file except R11 opens with the phase name, the document title, and a two-column table: *Date*, *Team ID*, *Project Name*, *Maximum Marks*. R11 has the same table with an extra empty first row. Team ID is blank in every reference.
- **Marks.** R1 4, R2 2, R3 4, R4 4, R5 4, R6 4, R7 5 (with "4 Marks" on its backlog section), R8 2, R9 2, R10 4, R11 blank. These are assessment weights, not project content.
- **Writing style.** Short and template-driven. A one-sentence purpose, then the template content: canvases, tables or bullet lists. Little prose beyond that.
- **Visuals.** Ideation documents embed screenshots of Mural or Miro canvases. Design documents embed a single diagram. Requirement and planning documents are tables only.
- **Sources.** R1, R2 and R3 cite the template they are based on (Mural, Miro). R5 lists references.

### Errors found in the references (not to be copied)

| Reference | Problem |
|---|---|
| R4 | The FR table is headed "Functional Requirements – Music Streaming App", and one row reads "Create and Manage Playlists": leftovers from another template. The phase label says "Project Design Phase-II" although the file is filed under Requirement Analysis. |
| R5, R6 | Also labelled "Project Design Phase-II" while filed under Requirement Analysis. |
| R6 | The diagram is titled "DFD Level 0" but shows five processes and several stores, which is a Level 1 diagram; a Level 0 (context) diagram has one process. A text box says "Example: DFD Level 0 (Industry Standard)", but the image next to it is a 1×1 transparent placeholder, so that example was never embedded. |
| R7 | Each sprint claims 20 total story points, but the backlog points per sprint add up to 5, 2, 7 and 7. Each sprint is "6 Days", yet the dates span a month (1 May to 2 June). The heading promises a velocity figure and a burndown chart, but neither is included. |
| R10 | The diagram has spelling and rendering errors ("Batabase", "Da ta s Storage", "Deploymen" cut off), shows two contradictory "Database" boxes, and duplicates the storage icons. |
| R11 | In TC-001, "Expected Result" holds a placeholder while "Actual Result" contains expected-style text. Example credentials (`password123`) appear in the document. The folder is named "Performance Testing" but contains no performance test at all. |

## 3. Document-by-document analysis

### R1 — Empathy Map Canvas

| Aspect | Analysis |
|---|---|
| Purpose | Ideation, "Empathize & Discover": understand the target user's needs, frustrations and behaviour before defining the problem. |
| Structure | Header table (4 marks) → heading "Empathy Map Canvas" → one-sentence purpose → one canvas image → template reference link (mural.co). |
| Tables / diagrams | One Mural canvas with six areas: **Goal**, **What do they need to DO?**, **What do they HEAR?**, **What do they THINK and FEEL?** split into **Pains** and **Gains**, **What do they SAY?** (direct quotes), **What do they DO?**. Each area has 3–5 bullets plus decorative sticky notes. |
| Information needed | A defined user persona; observed or researched behaviours, worries, motivations and verbatim-style quotes. |
| Adaptation for StaffSync | Personas come from StaffSync's three roles: Employee, Manager and HR. The most useful canvas is for the people StaffSync was built around, so produce one canvas per role, or a primary HR canvas with the other roles summarised. Statements must come from the problems StaffSync's features actually address (manual leave approvals, attendance tracking, scattered announcements). Because no user interviews are recorded in the repository, the canvas must say it is an assumption-based persona, not research results. |

### R2 — Define the Problem Statements

| Aspect | Analysis |
|---|---|
| Purpose | Ideation: state the customer's problem from their point of view, to guide development. |
| Structure | Header table (2 marks) → heading → one-sentence purpose → Miro canvas image → reference link → problem statement table. |
| Tables / diagrams | Canvas: five columns (I am / I'm trying to / But / Because / Which makes me feel), with one sticky note each. Table: rows PS-1 and PS-2 with the same five columns. (One "Because" cell in the reference is empty.) |
| Information needed | Two or more customer types, their goal, the obstacle, its root cause and the emotional effect. |
| Adaptation for StaffSync | PS rows for HR, Manager and Employee, each traced to a StaffSync capability (for example, the manager approving leave from a team list instead of email). Every cell filled; no empty cells. |

### R3 — Brainstorm & Idea Prioritization Template

| Aspect | Analysis |
|---|---|
| Purpose | Ideation: generate many solution ideas, group them, and rank them by importance and feasibility. |
| Structure | Header table (4 marks) → explanation of brainstorming → reference link → **Step 1** Team gathering, collaboration and problem statement → **Step 2** Brainstorm, idea listing and grouping → **Step 3** Idea prioritisation. |
| Tables / diagrams | Four canvas images: (1) session setup, "How might we…" problem, key rules of brainstorming; (2) idea list and per-person sticky notes (Person 1–4); (3) grouped ideas; (4) importance-versus-feasibility 2×2 grid and priority buckets (High impact & low effort, High impact & high effort, Nice to have). In the reference the grid itself is empty; only the bullet buckets are filled. |
| Information needed | The problem statement as a "How might we" question; the list of ideas; who contributed what; the grouping; each idea's importance and feasibility. |
| Adaptation for StaffSync | Ideas are StaffSync features and the candidates that were set aside. The priority buckets must match what was actually built (built in which phase) and what the README lists as not yet done (leave balances, holiday calendar, email notifications…). Per-person attribution is unknown, so show a single contributor column, not invented names. Plot the ideas on the 2×2 grid. |

### R4 — Solution Requirements (Functional & Non-functional)

| Aspect | Analysis |
|---|---|
| Purpose | Requirement analysis: list what the system must do (FR) and how well it must do it (NFR). |
| Structure | Header table (4 marks) → FR intro sentence → FR table → NFR intro sentence → NFR table. |
| Tables / diagrams | FR table: FR No. / Functional Requirement (Epic) / Sub-requirement (Story / Sub-task), with an epic spanning several rows. NFR table: NFR No. / Non-functional requirement / Description, covering Usability, Security, Reliability, Performance, Availability and Scalability. |
| Information needed | The system's epics and sub-features; measurable quality targets. |
| Adaptation for StaffSync | FRs come from the real API and pages (authentication, organisation sign-up, employees, attendance, leave, dashboards, reports, announcements, training, notifications, demo, platform console). NFRs must state what StaffSync actually does and can prove (bcrypt cost 12, rate limits, tenant isolation, pagination caps, measured response times). No unverified targets such as "99.9% uptime": a target with no evidence is shown as a target, not as an achieved fact. |

### R5 — Technology Stack (Architecture & Stack)

| Aspect | Analysis |
|---|---|
| Purpose | Requirement analysis: describe the technical architecture and the technology chosen for each component. |
| Structure | Header table (4 marks) → "Technical Architecture" paragraph → **Table 1** Components & Technologies → **Table 2** Application Characteristics → references. |
| Tables / diagrams | Table 1: S.No / Component / Description / Technology. Table 2: S.No / Characteristic / Description / Technology. (S.No is blank in the reference.) |
| Information needed | Every layer and component with its exact technology; the application's characteristics (open-source frameworks, scalability approach, security implementations, and so on). |
| Adaptation for StaffSync | Taken from `package.json` files and configuration: React 19, Vite, MUI 9, Redux Toolkit, Axios, Express 5, Mongoose 9, MongoDB Atlas, JWT, bcryptjs, Helmet, express-rate-limit, express-validator, Nodemailer, Render, GitHub Actions. Number every row. Add the characteristics StaffSync actually has (security, multi-tenancy, availability approach, performance). References point to the real documentation of those libraries. |

### R6 — Data Flow Diagram & User Stories

| Aspect | Analysis |
|---|---|
| Purpose | Requirement analysis: show how data moves between users, processes and stores; and state the requirements as user stories with acceptance criteria. |
| Structure | Header table (4 marks) → DFD explanation → DFD image → "User Stories" heading → user story table. |
| Tables / diagrams | DFD in Yourdon–DeMarco notation: external entities as rectangles, numbered processes as circles, data stores as open rectangles, labelled arrows. User story table: User Type / Functional Requirement (Epic) / User Story / Task / Acceptance Criteria / Priority / Release. |
| Information needed | External entities, processes and stores (from the code); user stories, each with testable acceptance criteria, a priority and a release. |
| Adaptation for StaffSync | Produce a true **Level 0 context diagram** (StaffSync as one process with its external entities) and a **Level 1 diagram** with the real processes (authentication, people management, attendance, leave, notifications, reporting, content, platform administration) and the real MongoDB collections as stores. User stories map to the FRs in B1; "Release" uses StaffSync's actual development phases from git history, not invented sprints. |

### R7 — Project Planning Template

| Aspect | Analysis |
|---|---|
| Purpose | Project planning: product backlog with estimates, sprint schedule, and progress tracking (velocity, burndown). |
| Structure | Header table (5 marks) → "Product Backlog, Sprint Schedule, and Estimation (4 Marks)" → backlog table → "Project Tracker, Velocity & Burndown Chart" → tracker table. |
| Tables / diagrams | Backlog: Sprint / Epic / User Story Number / User Story / Story Points / Priority / Team Members. Tracker: Sprint / Total Story Points / Duration / Start / Planned End / Points Completed / Actual Release. No chart is actually included. |
| Information needed | Story-point estimates, sprint boundaries, planned and actual dates, completed points, team members. |
| Adaptation for StaffSync | Iterations are StaffSync's real development phases, whose actual completion is recorded in git history (6–8 October 2026). Story points were not recorded at the time, so any estimates are labelled as retrospective estimates. Velocity is calculated from those, and a burndown chart is drawn from the commit dates. Team members are unknown beyond the git author. |

### R8 — Problem – Solution Fit

| Aspect | Analysis |
|---|---|
| Purpose | Project design: confirm that the solution matches a real problem before scaling. |
| Structure | Header table (2 marks) → Overview paragraph → Purpose (5 bullets) → Problem Statement (5 bullets) → Solution (7 bullets). Prose and bullets, not the usual canvas. |
| Tables / diagrams | None. |
| Information needed | The core problems and the matching solution elements; the reasoning that connects them. |
| Adaptation for StaffSync | Same prose structure. Every problem bullet paired with the StaffSync feature that answers it. Add a problem-to-feature fit table, so the "fit" is shown rather than only asserted. |

### R9 — Proposed Solution

| Aspect | Analysis |
|---|---|
| Purpose | Project design: summarise the proposed solution in six fixed parameters. |
| Structure | Header table (2 marks) → heading → six-row table. |
| Tables / diagrams | S. No. / Parameter / Description. Rows: Problem statement; Idea / solution description; Novelty / uniqueness; Social impact / customer satisfaction; Business model (revenue model); Scalability of the solution. |
| Information needed | All six parameters. |
| Adaptation for StaffSync | Novelty from real differentiators (tenant isolation enforced in the data layer, atomic leave decisions, per-employee time zones, public demo with nightly reset). Business model: the README states that there are **no plans or billing yet**; the document must say so and present any model as a proposal. Scalability: what exists (stateless API, indexes, pagination) and its known limits (in-memory rate limits per instance). |

### R10 — Solution Architecture

| Aspect | Analysis |
|---|---|
| Purpose | Project design: describe the overall architecture and its goals. |
| Structure | Header table (4 marks) → intro paragraph → five goal bullets → "Example – Solution Architecture Diagram" → image. |
| Tables / diagrams | One architecture diagram: users, presentation layer, backend, data storage, deployment and CI/CD. |
| Information needed | All tiers, components and integrations, plus the deployment path. |
| Adaptation for StaffSync | An accurate diagram drawn from the code: browser (React SPA), Express API with its middleware chain, MongoDB Atlas collections, SMTP email, Render hosting (one service serving both API and app), GitHub Actions CI. Add a request-lifecycle explanation and a component table, so the diagram can be checked against the code. |

### R11 — User Acceptance Testing (UAT) Template

| Aspect | Analysis |
|---|---|
| Purpose | Testing: confirm with users that the system meets their needs before release. |
| Structure | Header table → Project overview (name, description, version, testing period) → Testing scope (8 bullets) → Requirements to be tested (4 user stories) → Testing environment (URL, credentials) → Test case table → Bug tracking table → Sign-off (tester, date, signature) → Notes (4 bullets). |
| Tables / diagrams | Test cases: Test Case ID / Scenario / Steps / Expected / Actual / Pass-Fail. Bugs: Bug ID / Description / Steps to reproduce / Severity / Status / Additional feedback. |
| Information needed | Version, test period, environment, test accounts (without passwords), scenarios with steps and expected results, actual results from executed runs, defects found, sign-off by named people. |
| Adaptation for StaffSync | Test cases from the real workflows (the manual checklist `docs/E2E-CHECKLIST.md`, updated to today's interface). Actual results and Pass/Fail are filled **only** where a run is recorded; everything else is "Not yet executed". No passwords: refer to where they are configured. Sign-off left for named people. Because the folder is called "Performance Testing", a separate **performance test report** is added, using only results measured by the project's own benchmark. |

## 4. Relationships and dependencies

### Within each phase

- **Ideation.** The Empathy Map (R1) identifies needs and pains → the Problem Statements (R2) turn them into customer problems → the Brainstorm (R3) starts from one problem, framed as "How might we…", and produces prioritised ideas.
- **Requirement Analysis.** Prioritised ideas become the Solution Requirements (R4: epics and NFRs) → the DFD & User Stories (R6) restate those epics as stories with acceptance criteria and show the data they move → the Technology Stack (R5) chooses the components that implement them.
- **Project Planning.** The Planning Template (R7) takes the user stories from R6 as its backlog, estimates them and schedules them into sprints.
- **Project Design.** Problem–Solution Fit (R8) checks the problems (R2) against the solution → the Proposed Solution (R9) summarises it in six parameters → the Solution Architecture (R10) shows how the technology (R5) is arranged to deliver it.
- **Testing.** UAT (R11) tests the user stories (R6) and requirements (R4) and records the results and defects.

### Across phases

| From | To | Link |
|---|---|---|
| R1 pains | R2 "But / Because" columns | Each problem statement should trace to an observed pain |
| R2 problem | R3 Step 1 problem statement | The brainstorm starts from one problem |
| R3 priorities | R4 epics, R7 sprint order | High-priority ideas become early epics and sprints |
| R4 FR numbers | R6 epics, R7 backlog, R11 test cases | One requirement ID carried through stories, sprints and tests |
| R4 NFRs | R5 characteristics, performance testing | Every quality target needs a mechanism and a measurement |
| R5 components | R10 architecture diagram | The diagram shows the same components |
| R6 DFD stores | R10 data layer | The same data stores appear in both |
| R2 / R8 problems | R9 parameter 1 | The same problem statement |

The references do not maintain these links explicitly: requirement numbers are not reused in later documents. The StaffSync set will carry FR numbers through user stories, the backlog, test cases and a traceability matrix.
