import { randomBytes } from "node:crypto";
import { sql, listProducts } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { bad, ok, str, BANK } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return bad("Please log in.", 401);
  const orders = await sql`select id, reference, status, total, created_at from orders where user_id = ${user.id} order by created_at desc`;
  return ok(orders);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return bad("Please log in to place an order.", 401);
  const b = await req.json().catch(() => ({}));
  const name = str(b.deliveryName, 160), phone = str(b.deliveryPhone, 40), address = str(b.deliveryAddress, 600);
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 1000) : null;
  if (!name || !phone || !address) return bad("Enter delivery name, mobile number and address.");
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 100) return bad("Your cart is empty.");
  const catalog = new Map((await listProducts()).map((p) => [p.id, p]));
  const lines: { id: string; name: string; code: string; price: number; qty: number }[] = [];
  for (const it of b.items) {
    const p = catalog.get(String(it?.id));
    const qty = Number(it?.quantity);
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > 999) return bad("An item in your cart is no longer available. Please refresh.");
    lines.push({ id: p.id, name: p.name, code: p.code, price: p.price, qty });
  }
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const d = new Date();
  const reference = `NEAS-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const order = await sql.begin(async (tx) => {
    const [o] = await tx`insert into orders (reference, user_id, total, delivery_name, delivery_phone, delivery_address, notes)
      values (${reference}, ${user.id}, ${total}, ${name}, ${phone}, ${address}, ${notes}) returning id, reference, total, status`;
    for (const l of lines) await tx`insert into order_items (order_id, product_id, name, code, unit_price, quantity) values (${o.id}, ${l.id}, ${l.name}, ${l.code}, ${l.price}, ${l.qty})`;
    return o;
  });
  return ok({ order, bank: BANK });
}
