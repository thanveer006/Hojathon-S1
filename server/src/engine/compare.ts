import {
  NormalizedFields,
  SourceKey,
  findClosestFamilyMember,
  normalizeAddressForComparison,
  normalizeNameForComparison,
} from "./normalize";
import { RationCardDoc } from "../models/Applicant";
import { ComparableField } from "./rules";

export interface FieldObservation {
  field: ComparableField;
  values: { source: SourceKey; value: string | number }[];
  isContradiction: boolean;
}

const INCOME_TOLERANCE_RATIO = 0.02; // 2% tolerance for rounding, not for real discrepancies

/**
 * Compares normalized fields across sources and returns one FieldObservation
 * per comparable field, flagged as a contradiction if values diverge beyond
 * tolerance. This is the "Compare" / reasoning stage — not a plain string
 * diff: names use fuzzy/phonetic matching, dates are format-normalized,
 * incomes use a numeric tolerance band, addresses use token-normalized match.
 */
export function detectContradictions(
  normalized: NormalizedFields[],
  rationCard: RationCardDoc,
  anchorName: string
): FieldObservation[] {
  const observations: FieldObservation[] = [];

  // Resolve the ration card's applicant name against the family member list
  const rationCardEntry = normalized.find((n) => n.source === "rationCard")!;
  const matchedMember = findClosestFamilyMember(rationCard.familyMembers, anchorName);
  const rationCardName = matchedMember;

  // NAME
  const nameCandidates: { source: SourceKey; value: string }[] = normalized
    .filter((n) => n.source !== "rationCard" && n.name)
    .map((n) => ({ source: n.source, value: n.name! }));
  if (rationCardName) nameCandidates.push({ source: "rationCard", value: rationCardName });

  observations.push({
    field: "name",
    values: nameCandidates,
    isContradiction: hasNameContradiction(nameCandidates),
  });

  // DOB
  const dobCandidates = normalized
    .filter((n) => n.dob)
    .map((n) => ({ source: n.source, value: n.dob! }));
  observations.push({
    field: "dob",
    values: dobCandidates,
    isContradiction: new Set(dobCandidates.map((c) => c.value)).size > 1,
  });

  // ADDRESS
  const addressCandidates = normalized
    .filter((n) => n.address)
    .map((n) => ({ source: n.source, value: n.address! }));
  observations.push({
    field: "address",
    values: addressCandidates,
    isContradiction: hasAddressContradiction(addressCandidates),
  });

  // INCOME
  const incomeCandidates = normalized
    .filter((n) => n.income !== undefined)
    .map((n) => ({ source: n.source, value: n.income! }));
  observations.push({
    field: "income",
    values: incomeCandidates,
    isContradiction: hasIncomeContradiction(incomeCandidates),
  });

  // CATEGORY
  const categoryCandidates = normalized
    .filter((n) => n.category)
    .map((n) => ({ source: n.source, value: n.category! }));
  observations.push({
    field: "category",
    values: categoryCandidates,
    isContradiction: new Set(categoryCandidates.map((c) => c.value)).size > 1,
  });

  return observations;
}

/**
 * Any spelling/transliteration difference counts as a contradiction — that's
 * the whole point of flagging it (e.g. "Muhammed" vs "Mohammed" should be
 * surfaced so the citizen standardizes on the Aadhaar spelling). Fuzzy/
 * phonetic matching (nameSimilarity) is reserved for identifying which
 * ration card family member corresponds to the applicant, not for deciding
 * whether a contradiction exists.
 */
function hasNameContradiction(candidates: { source: SourceKey; value: string }[]): boolean {
  const normalizedSet = new Set(candidates.map((c) => normalizeNameForComparison(c.value)));
  return normalizedSet.size > 1;
}

function hasAddressContradiction(candidates: { source: SourceKey; value: string }[]): boolean {
  const normalizedSet = new Set(candidates.map((c) => normalizeAddressForComparison(c.value)));
  return normalizedSet.size > 1;
}

function hasIncomeContradiction(candidates: { source: SourceKey; value: number }[]): boolean {
  if (candidates.length < 2) return false;
  const max = Math.max(...candidates.map((c) => c.value));
  const min = Math.min(...candidates.map((c) => c.value));
  if (max === 0) return false;
  return (max - min) / max > INCOME_TOLERANCE_RATIO;
}
