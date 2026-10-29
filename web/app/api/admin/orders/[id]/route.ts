import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
const STATUSES = ["awaiting_payment", "paid", "processing", "shipped", "completed", "cancelled"];
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!STATUSES.includes(b.status)) return bad("Unknown status.");
  await sql`update orders set status = ${b.status}, updated_at = now() where id = ${Number(id)}`;
  return ok();
}
