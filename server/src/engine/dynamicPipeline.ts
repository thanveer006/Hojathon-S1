import crypto from "crypto";
import { extractTextFromUpload } from "./ocr";
import { extractGenericFields } from "./dynamicExtract";
import { DocCategory, resolveDynamicField } from "./dynamicRules";
import {
  normalizeDate,
  normalizeNameForComparison,
  normalizeAddressForComparison,
} from "./normalize";
import { ComparableField } from "./rules";
import { generateExplanation } from "./explain";

export interface UploadedDocInput {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  category: DocCategory;
  label: string;
}

export interface DynamicDocumentResult {
  label: string;
  fileName: string;
  category: DocCategory;
  fields: Partial<Record<ComparableField, string | number>>;
  otherFields: Record<string, string>;
  rawTextPreview: string;
}

export interface DynamicFieldComparison {
  field: ComparableField;
  values: { source: string; value: string | number }[];
  isContradiction: boolean;
}

export interface DynamicContradiction {
  field: string;
  values: { source: string; value: string | number }[];
  authoritativeSource: string;
  resolvedValue: string | number;
  rationale: string;
  fieldHash: string;
}

export interface DynamicPipelineTraceEntry {
  stage: string;
  detail: string;
  timestamp: string;
}

export interface DynamicPipelineResult {
  documents: DynamicDocumentResult[];
  fieldsCompared: DynamicFieldComparison[];
  contradictions: DynamicContradiction[];
  correctedRecord: Record<string, string | number>;
  correctionsApplied: string[];
  hasApplicationDoc: boolean;
  explanation: string;
  pipelineTrace: DynamicPipelineTraceEntry[];
}

const COMPARABLE_FIELDS: ComparableField[] = ["name", "dob", "address", "income", "category"];
const INCOME_TOLERANCE_RATIO = 0.02;

/**
 * The arbitrary-document counterpart to engine/pipeline.ts. Same stage
 * structure (Ingest -> Extract -> Compare -> Resolve -> Act -> Log ->
 * Explain) but operating over N citizen-tagged uploads of unknown type
 * instead of 4 fixed document types, and never persisted — every call is a
 * one-shot, memory-less analysis.
 */
export async function runDynamicPipeline(inputs: UploadedDocInput[]): Promise<DynamicPipelineResult> {
  const trace: DynamicPipelineTraceEntry[] = [];
  const stamp = () => new Date().toISOString();
  const log = (stage: string, detail: string) => trace.push({ stage, detail, timestamp: stamp() });

  log(
    "Ingest",
    `Received ${inputs.length} uploaded document(s): ${inputs.map((i) => i.label).join(", ")}.`
  );

  const documents: DynamicDocumentResult[] = [];
  for (const input of inputs) {
    const rawText = await extractTextFromUpload(input.buffer, input.mimeType);
    const extracted = extractGenericFields(rawText);
    const fields: Partial<Record<ComparableField, string | number>> = {};
    if (extracted.name) fields.name = extracted.name;
    if (extracted.dob) fields.dob = extracted.dob;
    if (extracted.address) fields.address = extracted.address;
    if (extracted.income !== undefined) fields.income = extracted.income;
    if (extracted.category) fields.category = extracted.category;
    documents.push({
      label: input.label,
      fileName: input.fileName,
      category: input.category,
      fields,
      otherFields: extracted.other,
      rawTextPreview: rawText.slice(0, 1500),
    });
  }
  log(
    "Extract",
    `Read text from ${documents.length} document(s) and extracted whichever of name/DOB/address/income/category each one contained.`
  );

  // COMPARE — only fields that show up in 2+ documents can contradict.
  const fieldsCompared: DynamicFieldComparison[] = [];
  for (const field of COMPARABLE_FIELDS) {
    const candidates = documents
      .filter((d) => d.fields[field] !== undefined)
      .map((d) => ({ source: d.label, value: d.fields[field]! }));
    if (candidates.length === 0) continue;
    fieldsCompared.push({
      field,
      values: candidates,
      isContradiction: hasContradiction(field, candidates),
    });
  }
  const flaggedCount = fieldsCompared.filter((f) => f.isContradiction).length;
  log(
    "Compare",
    fieldsCompared.length > 0
      ? `Compared ${fieldsCompared.length} field(s) shared by 2+ documents. Found ${flaggedCount} contradiction(s).`
      : `No field was present on more than one document — nothing to compare.`
  );

  // RESOLVE
  const contradictions: DynamicContradiction[] = [];
  const resolved: Partial<Record<ComparableField, { value: string | number; label: string }>> = {};
  for (const fc of fieldsCompared) {
    const candidates = documents
      .filter((d) => d.fields[fc.field] !== undefined)
      .map((d) => ({ label: d.label, category: d.category, value: d.fields[fc.field]! }));
    const { resolvedValue, authoritativeDocLabel, rationale } = resolveDynamicField(fc.field, candidates);
    resolved[fc.field] = { value: resolvedValue, label: authoritativeDocLabel };
    if (fc.isContradiction) {
      contradictions.push({
        field: fc.field,
        values: fc.values,
        authoritativeSource: authoritativeDocLabel,
        resolvedValue,
        rationale,
        fieldHash: hashDynamic(fc.field, fc.values),
      });
    }
  }
  log(
    "Resolve",
    contradictions.length > 0
      ? `Applied category-based authority rules to ${contradictions.length} contradiction(s): ${contradictions
          .map((c) => `${c.field} -> ${c.authoritativeSource}`)
          .join(", ")}.`
      : `No contradictions to resolve.`
  );

  // ACT — build a resolved master record; if one upload was tagged as the
  // "application" being corrected, report field-level corrections against it.
  const applicationDoc = documents.find((d) => d.category === "application");
  const correctionsApplied: string[] = [];
  const correctedRecord: Record<string, string | number> = {};
  for (const field of COMPARABLE_FIELDS) {
    const r = resolved[field];
    if (!r) continue;
    correctedRecord[field] = r.value;
    const originalValue = applicationDoc?.fields[field];
    if (applicationDoc && originalValue !== undefined && String(originalValue) !== String(r.value)) {
      correctionsApplied.push(
        `${field}: changed from "${originalValue}" to "${r.value}" (source of truth: ${r.label})`
      );
    }
  }
  log(
    "Act",
    applicationDoc
      ? correctionsApplied.length > 0
        ? `Generated a corrected record for "${applicationDoc.label}" with ${correctionsApplied.length} field correction(s) applied.`
        : `Generated a corrected record for "${applicationDoc.label}" — no corrections were necessary.`
      : `No uploaded document was tagged "Application Form" — generated a resolved master record instead of a correction against one.`
  );

  log("Log", "Ad-hoc analysis — not persisted; no history is kept across runs for uploaded documents.");

  // EXPLAIN
  const displayName = (documents.find((d) => d.fields.name)?.fields.name as string) || "Applicant";
  const explanation = await generateExplanation(displayName, contradictions as never, {
    correctionsApplied,
  });
  log("Explain", `Generated plain-language report (${explanation.split(/\s+/).length} words).`);

  return {
    documents,
    fieldsCompared,
    contradictions,
    correctedRecord,
    correctionsApplied,
    hasApplicationDoc: Boolean(applicationDoc),
    explanation,
    pipelineTrace: trace,
  };
}

function hasContradiction(
  field: ComparableField,
  candidates: { value: string | number }[]
): boolean {
  if (candidates.length < 2) return false;
  if (field === "income") {
    const nums = candidates.map((c) => Number(c.value));
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    if (max === 0) return false;
    return (max - min) / max > INCOME_TOLERANCE_RATIO;
  }
  if (field === "dob") {
    return new Set(candidates.map((c) => normalizeDate(String(c.value)))).size > 1;
  }
  if (field === "name") {
    return new Set(candidates.map((c) => normalizeNameForComparison(String(c.value)))).size > 1;
  }
  if (field === "address") {
    return new Set(candidates.map((c) => normalizeAddressForComparison(String(c.value)))).size > 1;
  }
  return new Set(candidates.map((c) => String(c.value).toUpperCase())).size > 1;
}

function hashDynamic(field: string, values: { source: string; value: string | number }[]): string {
  const canonical = JSON.stringify({
    field,
    values: [...values].sort((a, b) => a.source.localeCompare(b.source)).map((v) => `${v.source}:${v.value}`),
  });
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
