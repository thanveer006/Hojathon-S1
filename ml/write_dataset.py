"""
Dataset generator with NO external LLM API dependency. Replaces the
Gemini-based generate_dataset.py: reuses the same scenario synthesis
(make_scenario, lifted from generate_dataset.py) but writes every target
explanation itself via a large, hand-authored template system instead of
calling out to a commercial model. Fully offline, deterministic given a
seed, no API key/quota to manage.

Usage: python write_dataset.py [--count 600] [--out data/train.jsonl] [--seed 3]
"""
import argparse
import json
import random
from pathlib import Path

from scenarios import make_scenario
from shared import FIELD_LABELS, serialize_input

OPENERS = [
    "Hi {name}, thanks for your patience while we checked your documents — here's what we found.",
    "Hello {name}, we've finished reviewing your scheme application and wanted to walk you through it.",
    "{name}, here's a quick summary of what we found when we cross-checked your documents.",
    "We compared your documents, {name}, and a few things are worth explaining.",
    "Hi {name}, our review of your application turned up some details worth flagging.",
    "Good news first, {name}: we've already sorted out your application. Here's what happened.",
    "{name}, a quick note about the checks we ran on your submitted documents.",
    "Thanks for submitting your application, {name}. Here's what our document check found.",
    "Hi {name}, we noticed a few mismatches while reviewing your paperwork, and here's how we handled them.",
    "{name}, before your application moves forward, here's a short explanation of what we checked.",
]

NO_CONTRADICTION_OPENERS = [
    "Good news, {name} — all four of your documents agree with each other. No contradictions were found and your application is ready to proceed as submitted.",
    "Hi {name}, everything checks out: your Aadhaar Card, Ration Card, Income Certificate, and application form all agree, so there's nothing further needed from you.",
    "{name}, your documents matched perfectly across the board. Your application is moving forward as submitted, no corrections needed.",
]

# Per-field phrasing variety for describing one contradiction. Each entry is
# a template using {label}, {values}, {source}, {reason} placeholders so the
# sentence structure — not just the word choice — varies across examples.
CONTRADICTION_TEMPLATES = [
    "Your {label} didn't match across documents ({values}) — we went with the value from your {source} since {reason}.",
    "We found a mismatch in your {label} ({values}). We trusted your {source} here because {reason}.",
    "There was a difference in your {label} between documents ({values}); your {source} took precedence, since {reason}.",
    "Your {label} wasn't consistent everywhere ({values}). We used your {source} as the source of truth — {reason}.",
    "Looking at your {label}, we saw {values}. Since {reason}, we relied on your {source}.",
    "Your documents disagreed on {label} ({values}). Your {source} settled it, because {reason}.",
]

CLOSERS_WITH_DOCS = [
    "Your application has already been corrected to match the trusted values above, so it can move forward without any action from you — just get the document(s) above updated when you get the chance, so this doesn't come up again.",
    "There's nothing else you need to do right now — we've auto-corrected your application to match the trusted records. It would still help to get the document(s) above corrected at your local office for next time.",
    "No further action is needed to proceed; your application now reflects the trusted values. Please do get the listed document(s) updated at your local office when convenient, though, to avoid the same mismatch on your next application.",
    "Your application can proceed as-is since we've already applied the correction. To save you the trouble later, please update the document(s) above at your local office whenever you get a chance.",
    "We've taken care of the correction on our end, so you don't need to do anything for this application to move ahead. Just keep in mind the document(s) above should be updated at your local office at some point.",
]

CLOSER_NO_DOCS = "Your application has already been corrected using the trusted values above, so it can proceed as-is — no documents need updating this time."

WHAT_TO_DO_LEAD_INS = [
    "To avoid this happening again, please get the following corrected at your local office: {docs}.",
    "So this doesn't come up on your next application, please update: {docs}.",
    "One thing to take care of when you get a chance: get {docs} corrected at your local office.",
    "For future applications, please have {docs} updated at your local office.",
]


def docs_needing_correction(c: dict) -> list[str]:
    return [
        v["source"]
        for v in c["values"]
        if v["source"] != c["authoritativeSource"] and str(v["value"]) != str(c["resolvedValue"])
    ]


def contradiction_line(c: dict) -> str:
    values = " vs. ".join(f'{v["source"]}: "{v["value"]}"' for v in c["values"])
    label = FIELD_LABELS.get(c["field"], c["field"])
    reason = c["rationale"].rstrip(".").lower()
    template = random.choice(CONTRADICTION_TEMPLATES)
    return template.format(label=label, values=values, source=c["authoritativeSource"], reason=reason)


def build_target(applicant_name: str, contradictions: list[dict]) -> str:
    if not contradictions:
        return random.choice(NO_CONTRADICTION_OPENERS).format(name=applicant_name)

    opener = random.choice(OPENERS).format(name=applicant_name)
    lines = [contradiction_line(c) for c in contradictions]

    docs = []
    for c in contradictions:
        docs.extend(docs_needing_correction(c))
    docs = list(dict.fromkeys(docs))

    if docs:
        closer = random.choice(CLOSERS_WITH_DOCS)
        doc_line = random.choice(WHAT_TO_DO_LEAD_INS).format(docs=", ".join(docs))
    else:
        closer = CLOSER_NO_DOCS
        doc_line = ""

    parts = [opener, " ".join(lines)]
    if doc_line:
        parts.append(doc_line)
    parts.append(closer)
    return "\n\n".join(p for p in parts if p)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=600)
    parser.add_argument("--out", type=str, default="data/train.jsonl")
    parser.add_argument("--seed", type=int, default=3)
    args = parser.parse_args()

    random.seed(args.seed)
    out_path = Path(__file__).parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    written = 0
    with out_path.open("w", encoding="utf-8") as f:
        for _ in range(args.count):
            applicant_name, contradictions, corrections_applied = make_scenario()
            target = build_target(applicant_name, contradictions)
            input_text = serialize_input(applicant_name, contradictions, corrections_applied)
            f.write(json.dumps({"input": input_text, "target": target}, ensure_ascii=False) + "\n")
            written += 1

    print(f"Wrote {written} self-authored (no external API) examples to {out_path}")


if __name__ == "__main__":
    main()
