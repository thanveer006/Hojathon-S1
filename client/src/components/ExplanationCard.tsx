export function ExplanationCard({ explanation }: { explanation: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-amber-900 mb-2">Citizen Report</h3>
      <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">{explanation}</p>
    </div>
  );
}
