import { ApplicantSummary } from "../types";

export function ApplicantSelector({
  applicants,
  selectedId,
  onSelect,
}: {
  applicants: ApplicantSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {applicants.map((a) => (
        <button
          key={a.applicantId}
          onClick={() => onSelect(a.applicantId)}
          className={`rounded-2xl border p-4 text-left shadow-card transition hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-setu-teal focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
            selectedId === a.applicantId
              ? "border-setu-teal bg-teal-50 ring-2 ring-setu-teal dark:bg-teal-500/10"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="font-mono text-xs text-slate-400">{a.applicantId}</div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{a.displayName}</div>
          <div className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
            {a.scenario}
          </div>
        </button>
      ))}
    </div>
  );
}
