import { ApplicantAttrs } from "../models/Applicant";
import { AnalysisLog, ContradictionRecord } from "../models/AnalysisLog";
import { extractNormalizedFields } from "./normalize";
import { detectContradictions } from "./compare";
import { resolveAllFields } from "./resolve";
import { buildCorrectedApplication } from "./act";
import { generateExplanation } from "./explain";

export interface PipelineTraceEntry {
  stage: string;
  detail: string;
  timestamp: string;
}

export interface PipelineResult {
  runNumber: number;
  contradictions: ContradictionRecord[];
  newContradictions: ContradictionRecord[];
  repeatedButResolved: ContradictionRecord[];
  correctedApplication: ReturnType<typeof buildCorrectedApplication>;
  explanation: string;
  pipelineTrace: PipelineTraceEntry[];
}

/**
 * Runs the full agentic pipeline for one applicant:
 * Ingest -> Extract -> Compare -> Resolve -> Act -> Log
 * Every stage appends a trace entry so the pipeline's reasoning is visible,
 * not just its final output.
 */
export async function runPipeline(applicant: ApplicantAttrs): Promise<PipelineResult> {
  const trace: PipelineTraceEntry[] = [];
  const stamp = () => new Date().toISOString();
  const log = (stage: string, detail: string) => trace.push({ stage, detail, timestamp: stamp() });

  // INGEST
  log(
    "Ingest",
    `Loaded 4 source documents for ${applicant.displayName} (${applicant.applicantId}): Aadhaar, Ration Card, Income Certificate, Scheme Application.`
  );

  // EXTRACT
  const normalized = extractNormalizedFields(applicant.documents);
  log(
    "Extract",
    `Normalized ${normalized.length} documents into a common field schema (name, dob, address, income, category).`
  );

  // COMPARE
  const observations = detectContradictions(
    normalized,
    applicant.documents.rationCard,
    applicant.documents.aadhaar.fullName
  );
  const flaggedCount = observations.filter((o) => o.isContradiction).length;
  log(
    "Compare",
    `Compared ${observations.length} fields across sources using fuzzy name matching, date normalization, and income tolerance banding. Found ${flaggedCount} contradiction(s).`
  );

  // RESOLVE
  const { resolvedFields, contradictions } = resolveAllFields(observations);
  log(
    "Resolve",
    contradictions.length > 0
      ? `Applied authority-resolution rules table to ${contradictions.length} contradiction(s): ${contradictions
          .map((c) => `${c.field} -> ${c.authoritativeSource}`)
          .join(", ")}.`
      : `No contradictions to resolve — all sources already agree.`
  );

  // ACT
  const correctedApplication = buildCorrectedApplication(
    applicant.documents.schemeApplication,
    resolvedFields
  );
  log(
    "Act",
    correctedApplication.correctionsApplied.length > 0
      ? `Generated corrected scheme application with ${correctedApplication.correctionsApplied.length} field correction(s) applied.`
      : `Generated scheme application — no corrections were necessary.`
  );

  // Determine what's new vs. already-seen (Remember requirement)
  const priorLogs = await AnalysisLog.find({ applicantId: applicant.applicantId }).sort({
    runNumber: -1,
  });
  const previouslySeenHashes = new Set(
    priorLogs.flatMap((l) => l.contradictions.map((c) => c.fieldHash))
  );
  const newContradictions = contradictions.filter((c) => !previouslySeenHashes.has(c.fieldHash));
  const repeatedButResolved = contradictions.filter((c) => previouslySeenHashes.has(c.fieldHash));
  const runNumber = (priorLogs[0]?.runNumber ?? 0) + 1;

  log(
    "Log",
    runNumber === 1
      ? `First analysis run for this applicant — recording ${contradictions.length} contradiction(s) to memory.`
      : `Run #${runNumber}. ${repeatedButResolved.length} contradiction(s) already known from a prior run (not re-flagged as new), ${newContradictions.length} newly observed.`
  );

  // EXPLAIN (LLM job #2)
  const explanation = await generateExplanation(
    applicant.displayName,
    contradictions,
    correctedApplication
  );
  log("Explain", `Generated plain-language citizen report (${explanation.split(/\s+/).length} words).`);

  await AnalysisLog.create({
    applicantId: applicant.applicantId,
    runNumber,
    contradictions,
    newContradictions,
    repeatedButResolved,
    correctedApplication,
    explanation,
    pipelineTrace: trace,
  });

  return {
    runNumber,
    contradictions,
    newContradictions,
    repeatedButResolved,
    correctedApplication,
    explanation,
    pipelineTrace: trace,
  };
}
