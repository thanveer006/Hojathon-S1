"""
Shared data shapes and input serialization for the SETU explanation model.

Mirrors server/src/engine/rules.ts (AUTHORITY_RULES) and the ContradictionRecord /
CorrectedApplication shapes in server/src/models/AnalysisLog.ts and
server/src/engine/act.ts.

Source names here are the human-readable LABELS (SOURCE_LABELS in
server/src/engine/normalize.ts), not the internal camelCase keys, because
resolve.ts maps every source through SOURCE_LABELS before the record is
persisted — so those labels are what serve.py actually receives at inference
time. Training on anything else would give the model a vocabulary it never
sees in production.
"""

AUTHORITY_RULES = {
    "name": {
        "authoritativeSource": "Aadhaar Card",
        "rationale": "Aadhaar is treated as the anchor identity document across Kerala scheme verifications — all other records are expected to match it.",
    },
    "dob": {
        "authoritativeSource": "Aadhaar Card",
        "rationale": "Date of birth on Aadhaar is the UIDAI-verified value and takes precedence over self-declared or secondary records.",
    },
    "address": {
        "authoritativeSource": "Aadhaar Card",
        "rationale": "Aadhaar address is most likely to be current since it can be self-updated; ration cards and income certificates are revised far less frequently and often lag behind a household's actual address.",
    },
    "income": {
        "authoritativeSource": "Income Certificate",
        "rationale": "The income certificate is issued by a Village Officer/Tahsildar as legal proof of income; a self-declared figure on the application form carries no verification weight.",
    },
    "category": {
        "authoritativeSource": "Ration Card",
        "rationale": "The ration card is the official APL/BPL/AAY categorization record maintained by the Civil Supplies Department; category claims on an application form are unverified until checked against it.",
    },
}

ALL_SOURCES = ["Aadhaar Card", "Ration Card", "Income Certificate", "Scheme Application Form"]

# Human label for each comparable field, as used in act.ts's correctionsApplied strings.
FIELD_LABELS = {
    "name": "applicant name",
    "dob": "date of birth",
    "address": "address",
    "income": "declared annual income",
    "category": "category claimed",
}


def serialize_input(applicant_name: str, contradictions: list[dict], corrections_applied: list[str]) -> str:
    """Turn a (contradictions, corrections) pair into the flat text prompt the
    model is trained/queried on. Deterministic and field-order-stable so
    training and serving never drift apart."""
    lines = [f"Applicant: {applicant_name}", "Contradictions:"]
    for c in contradictions:
        values = " vs ".join(f'{v["source"]}="{v["value"]}"' for v in c["values"])
        lines.append(
            f'- {c["field"]}: {values} -> trust {c["authoritativeSource"]} ({c["rationale"]})'
        )
    lines.append("Corrections applied:")
    if corrections_applied:
        lines.extend(f"- {c}" for c in corrections_applied)
    else:
        lines.append("- none")
    return "\n".join(lines)


TASK_PREFIX = "Write a plain-language citizen notice for this resolved application:\n\n"
