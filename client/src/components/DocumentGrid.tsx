import { ApplicantDocuments, ContradictionRecord } from "../types";

const FIELD_TO_DOC_KEYS: Record<string, Record<string, string[]>> = {
  name: {
    aadhaar: ["fullName"],
    rationCard: ["familyMembers"],
    incomeCertificate: ["applicantName"],
    schemeApplication: ["applicantName"],
  },
  dob: {
    aadhaar: ["dob"],
    schemeApplication: ["dob"],
  },
  address: {
    aadhaar: ["address"],
    rationCard: ["address"],
    incomeCertificate: ["address"],
    schemeApplication: ["address"],
  },
  income: {
    incomeCertificate: ["annualFamilyIncome"],
    schemeApplication: ["declaredAnnualIncome"],
  },
  category: {
    rationCard: ["cardType"],
    schemeApplication: ["categoryClaimed"],
  },
};

const DOC_KEY_TO_SOURCE_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  rationCard: "Ration Card",
  incomeCertificate: "Income Certificate",
  schemeApplication: "Scheme Application Form",
};

/** Only flags a document if ITS value actually differs from the resolved
 * value — a document that happens to already agree (e.g. the application
 * form, when only the income certificate is stale) shouldn't get a warning
 * icon just because the field had a contradiction somewhere else. */
function flaggedKeysFor(docKey: string, contradictions: ContradictionRecord[]): Set<string> {
  const keys = new Set<string>();
  const sourceLabel = DOC_KEY_TO_SOURCE_LABEL[docKey];
  for (const c of contradictions) {
    const map = FIELD_TO_DOC_KEYS[c.field];
    if (!map?.[docKey]) continue;
    const entry = c.values.find((v) => v.source === sourceLabel);
    if (entry && String(entry.value) !== String(c.resolvedValue)) {
      map[docKey].forEach((k) => keys.add(k));
    }
  }
  return keys;
}

function Row({ label, value, flagged }: { label: string; value: string; flagged: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 py-1.5 px-2 rounded text-sm ${
        flagged ? "bg-rose-50 border border-rose-200" : ""
      }`}
    >
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-medium ${flagged ? "text-rose-700" : "text-slate-800"}`}>
        {value}
        {flagged && <span className="ml-1 text-rose-400">⚠</span>}
      </span>
    </div>
  );
}

export function DocumentGrid({
  data,
  contradictions,
}: {
  data: ApplicantDocuments;
  contradictions: ContradictionRecord[];
}) {
  const { aadhaar, rationCard, incomeCertificate, schemeApplication } = data.documents;
  const aFlags = flaggedKeysFor("aadhaar", contradictions);
  const rFlags = flaggedKeysFor("rationCard", contradictions);
  const iFlags = flaggedKeysFor("incomeCertificate", contradictions);
  const sFlags = flaggedKeysFor("schemeApplication", contradictions);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-setu-teal mb-2">Aadhaar Card</h3>
        <Row label="Name" value={aadhaar.fullName} flagged={aFlags.has("fullName")} />
        <Row label="DOB" value={aadhaar.dob} flagged={aFlags.has("dob")} />
        <Row label="Gender" value={aadhaar.gender} flagged={false} />
        <Row label="Aadhaar No." value={aadhaar.aadhaarNumber} flagged={false} />
        <Row label="Address" value={aadhaar.address} flagged={aFlags.has("address")} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-setu-teal mb-2">Ration Card</h3>
        <Row label="Head of Household" value={rationCard.headOfHouseholdName} flagged={false} />
        <Row
          label="Family Members"
          value={rationCard.familyMembers.join(", ")}
          flagged={rFlags.has("familyMembers")}
        />
        <Row label="Card No." value={rationCard.rationCardNumber} flagged={false} />
        <Row label="Card Type" value={rationCard.cardType} flagged={rFlags.has("cardType")} />
        <Row label="Address" value={rationCard.address} flagged={rFlags.has("address")} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-setu-teal mb-2">Income Certificate</h3>
        <Row label="Name" value={incomeCertificate.applicantName} flagged={iFlags.has("applicantName")} />
        <Row
          label="Annual Income"
          value={`₹${incomeCertificate.annualFamilyIncome.toLocaleString("en-IN")}`}
          flagged={iFlags.has("annualFamilyIncome")}
        />
        <Row label="Issuing Authority" value={incomeCertificate.issuingAuthority} flagged={false} />
        <Row label="Date of Issue" value={incomeCertificate.dateOfIssue} flagged={false} />
        <Row label="Address" value={incomeCertificate.address} flagged={iFlags.has("address")} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-setu-teal mb-2">Scheme Application</h3>
        <Row label="Name" value={schemeApplication.applicantName} flagged={sFlags.has("applicantName")} />
        <Row label="DOB" value={schemeApplication.dob} flagged={sFlags.has("dob")} />
        <Row
          label="Declared Income"
          value={`₹${schemeApplication.declaredAnnualIncome.toLocaleString("en-IN")}`}
          flagged={sFlags.has("declaredAnnualIncome")}
        />
        <Row
          label="Category Claimed"
          value={schemeApplication.categoryClaimed}
          flagged={sFlags.has("categoryClaimed")}
        />
        <Row label="Address" value={schemeApplication.address} flagged={sFlags.has("address")} />
        <Row label="Scheme" value={schemeApplication.schemeAppliedFor} flagged={false} />
      </div>
    </div>
  );
}
