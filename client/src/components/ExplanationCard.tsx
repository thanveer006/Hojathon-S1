export function ExplanationCard({ explanation }: { explanation: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-card dark:border-amber-500/25 dark:bg-amber-500/10">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v10H9l-5 4V5z" />
        </svg>
        Citizen Report
      </h3>
      <p className="whitespace-pre-line text-sm leading-relaxed text-amber-900 dark:text-amber-100/90">
        {explanation}
      </p>
    </div>
  );
}
