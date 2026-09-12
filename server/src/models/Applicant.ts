import { Schema, model, Document } from "mongoose";

export interface AadhaarDoc {
  type: "aadhaar";
  fullName: string;
  dob: string; // DD/MM/YYYY
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
  categoryClaimed: "APL" | "BPL" | "AAY";
  schemeAppliedFor: string;
}

export interface ApplicantAttrs {
  applicantId: string;
  displayName: string;
  scenario: string; // short description of what's wrong, for demo narration
  documents: {
    aadhaar: AadhaarDoc;
    rationCard: RationCardDoc;
    incomeCertificate: IncomeCertificateDoc;
    schemeApplication: SchemeApplicationDoc;
  };
}

export interface ApplicantDocument extends ApplicantAttrs, Document {}

const ApplicantSchema = new Schema<ApplicantDocument>(
  {
    applicantId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    scenario: { type: String, required: true },
    documents: {
      aadhaar: { type: Schema.Types.Mixed, required: true },
      rationCard: { type: Schema.Types.Mixed, required: true },
      incomeCertificate: { type: Schema.Types.Mixed, required: true },
      schemeApplication: { type: Schema.Types.Mixed, required: true },
    },
  },
  { timestamps: true }
);

export const Applicant = model<ApplicantDocument>("Applicant", ApplicantSchema);
