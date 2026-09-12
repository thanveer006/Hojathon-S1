import { ApplicantAttrs } from "../models/Applicant";

export const applicantFixtures: ApplicantAttrs[] = [
  // 1. Clean case — no contradictions
  {
    applicantId: "APP-1001",
    displayName: "Anjali Suresh",
    scenario: "Clean case — all documents agree. Should pass with zero contradictions flagged.",
    documents: {
      aadhaar: {
        type: "aadhaar",
        fullName: "Anjali Suresh",
        dob: "14/06/2004",
        gender: "Female",
        aadhaarNumber: "4821 6690 3345",
        address: "TC 14/220, Sasthamangalam, Thiruvananthapuram, Kerala 695010",
      },
      rationCard: {
        type: "rationCard",
        headOfHouseholdName: "Suresh Kumar P",
        familyMembers: ["Suresh Kumar P", "Anjali Suresh", "Latha Suresh"],
        address: "TC 14/220, Sasthamangalam, Thiruvananthapuram, Kerala 695010",
        rationCardNumber: "RC-TVM-778821",
        cardType: "BPL",
      },
      incomeCertificate: {
        type: "incomeCertificate",
        applicantName: "Anjali Suresh",
        annualFamilyIncome: 78000,
        issuingAuthority: "Village Officer, Sasthamangalam",
        dateOfIssue: "02/01/2026",
        validityPeriod: "1 year from date of issue",
        address: "TC 14/220, Sasthamangalam, Thiruvananthapuram, Kerala 695010",
      },
      schemeApplication: {
        type: "schemeApplication",
        applicantName: "Anjali Suresh",
        dob: "14/06/2004",
        address: "TC 14/220, Sasthamangalam, Thiruvananthapuram, Kerala 695010",
        declaredAnnualIncome: 78000,
        categoryClaimed: "BPL",
        schemeAppliedFor: "Kerala Scholarship for BPL Students",
      },
    },
  },

  // 2. Name mismatch + Income mismatch
  {
    applicantId: "APP-1002",
    displayName: "Muhammed Rasheed",
    scenario:
      "Name transliteration drift (Muhammed vs Mohammed) and income mismatch between form and income certificate.",
    documents: {
      aadhaar: {
        type: "aadhaar",
        fullName: "Muhammed Rasheed K",
        dob: "22/11/2002",
        gender: "Male",
        aadhaarNumber: "5710 2298 8813",
        address: "Kannur Road, Thalassery, Kannur, Kerala 670101",
      },
      rationCard: {
        type: "rationCard",
        headOfHouseholdName: "Abdul Rasheed",
        familyMembers: ["Abdul Rasheed", "Mohammed Rasheed K", "Fathima Rasheed"],
        address: "Kannur Road, Thalassery, Kannur, Kerala 670101",
        rationCardNumber: "RC-KNR-441209",
        cardType: "BPL",
      },
      incomeCertificate: {
        type: "incomeCertificate",
        applicantName: "Mohammed Rasheed K",
        annualFamilyIncome: 92000,
        issuingAuthority: "Tahsildar, Thalassery",
        dateOfIssue: "18/02/2026",
        validityPeriod: "1 year from date of issue",
        address: "Kannur Road, Thalassery, Kannur, Kerala 670101",
      },
      schemeApplication: {
        type: "schemeApplication",
        applicantName: "Mohammed Rasheed",
        dob: "22/11/2002",
        address: "Kannur Road, Thalassery, Kannur, Kerala 670101",
        declaredAnnualIncome: 65000,
        categoryClaimed: "BPL",
        schemeAppliedFor: "Kerala Scholarship for BPL Students",
      },
    },
  },

  // 3. DOB mismatch + Address mismatch (stale income cert address) + Category mismatch
  {
    applicantId: "APP-1003",
    displayName: "Devika Nair",
    scenario:
      "DOB day/month swapped on the form, income certificate has a stale address, and the form claims BPL while the ration card says APL.",
    documents: {
      aadhaar: {
        type: "aadhaar",
        fullName: "Devika Nair",
        dob: "05/03/2001",
        gender: "Female",
        aadhaarNumber: "3390 7743 1256",
        address: "Near Panchayat Office, Aluva, Ernakulam, Kerala 683101",
      },
      rationCard: {
        type: "rationCard",
        headOfHouseholdName: "Rajan Nair",
        familyMembers: ["Rajan Nair", "Devika Nair"],
        address: "Near Panchayat Office, Aluva, Ernakulam, Kerala 683101",
        rationCardNumber: "RC-EKM-119983",
        cardType: "APL",
      },
      incomeCertificate: {
        type: "incomeCertificate",
        applicantName: "Devika Nair",
        annualFamilyIncome: 210000,
        issuingAuthority: "Village Officer, Aluva",
        dateOfIssue: "10/03/2023",
        validityPeriod: "1 year from date of issue",
        address: "Old House, Chunangamvely, Aluva, Ernakulam, Kerala 683101",
      },
      schemeApplication: {
        type: "schemeApplication",
        applicantName: "Devika Nair",
        dob: "03/05/2001",
        address: "Near Panchayat Office, Aluva, Ernakulam, Kerala 683101",
        declaredAnnualIncome: 210000,
        categoryClaimed: "BPL",
        schemeAppliedFor: "Kerala Scholarship for BPL Students",
      },
    },
  },

  // 4. Multi-field: name + address + income all mismatched (worst case)
  {
    applicantId: "APP-1004",
    displayName: "Arjun Pillai",
    scenario:
      "Compounding mismatches — minor name spelling variance, address changed after moving, and self-declared income far below the certified value.",
    documents: {
      aadhaar: {
        type: "aadhaar",
        fullName: "Arjun S Pillai",
        dob: "30/09/1999",
        gender: "Male",
        aadhaarNumber: "6642 1187 0034",
        address: "Vazhuthacaud, Thiruvananthapuram, Kerala 695014",
      },
      rationCard: {
        type: "rationCard",
        headOfHouseholdName: "Suresh Pillai",
        familyMembers: ["Suresh Pillai", "Arjun Pillai", "Meera Pillai"],
        address: "Vazhuthacaud, Thiruvananthapuram, Kerala 695014",
        rationCardNumber: "RC-TVM-556210",
        cardType: "BPL",
      },
      incomeCertificate: {
        type: "incomeCertificate",
        applicantName: "Arjun S. Pillai",
        annualFamilyIncome: 145000,
        issuingAuthority: "Tahsildar, Thiruvananthapuram",
        dateOfIssue: "05/01/2026",
        validityPeriod: "1 year from date of issue",
        address: "Pattom, Thiruvananthapuram, Kerala 695004",
      },
      schemeApplication: {
        type: "schemeApplication",
        applicantName: "Arjun Pillai S",
        dob: "30/09/1999",
        address: "Pattom, Thiruvananthapuram, Kerala 695004",
        declaredAnnualIncome: 98000,
        categoryClaimed: "BPL",
        schemeAppliedFor: "Kerala Scholarship for BPL Students",
      },
    },
  },
];
