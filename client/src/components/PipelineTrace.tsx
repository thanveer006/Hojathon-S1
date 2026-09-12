import { PipelineTraceEntry } from "../types";

const STAGE_ICONS: Record<string, string> = {
  Ingest: "📥",
  Extract: "🔎",
  Compare: "⚖️",
  Resolve: "🧭",
  Act: "🛠️",
  Log: "🧠",
  Explain: "💬",
};

export function PipelineTrace({ trace }: { trace: PipelineTraceEntry[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-3">Agent Pipeline Trace</h3>
      <ol className="space-y-3">
        {trace.map((t, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-setu-teal/10 text-setu-teal flex items-center justify-center text-sm">
                {STAGE_ICONS[t.stage] ?? "•"}
              </div>
              {i < trace.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="pb-2">
              <div className="text-sm font-semibold text-slate-800">{t.stage}</div>
              <div className="text-sm text-slate-600">{t.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
