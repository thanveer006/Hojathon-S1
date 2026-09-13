"""
Synthesizes contradiction scenarios from the rules-engine shape (AUTHORITY_RULES
in shared.py). Pure, deterministic-given-a-seed, no external dependencies —
shared by both generate_dataset.py (optional Gemini-written targets) and
write_dataset.py (self-authored targets, no API).
"""
import random

from shared import AUTHORITY_RULES, FIELD_LABELS

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
