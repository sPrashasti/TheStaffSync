# StaffSync — Project Documentation

Phase-by-phase project documents for StaffSync, modelled on the reference templates in `New folder/` and written from StaffSync's actual code, tests and history. Prepared 17 October 2026. Kept separate from the application source; nothing in `client/` or `server/` was changed to produce them.

## Start here

| File | What it is |
|---|---|
| [01-REFERENCE-ANALYSIS.md](01-REFERENCE-ANALYSIS.md) | Inventory and analysis of all 11 reference documents |
| [02-REFERENCE-TO-STAFFSYNC-MAPPING.md](02-REFERENCE-TO-STAFFSYNC-MAPPING.md) | Which StaffSync document answers each reference, and the evidence used |
| [03-VALIDATION-AND-TRACEABILITY.md](03-VALIDATION-AND-TRACEABILITY.md) | Claims checked against code, traceability matrix, open gaps |
| [00-WORKING-CHECKLIST.md](00-WORKING-CHECKLIST.md) | Progress checklist |

## The documents

| Phase | Document |
|---|---|
| A. Ideation | [A1 Empathy Map Canvas](A-Ideation/A1-Empathy-Map-Canvas.docx) · [A2 Problem Statements](A-Ideation/A2-Problem-Statements.docx) · [A3 Brainstorm & Idea Prioritisation](A-Ideation/A3-Brainstorm-and-Idea-Prioritisation.docx) |
| B. Requirement Analysis | [B1 Solution Requirements](B-Requirement-Analysis/B1-Solution-Requirements.docx) · [B2 Technology Stack](B-Requirement-Analysis/B2-Technology-Stack.docx) · [B3 Data Flow Diagram & User Stories](B-Requirement-Analysis/B3-Data-Flow-Diagram-and-User-Stories.docx) |
| C. Project Planning | [C1 Project Planning](C-Project-Planning/C1-Project-Planning.docx) |
| D. Project Design | [D1 Problem–Solution Fit](D-Project-Design/D1-Problem-Solution-Fit.docx) · [D2 Proposed Solution](D-Project-Design/D2-Proposed-Solution.docx) · [D3 Solution Architecture](D-Project-Design/D3-Solution-Architecture.docx) |
| E. Testing | [E1 User Acceptance Testing](E-Testing/E1-User-Acceptance-Testing.docx) · [E2 Performance Test Report](E-Testing/E2-Performance-Test-Report.docx) |

## Supporting material

- `diagrams/` — the eight diagrams as PNG and SVG; `diagrams/src/` holds the editable source of each (open the `.html` file in a browser).
- `evidence/` — raw output of the test suites and the benchmark run on 17 October 2026.
- `generator/` — the scripts that build the `.docx` files and render the diagrams.

## Rebuilding

```bash
cd project-documentation/generator
npm install
node gen-A.js        # also gen-B.js … gen-E.js
```

The scripts refuse to overwrite an existing document unless `ALLOW_REBUILD=1` is set. Output paths are absolute (`D:/TheStaffSync/...`); change `OUT` and `DIA` at the top of each script if the repository moves. Diagrams: `node render-diagrams.mjs <diagrams/src> <diagrams> <name…>` (needs Google Chrome).
