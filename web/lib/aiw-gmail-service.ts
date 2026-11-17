import { ensureAiwGmailAccountsTable, getGmailAccessToken, recordAiwGmailAudit } from "@/lib/aiw-gmail";
import { isValidEmailAddress } from "@/lib/aiw-email-validation";

export type AiwGmailAccount = "info" | "operations";
const READ_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
const COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

export class AiwGmailError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "gmail_error") {
    super(message);
    this.name = "AiwGmailError";
  }
}

function assertScope(scope: string, required: string) {
  if (!scope.split(/\s+/).includes(required)) {
    throw new AiwGmailError("The connected mailbox has not granted the required Gmail permission. Reconnect it and approve the requested scope.", 403, "scope_missing");
  }
}

async function accessFor(account: AiwGmailAccount, actorId: number, requiredScope: string) {
  await ensureAiwGmailAccountsTable();
  const token = await getGmailAccessToken(account, actorId);
  assertScope(token.scope, requiredScope);
  return token;
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
  if (!isValidEmailAddress(to)) throw new AiwGmailError("Enter one valid recipient email address (maximum 254 characters).", 400, "invalid_recipient");
  if (!subject || subject.length > 240) throw new AiwGmailError("Subject is required and must be 240 characters or fewer.", 400, "invalid_subject");
  if (!body || body.length > 100_000) throw new AiwGmailError("Message body is required and must be 100,000 characters or fewer.", 400, "invalid_body");
  return { to, subject, body };
}

export async function listAiwGmailInbox(account: AiwGmailAccount, actorId: number, maxResults = 20) {
  const requested = Number(maxResults);
  const limit = Number.isFinite(requested) ? Math.min(25, Math.max(1, Math.floor(requested))) : 20;
  const params = new URLSearchParams({ maxResults: String(limit) });
  const data = await gmailRequest(account, actorId, READ_SCOPE, "messages?" + params.toString());
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const results = await Promise.all(messages.slice(0, limit).map(async (message: { id?: string }) => {
    if (!message.id) return null;
    const item = await gmailRequest(account, actorId, READ_SCOPE, "messages/" + encodeURIComponent(message.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date");
    const headers = Array.isArray(item.payload?.headers) ? item.payload.headers : [];
    const get = (name: string) => String(headers.find((header: { name?: string }) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "");
    return { id: String(item.id), threadId: String(item.threadId ?? ""), from: get("From"), subject: get("Subject"), date: get("Date"), unread: (item.labelIds ?? []).includes("UNREAD") };
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
  await recordAiwGmailAudit({ accountKey: account, actorId, action: "draft_create", outcome: "success", detail: "Gmail draft created; message content and recipient excluded from audit log." });
  return { id: String(data.id ?? ""), messageId: String(data.message?.id ?? ""), threadId: String(data.message?.threadId ?? "") };
}
