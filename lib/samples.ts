import type { CaseForm } from "./types";

// Fictional sample cases for demoing the UI. No real customer data.
export const SAMPLE_CASES: CaseForm[] = [
  {
    caseId: "CS-48213",
    customerRef: "REF-90021",
    issueType: "payment_status",
    details:
      "Customer says a withdrawal requested 3 days ago still shows as pending on their side and is asking for an expected completion time.",
    amount: "$420.00",
    language: "en",
    tone: "professional",
    risk: "low",
  },
  {
    caseId: "CS-48227",
    customerRef: "REF-90188",
    issueType: "missing_payment",
    details:
      "A deposit was sent from the customer's bank but is not reflected on the account balance. Customer provided a transaction date but no reference number.",
    amount: "$150.00",
    language: "en",
    tone: "professional",
    risk: "medium",
  },
  {
    caseId: "CS-48301",
    customerRef: "REF-90422",
    issueType: "account_verification",
    details:
      "Identity documents were submitted twice but the verification status has not updated. Customer is unable to proceed and is getting frustrated.",
    amount: "—",
    language: "es",
    tone: "friendly",
    risk: "medium",
  },
  {
    caseId: "CS-48355",
    customerRef: "REF-90567",
    issueType: "promotion_dispute",
    details:
      "Customer believes a promotional bonus was not credited after meeting the stated conditions and is disputing the outcome.",
    amount: "$50.00",
    language: "en",
    tone: "firm",
    risk: "low",
  },
  {
    caseId: "CS-48390",
    customerRef: "REF-90733",
    issueType: "account_access",
    details:
      "Customer is locked out after multiple failed login attempts and cannot complete the password reset because the recovery email is outdated.",
    amount: "—",
    language: "fr",
    tone: "professional",
    risk: "high",
  },
  {
    caseId: "CS-48412",
    customerRef: "REF-90810",
    issueType: "payment_status",
    details:
      "Customer is asking whether a refund has been issued yet and when it will appear on their original payment method.",
    amount: "$1,200.00",
    language: "en",
    tone: "friendly",
    risk: "low",
  },
];
