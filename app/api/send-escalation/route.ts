import { buildEscalationEmail } from "@/lib/escalationEmail";
import type { EscalationPayload } from "@/lib/escalationEmail";

// Runs server-side only. The Resend API key and the manager's email address
// live in environment variables and never reach the browser.
export const runtime = "nodejs";

function bad(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const managerEmail = process.env.MANAGER_EMAIL;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    "Support Escalations <onboarding@resend.dev>";

  // Server configuration checks (messages never reveal the key or address).
  if (!apiKey) {
    return bad(
      "Email is not configured on the server (missing RESEND_API_KEY).",
      500,
    );
  }
  if (!managerEmail) {
    return bad(
      "Email is not configured on the server (missing MANAGER_EMAIL).",
      500,
    );
  }

  let payload: EscalationPayload;
  try {
    payload = (await req.json()) as EscalationPayload;
  } catch {
    return bad("Invalid request body.", 400);
  }

  if (!payload || !payload.caseId || !payload.issueType) {
    return bad("Missing required case fields.", 400);
  }

  // Server-side guard: only urgent (high/critical) or Escalated cases may send.
  const risk = String(payload.risk || "").toLowerCase();
  const escalatable =
    risk === "high" || risk === "critical" || payload.status === "Escalated";
  if (!escalatable) {
    return bad(
      "This case is not urgent or escalated, so no escalation email was sent.",
      400,
    );
  }

  const { subject, html, text } = buildEscalationEmail({
    caseId: payload.caseId,
    customerRef: payload.customerRef,
    issueType: payload.issueType,
    risk,
    assignedTeam: payload.assignedTeam,
    status: payload.status,
    internalNote: payload.internalNote,
    checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
    managerAction: payload.managerAction,
  });

  // The recipient is ALWAYS the configured manager — never anything the client
  // sends — so a customer address can never be the target.
  let resendRes: Response;
  try {
    resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [managerEmail],
        subject,
        html,
        text,
      }),
    });
  } catch {
    return bad("Could not reach the email provider.", 502);
  }

  const data = (await resendRes.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
    error?: { message?: string };
  };

  if (!resendRes.ok) {
    const msg =
      data?.message || data?.error?.message || "the email provider rejected the request.";
    return bad(`Email provider error: ${msg}`, 502);
  }

  // Note: we intentionally do NOT echo the manager's address back to the client.
  return Response.json({ ok: true, id: data?.id ?? null });
}
