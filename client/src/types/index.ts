export interface ApplicantSummary {
  applicantId: string;
  displayName: string;
  scenario: string;
}

export interface AadhaarDoc {
  type: "aadhaar";
  fullName: string;
  dob: string;
  gender: string;
  aadhaarNumber: string;
  address: string;
}

export interface RationCardDoc {
  type: "rationCard";
  headOfHouseholdName: string;
  familyMembers: string[];
  address: string;
  rationCardNumber: string;
  cardType: "APL" | "BPL" | "AAY";
}

export interface IncomeCertificateDoc {
  type: "incomeCertificate";
  applicantName: string;
  annualFamilyIncome: number;
  issuingAuthority: string;
  dateOfIssue: string;
  validityPeriod: string;
  address: string;
}

export interface SchemeApplicationDoc {
  type: "schemeApplication";
  applicantName: string;
  dob: string;
  address: string;
  declaredAnnualIncome: number;
  categoryClaimed: string;
  schemeAppliedFor: string;
}

export interface ApplicantDocuments {
  applicantId: string;
  displayName: string;
  scenario: string;
  documents: {
    aadhaar: AadhaarDoc;
    rationCard: RationCardDoc;
    incomeCertificate: IncomeCertificateDoc;
    schemeApplication: SchemeApplicationDoc;
  };
}

export interface ContradictionRecord {
  field: string;
  values: { source: string; value: string | number }[];
  authoritativeSource: string;
  resolvedValue: string | number;
  rationale: string;
  fieldHash: string;
}

export interface CorrectedApplication {
  applicantName: string;
  dob: string;
  address: string;
  declaredAnnualIncome: number;
  categoryClaimed: string;
  schemeAppliedFor: string;
  correctionsApplied: string[];
}

export interface PipelineTraceEntry {
  stage: string;
  detail: string;
  timestamp: string;
}

export interface PipelineResult {
  runNumber: number;
  contradictions: ContradictionRecord[];
  newContradictions: ContradictionRecord[];
  repeatedButResolved: ContradictionRecord[];
  correctedApplication: CorrectedApplication;
  explanation: string;
  pipelineTrace: PipelineTraceEntry[];
}

export interface AnalysisLogEntry extends PipelineResult {
  _id: string;
  applicantId: string;
  createdAt: string;
}

// --- Arbitrary document upload flow ---

export type DocCategory = "identity" | "income" | "eligibility" | "application" | "other";

export const DOC_CATEGORY_OPTIONS: { value: DocCategory; label: string; hint: string }[] = [
  { value: "identity", label: "Identity Document", hint: "e.g. Aadhaar, passport, voter ID" },
  { value: "income", label: "Income Proof", hint: "e.g. income certificate, salary slip" },
  { value: "eligibility", label: "Eligibility / Category Proof", hint: "e.g. ration card, caste certificate" },
  { value: "application", label: "Application Form", hint: "the form being checked/corrected" },
  { value: "other", label: "Other", hint: "anything else relevant" },
];

export type ComparableField = "name" | "dob" | "address" | "income" | "category";

export interface DynamicDocumentResult {
  label: string;
  fileName: string;
  category: DocCategory;
  fields: Partial<Record<ComparableField, string | number>>;
  otherFields: Record<string, string>;
  rawTextPreview: string;
}

export interface DynamicFieldComparison {
  field: ComparableField;
  values: { source: string; value: string | number }[];
  isContradiction: boolean;
}

export interface DynamicPipelineResult {
  documents: DynamicDocumentResult[];
  fieldsCompared: DynamicFieldComparison[];
  contradictions: ContradictionRecord[];
  correctedRecord: Record<string, string | number>;
  correctionsApplied: string[];
  hasApplicationDoc: boolean;
  explanation: string;
  pipelineTrace: PipelineTraceEntry[];
}
