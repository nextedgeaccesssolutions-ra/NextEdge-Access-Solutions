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
  let input: any;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const account = input?.account as AiwGmailAccount;
  if (account !== "info" && account !== "operations") return NextResponse.json({ error: "Choose a valid NEAS mailbox." }, { status: 400 });
  try {
    await loadConfig(true);
    const draft = await createAiwGmailDraft(account, user.id, { to: String(input?.to ?? ""), subject: String(input?.subject ?? ""), body: String(input?.body ?? "") });
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const e = error instanceof AiwGmailError ? error : new AiwGmailError("Draft creation failed.", 502);
    await recordAiwGmailAudit({ accountKey: account, actorId: user.id, action: "draft_create", outcome: "failure", providerCode: e.code, detail: e.message }).catch(() => {});
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
}
