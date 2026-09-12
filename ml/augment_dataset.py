"""
Data-augmentation fallback for when the Gemini free-tier daily quota is
exhausted (see generate_dataset.py). Reuses the exact same scenario
synthesis (make_scenario) and input serialization (shared.serialize_input)
as the Gemini pipeline, so every row has the identical (input, target)
shape expected by train.py / serve.py. The only difference is the target:
instead of an LLM-written notice, it's built from a small set of
template variants (rule-based, not calling any external API).

This is intentionally lower quality/diversity than the Gemini-written
targets — it exists purely to give the LoRA adapter more volume to learn
the input vocabulary and output structure from, while the real
Gemini-written examples remain the higher-quality core signal (see
combine_dataset.py, which oversamples them relative to this file).

Usage: python augment_dataset.py [--count 300] [--out data/train_synthetic.jsonl]
"""
import argparse
import json
import random
from pathlib import Path

from generate_dataset import make_scenario
from shared import serialize_input, FIELD_LABELS

OPENERS = [
    "Thanks for your patience while we checked your application, {name} — here's what we found.",
    "Hello {name}, we've finished reviewing your documents and wanted to explain what happened.",
    "Hi {name}, a quick note about your scheme application after our document check.",
    "{name}, here is a summary of the checks we ran on your application.",
    "We compared your documents, {name}, and found a few things worth explaining.",
]

CLOSERS = [
    "Your application has already been corrected using the trusted values above, so it can move forward without any action from you — just get the documents above updated when you get the chance, so this doesn't come up again.",
    "We've auto-corrected your application to match the trusted records, so there's nothing else you need to do right now. Please do update the listed document(s) at your local office when convenient, to avoid the same mismatch next time.",
    "No further action is needed to proceed — your application now reflects the trusted values. It would still help to get the document(s) above corrected at your local office for future submissions.",
]

NO_DOC_CLOSER = "Your application has already been corrected using the trusted values above, so it can proceed as-is — no documents need updating this time."


def contradiction_line(c: dict) -> str:
    values = " vs. ".join(f'{v["source"]}: "{v["value"]}"' for v in c["values"])
    label = FIELD_LABELS.get(c["field"], c["field"])
    return (
        f"Your {label} did not match across documents ({values}). "
        f"We used the value from your {c['authoritativeSource']} because "
        f"{c['rationale'].rstrip('.').lower()}."
    )


def docs_needing_correction(c: dict) -> list[str]:
    return [
        v["source"]
        for v in c["values"]
        if v["source"] != c["authoritativeSource"] and str(v["value"]) != str(c["resolvedValue"])
    ]


def build_target(applicant_name: str, contradictions: list[dict]) -> str:
    opener = random.choice(OPENERS).format(name=applicant_name)
    lines = [contradiction_line(c) for c in contradictions]
    docs = []
    for c in contradictions:
        docs.extend(docs_needing_correction(c))
    docs = list(dict.fromkeys(docs))  # de-dupe, preserve order
    if docs:
        closer = random.choice(CLOSERS)
        doc_line = f"To avoid this happening again, please get the following corrected at your local office: {', '.join(docs)}."
    else:
        closer = NO_DOC_CLOSER
        doc_line = ""

    parts = [opener, " ".join(lines)]
    if doc_line:
        parts.append(doc_line)
    parts.append(closer)
    return "\n\n".join(p for p in parts if p)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=300)
    parser.add_argument("--out", type=str, default="data/train_synthetic.jsonl")
    parser.add_argument("--seed", type=int, default=7)
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

    print(f"Wrote {written} template-based synthetic examples to {out_path}")


if __name__ == "__main__":
    main()
