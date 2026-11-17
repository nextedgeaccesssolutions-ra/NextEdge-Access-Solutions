import { sql } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/social-token-crypto";
import { ensureAiwGmailAccountsTable, recordAiwGmailAudit } from "@/lib/aiw-gmail";

export type AiwGmailAccount = "info" | "operations";
const EMAILS: Record<AiwGmailAccount, string> = {
  info: "info.nextedgeaccesssolutions@gmail.com",
  operations: "nextedgeaccesssolutions@gmail.com",
};
const READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

type StoredTokens = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_at: number;
};

export class AiwGmailError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "gmail_error") {
    super(message);
    this.name = "AiwGmailError";
  }
}

function scopeSet(scope: string) {
  return new Set(scope.split(/\s+/).filter(Boolean));
}

function assertScope(scope: string, required: string) {
  if (!scopeSet(scope).has(required)) {
    throw new AiwGmailError("The connected mailbox has not granted the required Gmail permission. Reconnect it and approve the requested scope.", 403, "scope_missing");
  }
}

function decodeTokens(tokenEnc: string): StoredTokens {
  try {
    const parsed = JSON.parse(decrypt(tokenEnc)) as Partial<StoredTokens>;
    if (!parsed.access_token || !parsed.refresh_token || !Number.isFinite(parsed.expires_at)) throw new Error("invalid token payload");
    return parsed as StoredTokens;
  } catch {
    throw new AiwGmailError("Stored Gmail authorization cannot be decrypted. Reconnect the mailbox; do not rotate its encryption key.", 503, "token_decryption_failed");
  }
}

async function accessFor(account: AiwGmailAccount, actorId: number, requiredScope: string) {
  await ensureAiwGmailAccountsTable();
  const rows = await sql`select email,token_enc,scope,status from aiw_gmail_accounts where account_key = ${account} limit 1`;
  const row = rows[0];
  if (!row || row.email !== EMAILS[account] || row.status !== "connected") {
    throw new AiwGmailError("This NEAS mailbox is not connected. Complete Google authorization first.", 409, "mailbox_not_connected");
  }
  const tokens = decodeTokens(String(row.token_enc));
  assertScope(String(row.scope ?? tokens.scope ?? ""), requiredScope);
  if (tokens.expires_at > Date.now() + 120_000) return { accessToken: tokens.access_token, scope: String(row.scope ?? tokens.scope ?? "") };

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new AiwGmailError("Google OAuth client credentials are not configured.", 503, "oauth_config_missing");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const refreshed = await response.json().catch(() => ({}));
  if (!response.ok || !refreshed.access_token) {
    await sql`update aiw_gmail_accounts set status = 'reauth_required', last_error = 'Google refresh failed', updated_at = now() where account_key = ${account}`;
    await recordAiwGmailAudit({ accountKey: account, actorId, action: "token_refresh", outcome: "failure", providerCode: String(refreshed.error ?? response.status), detail: "Google refresh token was rejected; mailbox requires reauthorization." });
    throw new AiwGmailError("Google authorization has expired or been revoked. Reconnect this mailbox.", 401, "reauth_required");
  }

  const next: StoredTokens = {
    access_token: String(refreshed.access_token),
    refresh_token: String(refreshed.refresh_token || tokens.refresh_token),
    token_type: String(refreshed.token_type || tokens.token_type || "Bearer"),
    scope: String(refreshed.scope || tokens.scope || row.scope || ""),
    expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
  };
  const encrypted = encrypt(JSON.stringify(next));
  await sql`update aiw_gmail_accounts set token_enc = ${encrypted}, scope = ${next.scope}, expires_at = now() + (${Number(refreshed.expires_in || 3600)} * interval '1 second'), status = 'connected', last_error = null, updated_at = now() where account_key = ${account}`;
  await recordAiwGmailAudit({ accountKey: account, actorId, action: "token_refresh", outcome: "success", detail: "Access token refreshed; token payload re-encrypted." });
  return { accessToken: next.access_token, scope: next.scope };
}

async function gmailRequest(account: AiwGmailAccount, actorId: number, scope: string, path: string, init?: RequestInit) {
  const { accessToken } = await accessFor(account, actorId, scope);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, {
    ...init,
    headers: { authorization: "Bearer " + accessToken, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerCode = String(data?.error?.status ?? data?.error?.code ?? response.status);
    await recordAiwGmailAudit({ accountKey: account, actorId, action: "gmail_api", outcome: "failure", providerCode, detail: "Gmail API request failed." });
    if (response.status === 401 || response.status === 403) {
      throw new AiwGmailError("Google rejected this mailbox authorization. Reconnect it or review the granted Gmail scopes.", response.status, "gmail_authorization_failed");
    }
    throw new AiwGmailError("Gmail API request failed. Check the NEAS audit log for the provider status.", 502, "gmail_api_failed");
  }
  return data;
}

function mimeRaw(to: string, subject: string, body: string) {
  const encodedSubject = "=?UTF-8?B?" + Buffer.from(subject, "utf8").toString("base64") + "?=";
  const mime = [
    "To: " + to,
    "Subject: " + encodedSubject,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}

function validateMessage(input: { to: string; subject: string; body: string }) {
  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new AiwGmailError("Enter one valid recipient email address.", 400, "invalid_recipient");
  if (!subject || subject.length > 240) throw new AiwGmailError("Subject is required and must be 240 characters or fewer.", 400, "invalid_subject");
  if (!body || body.length > 100_000) throw new AiwGmailError("Message body is required and must be 100,000 characters or fewer.", 400, "invalid_body");
  return { to, subject, body };
}

export async function listAiwGmailInbox(account: AiwGmailAccount, actorId: number, maxResults = 20, query = "") {
  const requested = Number(maxResults);
  const limit = Number.isFinite(requested) ? Math.min(25, Math.max(1, Math.floor(requested))) : 20;
  const params = new URLSearchParams({ maxResults: String(limit) });
  if (query.trim()) params.set("q", query.trim().slice(0, 500));
  const data = await gmailRequest(account, actorId, READ_SCOPE, "messages?" + params.toString());
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const results = await Promise.all(messages.slice(0, limit).map(async (message: { id?: string; threadId?: string }) => {
    if (!message.id) return null;
    const item = await gmailRequest(account, actorId, READ_SCOPE, "messages/" + encodeURIComponent(message.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date");
    const headers = Array.isArray(item.payload?.headers) ? item.payload.headers : [];
    const get = (name: string) => String(headers.find((h: { name?: string }) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "");
    return { id: String(item.id), threadId: String(item.threadId ?? ""), snippet: String(item.snippet ?? ""), from: get("From"), subject: get("Subject"), date: get("Date"), unread: (item.labelIds ?? []).includes("UNREAD") };
  }));
  await recordAiwGmailAudit({ accountKey: account, actorId, action: "inbox_list", outcome: "success", detail: "Inbox metadata retrieved; message bodies are not persisted by NEAS." });
  return results.filter(Boolean);
}

export async function createAiwGmailDraft(account: AiwGmailAccount, actorId: number, input: { to: string; subject: string; body: string }) {
  const message = validateMessage(input);
  const data = await gmailRequest(account, actorId, COMPOSE_SCOPE, "drafts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: { raw: mimeRaw(message.to, message.subject, message.body) } }),
  });
  await recordAiwGmailAudit({ accountKey: account, actorId, action: "draft_create", outcome: "success", detail: "Draft created for recipient " + message.to + "; content excluded from audit log." });
  return { id: String(data.id ?? ""), messageId: String(data.message?.id ?? ""), threadId: String(data.message?.threadId ?? "") };
}

export async function sendAiwGmailMessage(account: AiwGmailAccount, actorId: number, input: { to: string; subject: string; body: string }) {
  await ensureAiwGmailAccountsTable();
  const rows = await sql`select automatic_send_enabled from aiw_gmail_policy where id = 1 limit 1`;
  const enabled = process.env.NEAS_GMAIL_AUTOMATIC_SEND_ENABLED === "true" && rows[0]?.automatic_send_enabled === true;
  if (!enabled) {
    throw new AiwGmailError("Automatic email sending is disabled pending Google verification and successful production acceptance tests.", 423, "sending_disabled");
  }
  const message = validateMessage(input);
  const data = await gmailRequest(account, actorId, COMPOSE_SCOPE, "messages/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw: mimeRaw(message.to, message.subject, message.body) }),
  });
  await recordAiwGmailAudit({ accountKey: account, actorId, action: "send_message", outcome: "success", detail: "Message sent to " + message.to + "; message content excluded from audit log." });
  return { id: String(data.id ?? ""), threadId: String(data.threadId ?? "") };
}
