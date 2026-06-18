"use client";

import { useEffect, useState } from "react";
import {
  ISSUE_TYPES,
  LANGUAGES,
  RISK_LEVELS,
  TONES,
  issueLabel,
} from "@/lib/options";
import { SAMPLE_CASES } from "@/lib/samples";
import { generateOutput } from "@/lib/generate";
import {
  MAX_HISTORY,
  loadHistory,
  newId,
  relativeTime,
  saveHistory,
  type HistoryEntry,
} from "@/lib/history";
import type {
  CaseForm,
  CaseWarning,
  GeneratedOutput,
  RiskLevel,
} from "@/lib/types";

const EMPTY_FORM: CaseForm = {
  caseId: "",
  customerRef: "",
  issueType: "payment_status",
  details: "",
  amount: "",
  language: "en",
  tone: "professional",
  risk: "low",
};

export default function Page() {
  const [form, setForm] = useState<CaseForm>(SAMPLE_CASES[0]);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sampleIndex, setSampleIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load saved history from the browser after mount (avoids SSR mismatch).
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function update<K extends keyof CaseForm>(key: K, value: CaseForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleGenerate() {
    const result = generateOutput(form);
    setOutput(result);
    setChecked({});

    const entry: HistoryEntry = {
      id: newId(),
      savedAt: Date.now(),
      form,
      output: result,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }

  function loadSample() {
    const next = (sampleIndex + 1) % SAMPLE_CASES.length;
    setSampleIndex(next);
    setForm(SAMPLE_CASES[next]);
    setOutput(null);
    setChecked({});
  }

  function clearForm() {
    setForm(EMPTY_FORM);
    setOutput(null);
    setChecked({});
  }

  function restoreEntry(entry: HistoryEntry) {
    setForm(entry.form);
    setOutput(entry.output);
    setChecked({});
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8">
      <Header />

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* ---------------- Form ---------------- */}
        <section className="rounded-xl border border-line bg-panel shadow-panel">
          <PanelHeader
            title="Case input"
            subtitle="Enter the case, then generate a draft."
            action={
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={loadSample}
                  className="text-gold transition-colors hover:text-gold-soft"
                >
                  Load sample
                </button>
                <span className="text-faint">·</span>
                <button
                  onClick={clearForm}
                  className="text-muted transition-colors hover:text-fg"
                >
                  Clear
                </button>
              </div>
            }
          />

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Case ID">
                <input
                  className={inputCls}
                  placeholder="CS-00000"
                  value={form.caseId}
                  onChange={(e) => update("caseId", e.target.value)}
                />
              </Field>
              <Field label="Customer reference ID">
                <input
                  className={inputCls}
                  placeholder="REF-00000"
                  value={form.customerRef}
                  onChange={(e) => update("customerRef", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Issue type">
              <Select
                value={form.issueType}
                onChange={(v) => update("issueType", v as CaseForm["issueType"])}
                options={ISSUE_TYPES}
              />
            </Field>

            <Field label="Case details">
              <textarea
                className={`${inputCls} min-h-[112px] resize-y leading-relaxed`}
                placeholder="Summarize what the customer reported…"
                value={form.details}
                onChange={(e) => update("details", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Amount involved">
                <input
                  className={inputCls}
                  placeholder="$0.00 or —"
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                />
              </Field>
              <Field label="Language">
                <Select
                  value={form.language}
                  onChange={(v) => update("language", v as CaseForm["language"])}
                  options={LANGUAGES}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Reply tone">
                <Select
                  value={form.tone}
                  onChange={(v) => update("tone", v as CaseForm["tone"])}
                  options={TONES}
                />
              </Field>
              <Field label="Risk level">
                <Select
                  value={form.risk}
                  onChange={(v) => update("risk", v as CaseForm["risk"])}
                  options={RISK_LEVELS}
                />
              </Field>
            </div>

            <button
              onClick={handleGenerate}
              className="mt-1 w-full rounded-md border border-gold-dim bg-gradient-to-b from-gold to-[#b88f3c] px-4 py-2.5 text-sm font-semibold text-ink transition-all hover:from-gold-soft hover:to-gold active:translate-y-px"
            >
              Generate reply &amp; case actions
            </button>
            <p className="text-center text-[11px] text-faint">
              Generated from sample templates — review before sending.
            </p>
          </div>
        </section>

        {/* ---------------- Output ---------------- */}
        <section className="rounded-xl border border-line bg-panel shadow-panel">
          {output ? (
            <OutputView
              form={form}
              output={output}
              checked={checked}
              setChecked={setChecked}
            />
          ) : (
            <EmptyState />
          )}
        </section>
      </main>

      <HistorySection
        history={history}
        onRestore={restoreEntry}
        onClear={clearHistory}
      />
    </div>
  );
}

/* ============================ Layout pieces ============================ */

function Header() {
  return (
    <header className="py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold-dim bg-gradient-to-b from-[#1c1d22] to-[#111216]">
            <span className="text-lg font-bold text-gold">S</span>
          </div>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-fg">
              Support Reply Generator
            </h1>
            <p className="text-xs text-muted">
              Internal support tooling · draft replies &amp; case actions
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-line bg-panel-2 px-3 py-1 text-[11px] text-muted sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Sample data only
        </span>
      </div>
      <div className="header-line mt-6 h-px w-full" />
    </header>
  );
}

function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-line-soft px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel-2">
        <span className="text-xl text-gold">↳</span>
      </div>
      <h3 className="mt-4 text-sm font-medium text-fg">No draft yet</h3>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
        Fill in the case on the left and select an issue type, then choose
        <span className="text-fg"> Generate</span>. You can also
        <span className="text-fg"> Load sample</span> to see an example case.
      </p>
    </div>
  );
}

/* ============================ History ============================ */

function HistorySection({
  history,
  onRestore,
  onClear,
}: {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-line bg-panel shadow-panel">
      <PanelHeader
        title="Recent cases"
        subtitle={`Saved in this browser only · last ${MAX_HISTORY} generated`}
        action={
          history.length > 0 ? (
            <button
              onClick={onClear}
              className="text-xs text-muted transition-colors hover:text-fg"
            >
              Clear history
            </button>
          ) : null
        }
      />

      {history.length === 0 ? (
        <p className="px-5 py-10 text-center text-xs text-muted">
          No cases generated yet. Each case you generate is saved here so you can
          reopen it later.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {history.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => onRestore(entry)}
                className="group flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-left transition-colors hover:bg-panel-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-fg">
                      {entry.form.caseId || "—"}
                    </span>
                    <span className="hidden text-[11px] text-faint sm:inline">
                      {entry.form.customerRef || "—"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {issueLabel(entry.form.issueType)}
                  </div>
                </div>

                <RiskBadge risk={entry.form.risk} />
                <StatusBadge status={entry.output.recommendedStatus} />
                <span
                  className="w-[68px] text-right text-[11px] text-faint"
                  title={new Date(entry.savedAt).toLocaleString()}
                >
                  {relativeTime(entry.savedAt)}
                </span>
                <span className="text-faint transition-colors group-hover:text-gold">
                  ↗
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================ Output view ============================ */

function OutputView({
  form,
  output,
  checked,
  setChecked,
}: {
  form: CaseForm;
  output: GeneratedOutput;
  checked: Record<string, boolean>;
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const doneCount = output.checklist.filter((c) => checked[c.id]).length;

  return (
    <div>
      <PanelHeader
        title="Generated draft"
        subtitle={`Case ${form.caseId || "—"} · ${form.customerRef || "—"}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {issueLabel(form.issueType)}
            </span>
            <RiskBadge risk={form.risk} />
          </div>
        }
      />

      <div className="space-y-5 p-5">
        {output.warning && <WarningBanner warning={output.warning} />}

        <OutputCard title="Customer reply" copyText={output.customerReply}>
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">
            {output.customerReply}
          </pre>
        </OutputCard>

        <OutputCard title="Internal note" copyText={output.internalNote}>
          <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-muted">
            {output.internalNote}
          </pre>
        </OutputCard>

        <div className="rounded-lg border border-line-soft bg-panel-2/60">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Escalation checklist
            </h3>
            <span className="text-[11px] text-faint">
              {doneCount} of {output.checklist.length} done
            </span>
          </div>
          <ul className="divide-y divide-line-soft">
            {output.checklist.map((item) => {
              const isDone = !!checked[item.id];
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-panel-2">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isDone}
                      onChange={() =>
                        setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))
                      }
                    />
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border text-[10px] ${
                        isDone
                          ? "border-gold bg-gold text-ink"
                          : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex items-start gap-2 text-[13px] leading-snug">
                      {item.flagged && !isDone && (
                        <span className="mt-px text-gold" title="Added by a rule">
                          ▲
                        </span>
                      )}
                      <span
                        className={isDone ? "text-faint line-through" : "text-fg"}
                      >
                        {item.label}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryTile label="Recommended status">
            <StatusBadge status={output.recommendedStatus} large />
          </SummaryTile>
          <SummaryTile label="Assigned team">
            <span className="text-sm font-medium text-fg">
              {output.assignedTeam}
            </span>
          </SummaryTile>
        </div>
      </div>
    </div>
  );
}

function WarningBanner({ warning }: { warning: CaseWarning }) {
  const tone =
    warning.level === "critical"
      ? {
          border: "border-[#7a4a45]",
          bg: "bg-[#241715]",
          accent: "text-[#e0a79d]",
          label: "Critical risk",
        }
      : warning.level === "high"
        ? {
            border: "border-[#7a4a45]",
            bg: "bg-[#221513]",
            accent: "text-[#d9988e]",
            label: "High risk",
          }
        : {
            border: "border-gold-dim",
            bg: "bg-[#1f1a0c]",
            accent: "text-gold-soft",
            label: "Caution",
          };

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} px-4 py-3`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-px text-sm ${tone.accent}`}>⚠</span>
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${tone.accent}`}
          >
            {tone.label} — review before sending
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg">
            {warning.message}
          </p>
          {warning.reasons.length > 0 && (
            <p className="mt-1.5 text-[11px] text-muted">
              Triggered by: {warning.reasons.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line-soft bg-panel-2/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const tone = statusTone(status);
  const size = large ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${tone.border} ${tone.bg} ${size} font-medium ${tone.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {status}
    </span>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "Escalated":
      return {
        border: "border-[#7a4a45]",
        bg: "bg-[#2a1c1a]",
        text: "text-[#d9988e]",
        dot: "bg-[#d9988e]",
      };
    case "Under review":
    case "Pending verification":
      return {
        border: "border-gold-dim",
        bg: "bg-[#221d10]",
        text: "text-gold-soft",
        dot: "bg-gold",
      };
    default: // In progress / others
      return {
        border: "border-line",
        bg: "bg-panel-2",
        text: "text-muted",
        dot: "bg-faint",
      };
  }
}

function OutputCard({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line-soft bg-panel-2/60">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h3>
        <CopyButton text={copyText} />
      </div>
      <div className="scroll-thin max-h-[360px] overflow-auto px-4 py-3.5">
        {children}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-gold-dim hover:text-gold"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ============================ Badges ============================ */

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const tone = riskTone(risk);
  const label = risk.charAt(0).toUpperCase() + risk.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${tone.border} ${tone.bg} px-2 py-0.5 text-[11px] font-medium ${tone.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label} risk
    </span>
  );
}

function riskTone(risk: RiskLevel) {
  switch (risk) {
    case "critical":
      return {
        border: "border-[#7a4a45]",
        bg: "bg-[#2a1c1a]",
        text: "text-[#d9988e]",
        dot: "bg-[#d9988e]",
      };
    case "high":
      return {
        border: "border-gold-dim",
        bg: "bg-[#221d10]",
        text: "text-gold-soft",
        dot: "bg-gold",
      };
    case "medium":
      return {
        border: "border-line",
        bg: "bg-panel-2",
        text: "text-muted",
        dot: "bg-gold-dim",
      };
    default: // low
      return {
        border: "border-line",
        bg: "bg-panel-2",
        text: "text-muted",
        dot: "bg-faint",
      };
  }
}

/* ============================ Form primitives ============================ */

const inputCls =
  "field-focus w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-[13px] text-fg placeholder:text-faint";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} cursor-pointer appearance-none pr-9`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">
        ▾
      </span>
    </div>
  );
}
