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
