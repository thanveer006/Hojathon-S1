import { Fragment } from "react";
import { Card } from "./ui";

const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  dob: "Date of Birth",
  address: "Address",
  income: "Income",
  category: "Category",
};

export function CorrectedRecordCard({
  record,
  correctionsApplied,
}: {
  record: Record<string, string | number>;
  correctionsApplied: string[];
}) {
  const keys = Object.keys(record);
  return (
    <Card>
      {keys.length === 0 ? (
        <p className="text-sm italic text-slate-400">
          No comparable fields were found across the uploaded documents.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          {keys.map((key) => (
            <Fragment key={key}>
              <dt className="text-slate-500 dark:text-slate-400">{FIELD_LABEL[key] ?? key}</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">
                {key === "income" ? `₹${Number(record[key]).toLocaleString("en-IN")}` : String(record[key])}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
      {correctionsApplied.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Corrections applied
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            {correctionsApplied.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
