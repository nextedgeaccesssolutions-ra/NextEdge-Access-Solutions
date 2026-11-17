import { sql } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/social-token-crypto";
import { decrypt, encrypt } from "@/lib/social-token-crypto";

let ready: Promise<void> | null = null;

/** Idempotently bootstrap the dedicated Gmail OAuth account table at first admin use. */
export function ensureAiwGmailAccountsTable(): Promise<void> {
  ready ??= (async () => {
    await sql`create table if not exists aiw_gmail_accounts (
      id bigserial primary key,
      account_key text not null unique check (account_key in ('info','operations')),
      email text not null unique,
      token_enc text not null,
      scope text not null default '',
      expires_at timestamptz,
      status text not null default 'connected' check (status in ('connected','reauth_required','error')),
      last_error text,
      connected_by int references users(id) on delete set null,
      connected_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
    await sql`create index if not exists aiw_gmail_accounts_status_idx on aiw_gmail_accounts(status)`;
    await sql`create table if not exists aiw_gmail_send_audit (
      id bigserial primary key,
      account_key text not null check (account_key in ('info','operations')),
      actor_id int references users(id) on delete set null,
      recipient text not null,
      template_key text not null,
      subject text not null,
      idempotency_key text not null unique,
      status text not null check (status in ('sent','blocked','failed')),
      provider_message_id text,
      error_code text,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists aiw_gmail_send_audit_daily_idx on aiw_gmail_send_audit(account_key, created_at desc)`;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export const GMAIL_ACCOUNTS = {
  info: "info.nextedgeaccesssolutions@gmail.com",
  operations: "nextedgeaccesssolutions@gmail.com",
} as const;
export type GmailAccountKey = keyof typeof GMAIL_ACCOUNTS;

export function gmailSendScopeApproved() {
  return process.env.NEAS_GMAIL_SEND_ENABLED === "true" &&
    process.env.GOOGLE_GMAIL_SEND_SCOPE_APPROVED === "true";
}
export function hasGmailSendScope(scope: string) {
  return scope.split(/\s+/).includes("https://www.googleapis.com/auth/gmail.send");
}
export function approvedRecipient(email: string) {
  const allowed = (process.env.NEAS_GMAIL_APPROVED_RECIPIENTS ?? "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}
export const GMAIL_TEMPLATES = {
  quote_followup: {
    subject: "Following up on your NEAS quotation",
    render: (v: { contact: string; company: string; reference: string }) =>
      `<p>Dear ${escapeHtml(v.contact)},</p><p>We are following up on NEAS quotation <strong>${escapeHtml(v.reference)}</strong> prepared for ${escapeHtml(v.company)}.</p><p>Please let us know if you would like to discuss the scope, schedule, or technical requirements.</p><p>Regards,<br/>NextEdge Access Solutions (NEAS)</p>`,
  },
  training_information: {
    subject: "Your NEAS training enquiry",
    render: (v: { contact: string; company: string; reference: string }) =>
      `<p>Dear ${escapeHtml(v.contact)},</p><p>Thank you for your interest in NEAS training services for ${escapeHtml(v.company)}.</p><p>Our team can provide further information about course availability, prerequisites, and registration. Enquiry reference: ${escapeHtml(v.reference)}.</p><p>Regards,<br/>NextEdge Access Solutions (NEAS)</p>`,
  },
} as const;

type TokenBundle = { refresh_token: string; access_token?: string; token_type?: string; scope?: string; expires_at?: number };
export async function getGmailAccessToken(accountKey: GmailAccountKey) {
  const rows = await sql`select token_enc, scope, email, status from aiw_gmail_accounts where account_key=${accountKey} limit 1`;
  const row = rows[0];
  if (!row || row.status !== "connected" || row.email !== GMAIL_ACCOUNTS[accountKey]) throw new Error("mailbox_not_connected");
  const bundle = JSON.parse(decrypt(String(row.token_enc))) as TokenBundle;
  if (!bundle.refresh_token) throw new Error("refresh_token_missing");
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) throw new Error("oauth_client_missing");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: bundle.refresh_token, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const fresh = await response.json();
  if (!response.ok || !fresh.access_token) {
    await sql`update aiw_gmail_accounts set status='reauth_required', last_error='token_refresh_failed', updated_at=now() where account_key=${accountKey}`;
    throw new Error("token_refresh_failed");
  }
  const next: TokenBundle = { ...bundle, access_token: fresh.access_token, expires_at: Date.now() + Number(fresh.expires_in || 3600) * 1000 };
  await sql`update aiw_gmail_accounts set token_enc=${encrypt(JSON.stringify(next))}, expires_at=now() + (${Number(fresh.expires_in || 3600)} * interval '1 second'), updated_at=now() where account_key=${accountKey}`;
  return { accessToken: String(fresh.access_token), scope: String(row.scope ?? bundle.scope ?? "") };
}
