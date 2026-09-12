import {
  AadhaarDoc,
  RationCardDoc,
  IncomeCertificateDoc,
  SchemeApplicationDoc,
} from "../models/Applicant";

/**
 * Common normalized field schema every document source is mapped into.
 * This is the "Extract" stage: raw, differently-shaped documents get
 * reduced to a shared set of comparable fields.
 */
export interface NormalizedFields {
  source: SourceKey;
  sourceLabel: string;
  name?: string;
  dob?: string; // normalized to YYYY-MM-DD
  address?: string;
  income?: number;
  category?: "APL" | "BPL" | "AAY";
}

export type SourceKey = "aadhaar" | "rationCard" | "incomeCertificate" | "schemeApplication";

export const SOURCE_LABELS: Record<SourceKey, string> = {
  aadhaar: "Aadhaar Card",
  rationCard: "Ration Card",
  incomeCertificate: "Income Certificate",
  schemeApplication: "Scheme Application Form",
};

/** Converts DD/MM/YYYY -> YYYY-MM-DD for reliable comparison. Passes through if already ISO. */
export function normalizeDate(raw: string): string {
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
}

/** Converts YYYY-MM-DD back to DD/MM/YYYY for citizen-facing display — the
 * format every source document actually uses. Passes through unrecognized
 * input unchanged. */
export function isoDateToDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}`;
}

/** Strips honorifics/whitespace variance and lowercases for fuzzy comparison downstream. */
export function normalizeNameForComparison(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAddressForComparison(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractNormalizedFields(documents: {
  aadhaar: AadhaarDoc;
  rationCard: RationCardDoc;
  incomeCertificate: IncomeCertificateDoc;
  schemeApplication: SchemeApplicationDoc;
}): NormalizedFields[] {
  const { aadhaar, rationCard, incomeCertificate, schemeApplication } = documents;

  return [
    {
      source: "aadhaar",
      sourceLabel: SOURCE_LABELS.aadhaar,
      name: aadhaar.fullName,
      dob: normalizeDate(aadhaar.dob),
      address: aadhaar.address,
    },
    {
      // name is resolved later via findClosestFamilyMember() once we know
      // which family member corresponds to the applicant — a ration card
      // lists a household, not a single named applicant.
      source: "rationCard",
      sourceLabel: SOURCE_LABELS.rationCard,
      address: rationCard.address,
      category: rationCard.cardType,
    },
    {
      source: "incomeCertificate",
      sourceLabel: SOURCE_LABELS.incomeCertificate,
      name: incomeCertificate.applicantName,
      address: incomeCertificate.address,
      income: incomeCertificate.annualFamilyIncome,
    },
    {
      source: "schemeApplication",
      sourceLabel: SOURCE_LABELS.schemeApplication,
      name: schemeApplication.applicantName,
      dob: normalizeDate(schemeApplication.dob),
      address: schemeApplication.address,
      income: schemeApplication.declaredAnnualIncome,
      category: schemeApplication.categoryClaimed,
    },
  ];
}

/** Ration card doesn't carry a single "applicant name" field, so we match against
 * the family member name closest to the scheme applicant name. Used post-hoc by
 * the comparator, not during raw extraction, to avoid guessing during Extract.
 */
export function findClosestFamilyMember(
  familyMembers: string[],
  targetName: string
): string | undefined {
  const target = normalizeNameForComparison(targetName);
  let best: { name: string; score: number } | undefined;
  for (const member of familyMembers) {
    const score = nameSimilarity(normalizeNameForComparison(member), target);
    if (!best || score > best.score) best = { name: member, score };
  }
  return best?.name;
}

/** Lightweight token-overlap similarity (0-1) — good enough for transliteration drift like Muhammed/Mohammed. */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = a.split(" ");
  const tokensB = b.split(" ");
  let matches = 0;
  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb || soundsAlike(ta, tb)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(tokensA.length, tokensB.length);
}

/** Very small phonetic heuristic for common transliteration swaps (Muhammed/Mohammed, etc). */
function soundsAlike(a: string, b: string): boolean {
  if (a === b) return true;
  const normalize = (s: string) =>
    s
      .replace(/mu/g, "mo")
      .replace(/oo/g, "u")
      .replace(/[aeiou]/g, "");
  return normalize(a) === normalize(b) && normalize(a).length > 1;
}
