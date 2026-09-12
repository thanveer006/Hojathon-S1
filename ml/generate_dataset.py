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

from shared import AUTHORITY_RULES, FIELD_LABELS, serialize_input

FORM_SOURCE = "Scheme Application Form"

# Which documents actually carry which field — mirrors extractNormalizedFields()
# in server/src/engine/normalize.ts. Without this the generator invents
# impossible contradictions (an income figure on an Aadhaar card), teaching the
# model document/field pairings that can never occur in production.
FIELD_SOURCES = {
    "name": ["Aadhaar Card", "Income Certificate", FORM_SOURCE],
    "dob": ["Aadhaar Card", FORM_SOURCE],
    "address": ["Aadhaar Card", "Ration Card", "Income Certificate", FORM_SOURCE],
    "income": ["Income Certificate", FORM_SOURCE],
    "category": ["Ration Card", FORM_SOURCE],
}

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

MODEL = "gemini-flash-lite-latest"


def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_date():
    y = random.randint(1955, 2003)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{d:02d}/{m:02d}/{y}"


def base_value(field: str, applicant_name: str):
    """The authoritative (correct) value for a field."""
    if field == "name":
        return applicant_name
    if field == "dob":
        return random_date()
    if field == "address":
        return random.choice(PLACES)
    if field == "income":
        return random.choice([28000, 45000, 60000, 95000, 120000, 150000])
    if field == "category":
        return random.choice(CATEGORIES)
    raise ValueError(field)


def variant_of(field: str, base, n: int):
    """A *derived* variant of `base` — the kind of drift a real document
    actually shows (a spelling variant of the same name, the same date off by
    a day, a stale address, a differing income figure). Deriving rather than
    regenerating keeps every value in a contradiction about the same
    underlying fact, so the explanation the model is trained to write
    actually matches the values it was shown."""
    if field == "name":
        first, _, last = str(base).partition(" ")
        return f"{first} {last[:1]} {last}".strip() if n == 1 else f"{first[:-1]}a {last}".strip()
    if field == "dob":
        d, m, y = str(base).split("/")
        return f"{(int(d) % 28) + 1:02d}/{m}/{y}" if n == 1 else f"{d}/{(int(m) % 12) + 1:02d}/{y}"
    if field == "address":
        return f"{base} (old address)" if n == 1 else f"{base} — previous ward"
    if field == "income":
        delta = [-12000, 15000][n % 2]
        return max(10000, int(base) + delta)
    if field == "category":
        others = [c for c in CATEGORIES if c != base]
        return others[n % len(others)]
    raise ValueError(field)


def make_scenario():
    applicant_name = random_name()
    fields = random.sample(list(AUTHORITY_RULES.keys()), k=random.randint(1, 4))
    contradictions = []
    corrections_applied = []

    for field in fields:
        rule = AUTHORITY_RULES[field]
        auth_source = rule["authoritativeSource"]
        other_sources = [s for s in FIELD_SOURCES[field] if s != auth_source]
        n_other = random.randint(1, min(2, len(other_sources)))
        chosen_others = random.sample(other_sources, k=n_other)

        auth_value = base_value(field, applicant_name)
        values = [{"source": auth_source, "value": auth_value}]
        for i, src in enumerate(chosen_others, start=1):
            values.append({"source": src, "value": variant_of(field, auth_value, i)})
        random.shuffle(values)

        contradictions.append({
            "field": field,
            "values": values,
            "authoritativeSource": auth_source,
            "resolvedValue": auth_value,
            "rationale": rule["rationale"],
        })

        # The application form is the document that actually gets corrected —
        # quote its real value from this contradiction, never a fresh random
        # one, or the notice cites a figure that appears nowhere in the input.
        form_entry = next((v for v in values if v["source"] == FORM_SOURCE), None)
        if form_entry:
            corrections_applied.append(
                f'{FIELD_LABELS[field]}: changed from "{form_entry["value"]}" '
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
