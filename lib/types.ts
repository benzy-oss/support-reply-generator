export type IssueType =
  | "payment_status"
  | "missing_payment"
  | "account_verification"
  | "promotion_dispute"
  | "account_access";

export type LanguageCode = "en" | "es" | "fr" | "de" | "pt" | "zh";

export type ToneCode = "professional" | "friendly" | "firm";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface CaseForm {
  caseId: string;
  customerRef: string;
  issueType: IssueType;
  details: string;
  amount: string;
  language: LanguageCode;
  tone: ToneCode;
  risk: RiskLevel;
}

export interface ChecklistItem {
  id: string;
  label: string;
  /** true when added by a rule (risk / amount / detail signal) rather than the
   *  standard procedure for the issue type. */
  flagged?: boolean;
}

export interface CaseWarning {
  level: "caution" | "high" | "critical";
  message: string;
  /** Plain-language reasons the warning fired, e.g. "Risk level: Critical". */
  reasons: string[];
}

export interface GeneratedOutput {
  customerReply: string;
  internalNote: string;
  checklist: ChecklistItem[];
  recommendedStatus: string;
  assignedTeam: string;
  warning: CaseWarning | null;
}
