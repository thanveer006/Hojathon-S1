import { CorrectedApplication } from "../types";
import { Card } from "./ui";

export function CorrectedApplicationCard({ app }: { app: CorrectedApplication }) {
  return (
    <Card>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500 dark:text-slate-400">Name</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">{app.applicantName}</dd>
        <dt className="text-slate-500 dark:text-slate-400">DOB</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">{app.dob}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Address</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">{app.address}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Declared Income</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">
          ₹{app.declaredAnnualIncome.toLocaleString("en-IN")}
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Category</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">{app.categoryClaimed}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Scheme</dt>
        <dd className="font-medium text-slate-800 dark:text-slate-100">{app.schemeAppliedFor}</dd>
      </dl>
      {app.correctionsApplied.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Corrections applied
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            {app.correctionsApplied.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
