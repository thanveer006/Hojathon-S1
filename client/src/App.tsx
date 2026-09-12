import { useEffect, useState } from "react";
import { api } from "./api/client";
import {
  AnalysisLogEntry,
  ApplicantDocuments,
  ApplicantSummary,
  PipelineResult,
} from "./types";
import { ApplicantSelector } from "./components/ApplicantSelector";
import { DocumentGrid } from "./components/DocumentGrid";
import { PipelineTrace } from "./components/PipelineTrace";
import { ContradictionsPanel } from "./components/ContradictionsPanel";
import { CorrectedApplicationCard } from "./components/CorrectedApplicationCard";
import { ExplanationCard } from "./components/ExplanationCard";
import { LogHistory } from "./components/LogHistory";
import { UploadAnalyzer } from "./components/UploadAnalyzer";
import { AccentButton, ErrorBanner, SectionHeading } from "./components/ui";

const FRIENDLY_ERROR = "Something went wrong talking to the server. Please try again.";

type Mode = "seeded" | "upload";

function ModeTab({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-setu-teal bg-teal-50 dark:bg-teal-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-setu-teal text-white"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {icon}
      </div>
      <div>
        <div
          className={`text-sm font-semibold ${
            active ? "text-setu-teal" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {label}
        </div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("seeded");
  const [applicants, setApplicants] = useState<ApplicantSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docs, setDocs] = useState<ApplicantDocuments | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [logs, setLogs] = useState<AnalysisLogEntry[]>([]);
  const [loadingApplicant, setLoadingApplicant] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listApplicants().then(setApplicants).catch(() => setError(FRIENDLY_ERROR));
  }, []);

  // Guards against out-of-order responses: if the applicant selection
  // changes again before this run's requests resolve, its results are
  // discarded instead of overwriting the now-current applicant's data.
  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    setDocs(null);
    setResult(null);
    setError(null);
    setLoadingApplicant(true);

    Promise.allSettled([api.getDocuments(selectedId), api.getLog(selectedId)]).then(
      ([docsResult, logsResult]) => {
        if (stale) return;
        if (docsResult.status === "fulfilled") setDocs(docsResult.value);
        else setError(FRIENDLY_ERROR);
        setLogs(logsResult.status === "fulfilled" ? logsResult.value : []);
        setLoadingApplicant(false);
      }
    );

    return () => {
      stale = true;
    };
  }, [selectedId]);

  async function handleAnalyze() {
    if (!selectedId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyze(selectedId);
      setResult(res);
      const freshLogs = await api.getLog(selectedId);
      setLogs(freshLogs);
    } catch {
      setError(FRIENDLY_ERROR);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-teal-900/10 bg-gradient-to-r from-setu-teal to-teal-700 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-md bg-white/95 p-1 shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SETU</h1>
            <p className="mt-1 max-w-2xl text-sm text-teal-100">
              Scheme Eligibility Contradiction Agent — detects document conflicts, resolves them
              using administrative authority rules, and auto-corrects scheme applications.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeTab
            active={mode === "seeded"}
            onClick={() => setMode("seeded")}
            label="Demo Applicants"
            sub="4 curated scenarios, with memory across runs"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <ModeTab
            active={mode === "upload"}
            onClick={() => setMode("upload")}
            label="Upload Documents"
            sub="Any document, any type — one-shot analysis"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            }
          />
        </div>

        {mode === "upload" && <UploadAnalyzer />}

        {mode === "seeded" && (
          <div className="animate-fade-in space-y-6">
            <section>
              <SectionHeading step={1} title="Select an Applicant" />
              <ApplicantSelector applicants={applicants} selectedId={selectedId} onSelect={setSelectedId} />
            </section>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            {loadingApplicant && (
              <div className="animate-pulse text-sm text-slate-500 dark:text-slate-400">
                Loading applicant records…
              </div>
            )}

            {docs && (
              <section>
                <SectionHeading
                  step={2}
                  title="Source Documents"
                  action={
                    <AccentButton onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? "Analyzing…" : "Analyze"}
                    </AccentButton>
                  }
                />
                <DocumentGrid data={docs} contradictions={result?.contradictions ?? []} />
              </section>
            )}

            {result && (
              <>
                <section>
                  <SectionHeading step={3} title="Pipeline Execution" />
                  <PipelineTrace trace={result.pipelineTrace} />
                </section>

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <SectionHeading step={4} title="Contradictions & Resolution" />
                    <ContradictionsPanel
                      contradictions={result.contradictions}
                      newContradictions={result.newContradictions}
                      repeatedButResolved={result.repeatedButResolved}
                    />
                  </div>
                  <div className="space-y-3">
                    <SectionHeading step={5} title="Corrected Application" />
                    <CorrectedApplicationCard app={result.correctedApplication} />
                  </div>
                </section>

                <section>
                  <SectionHeading step={6} title="Plain-Language Report" />
                  <ExplanationCard explanation={result.explanation} />
                </section>
              </>
            )}

            {logs.length > 0 && (
              <section>
                <SectionHeading step={7} title="Memory — Analysis History" />
                <LogHistory logs={logs} />
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-slate-500 dark:text-slate-500">
        Built for Hojathon 2026. Documents shown are synthetic — modeled on real, documented causes
        of Kerala scheme-application rejection. No real PII is used.
      </footer>
    </div>
  );
}
