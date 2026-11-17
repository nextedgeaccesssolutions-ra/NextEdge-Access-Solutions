import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { AiwGmailError, createAiwGmailDraft, type AiwGmailAccount } from "@/lib/aiw-gmail-service";
import { recordAiwGmailAudit } from "@/lib/aiw-gmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(req.url).origin) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const payload = input as Record<string, unknown>;
  const account = payload.account as AiwGmailAccount;
  if (account !== "info" && account !== "operations") return NextResponse.json({ error: "Choose a valid NEAS mailbox." }, { status: 400 });
  try {
    await loadConfig(true);
    const draft = await createAiwGmailDraft(account, user.id, { to: String(payload.to ?? ""), subject: String(payload.subject ?? ""), body: String(payload.body ?? "") });
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const e = error instanceof AiwGmailError ? error : new AiwGmailError("Draft creation failed.", 502);
    await recordAiwGmailAudit({ accountKey: account, actorId: user.id, action: "draft_create", outcome: "failure", providerCode: e.code, detail: e.message }).catch(() => {});
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
}
