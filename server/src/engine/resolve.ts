import crypto from "crypto";
import { FieldObservation } from "./compare";
import { resolveField } from "./rules";
import { ContradictionRecord } from "../models/AnalysisLog";
import { SOURCE_LABELS, SourceKey, isoDateToDisplay } from "./normalize";

export interface ResolvedField {
  field: string;
  resolvedValue: string | number;
  authoritativeSource: SourceKey;
  isContradiction: boolean;
}

/**
 * "Decide" stage: for every observed field, apply the authority rules table
 * to pick the resolved value. Fields with no contradiction still go through
 * resolution (trivially — all sources agree) so the corrected application
 * always has a fully-determined value set.
 */
export function resolveAllFields(observations: FieldObservation[]): {
  resolvedFields: ResolvedField[];
  contradictions: ContradictionRecord[];
} {
  const resolvedFields: ResolvedField[] = [];
  const contradictions: ContradictionRecord[] = [];

  for (const obs of observations) {
    if (obs.values.length === 0) continue;
    const { resolvedValue, authoritativeSource, rationale } = resolveField(obs.field, obs.values);

    resolvedFields.push({
      field: obs.field,
      resolvedValue,
      authoritativeSource,
      isContradiction: obs.isContradiction,
    });

    if (obs.isContradiction) {
      const toDisplay = (v: string | number) =>
        obs.field === "dob" ? isoDateToDisplay(String(v)) : v;
      contradictions.push({
        field: obs.field,
        values: obs.values.map((v) => ({
          source: SOURCE_LABELS[v.source],
          value: toDisplay(v.value),
        })),
        authoritativeSource: SOURCE_LABELS[authoritativeSource],
        resolvedValue: toDisplay(resolvedValue),
        rationale,
        fieldHash: hashContradiction(obs),
      });
    }
  }

  return { resolvedFields, contradictions };
}

/** Stable hash of field + sorted source values, used to recognize a contradiction
 * across analysis runs (the "Remember" requirement — don't re-flag what was
 * already surfaced and resolved for this applicant). */
export function hashContradiction(obs: FieldObservation): string {
  const canonical = JSON.stringify({
    field: obs.field,
    values: [...obs.values]
      .sort((a, b) => a.source.localeCompare(b.source))
      .map((v) => `${v.source}:${v.value}`),
  });
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
