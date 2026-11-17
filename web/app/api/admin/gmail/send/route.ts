import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  approvedRecipient, ensureAiwGmailAccountsTable, GMAIL_ACCOUNTS, GMAIL_TEMPLATES,
  getGmailAccessToken, gmailSendScopeApproved, hasGmailSendScope, type GmailAccountKey,
} from "@/lib/aiw-gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const json = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const safe = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return json("Administrator access required.", 403);
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(req.url).origin) return json("Same-origin request required.", 403);
  const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) return json("A unique Idempotency-Key header (16–128 characters) is required.", 400);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json("Invalid request body.", 400);

  const input = body as Record<string, unknown>;
  const accountKey = safe(input.account, 20) as GmailAccountKey;
  const recipient = safe(input.recipient, 254).toLowerCase();
  const templateKey = safe(input.template, 40) as keyof typeof GMAIL_TEMPLATES;
  const contact = safe(input.contact, 100);
  const company = safe(input.company, 160);
  const reference = safe(input.reference, 80);
  if (!Object.hasOwn(GMAIL_ACCOUNTS, accountKey) || !emailPattern.test(recipient) ||
      !Object.hasOwn(GMAIL_TEMPLATES, templateKey) || !contact || !company || !reference) {
    return json("A valid mailbox, recipient, approved template, contact, company and reference are required.", 400);
  }

  await ensureAiwGmailAccountsTable();
  const template = GMAIL_TEMPLATES[templateKey];
  const recordBlocked = async (code: string, status = 403) => {
    await sql`insert into aiw_gmail_send_audit(account_key,actor_id,recipient,template_key,subject,idempotency_key,status,error_code)
      values (${accountKey},${user.id},${recipient},${templateKey},${template.subject},${idempotencyKey},'blocked',${code})
      on conflict (idempotency_key) do nothing`;
    return json(code, status);
  };

  if (!gmailSendScopeApproved()) return recordBlocked("gmail_send_policy_or_google_scope_not_approved");
  if (!approvedRecipient(recipient)) return recordBlocked("recipient_not_on_explicit_approval_allowlist");
  const account = (await sql`select scope,status,email from aiw_gmail_accounts where account_key=${accountKey} limit 1`)[0];
  if (!account || account.status !== "connected" || account.email !== GMAIL_ACCOUNTS[accountKey]) return recordBlocked("mailbox_not_connected", 409);
  if (!hasGmailSendScope(String(account.scope ?? ""))) return recordBlocked("gmail_send_scope_missing_reconnect_required", 409);

  const dailyLimit = Math.max(1, Math.min(50, Number.parseInt(process.env.NEAS_GMAIL_DAILY_SEND_LIMIT ?? "20", 10) || 20));
  const html = template.render({ contact, company, reference });
  const plain = html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const from = GMAIL_ACCOUNTS[accountKey];
  const mime = [
    `From: ${from}`, `To: ${recipient}`, `Subject: ${template.subject}`,
    "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="neas-boundary"',
    "", "--neas-boundary", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", plain,
    "--neas-boundary", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", html,
    "--neas-boundary--", "",
  ].join("\r\n");
  const raw = Buffer.from(mime, "utf8").toString("base64url");
  let reservationId: number | null = null;

  try {
    const token = await getGmailAccessToken(accountKey);
    if (!hasGmailSendScope(token.scope)) return recordBlocked("gmail_send_scope_missing_reconnect_required", 409);

    // Serialize reservations per mailbox so concurrent requests cannot exceed the rolling daily cap.
    const reservation = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext(${accountKey}))`;
      const counts = await tx`select count(*)::int as n from aiw_gmail_send_audit
        where account_key=${accountKey} and created_at >= now() - interval '24 hours'`;
      if (Number(counts[0]?.n ?? 0) >= dailyLimit) return { id: null, limited: true };
      const rows = await tx`insert into aiw_gmail_send_audit(account_key,actor_id,recipient,template_key,subject,idempotency_key,status)
        values (${accountKey},${user.id},${recipient},${templateKey},${template.subject},${idempotencyKey},'blocked')
        on conflict (idempotency_key) do nothing returning id`;
      return { id: rows[0]?.id ? Number(rows[0].id) : null, limited: false };
    });
    if (reservation.limited) return recordBlocked("daily_mailbox_send_limit_reached", 429);
    if (!reservation.id) return json("This request has already been processed or reserved. Check its audit status before retrying.", 409);
    reservationId = reservation.id;

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { authorization: "Bearer " + token.accessToken, "content-type": "application/json" },
      body: JSON.stringify({ raw }), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) {
      await sql`update aiw_gmail_send_audit set status='failed',error_code=${"gmail_api_" + response.status} where id=${reservationId}`;
      return json("Gmail rejected the message. The attempt was recorded; do not blindly retry.", 502);
    }
    await sql`update aiw_gmail_send_audit set status='sent',provider_message_id=${String(result.id)} where id=${reservationId}`;
    return NextResponse.json({ ok: true, status: "sent", messageId: String(result.id) });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "send_failed";
    if (reservationId) {
      await sql`update aiw_gmail_send_audit set status='failed',error_code=${code} where id=${reservationId}`;
    } else {
      await sql`insert into aiw_gmail_send_audit(account_key,actor_id,recipient,template_key,subject,idempotency_key,status,error_code)
        values (${accountKey},${user.id},${recipient},${templateKey},${template.subject},${idempotencyKey},'failed',${code})
        on conflict (idempotency_key) do nothing`;
    }
    return json("Email was not confirmed as sent. Review the audit record before retrying.", 502);
  }
}
