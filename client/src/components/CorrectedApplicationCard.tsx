import { CorrectedApplication } from "../types";

export function CorrectedApplicationCard({ app }: { app: CorrectedApplication }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-3">Corrected Application</h3>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500">Name</dt>
        <dd className="font-medium">{app.applicantName}</dd>
        <dt className="text-slate-500">DOB</dt>
        <dd className="font-medium">{app.dob}</dd>
        <dt className="text-slate-500">Address</dt>
        <dd className="font-medium">{app.address}</dd>
        <dt className="text-slate-500">Declared Income</dt>
        <dd className="font-medium">₹{app.declaredAnnualIncome.toLocaleString("en-IN")}</dd>
        <dt className="text-slate-500">Category</dt>
        <dd className="font-medium">{app.categoryClaimed}</dd>
        <dt className="text-slate-500">Scheme</dt>
        <dd className="font-medium">{app.schemeAppliedFor}</dd>
      </dl>
      {app.correctionsApplied.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 mb-1">Corrections applied</div>
          <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
            {app.correctionsApplied.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
