import { ResolvedField } from "./resolve";
import { SchemeApplicationDoc } from "../models/Applicant";
import { isoDateToDisplay } from "./normalize";

export interface CorrectedApplication {
  applicantName: string;
  dob: string;
  address: string;
  declaredAnnualIncome: number;
  categoryClaimed: string;
  schemeAppliedFor: string;
  correctionsApplied: string[];
}

/**
 * "Act" stage: autonomously produce a corrected scheme application using the
 * resolved (authority-backed) values, rather than merely reporting problems.
 */
export function buildCorrectedApplication(
  original: SchemeApplicationDoc,
  resolvedFields: ResolvedField[]
): CorrectedApplication {
  const byField = Object.fromEntries(resolvedFields.map((f) => [f.field, f]));
  const correctionsApplied: string[] = [];

  const name = pick(byField.name, original.applicantName, "applicant name", correctionsApplied);
  const dob = pick(byField.dob, original.dob, "date of birth", correctionsApplied, true);
  const address = pick(byField.address, original.address, "address", correctionsApplied);
  const income = pick(
    byField.income,
    original.declaredAnnualIncome,
    "declared annual income",
    correctionsApplied
  );
  const category = pick(
    byField.category,
    original.categoryClaimed,
    "category claimed",
    correctionsApplied
  );

  return {
    applicantName: String(name),
    dob: String(dob),
    address: String(address),
    declaredAnnualIncome: Number(income),
    categoryClaimed: String(category),
    schemeAppliedFor: original.schemeAppliedFor,
    correctionsApplied,
  };
}

/**
 * A field is only reported as "corrected" if the scheme application's own
 * value actually differs from the resolved value. A contradiction can exist
 * among the OTHER sources (e.g. a stale income certificate address) while
 * the application itself already carries the correct value — in that case
 * there is nothing to change on the application, only on the stale document.
 */
function pick(
  resolved: ResolvedField | undefined,
  originalValue: string | number,
  label: string,
  log: string[],
  isDate = false
): string | number {
  if (!resolved) return originalValue;
  const resolvedDisplay = isDate ? isoDateToDisplay(String(resolved.resolvedValue)) : resolved.resolvedValue;
  const changed = resolved.isContradiction && String(originalValue) !== String(resolvedDisplay);
  if (changed) {
    log.push(
      `${label}: changed from "${originalValue}" to "${resolvedDisplay}" (source of truth: ${resolved.authoritativeSource})`
    );
  }
  return isDate ? String(resolvedDisplay) : resolved.resolvedValue;
}
