import { createWorker } from "tesseract.js";

/**
 * Best-effort OCR + text extraction for ad-hoc document uploads.
 *
 * Strategy: try to read an embedded text layer first (fast, exact — works
 * for "digitally generated" PDFs), and only fall back to Tesseract OCR for
 * images (jpg/png/webp). This is a hackathon-appropriate shortcut, not a
 * production document pipeline: we do NOT render PDF pages to images for
 * OCR (tesseract.js cannot read raw PDF bytes as an image), so a scanned,
 * text-less PDF will come back with empty text and every field left for
 * manual entry rather than crashing.
 */
export async function extractTextFromUpload(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    try {
      // pdf-parse v2's API is class-based (PDFParse.getText()); no @types
      // package exists for it, so require() avoids a build-time type dependency.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return (result.text || "").trim();
    } catch (err) {
      console.warn("[ocr] pdf-parse failed:", err);
      return "";
    }
  }

  if (mimeType.startsWith("image/")) {
    try {
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await worker.terminate();
      return text || "";
    } catch (err) {
      console.warn("[ocr] tesseract OCR failed:", err);
      return "";
    }
  }

  return "";
}

export interface FieldExtractionResult {
  fields: Record<string, string>;
  /** Field names we could not confidently extract — left empty for manual entry. */
  unresolvedFields: string[];
  rawText: string;
}

const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/;
const AADHAAR_NUM_RE = /(\d{4}\s?\d{4}\s?\d{4})/;
const INCOME_RE = /(?:rs\.?|inr|₹)\s?([\d,]{4,})/i;
const RATION_NUM_RE = /(?:ration\s*card\s*(?:no|number)\.?[:\s]*)([A-Z0-9\/-]{4,})/i;

function toDdMmYyyy(raw: string): string {
  return raw.replace(/[-.]/g, "/");
}

function findLineAfterLabel(text: string, labels: string[]): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*[:\\-]?\\s*(.+)`, "i");
      const match = line.match(re);
      if (match && match[1].trim().length > 1) return match[1].trim();
    }
  }
  return undefined;
}

function guessName(text: string): string | undefined {
  return findLineAfterLabel(text, ["name", "applicant name", "full name", "head of household"]);
}

function guessAddress(text: string): string | undefined {
  const found = findLineAfterLabel(text, ["address"]);
  if (found) return found;
  // Fallback: addresses are often the longest line containing a pin code.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pinLine = lines.find((l) => /\b\d{6}\b/.test(l));
  return pinLine;
}

/** Aadhaar: name, dob, gender, aadhaarNumber, address. */
export function extractAadhaarFields(text: string): FieldExtractionResult {
  const fields: Record<string, string> = {};
  const unresolved: string[] = [];

  const name = guessName(text);
  if (name) fields.fullName = name;
  else unresolved.push("fullName");

  const dobLine = findLineAfterLabel(text, ["dob", "date of birth"]);
  const dobMatch = (dobLine || text).match(DATE_RE);
  if (dobMatch) fields.dob = toDdMmYyyy(dobMatch[1]);
  else unresolved.push("dob");

  const genderMatch = text.match(/\b(male|female|transgender)\b/i);
  if (genderMatch) fields.gender = genderMatch[1][0].toUpperCase() + genderMatch[1].slice(1).toLowerCase();
  else unresolved.push("gender");

  const aadhaarMatch = text.match(AADHAAR_NUM_RE);
  if (aadhaarMatch) fields.aadhaarNumber = aadhaarMatch[1].replace(/\s+/g, " ").trim();
  else unresolved.push("aadhaarNumber");

  const address = guessAddress(text);
  if (address) fields.address = address;
  else unresolved.push("address");

  return { fields, unresolvedFields: unresolved, rawText: text };
}

/** Ration card: headOfHouseholdName, familyMembers, address, rationCardNumber, cardType. */
export function extractRationCardFields(text: string): FieldExtractionResult {
  const fields: Record<string, string> = {};
  const unresolved: string[] = [];

  const head = findLineAfterLabel(text, ["head of household", "name of head", "head"]);
  if (head) fields.headOfHouseholdName = head;
  else unresolved.push("headOfHouseholdName");

  // Family member list has no reliable single-line pattern in OCR'd text —
  // left for manual entry rather than guessed.
  unresolved.push("familyMembers");

  const numMatch = text.match(RATION_NUM_RE);
  if (numMatch) fields.rationCardNumber = numMatch[1];
  else unresolved.push("rationCardNumber");

  const cardTypeMatch = text.match(/\b(APL|BPL|AAY)\b/i);
  if (cardTypeMatch) fields.cardType = cardTypeMatch[1].toUpperCase();
  else unresolved.push("cardType");

  const address = guessAddress(text);
  if (address) fields.address = address;
  else unresolved.push("address");

  return { fields, unresolvedFields: unresolved, rawText: text };
}

/** Income certificate: applicantName, annualFamilyIncome, issuingAuthority, dateOfIssue, validityPeriod, address. */
export function extractIncomeCertificateFields(text: string): FieldExtractionResult {
  const fields: Record<string, string> = {};
  const unresolved: string[] = [];

  const name = guessName(text);
  if (name) fields.applicantName = name;
  else unresolved.push("applicantName");

  const incomeMatch = text.match(INCOME_RE);
  if (incomeMatch) fields.annualFamilyIncome = incomeMatch[1].replace(/,/g, "");
  else unresolved.push("annualFamilyIncome");

  const authority = findLineAfterLabel(text, ["issuing authority", "issued by", "authority"]);
  if (authority) fields.issuingAuthority = authority;
  else unresolved.push("issuingAuthority");

  const issueLine = findLineAfterLabel(text, ["date of issue", "issued on"]);
  const issueMatch = (issueLine || text).match(DATE_RE);
  if (issueMatch) fields.dateOfIssue = toDdMmYyyy(issueMatch[1]);
  else unresolved.push("dateOfIssue");

  // Validity period phrasing varies too much for a reliable regex — left for manual entry.
  unresolved.push("validityPeriod");

  const address = guessAddress(text);
  if (address) fields.address = address;
  else unresolved.push("address");

  return { fields, unresolvedFields: unresolved, rawText: text };
}

/** Scheme application: applicantName, dob, address, declaredAnnualIncome, categoryClaimed, schemeAppliedFor. */
export function extractSchemeApplicationFields(text: string): FieldExtractionResult {
  const fields: Record<string, string> = {};
  const unresolved: string[] = [];

  const name = guessName(text);
  if (name) fields.applicantName = name;
  else unresolved.push("applicantName");

  const dobLine = findLineAfterLabel(text, ["dob", "date of birth"]);
  const dobMatch = (dobLine || text).match(DATE_RE);
  if (dobMatch) fields.dob = toDdMmYyyy(dobMatch[1]);
  else unresolved.push("dob");

  const incomeMatch = text.match(INCOME_RE);
  if (incomeMatch) fields.declaredAnnualIncome = incomeMatch[1].replace(/,/g, "");
  else unresolved.push("declaredAnnualIncome");

  const categoryMatch = text.match(/\b(APL|BPL|AAY)\b/i);
  if (categoryMatch) fields.categoryClaimed = categoryMatch[1].toUpperCase();
  else unresolved.push("categoryClaimed");

  const scheme = findLineAfterLabel(text, ["scheme", "scheme applied for", "scheme name"]);
  if (scheme) fields.schemeAppliedFor = scheme;
  else unresolved.push("schemeAppliedFor");

  const address = guessAddress(text);
  if (address) fields.address = address;
  else unresolved.push("address");

  return { fields, unresolvedFields: unresolved, rawText: text };
}

export type DocKind = "aadhaar" | "rationCard" | "incomeCertificate" | "schemeApplication";

export function extractFieldsForDocType(kind: DocKind, text: string): FieldExtractionResult {
  switch (kind) {
    case "aadhaar":
      return extractAadhaarFields(text);
    case "rationCard":
      return extractRationCardFields(text);
    case "incomeCertificate":
      return extractIncomeCertificateFields(text);
    case "schemeApplication":
      return extractSchemeApplicationFields(text);
  }
}
