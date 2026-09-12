import { AnalysisLogEntry } from "../types";

export function LogHistory({ logs }: { logs: AnalysisLogEntry[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-3">
        Analysis History ({logs.length} run{logs.length > 1 ? "s" : ""})
      </h3>
      <div className="space-y-2">
        {logs.map((l) => (
          <div
            key={l._id}
            className="flex items-center justify-between text-sm border border-slate-100 rounded px-3 py-2"
          >
            <div>
              <span className="font-medium">Run #{l.runNumber}</span>{" "}
              <span className="text-slate-500">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {l.contradictions.length} flagged
              </span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {l.newContradictions.length} new
              </span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {l.repeatedButResolved.length} repeated
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
