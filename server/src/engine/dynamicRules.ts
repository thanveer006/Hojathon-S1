import { ComparableField } from "./rules";

/**
 * For arbitrary uploads we don't know a document's concrete type (it isn't
 * necessarily "an Aadhaar card"), so the citizen tags each upload with a
 * broad category instead. Authority resolution then keys off that category
 * rather than a fixed source name — the same real-world logic as
 * rules.ts (identity documents anchor identity fields, etc.), generalized.
 */
export type DocCategory = "identity" | "income" | "eligibility" | "application" | "other";

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  identity: "Identity Document",
  income: "Income Proof",
  eligibility: "Eligibility / Category Proof",
  application: "Application Form",
  other: "Other Document",
};

export const FIELD_AUTHORITY: Record<ComparableField, DocCategory> = {
  name: "identity",
  dob: "identity",
  address: "identity",
  income: "income",
  category: "eligibility",
};

export interface DynamicCandidate {
  label: string;
  category: DocCategory;
  value: string | number;
}

export function resolveDynamicField(
  field: ComparableField,
  candidates: DynamicCandidate[]
): { resolvedValue: string | number; authoritativeDocLabel: string; rationale: string } {
  const authorityCategory = FIELD_AUTHORITY[field];
  const winner = candidates.find((c) => c.category === authorityCategory);
  if (winner) {
    return {
      resolvedValue: winner.value,
      authoritativeDocLabel: winner.label,
      rationale: `"${winner.label}" is tagged as ${CATEGORY_LABELS[authorityCategory]}, the trusted source for ${field}.`,
    };
  }
  const fallback = candidates[0];
  return {
    resolvedValue: fallback.value,
    authoritativeDocLabel: fallback.label,
    rationale: `None of the uploaded documents were tagged as ${CATEGORY_LABELS[authorityCategory]} (the usual source for ${field}) — used "${fallback.label}" as a fallback.`,
  };
}
