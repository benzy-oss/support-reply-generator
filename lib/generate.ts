import { issueLabel } from "./options";
import type {
  CaseForm,
  CaseWarning,
  ChecklistItem,
  GeneratedOutput,
  IssueType,
  LanguageCode,
  RiskLevel,
  ToneCode,
} from "./types";

// ===========================================================================
// Tunable business thresholds
// ===========================================================================
const HIGH_VALUE = 1000; // cases at/above this amount get senior sign-off

// Issue types that involve money, so a high amount matters for them.
const FINANCIAL_ISSUES: IssueType[] = [
  "payment_status",
  "missing_payment",
  "promotion_dispute",
];

// ===========================================================================
// Localized greeting / sign-off (language drives these; body stays English)
// ===========================================================================
const GREETING: Record<LanguageCode, string> = {
  en: "Hello,",
  es: "Hola,",
  fr: "Bonjour,",
  de: "Hallo,",
  pt: "Olá,",
  zh: "您好，",
};

const SIGN_OFF: Record<LanguageCode, string> = {
  en: "Kind regards,\nSupport Team",
  es: "Un cordial saludo,\nEquipo de Soporte",
  fr: "Cordialement,\nL'équipe d'assistance",
  de: "Mit freundlichen Grüßen,\nIhr Support-Team",
  pt: "Atenciosamente,\nEquipe de Suporte",
  zh: "此致敬礼，\n客户支持团队",
};

const TONE_OPENER: Record<ToneCode, string> = {
  professional: "Thank you for reaching out regarding your case.",
  friendly:
    "Thanks so much for getting in touch — we're happy to help with this.",
  firm: "Thank you for your message. We want to be clear with you about where this matter stands and how it will be handled.",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// ===========================================================================
// Per-issue base templates and routing
// ===========================================================================
interface IssueConfig {
  body: (f: CaseForm) => string;
  noteSummary: () => string;
  baseStatus: string;
  baseTeam: string;
  baseChecklist: string[];
}

const amountLine = (f: CaseForm) =>
  parseAmount(f.amount) !== null
    ? ` The amount referenced on this case is ${f.amount.trim()}.`
    : "";

const ISSUE_CONFIG: Record<IssueType, IssueConfig> = {
  payment_status: {
    body: (f) =>
      `We've located your case and are reviewing the current status of the payment in question.${amountLine(
        f,
      )} Payments of this type are typically processed within standard timeframes, and we are confirming where yours sits in that process right now. We will follow up as soon as we have a confirmed update, and no further action is required from you in the meantime.`,
    noteSummary: () =>
      "Customer is asking for the current status / expected completion time of a payment. Confirm the processing stage and give a realistic window.",
    baseStatus: "In progress",
    baseTeam: "Payments Operations",
    baseChecklist: [
      "Confirm the payment reference matches the case.",
      "Check the current processing stage in the system of record.",
      "Verify the standard processing window has not been exceeded.",
      "Reply with the standard window and a clear follow-up time.",
    ],
  },
  missing_payment: {
    body: (f) =>
      `Thank you for letting us know that a payment isn't appearing as expected.${amountLine(
        f,
      )} To trace this accurately, our team will reconcile the records on our side against the details you've provided. So we can move quickly, please reply with the transaction date and any reference or confirmation number you have. Once we receive those details, we'll complete the trace and confirm the outcome with you.`,
    noteSummary: () =>
      "Reported payment not reflected on the account. Needs reconciliation against the system of record before any balance change.",
    baseStatus: "Pending verification",
    baseTeam: "Payments Operations",
    baseChecklist: [
      "Request the transaction date and reference / confirmation number.",
      "Reconcile the reported payment against the system of record.",
      "Check for a pending, failed, or mismatched-reference entry.",
      "Document the trace outcome on the case before replying.",
    ],
  },
  account_verification: {
    body: () =>
      `Thank you for completing the verification step. We can see your submission and it is currently in our review queue. Verification reviews are handled in the order received, and you don't need to resubmit your documents — duplicates can actually slow the process down. We'll notify you as soon as the review is complete, and we'll let you know directly if anything further is needed.`,
    noteSummary: () =>
      "Verification submission stuck / not updating. Check the review-queue status and confirm documents are legible and complete.",
    baseStatus: "Pending verification",
    baseTeam: "Verification Team",
    baseChecklist: [
      "Confirm a submission is present and in the review queue.",
      "Check for duplicate submissions and consolidate if needed.",
      "Verify documents are legible, valid, and unexpired.",
      "Notify the customer of the outcome or the next step.",
    ],
  },
  promotion_dispute: {
    body: (f) =>
      `Thank you for raising this. We understand you believe a promotion or bonus wasn't applied as expected, and we want to review it fairly.${amountLine(
        f,
      )} Our team will check the specific promotion terms against the activity on your account and confirm whether the qualifying conditions were met. We'll share a clear explanation of the outcome once that review is complete.`,
    noteSummary: () =>
      "Customer disputes a promotion / bonus outcome. Compare the documented terms and qualifying-condition log against account activity.",
    baseStatus: "Under review",
    baseTeam: "Promotions & Offers",
    baseChecklist: [
      "Identify the exact promotion / bonus and its terms.",
      "Pull the qualifying-condition log for the account.",
      "Compare the stated conditions against recorded activity.",
      "Prepare a clear, evidence-based explanation of the outcome.",
    ],
  },
  account_access: {
    body: () =>
      `Thanks for reaching out — let's get you back into your account safely. For your security, we'll confirm a few account details before making any changes, and we can help update outdated recovery information if it's blocking your reset. Please reply confirming the details we have on file, and we'll guide you through the next step. We will never ask for your full password.`,
    noteSummary: () =>
      "Customer locked out; recovery details may be outdated. Verify identity per security policy BEFORE any change. Never request the password.",
    baseStatus: "In progress",
    baseTeam: "Account Security",
    baseChecklist: [
      "Verify the customer's identity per the security checklist.",
      "Confirm whether the recovery email / phone is outdated.",
      "Check for a lockout from failed attempts vs. a security hold.",
      "Guide the reset only after identity is confirmed.",
    ],
  },
};

// ===========================================================================
// Rule inputs derived from the form
// ===========================================================================

/** Parse a free-text amount like "$1,200.00" into a number, or null. */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

interface SignalDef {
  key: string;
  re: RegExp;
  label: string;
}

// Keyword signals scanned from the case details. Kept deliberately small and
// readable so support leads can see exactly what trips a rule.
const SIGNAL_DEFS: SignalDef[] = [
  {
    key: "fraud",
    re: /\b(fraud|unauthori[sz]ed|scam|stolen|hack(ed|ing)?|compromis(e|ed|ing)|phish)/i,
    label: "Possible fraud / unauthorized activity",
  },
  {
    key: "chargeback",
    re: /\b(charge ?back|dispute the (charge|payment)|bank dispute)\b/i,
    label: "Chargeback / payment dispute mentioned",
  },
  {
    key: "legal",
    re: /\b(lawyer|solicitor|legal action|lawsuit|sue|regulator|ombudsman|formal complaint)\b/i,
    label: "Legal / regulator / formal complaint mentioned",
  },
  {
    key: "urgent",
    re: /\b(urgent(ly)?|asap|immediately|emergency|right away|time[- ]?sensitive)\b/i,
    label: "Customer flagged urgency",
  },
  {
    key: "duplicate",
    re: /\b(duplicate|twice|two times|resubmit(ted)?|multiple (times|submissions|attempts))\b/i,
    label: "Possible duplicate submission / transaction",
  },
  {
    key: "vulnerable",
    re: /\b(self[- ]?exclu|gambling problem|addict(ion|ed)?|vulnerable|harm myself|mental health|suicid)/i,
    label: "Potential vulnerability — handle with care",
  },
];

function detectSignals(details: string): { keys: Set<string>; labels: string[] } {
  const found = SIGNAL_DEFS.filter((d) => d.re.test(details || ""));
  return {
    keys: new Set(found.map((f) => f.key)),
    labels: found.map((f) => f.label),
  };
}

// ===========================================================================
// Rule outputs: status, team, checklist, warning
// ===========================================================================

function computeStatus(
  base: string,
  issue: IssueType,
  risk: RiskLevel,
  signals: Set<string>,
  highValue: boolean,
): string {
  const escalate = risk === "critical" || signals.has("fraud");
  if (escalate) return "Escalated";

  const review =
    risk === "high" ||
    signals.has("chargeback") ||
    signals.has("legal") ||
    signals.has("vulnerable") ||
    (highValue && FINANCIAL_ISSUES.includes(issue));
  if (review) return "Under review";

  return base;
}

function computeTeam(
  base: string,
  risk: RiskLevel,
  signals: Set<string>,
): string {
  if (risk === "critical" || signals.has("fraud")) return "Risk & Compliance";
  if (signals.has("vulnerable")) return "Senior Support / Tier 2";
  return base;
}

function computeChecklist(
  cfg: IssueConfig,
  form: CaseForm,
  signals: Set<string>,
  highValue: boolean,
): ChecklistItem[] {
  const flagged: string[] = [];

  if (form.risk === "critical") {
    flagged.push(
      "Escalate to a team lead immediately and record the time.",
      "Hold the customer reply until a lead has approved it.",
    );
  }
  if (signals.has("fraud")) {
    flagged.push(
      "Suspected fraud / unauthorized activity — notify Risk & Compliance and restrict sensitive actions.",
    );
  }
  if (form.risk === "high") {
    flagged.push("Flag the case for senior review before sending the reply.");
  }
  if (signals.has("vulnerable")) {
    flagged.push(
      "Sensitive situation — follow the duty-of-care process and do not pressure the customer.",
    );
  }
  if (signals.has("chargeback") || signals.has("legal")) {
    flagged.push(
      "Dispute / complaint language used — log the exact wording and notify a team lead.",
    );
  }
  if (highValue) {
    flagged.push(
      `High-value case (${form.amount.trim()}) — get senior sign-off before any adjustment or commitment.`,
    );
  }
  if (signals.has("urgent")) {
    flagged.push(
      "Customer flagged urgency — set a priority follow-up and confirm a realistic timeframe.",
    );
  }
  if (signals.has("duplicate")) {
    flagged.push(
      "Possible duplicate — verify existing records before re-processing or re-requesting.",
    );
  }

  const items: ChecklistItem[] = [
    ...flagged.map((label, i) => ({ id: `flag-${i}`, label, flagged: true })),
    ...cfg.baseChecklist.map((label, i) => ({ id: `base-${i}`, label })),
  ];
  return items;
}

// Signals serious enough to surface in a warning banner.
const SERIOUS_SIGNALS = ["fraud", "chargeback", "legal", "vulnerable"];

function computeWarning(
  form: CaseForm,
  signals: Set<string>,
  highValue: boolean,
): CaseWarning | null {
  const reasons: string[] = [];
  if (form.risk === "high" || form.risk === "critical") {
    reasons.push(`Risk level: ${RISK_LABEL[form.risk]}`);
  }
  for (const def of SIGNAL_DEFS) {
    if (SERIOUS_SIGNALS.includes(def.key) && signals.has(def.key)) {
      reasons.push(def.label);
    }
  }
  if (highValue) reasons.push(`High-value amount (≥ $${HIGH_VALUE})`);

  // Decide whether to warn at all, and at what level.
  const isCritical = form.risk === "critical";
  const isHigh = form.risk === "high" || signals.has("fraud");
  const isCaution =
    signals.has("chargeback") ||
    signals.has("legal") ||
    signals.has("vulnerable") ||
    highValue;

  if (!isCritical && !isHigh && !isCaution) return null;

  let level: CaseWarning["level"];
  let message: string;

  if (isCritical) {
    level = "critical";
    message =
      "Critical-risk case. Do not send any reply until a team lead has reviewed and approved it. Make no commitments, and restrict sensitive actions until cleared.";
  } else if (isHigh) {
    level = "high";
    message = signals.has("fraud")
      ? "High-risk case — possible fraud or unauthorized activity. Verify identity carefully, avoid commitments, and have a senior agent review before sending."
      : "High-risk case. Have a senior agent review before sending, verify the relevant details, and avoid making commitments until confirmed.";
  } else {
    level = "caution";
    message =
      "Handle with extra care before replying — review the flagged points below and loop in a lead if unsure.";
  }

  return { level, message, reasons };
}

// ===========================================================================
// Main entry point
// ===========================================================================
export function generateOutput(form: CaseForm): GeneratedOutput {
  const cfg = ISSUE_CONFIG[form.issueType];
  const greeting = GREETING[form.language];
  const signOff = SIGN_OFF[form.language];
  const opener = TONE_OPENER[form.tone];
  const label = issueLabel(form.issueType);

  const amountNum = parseAmount(form.amount);
  const highValue = amountNum !== null && amountNum >= HIGH_VALUE;
  const { keys: signals, labels: signalLabels } = detectSignals(form.details);

  // --- Customer reply ---
  const caseRef = form.caseId?.trim() || "your case";
  const closingLine =
    form.tone === "firm"
      ? `If anything here is unclear, reply to this message quoting ${caseRef} and we'll address it directly.`
      : `If you have any further questions, just reply to this message and quote ${caseRef} so we can pick it straight up.`;

  const customerReply = [
    greeting,
    "",
    `${opener} ${cfg.body(form)}`,
    "",
    closingLine,
    "",
    signOff,
  ].join("\n");

  // --- Routing & status ---
  const recommendedStatus = computeStatus(
    cfg.baseStatus,
    form.issueType,
    form.risk,
    signals,
    highValue,
  );
  const assignedTeam = computeTeam(cfg.baseTeam, form.risk, signals);
  const checklist = computeChecklist(cfg, form, signals, highValue);
  const warning = computeWarning(form, signals, highValue);

  // --- Internal note (surfaces what the rules read) ---
  const internalNote = [
    `Case ${form.caseId || "—"}  ·  Customer ref ${form.customerRef || "—"}`,
    `Issue: ${label}  ·  Risk: ${RISK_LABEL[form.risk]}  ·  Tone: ${form.tone}`,
    amountNum !== null
      ? `Amount: ${form.amount.trim()}${highValue ? "  (high-value)" : ""}`
      : "Amount: not applicable",
    `Routing: ${assignedTeam}  ·  Status: ${recommendedStatus}`,
    signalLabels.length
      ? `Signals detected: ${signalLabels.join("; ")}`
      : "Signals detected: none",
    "",
    cfg.noteSummary(),
    form.details?.trim()
      ? `\nAgent-entered detail: ${form.details.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    customerReply,
    internalNote,
    checklist,
    recommendedStatus,
    assignedTeam,
    warning,
  };
}
