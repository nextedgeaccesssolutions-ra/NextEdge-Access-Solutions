import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { AiwGmailError, listAiwGmailInbox, type AiwGmailAccount } from "@/lib/aiw-gmail-service";
import { recordAiwGmailAudit } from "@/lib/aiw-gmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const url = new URL(req.url);
  const account = url.searchParams.get("account") as AiwGmailAccount | null;
  if (account !== "info" && account !== "operations") return NextResponse.json({ error: "Choose a valid NEAS mailbox." }, { status: 400 });
  try {
    await loadConfig(true);
    const messages = await listAiwGmailInbox(account, user.id, Number(url.searchParams.get("maxResults") || 20), url.searchParams.get("q") || "");
    return NextResponse.json({ ok: true, account, messages });
  } catch (error) {
    const e = error instanceof AiwGmailError ? error : new AiwGmailError("Inbox retrieval failed.", 502);
    await recordAiwGmailAudit({ accountKey: account, actorId: user.id, action: "inbox_list", outcome: "failure", providerCode: e.code, detail: e.message }).catch(() => {});
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
}
