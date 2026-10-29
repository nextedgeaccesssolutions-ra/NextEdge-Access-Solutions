import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
export async function PUT(req: Request) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const b = await req.json().catch(() => ({}));
  const m = Number(b.markupPercent);
  if (!Number.isFinite(m) || m < 0 || m > 500) return bad("Markup must be between 0 and 500%.");
  await sql`insert into settings (key, value) values ('markup_percent', ${String(m)}) on conflict (key) do update set value = excluded.value`;
  return ok({ markupPercent: m });
}
