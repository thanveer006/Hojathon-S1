import { PipelineTraceEntry } from "../types";

/** Inline stroke icons (no icon-library dependency) so the pipeline stages
 * render identically across operating systems — emoji do not. */
const STAGE_PATHS: Record<string, string> = {
  Ingest: "M12 3v10m0 0l-4-4m4 4l4-4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3",
  Extract: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4.2-4.2",
  Compare: "M12 4v16M7 8l-3 7h6zM17 8l-3 7h6zM5 8h14",
  Resolve: "M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 12.5l2.5 2.5 4.5-5",
  Act: "M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3z",
  Log: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6",
  Explain: "M4 5h16v10H9l-5 4V5z",
};

function StageIcon({ stage }: { stage: string }) {
  const path = STAGE_PATHS[stage];
  if (!path) return <span aria-hidden="true">•</span>;
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function PipelineTrace({ trace }: { trace: PipelineTraceEntry[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-3">Agent Pipeline Trace</h3>
      <ol className="space-y-3">
        {trace.map((t, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-setu-teal/10 text-setu-teal flex items-center justify-center shrink-0">
                <StageIcon stage={t.stage} />
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
