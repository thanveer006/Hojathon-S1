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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {applicants.map((a) => (
        <button
          key={a.applicantId}
          onClick={() => onSelect(a.applicantId)}
          className={`text-left rounded-lg border p-4 transition shadow-sm hover:shadow-md ${
            selectedId === a.applicantId
              ? "border-setu-teal bg-teal-50 ring-2 ring-setu-teal"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="text-xs font-mono text-slate-400">{a.applicantId}</div>
          <div className="font-semibold text-slate-800">{a.displayName}</div>
          <div className="text-sm text-slate-500 mt-1 line-clamp-2">{a.scenario}</div>
        </button>
      ))}
    </div>
  );
}
