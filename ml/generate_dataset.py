"""
One-time bootstrap: synthesize scenarios from the rules-engine shape, ask
Gemini to write a diverse citizen-facing explanation for each, and save the
(input, target) pairs as training data. Run once; the fine-tuned model never
calls an external API at inference time.

Usage: python generate_dataset.py [--count 600] [--out data/train.jsonl]
"""
import argparse
import json
import os
import random
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

from shared import AUTHORITY_RULES, ALL_SOURCES, serialize_input

load_dotenv(dotenv_path=Path(__file__).parent.parent / "server" / ".env")

FIRST_NAMES = [
    "Priya", "Anil", "Divya", "Rajesh", "Meera", "Suresh", "Lakshmi", "Vinod",
    "Anitha", "Manoj", "Deepa", "Sanjay", "Kavya", "Ramesh", "Nisha", "Arun",
]
LAST_NAMES = ["Nair", "Menon", "Pillai", "Kumar", "Varma", "S", "Krishnan", "Das"]
PLACES = [
    "Kochi, Ernakulam", "Thrissur", "Kozhikode", "Alappuzha", "Kottayam",
    "Palakkad", "Kollam", "Thiruvananthapuram", "Malappuram", "Idukki",
]
CATEGORIES = ["BPL", "APL", "AAY"]

MODEL = "gemini-3.6-flash"


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_date():
    y = random.randint(1955, 2003)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{d:02d}/{m:02d}/{y}"


def random_value(field: str, seed: int):
    if field == "name":
        base = random_name()
        return base if seed == 0 else base.replace(" ", "", 1) if seed == 1 else base + " K"
    if field == "dob":
        base = random_date()
        if seed == 0:
            return base
        d, m, y = base.split("/")
        return f"{int(d) + 1:02d}/{m}/{y}"
    if field == "address":
        base = random.choice(PLACES)
        return base if seed == 0 else base + " (old)"
    if field == "income":
        base = random.choice([28000, 45000, 60000, 95000, 120000, 150000])
        return base if seed == 0 else base + random.choice([-8000, 10000, 15000])
    if field == "category":
        return random.choice(CATEGORIES)
    raise ValueError(field)


def make_scenario():
    applicant_name = random_name()
    fields = random.sample(list(AUTHORITY_RULES.keys()), k=random.randint(1, 4))
    contradictions = []
    corrections_applied = []

    for field in fields:
        rule = AUTHORITY_RULES[field]
        auth_source = rule["authoritativeSource"]
        other_sources = [s for s in ALL_SOURCES if s != auth_source]
        n_other = random.randint(1, min(2, len(other_sources)))
        chosen_others = random.sample(other_sources, k=n_other)

        auth_value = random_value(field, 0)
        values = [{"source": auth_source, "value": auth_value}]
        for i, src in enumerate(chosen_others, start=1):
            values.append({"source": src, "value": random_value(field, i)})
        random.shuffle(values)

        contradictions.append({
            "field": field,
            "values": values,
            "authoritativeSource": auth_source,
            "resolvedValue": auth_value,
            "rationale": rule["rationale"],
        })

        if "applicationForm" in chosen_others:
            label = {
                "name": "applicant name", "dob": "date of birth", "address": "address",
                "income": "declared annual income", "category": "category claimed",
            }[field]
            corrections_applied.append(
                f'{label}: changed from "{random_value(field, chosen_others.index("applicationForm") + 1)}" '
                f'to "{auth_value}" (source of truth: {auth_source})'
            )

    return applicant_name, contradictions, corrections_applied


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

    written = 0
    with out_path.open("w", encoding="utf-8") as f:
        for i in range(args.count):
            applicant_name, contradictions, corrections_applied = make_scenario()
            prompt = build_prompt(applicant_name, contradictions, corrections_applied)
            try:
                resp = client.models.generate_content(model=MODEL, contents=prompt)
                target = (resp.text or "").strip()
            except Exception as e:
                print(f"[{i}] generation failed: {e}")
                time.sleep(2)
                continue
            if not target:
                continue

            input_text = serialize_input(applicant_name, contradictions, corrections_applied)
            f.write(json.dumps({"input": input_text, "target": target}, ensure_ascii=False) + "\n")
            written += 1
            if written % 25 == 0:
                print(f"{written}/{args.count} written")
            time.sleep(0.5)  # stay well under free-tier rate limits

    print(f"Done. {written} examples written to {out_path}")


if __name__ == "__main__":
    main()
