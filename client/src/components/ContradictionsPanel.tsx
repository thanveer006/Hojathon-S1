import { ContradictionRecord } from "../types";

export function ContradictionsPanel({
  contradictions,
  newContradictions,
  repeatedButResolved,
}: {
  contradictions: ContradictionRecord[];
  newContradictions: ContradictionRecord[];
  repeatedButResolved: ContradictionRecord[];
}) {
  const newHashes = new Set(newContradictions.map((c) => c.fieldHash));

  if (contradictions.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
        ✅ No contradictions found — all documents agree.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-3">
        Flagged Contradictions ({contradictions.length})
      </h3>
      {repeatedButResolved.length > 0 && (
        <div className="mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2">
          🧠 {repeatedButResolved.length} of these were already seen and resolved in a prior run —
          not re-flagged as new.
        </div>
      )}
      <div className="space-y-3">
        {contradictions.map((c) => (
          <div key={c.fieldHash} className="border border-rose-200 rounded-md p-3 bg-rose-50/50">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize text-rose-800">{c.field}</span>
              {newHashes.has(c.fieldHash) ? (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  new
                </span>
              ) : (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  previously seen
                </span>
              )}
            </div>
            <ul className="mt-1 text-sm text-slate-600 space-y-0.5">
              {c.values.map((v, i) => (
                <li key={i}>
                  <span className="text-slate-400">{v.source}:</span>{" "}
                  <span
                    className={
                      v.source === c.authoritativeSource
                        ? "font-semibold text-emerald-700"
                        : "line-through decoration-rose-400"
                    }
                  >
                    {String(v.value)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Resolved to:</span>{" "}
              <span className="text-emerald-700 font-semibold">{String(c.resolvedValue)}</span>{" "}
              <span className="text-slate-400">
                (source of truth: {c.authoritativeSource})
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 italic">{c.rationale}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
