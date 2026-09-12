/**
 * Generic, document-type-agnostic field extraction from OCR'd text.
 *
 * Unlike the seeded pipeline (normalize.ts), an arbitrary upload isn't known
 * in advance to be an Aadhaar card or a ration card — it could be anything.
 * So instead of type-specific parsers, this pulls out a small set of
 * canonical fields (name, dob, address, income, category) using label/
 * pattern matching that works across common Indian identity/income/
 * eligibility documents, and keeps anything else it finds as free-form
 * "other" fields for display only (never compared across documents, since
 * two unrelated documents' extra fields aren't safe to assume comparable).
 */
export interface ExtractedFields {
  name?: string;
  dob?: string; // DD/MM/YYYY, as found on the source document
  address?: string;
  income?: number;
  category?: "APL" | "BPL" | "AAY";
  other: Record<string, string>;
}

const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/;
const INCOME_RE = /(?:rs\.?|inr|₹)\s?([\d,]{4,})/i;
const CATEGORY_RE = /\b(APL|BPL|AAY)\b/i;
const LABEL_LINE_RE = /^([A-Za-z][A-Za-z /]{1,30}?)\s*[:\-]\s*(.+)$/;

const NAME_LABELS = [
  "name",
  "applicant name",
  "full name",
  "holder name",
  "account holder",
  "beneficiary name",
  "head of household",
];
const DOB_LABELS = ["dob", "date of birth"];
const ADDRESS_LABELS = ["address"];
const INCOME_LABELS = ["income", "annual income", "salary"];
const CONSUMED_LABEL_SUBSTRINGS = [
  ...NAME_LABELS,
  ...DOB_LABELS,
  ...ADDRESS_LABELS,
  ...INCOME_LABELS,
  "category",
];

function toDdMmYyyy(raw: string): string {
  return raw.replace(/[-.]/g, "/");
}

function findLineAfterLabel(text: string, labels: string[]): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*[:\\-]?\\s*(.+)`, "i");
      const match = line.match(re);
      if (match && match[1].trim().length > 1) return match[1].trim();
    }
  }
  return undefined;
}

function guessAddress(text: string): string | undefined {
  const found = findLineAfterLabel(text, ADDRESS_LABELS);
  if (found) return found;
  // Fallback: addresses are often the longest line containing a pin code.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => /\b\d{6}\b/.test(l));
}

export function extractGenericFields(text: string): ExtractedFields {
  const name = findLineAfterLabel(text, NAME_LABELS);

  const dobLine = findLineAfterLabel(text, DOB_LABELS);
  const dobMatch = (dobLine || text).match(DATE_RE);
  const dob = dobMatch ? toDdMmYyyy(dobMatch[1]) : undefined;

  const address = guessAddress(text);

  const incomeLine = findLineAfterLabel(text, INCOME_LABELS);
  const incomeMatch = (incomeLine || text).match(INCOME_RE) || (incomeLine || "").match(/([\d,]{4,})/);
  const income = incomeMatch ? Number(incomeMatch[1].replace(/,/g, "")) || undefined : undefined;

  const categoryMatch = text.match(CATEGORY_RE);
  const category = categoryMatch ? (categoryMatch[1].toUpperCase() as "APL" | "BPL" | "AAY") : undefined;

  // Anything else that looks like "Label: value" and isn't one of the
  // canonical fields above gets kept for display, not for comparison.
  const other: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = line.match(LABEL_LINE_RE);
    if (!m) continue;
    const label = m[1].trim();
    const lowerLabel = label.toLowerCase();
    if (CONSUMED_LABEL_SUBSTRINGS.some((s) => lowerLabel.includes(s))) continue;
    if (!other[label]) other[label] = m[2].trim();
  }

  return { name, dob, address, income, category, other };
}
