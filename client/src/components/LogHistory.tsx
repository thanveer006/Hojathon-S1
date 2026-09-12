import { AnalysisLogEntry } from "../types";
import { Card, Badge } from "./ui";

export function LogHistory({ logs }: { logs: AnalysisLogEntry[] }) {
  if (logs.length === 0) return null;
  return (
    <Card>
      <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">
        Analysis History ({logs.length} run{logs.length > 1 ? "s" : ""})
      </h3>
      <div className="space-y-2">
        {logs.map((l) => (
          <div
            key={l._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
          >
            <div>
              <span className="font-medium text-slate-800 dark:text-slate-100">Run #{l.runNumber}</span>{" "}
              <span className="text-slate-500 dark:text-slate-400">
                {new Date(l.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Badge tone="rose">{l.contradictions.length} flagged</Badge>
              <Badge tone="amber">{l.newContradictions.length} new</Badge>
              <Badge tone="neutral">{l.repeatedButResolved.length} repeated</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
