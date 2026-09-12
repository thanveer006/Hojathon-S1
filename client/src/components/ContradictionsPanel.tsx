import { ContradictionRecord } from "../types";
import { Card, Badge } from "./ui";

export function ContradictionsPanel({
  contradictions,
  newContradictions,
  repeatedButResolved,
  hideMemoryBadges = false,
}: {
  contradictions: ContradictionRecord[];
  newContradictions: ContradictionRecord[];
  repeatedButResolved: ContradictionRecord[];
  hideMemoryBadges?: boolean;
}) {
  const newHashes = new Set(newContradictions.map((c) => c.fieldHash));

  if (contradictions.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <span className="text-sm font-medium">✅ No contradictions found — all documents agree.</span>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">
        Flagged Contradictions ({contradictions.length})
      </h3>
      {!hideMemoryBadges && repeatedButResolved.length > 0 && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
          🧠 {repeatedButResolved.length} of these were already seen and resolved in a prior run — not
          re-flagged as new.
        </div>
      )}
      <div className="space-y-3">
        {contradictions.map((c) => (
          <div
            key={c.fieldHash}
            className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-500/25 dark:bg-rose-500/[0.06]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize text-rose-800 dark:text-rose-300">{c.field}</span>
              {!hideMemoryBadges &&
                (newHashes.has(c.fieldHash) ? (
                  <Badge tone="amber">new</Badge>
                ) : (
                  <Badge tone="neutral">previously seen</Badge>
                ))}
            </div>
            <ul className="mt-1.5 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
              {c.values.map((v, i) => (
                <li key={i}>
                  <span className="text-slate-400">{v.source}:</span>{" "}
                  <span
                    className={
                      v.source === c.authoritativeSource
                        ? "font-semibold text-emerald-700 dark:text-emerald-400"
                        : "line-through decoration-rose-400"
                    }
                  >
                    {String(v.value)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="font-medium">Resolved to:</span>{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {String(c.resolvedValue)}
              </span>{" "}
              <span className="text-slate-400">(source of truth: {c.authoritativeSource})</span>
            </div>
            <div className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{c.rationale}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
