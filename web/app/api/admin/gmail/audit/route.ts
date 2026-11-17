import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ensureAiwGmailAccountsTable } from "@/lib/aiw-gmail";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  await ensureAiwGmailAccountsTable();
  const rows = await sql`select id,account_key,actor_id,action,outcome,provider_code,detail,created_at
    from aiw_gmail_audit order by created_at desc limit 30`;
  return NextResponse.json({ ok: true, events: rows });
}
