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

const FRIENDLY_ERROR = "Something went wrong talking to the server. Please try again.";

export default function App() {
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
      <header className="bg-gradient-to-r from-setu-teal to-teal-700 text-white border-b border-teal-900/20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-md bg-white/95 p-1 shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SETU</h1>
            <p className="text-teal-100 text-sm mt-1 max-w-2xl">
              Scheme Eligibility Contradiction Agent — detects document conflicts, resolves them
              using administrative authority rules, and auto-corrects scheme applications.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            1. Select an Applicant
          </h2>
          <ApplicantSelector
            applicants={applicants}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {loadingApplicant && (
          <div className="text-sm text-slate-500 animate-pulse">Loading applicant records…</div>
        )}

        {docs && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                2. Source Documents
              </h2>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-setu-amber hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg shadow-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-setu-teal focus-visible:ring-offset-2"
              >
                {analyzing ? "Analyzing…" : "Analyze"}
              </button>
            </div>
            <DocumentGrid data={docs} contradictions={result?.contradictions ?? []} />
          </section>
        )}

        {result && (
          <>
            <section>
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                3. Pipeline Execution
              </h2>
              <PipelineTrace trace={result.pipelineTrace} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  4. Contradictions & Resolution
                </h2>
                <ContradictionsPanel
                  contradictions={result.contradictions}
                  newContradictions={result.newContradictions}
                  repeatedButResolved={result.repeatedButResolved}
                />
              </div>
              <div className="space-y-6">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  5. Corrected Application
                </h2>
                <CorrectedApplicationCard app={result.correctedApplication} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                6. Plain-Language Report
              </h2>
              <ExplanationCard explanation={result.explanation} />
            </section>
          </>
        )}

        {logs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
              7. Memory — Analysis History
            </h2>
            <LogHistory logs={logs} />
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-slate-500">
        Built for Hojathon 2026. Documents shown are synthetic — modeled on real, documented
        causes of Kerala scheme-application rejection. No real PII is used.
      </footer>
    </div>
  );
}
