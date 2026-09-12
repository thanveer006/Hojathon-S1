import { useRef, useState } from "react";
import { api } from "../api/client";
import { DOC_CATEGORY_OPTIONS, DocCategory, DynamicPipelineResult } from "../types";
import { Card, SectionHeading, Badge, AccentButton, GhostButton, ErrorBanner, InfoBanner } from "./ui";
import { PipelineTrace } from "./PipelineTrace";
import { ContradictionsPanel } from "./ContradictionsPanel";
import { ExplanationCard } from "./ExplanationCard";
import { DynamicDocumentsGrid } from "./DynamicDocumentsGrid";
import { CorrectedRecordCard } from "./CorrectedRecordCard";

interface PendingFile {
  id: string;
  file: File;
  category: DocCategory;
  label: string;
}

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function guessCategory(fileName: string): DocCategory {
  const n = fileName.toLowerCase();
  if (/(aadhaar|passport|voter|pan)/.test(n)) return "identity";
  if (/(income|salary|payslip)/.test(n)) return "income";
  if (/(ration|caste|category|bpl|apl)/.test(n)) return "eligibility";
  if (/(application|form)/.test(n)) return "application";
  return "other";
}

export function UploadAnalyzer() {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DynamicPipelineResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const rejected = files.filter((f) => !ACCEPTED.includes(f.type));
    if (rejected.length > 0) {
      setError(`Unsupported file type: ${rejected.map((f) => f.name).join(", ")}. Use PDF, JPEG, PNG, or WEBP.`);
    } else {
      setError(null);
    }
    const accepted = files.filter((f) => ACCEPTED.includes(f.type));
    setPending((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        category: guessCategory(file.name),
        label: file.name.replace(/\.[^.]+$/, ""),
      })),
    ]);
  }

  function updatePending(id: string, patch: Partial<PendingFile>) {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAnalyze() {
    if (pending.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.analyzeUpload(
        pending.map((p) => ({ file: p.file, category: p.category, label: p.label }))
      );
      setResult(res);
    } catch {
      setError("Analysis failed. Please check the files and try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <InfoBanner>
        Upload any documents relevant to this citizen — any file type, any number of them, no fixed
        template. Tag each one with what kind of proof it is so the resolution engine knows which
        document to trust for which field. Nothing here is saved: this is a one-shot check with no
        history.
      </InfoBanner>

      <Card
        className={`border-2 border-dashed transition-colors ${
          dragOver
            ? "border-setu-teal bg-teal-50/60 dark:bg-teal-500/5"
            : "border-slate-300 dark:border-slate-700"
        }`}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-3 py-10 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-setu-teal/10 text-setu-teal">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Drag & drop documents here, or{" "}
              <button
                onClick={() => inputRef.current?.click()}
                className="font-semibold text-setu-teal underline-offset-2 hover:underline"
              >
                browse files
              </button>
            </p>
            <p className="mt-1 text-xs text-slate-400">PDF, JPEG, PNG, or WEBP — any number of files</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {pending.length > 0 && (
        <Card padded={false} className="divide-y divide-slate-100 dark:divide-slate-800">
          {pending.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <input
                  value={p.label}
                  onChange={(e) => updatePending(p.id, { label: e.target.value })}
                  className="w-full truncate rounded-md border border-transparent bg-transparent px-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-setu-teal focus:outline-none dark:text-slate-100 dark:hover:border-slate-700"
                />
                <p className="truncate px-1 text-xs text-slate-400">{p.file.name}</p>
              </div>
              <select
                value={p.category}
                onChange={(e) => updatePending(p.id, { category: e.target.value as DocCategory })}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-setu-teal focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {DOC_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removePending(p.id)}
                className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                aria-label="Remove file"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="flex items-center gap-3">
        <AccentButton onClick={handleAnalyze} disabled={pending.length === 0 || analyzing}>
          {analyzing ? "Analyzing…" : `Analyze ${pending.length || ""} Document${pending.length === 1 ? "" : "s"}`}
        </AccentButton>
        {pending.length > 0 && (
          <GhostButton onClick={() => setPending([])} disabled={analyzing}>
            Clear all
          </GhostButton>
        )}
        {pending.length === 1 && <Badge tone="amber">At least 2 documents needed to detect contradictions</Badge>}
      </div>

      {result && (
        <div className="space-y-6">
          <section>
            <SectionHeading title="Extracted Documents" />
            <DynamicDocumentsGrid documents={result.documents} contradictions={result.contradictions} />
          </section>

          <section>
            <SectionHeading title="Pipeline Execution" />
            <PipelineTrace trace={result.pipelineTrace} />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <SectionHeading title="Contradictions & Resolution" />
              <ContradictionsPanel
                contradictions={result.contradictions}
                newContradictions={result.contradictions}
                repeatedButResolved={[]}
                hideMemoryBadges
              />
            </div>
            <div className="space-y-3">
              <SectionHeading title={result.hasApplicationDoc ? "Corrected Record" : "Resolved Master Record"} />
              <CorrectedRecordCard record={result.correctedRecord} correctionsApplied={result.correctionsApplied} />
            </div>
          </section>

          <section>
            <SectionHeading title="Plain-Language Report" />
            <ExplanationCard explanation={result.explanation} />
          </section>
        </div>
      )}
    </div>
  );
}
