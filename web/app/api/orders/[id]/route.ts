import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { bad, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return bad("Please log in.", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.status !== "cancelled") return bad("Invalid order update.", 400);
  const result = await sql`update orders set status = 'cancelled', updated_at = now() where id = ${Number(id)} and user_id = ${user.id} and status = 'awaiting_payment' returning id`;
  if (!result.length) return bad("Only unpaid orders can be cancelled.", 409);
  return ok({ updated: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return bad("Please log in.", 401);
  const { id } = await params;
  const result = await sql`delete from orders where id = ${Number(id)} and user_id = ${user.id} and status = 'cancelled' returning id`;
  if (!result.length) return bad("Only cancelled orders can be deleted.", 409);
  return ok({ deleted: true });
}
