import type {
  IssueType,
  LanguageCode,
  RiskLevel,
  ToneCode,
} from "./types";

export const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "payment_status", label: "Payment Status Inquiry" },
  { value: "missing_payment", label: "Missing Payment Record" },
  { value: "account_verification", label: "Account Verification Issue" },
  { value: "promotion_dispute", label: "Promotion or Bonus Dispute" },
  { value: "account_access", label: "Account Access Problem" },
];

export const LANGUAGES: { value: LanguageCode; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese (Simplified)" },
];

export const TONES: { value: ToneCode; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "firm", label: "Firm and Policy-Based" },
];

export const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function issueLabel(value: IssueType): string {
  return ISSUE_TYPES.find((i) => i.value === value)?.label ?? value;
}
