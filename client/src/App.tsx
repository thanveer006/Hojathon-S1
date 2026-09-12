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

export default function App() {
  const [applicants, setApplicants] = useState<ApplicantSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docs, setDocs] = useState<ApplicantDocuments | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [logs, setLogs] = useState<AnalysisLogEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listApplicants().then(setApplicants).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDocs(null);
    setResult(null);
    setError(null);
    api.getDocuments(selectedId).then(setDocs).catch((e) => setError(String(e)));
    api.getLog(selectedId).then(setLogs).catch(() => setLogs([]));
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
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-setu-teal text-white">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold">SETU</h1>
          <p className="text-teal-100 text-sm mt-1">
            Scheme Eligibility Contradiction Agent — detects document conflicts, resolves them
            using administrative authority rules, and auto-corrects scheme applications.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
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

        {docs && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                2. Source Documents
              </h2>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-setu-amber hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg shadow-sm text-sm"
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                3. Pipeline Execution
              </h2>
              <PipelineTrace trace={result.pipelineTrace} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  4. Contradictions & Resolution
                </h2>
                <ContradictionsPanel
                  contradictions={result.contradictions}
                  newContradictions={result.newContradictions}
                  repeatedButResolved={result.repeatedButResolved}
                />
              </div>
              <div className="space-y-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  5. Corrected Application
                </h2>
                <CorrectedApplicationCard app={result.correctedApplication} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                6. Plain-Language Report
              </h2>
              <ExplanationCard explanation={result.explanation} />
            </section>
          </>
        )}

        {logs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              7. Memory — Analysis History
            </h2>
            <LogHistory logs={logs} />
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-slate-400">
        Built for Hojathon 2026. Documents shown are synthetic — modeled on real, documented
        causes of Kerala scheme-application rejection. No real PII is used.
      </footer>
    </div>
  );
}
