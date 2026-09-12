# SETU — Scheme Eligibility Contradiction Agent

Bridging the gap between citizens and scheme eligibility. SETU detects
contradictions across a citizen's identity/income documents, decides which
document is authoritative for each conflicting field, auto-corrects a
government scheme application, and produces a plain-language explanation of
what was wrong and what to fix.

Built for **Hojathon (Agentic AI Hackathon 2026, Kerala)**.

## About the mock data

We use synthetic documents since real Aadhaar/income data is PII we can't
use in a public repo or demo. The field structures and contradiction types
are modeled on real, well-documented causes of scheme-application rejection
in Kerala, and the authority-resolution rules reflect actual administrative
convention (Aadhaar as identity anchor, income certificate as income proof,
ration card as category proof).

## Architecture

An explicit agentic pipeline — **Ingest → Extract → Compare → Resolve → Act
→ Log** — not a single LLM prompt pretending to reason:

1. **Ingest** — load a citizen's 4 documents (Aadhaar, Ration Card, Income
   Certificate, Scheme Application).
2. **Extract** — normalize each document's fields into a shared schema
   (name, dob, address, income, category).
3. **Compare** — detect contradictions with fuzzy name matching, date
   normalization, and income tolerance banding — not plain string diffs.
4. **Resolve** — apply an explicit, inspectable authority-resolution rules
   table (`server/src/engine/rules.ts`) to decide the correct value per
   field. This is deterministic code, not an LLM call.
5. **Act** — autonomously generate a corrected scheme application object.
6. **Log** — persist the contradiction/resolution history per applicant in
   MongoDB, so re-analysis doesn't re-flag already-resolved issues.

The LLM (Claude, via the Anthropic API) is used for exactly one job: turning
the already-resolved contradiction log into a plain-language citizen report
(`server/src/engine/explain.ts`). It never decides which document wins —
that logic is auditable in code. If no `ANTHROPIC_API_KEY` is set, a
deterministic template fallback keeps the pipeline fully runnable offline.

### Authority Resolution Table

| Field | Authoritative Source | Rationale |
|---|---|---|
| Name | Aadhaar | Anchor identity document across Kerala scheme verifications |
| DOB | Aadhaar | UIDAI-verified value |
| Address | Aadhaar | Most likely to be current; ration cards / income certificates lag |
| Income | Income Certificate | Legally issued proof of income, not self-declared |
| Category (APL/BPL/AAY) | Ration Card | Official categorization record |

## Tech stack

- **client/** — React + TypeScript + Tailwind CSS (Vite)
- **server/** — Node.js + Express + TypeScript
- **MongoDB** (Mongoose) — applicant records, document extractions,
  contradiction logs, resolution history
- **Anthropic API (Claude)** — plain-language explanation generation only

## Running locally

Prerequisites: Node.js 18+, a local MongoDB instance running on
`mongodb://127.0.0.1:27017`.

```bash
npm run install:all      # installs server + client dependencies
cp server/.env.example server/.env   # optionally add ANTHROPIC_API_KEY
npm run seed              # seeds 4 mock applicant scenarios into MongoDB
npm run dev                # runs server (:4000) and client (:5173) together
```

Open http://localhost:5173, pick an applicant, click **Analyze**, and watch
the pipeline trace run stage by stage.

## API

- `GET /api/applicants` — list mock applicant scenarios
- `GET /api/applicants/:id/documents` — the 4 raw documents for one applicant
- `POST /api/applicants/:id/analyze` — runs the full pipeline and returns
  the contradiction log, corrected application, and citizen explanation
- `GET /api/applicants/:id/log` — contradiction/resolution history (proves
  persistence across analysis runs)

## Demo script

1. Problem: "Citizens get rejected from schemes because their documents
   quietly disagree with each other, and no one tells them why."
2. Select **Arjun Pillai (APP-1004)** — show the 4 raw documents side by
   side, contradictions not yet highlighted.
3. Click **Analyze** — narrate the pipeline trace as it runs.
4. Point at the flagged contradictions and the authority-rule reasoning
   shown for each ("Income: Income Certificate wins over self-declared form
   value").
5. Show the auto-corrected application.
6. Show the plain-language citizen report.
7. Click **Analyze** again — point at the "previously seen" badges and the
   analysis history panel proving the log prevents duplicate flagging.
8. Close: this pattern — document contradiction causing silent rejection —
   applies across scholarships, PDS, health schemes, and subsidies, not
   just one form.

## Team

- Team ID:
- Team Name:
- Team Members:
- Project Name: SETU
