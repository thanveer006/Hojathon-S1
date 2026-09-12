import { SourceKey } from "./normalize";

export type ComparableField = "name" | "dob" | "address" | "income" | "category";

/**
 * Authority Resolution Table — the explicit, inspectable decision logic
 * for which document source wins when fields disagree. This is deliberately
 * NOT an LLM decision: it is deterministic and auditable, per real
 * administrative convention used in Kerala scheme verification.
 */
export interface AuthorityRule {
  field: ComparableField;
  authoritativeSource: SourceKey;
  rationale: string;
}

export const AUTHORITY_RULES: Record<ComparableField, AuthorityRule> = {
  name: {
    field: "name",
    authoritativeSource: "aadhaar",
    rationale:
      "Aadhaar is treated as the anchor identity document across Kerala scheme verifications — all other records are expected to match it.",
  },
  dob: {
    field: "dob",
    authoritativeSource: "aadhaar",
    rationale:
      "Date of birth on Aadhaar is the UIDAI-verified value and takes precedence over self-declared or secondary records.",
  },
  address: {
    field: "address",
    authoritativeSource: "aadhaar",
    rationale:
      "Aadhaar address is most likely to be current since it can be self-updated; ration cards and income certificates are revised far less frequently and often lag behind a household's actual address.",
  },
  income: {
    field: "income",
    authoritativeSource: "incomeCertificate",
    rationale:
      "The income certificate is issued by a Village Officer/Tahsildar as legal proof of income; a self-declared figure on the application form carries no verification weight.",
  },
  category: {
    field: "category",
    authoritativeSource: "rationCard",
    rationale:
      "The ration card is the official APL/BPL/AAY categorization record maintained by the Civil Supplies Department; category claims on an application form are unverified until checked against it.",
  },
};

/**
 * Given a field name and a set of candidate {source, value} pairs, returns
 * the resolved value based on the authority table above. This function is
 * the single place "decision" logic lives — inspect it during the demo.
 */
export function resolveField(
  field: ComparableField,
  candidates: { source: SourceKey; value: string | number }[]
): { resolvedValue: string | number; authoritativeSource: SourceKey; rationale: string } {
  const rule = AUTHORITY_RULES[field];
  const winner = candidates.find((c) => c.source === rule.authoritativeSource);
  if (!winner) {
    // Authoritative source didn't carry this field for some reason — fall
    // back to the first available candidate rather than failing silently.
    const fallback = candidates[0];
    return {
      resolvedValue: fallback.value,
      authoritativeSource: fallback.source,
      rationale: `Authoritative source (${rule.authoritativeSource}) did not provide this field; used ${fallback.source} as fallback.`,
    };
  }
  return {
    resolvedValue: winner.value,
    authoritativeSource: rule.authoritativeSource,
    rationale: rule.rationale,
  };
}
