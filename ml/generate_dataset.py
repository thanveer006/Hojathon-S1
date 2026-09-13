"""
OPTIONAL, legacy: bootstrap training targets by asking Gemini to write a
diverse citizen-facing explanation for each synthesized scenario. Not used
by default — see write_dataset.py, which produces training data the same
shape with no external API dependency. Keep this only if you want to blend
in real LLM-written examples; it costs API quota and needs GEMINI_API_KEY.

Usage: python generate_dataset.py [--count 600] [--out data/train.jsonl]
"""
import argparse
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from scenarios import make_scenario
from shared import serialize_input

load_dotenv(dotenv_path=Path(__file__).parent.parent / "server" / ".env")

MODEL = "gemini-flash-lite-latest"


def build_prompt(applicant_name, contradictions, corrections_applied) -> str:
    return f"""You are writing a short, plain-language notice for a citizen in Kerala, India whose welfare scheme application had contradictions across their documents. These contradictions have ALREADY been resolved by a rules engine — you are only explaining what was found and what the citizen should do next. Do not re-decide anything; just explain the reasoning that is given to you.

Applicant: {applicant_name}

Resolved contradictions (JSON):
{json.dumps(contradictions, indent=2)}

Corrections already applied to their application:
{chr(10).join(f"- {c}" for c in corrections_applied) or "- none"}

Write a short citizen-facing report (120-180 words, plain English, second person "you", no jargon, no markdown headers) that:
1. Summarizes what conflicted and which document was trusted and why (one line per contradiction).
2. Tells the citizen which physical document(s) they should get corrected/updated at the relevant office, so future submissions don't hit the same issue.
3. Reassures them their application was auto-corrected and can proceed.
Keep it warm but concise. Vary your opening line and phrasing style from a typical form letter — write naturally, as a helpful clerk would."""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=600)
    parser.add_argument("--out", type=str, default="data/train.jsonl")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY not set in server/.env")
    client = genai.Client(api_key=api_key)

    out_path = Path(__file__).parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    already = 0
    if out_path.exists():
        already = sum(1 for _ in out_path.open(encoding="utf-8"))
        if already:
            print(f"Resuming: {already} examples already in {out_path}")

    written = already
    consecutive_quota_fails = 0
    with out_path.open("a", encoding="utf-8") as f:
        while written < args.count:
            applicant_name, contradictions, corrections_applied = make_scenario()
            prompt = build_prompt(applicant_name, contradictions, corrections_applied)
            try:
                resp = client.models.generate_content(model=MODEL, contents=prompt)
                target = (resp.text or "").strip()
                consecutive_quota_fails = 0
            except Exception as e:
                msg = str(e)
                if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                    consecutive_quota_fails += 1
                    if consecutive_quota_fails >= 3:
                        print(f"Quota exhausted for {MODEL} after {written} examples. Stopping — "
                              f"re-run later (same command) to resume, or pass a different model.")
                        break
                    print(f"[{written}] quota hit, backing off 60s...")
                    time.sleep(60)
                else:
                    print(f"[{written}] generation failed: {msg[:200]}")
                    time.sleep(2)
                continue
            if not target:
                continue

            input_text = serialize_input(applicant_name, contradictions, corrections_applied)
            f.write(json.dumps({"input": input_text, "target": target}, ensure_ascii=False) + "\n")
            f.flush()
            written += 1
            if written % 25 == 0:
                print(f"{written}/{args.count} written")
            time.sleep(0.5)  # stay well under free-tier rate limits

    print(f"Done. {written} examples in {out_path}")


if __name__ == "__main__":
    main()
