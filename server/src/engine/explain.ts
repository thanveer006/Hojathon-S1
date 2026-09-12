import { ContradictionRecord } from "../models/AnalysisLog";

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8001/explain";

/**
 * "Explain" — the only other LLM job besides extraction. The LLM never
 * decides which document is correct (that's the rules engine); it only
 * turns an already-resolved contradiction log into plain language for the
 * citizen. Calls our own fine-tuned model (see ml/), served locally by
 * ml/serve.py — no external API involved at runtime. Falls back to a
 * deterministic template if the local model isn't running, so the pipeline
 * still runs end-to-end even before training is set up.
 *
 * Takes only `{ correctionsApplied }` from the corrected-application object
 * (rather than the full CorrectedApplication shape) so this same function
 * serves both the fixed seeded-applicant pipeline and the dynamic
 * arbitrary-document pipeline, which don't share one corrected-record type.
 */
export async function generateExplanation(
  applicantName: string,
  contradictions: ContradictionRecord[],
  correctedApplication: { correctionsApplied: string[] }
): Promise<string> {
  if (contradictions.length === 0) {
    return `Good news, ${applicantName} — all four documents agree with each other. No contradictions were found and your application is ready to proceed as submitted.`;
  }

  try {
    const text = await callLocalModel(applicantName, contradictions, correctedApplication);
    if (text) return text;
  } catch (err) {
    console.error("[explain] local model call failed, using template fallback:", err);
  }
  return templateExplanation(applicantName, contradictions);
}

async function callLocalModel(
  applicantName: string,
  contradictions: ContradictionRecord[],
  correctedApplication: { correctionsApplied: string[] }
): Promise<string | null> {
  // Generous: a small CPU-served model takes seconds, and aborting early
  // silently downgrades every response to the template fallback.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(LOCAL_LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantName,
        contradictions,
        correctionsApplied: correctedApplication.correctionsApplied,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } finally {
    clearTimeout(timeout);
  }
}

function templateExplanation(applicantName: string, contradictions: ContradictionRecord[]): string {
  const lines = contradictions.map((c) => {
    return `- Your ${c.field} did not match across documents (${c.values
      .map((v) => `${v.source}: "${v.value}"`)
      .join(" vs. ")}). We used the value from your ${c.authoritativeSource} because ${c.rationale.toLowerCase()}`;
  });
  const docsToFix = contradictions.flatMap((c) => sourcesNeedingCorrection(c));
  return [
    `Hello ${applicantName}, we found ${contradictions.length} contradiction(s) across your documents:`,
    ...lines,
    ``,
    `We've auto-corrected your scheme application using the trusted values above so it can proceed. To avoid this happening again, please get the following updated at your local office: ${Array.from(
      new Set(docsToFix)
    ).join(", ") || "no further action needed"}.`,
  ].join("\n");
}

/** Only sources whose actual value differs from the resolved value need
 * correcting — a non-authoritative source that happens to already agree
 * with the resolved value (e.g. the application form, when only a
 * secondary document like the income certificate is stale) needs no fix. */
function sourcesNeedingCorrection(c: ContradictionRecord): string[] {
  return c.values
    .filter((v) => v.source !== c.authoritativeSource && String(v.value) !== String(c.resolvedValue))
    .map((v) => v.source);
}
