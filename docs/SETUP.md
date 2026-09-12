# Setup Guide

SETU is a MERN app with a small local ML sidecar. This guide gets a judge from a clean checkout to a running demo.

---

## Prerequisites

* [Node.js](https://nodejs.org/) 18+ and npm
* Git
* A MongoDB connection string — either a local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
* Python 3.10+ — **only** if you want to run or retrain the local explanation model (`ml/`). Without it, the app still runs fully, using a deterministic template for the citizen-facing explanation instead of the fine-tuned model.
* Internet access is **not** required at runtime. It's only needed once, offline, if regenerating the ML training dataset (see below).

## Required Software & Versions

| Software | Version |
| -------- | ------- |
| Node.js | 18+ |
| npm | bundled with Node |
| MongoDB | any recent version (Atlas or local) |
| Python (optional, for `ml/`) | 3.10+ |

## Dependencies

```bash
npm run install:all   # installs server + client dependencies
```

If you also want to run the fine-tuned explanation model:

```bash
pip install -r ml/requirements.txt
```

## Environment Variables

Set these in `server/.env` (copy from `server/.env.example`):

| Variable | Description |
| -------- | ----------- |
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `PORT` | Port the Express server listens on (default `4000`) |
| `GEMINI_API_KEY` | Only used offline by `ml/generate_dataset.py` to bootstrap training data. Not read at runtime by the server or client. |
| `LOCAL_LLM_URL` | URL of the `ml/serve.py` sidecar's `/explain` endpoint (default `http://127.0.0.1:8001/explain`) |

```bash
cp server/.env.example server/.env
# then set MONGO_URI
```

## API Keys / Configuration

SETU does **not** call any commercial LLM API at runtime — no API key is needed to run or demo the app. The only external API used is Gemini, and only offline, once, to bootstrap the training dataset for our own fine-tuned model (`ml/generate_dataset.py`). Judges do not need a Gemini key to run or evaluate the project.

## Database Setup

MongoDB stores applicant records, document extractions, and the contradiction/resolution log history.

```bash
npm run seed   # seeds 4 mock applicant scenarios into MongoDB
```

Mock data is synthetic (no real Aadhaar/income data) but modeled on real, documented causes of scheme-application rejection in Kerala.

## Installation

```bash
git clone https://github.com/thanveer006/Hojathon-S1.git
cd Hojathon-S1
npm run install:all
cp server/.env.example server/.env   # then set MONGO_URI
npm run seed
```

## Running the Project

Default (template-based explanation, no Python required):

```bash
npm run dev   # server (:4000) + client (:5173)
```

With the fine-tuned local explanation model:

```bash
python ml/train.py     # one-time: writes the LoRA adapter to ml/model/
npm run dev:full        # ML sidecar (:8001) + server (:4000) + client (:5173)
```

Open http://localhost:5173, pick an applicant, click **Analyze**, and watch the pipeline trace run stage by stage (Ingest → Extract → Compare → Resolve → Act → Log → Explain).

## Testing

There is no automated test suite. The project was manually verified end-to-end against a live MongoDB Atlas instance: seeding, analysis, contradiction detection/resolution, corrected-application generation, and the "previously seen" memory behavior on repeat analysis runs were all exercised directly through the running app.
