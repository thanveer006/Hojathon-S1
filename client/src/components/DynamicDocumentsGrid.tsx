import { ContradictionRecord, DOC_CATEGORY_OPTIONS, DynamicDocumentResult } from "../types";
import { Card, Badge } from "./ui";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  DOC_CATEGORY_OPTIONS.map((o) => [o.value, o.label])
);

const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  dob: "Date of Birth",
  address: "Address",
  income: "Income",
  category: "Category",
};

export function DynamicDocumentsGrid({
  documents,
  contradictions,
}: {
  documents: DynamicDocumentResult[];
  contradictions: ContradictionRecord[];
}) {
  function isFlagged(docLabel: string, field: string) {
    const c = contradictions.find((c) => c.field === field);
    if (!c) return false;
    const entry = c.values.find((v) => v.source === docLabel);
    return Boolean(entry && String(entry.value) !== String(c.resolvedValue));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {documents.map((doc) => (
        <Card key={doc.fileName + doc.label}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-setu-teal">{doc.label}</h3>
            <Badge tone="teal">{CATEGORY_LABEL[doc.category] ?? doc.category}</Badge>
          </div>
          <p className="mb-3 truncate text-xs text-slate-400">{doc.fileName}</p>

          {Object.keys(doc.fields).length === 0 && Object.keys(doc.otherFields).length === 0 ? (
            <p className="text-sm italic text-slate-400">
              No text could be read from this file — it may be a scanned image with no clear layout.
            </p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {(Object.keys(doc.fields) as (keyof typeof doc.fields)[]).map((key) => {
                const flagged = isFlagged(doc.label, key);
                return (
                  <div
                    key={key}
                    className={`flex justify-between gap-3 rounded px-1.5 py-1 ${
                      flagged ? "bg-rose-50 dark:bg-rose-500/10" : ""
                    }`}
                  >
                    <dt className="text-slate-500 dark:text-slate-400">{FIELD_LABEL[key] ?? key}</dt>
                    <dd
                      className={`text-right font-medium ${
                        flagged ? "text-rose-700 dark:text-rose-300" : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {key === "income" ? `₹${Number(doc.fields[key]).toLocaleString("en-IN")}` : String(doc.fields[key])}
                      {flagged && <span className="ml-1 text-rose-400">⚠</span>}
                    </dd>
                  </div>
                );
              })}
              {Object.entries(doc.otherFields).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-1.5 py-1 opacity-70">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="text-right text-slate-500">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      ))}
    </div>
  );
}
