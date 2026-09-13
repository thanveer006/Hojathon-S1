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
→ Log → Explain** — not a single LLM prompt pretending to reason:

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
7. **Explain** — turn the already-resolved log into a plain-language citizen
   report (`server/src/engine/explain.ts`).

The language model is used for exactly one job — step 7. It never decides
which document wins; that logic is deterministic and auditable in code. And
it is **our own model, not a commercial API**: a LoRA fine-tune of
`google/flan-t5-small` served locally from `ml/serve.py`, which the server
calls over HTTP. If that sidecar isn't running, a deterministic template
fallback keeps the pipeline fully runnable. SETU therefore needs no LLM API
key and no network access at runtime.

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
- **ml/** — Python + FastAPI + transformers/PEFT — our own fine-tuned
  explanation model, served locally

## Our own explanation model (`ml/`)

Rather than depend on a commercial LLM API at runtime, we trained the
explanation model ourselves:

- `ml/write_dataset.py` — builds the training set. It synthesizes
  contradiction scenarios in exactly the shape the rules engine emits, then
  writes a natural citizen notice for each itself, via a large hand-authored
  template system — fully offline, no external API or key needed. (An
  optional legacy path, `ml/generate_dataset.py`, can blend in Gemini-written
  examples if you have an API key, but it isn't used by default.)
- `ml/train.py` — LoRA fine-tune of `google/flan-t5-small` on those pairs.
  Small enough to train and serve on CPU.
- `ml/serve.py` — FastAPI sidecar on `:8001` exposing `POST /explain`, which
  `server/src/engine/explain.ts` calls.
- `ml/shared.py` — the single source of truth for how a contradiction record
  is serialized into model input, imported by both training and serving so
  the two can never drift apart.

## Running locally

Prerequisites:

- Node.js 18+
- A MongoDB connection string (Atlas or local) in `server/.env` as `MONGO_URI`
- Python 3.10+ — only if you want to run or retrain the explanation model

```bash
npm run install:all   # installs server + client dependencies
cp server/.env.example server/.env   # then set MONGO_URI (skip if you already have a .env)
npm run seed          # seeds 4 mock applicant scenarios into MongoDB
npm run dev           # server (:4000) + client (:5173)
```

No LLM API key is required, ever — `ml/write_dataset.py` needs none, and the
optional legacy `ml/generate_dataset.py` (Gemini) is not part of the default
pipeline.

To run with the fine-tuned explanation model instead of the template
fallback:

```bash
pip install -r ml/requirements.txt
python ml/train.py     # writes the LoRA adapter to ml/model/
npm run dev:full       # ML sidecar (:8001) + server + client
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

- Team ID: 60
- Team Name: Thanveer
- Team Members: Thanveer Ahammed
- Project Name: SETU
