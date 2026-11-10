import { randomBytes } from "node:crypto";
import { sql, listProducts } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { bad, ok, str, BANK } from "@/lib/http";
import { notifyNewOrder } from "@/lib/notify";
import { isPaymentSlipSizeValid, isValidPaymentSlip } from "@/lib/payment-slip";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return bad("Please log in.", 401);
  const orders = await sql`select id, reference, status, total, created_at from orders where user_id = ${user.id} order by created_at desc`;
  return ok(orders);
}

export async function POST(req: Request) {
  const limited = rateLimitRequest(req, "orders-create", 10, 60_000);
  if (limited) return limited;
  const user = await getUser();
  if (!user) return bad("Please log in to place an order.", 401);

  const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");
  const form = isMultipart ? await req.formData().catch(() => null) : null;
  if (isMultipart && !form) return bad("The order form could not be read. Please try again.");

  const rawBody = form ? Object.fromEntries(form.entries()) : await req.json().catch(() => ({}));
  const b: Record<string, unknown> = rawBody && typeof rawBody === "object" ? rawBody as Record<string, unknown> : {};
  let items: unknown;
  try {
    items = form ? JSON.parse(String(form.get("items") || "[]")) : b.items;
  } catch {
    return bad("Your cart data is invalid. Please refresh and try again.");
  }

  const name = str(b.deliveryName, 160);
  const phone = str(b.deliveryPhone, 40);
  const address = str(b.deliveryAddress, 600);
  const email = str(b.deliveryEmail, 320)?.toLowerCase() ?? null;
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 1000) : null;
  const paymentMethod = str(b.paymentMethod, 40) || "bank_transfer";

  if (!name || !phone || !email || !address) return bad("Enter your name, mobile number, email and address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Enter a valid email address.");
  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^[+0-9][0-9\s().-]{6,39}$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) return bad("Enter a valid mobile number.");
  if (paymentMethod !== "bank_transfer") return bad("Online card payment is not available yet.");

  const slip = form?.get("paymentSlip");
  if (!(slip instanceof File) || !slip.size) return bad("Upload your payment slip before sending the order.");
  if (!isPaymentSlipSizeValid(slip.size)) {
    return bad("Payment slip must be a valid JPEG, PNG, WebP or PDF no larger than 4 MB.");
  }
  const slipBytes = new Uint8Array(await slip.arrayBuffer());
  if (!isValidPaymentSlip(slip.type, slipBytes)) {
    return bad("Payment slip must be a valid JPEG, PNG, WebP or PDF no larger than 4 MB.");
  }
  const slipData = `data:${slip.type};base64,${Buffer.from(slipBytes).toString("base64")}`;
  const safeSlipName = slip.name.replace(/[\r\n\0]/g, "").slice(0, 180) || "payment-slip";

  if (!Array.isArray(items) || !items.length || items.length > 100) return bad("Your cart is empty or contains too many items.");

  let products;
  try {
    products = await listProducts();
  } catch {
    return bad("Ordering is temporarily unavailable. Please try again later.", 503);
  }
  const catalog = new Map(products.map((p) => [p.id, p]));
  const quantities = new Map<string, number>();
  for (const it of items) {
    const id = String((it as { id?: unknown })?.id ?? "");
    const qty = Number((it as { quantity?: unknown })?.quantity);
    const p = catalog.get(id);
    if (!p || !Number.isFinite(p.price) || p.price < 0 || !Number.isInteger(qty) || qty < 1) return bad("An item in your cart is no longer available. Please refresh.");
    const combined = (quantities.get(id) ?? 0) + qty;
    if (combined > 999) return bad("Maximum quantity per item is 999.");
    quantities.set(id, combined);
  }

  const lines = [...quantities.entries()].map(([id, qty]) => {
    const p = catalog.get(id)!;
    return { id: p.id, name: p.name, code: p.code, price: p.price, qty };
  });
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  if (!Number.isFinite(total) || total <= 0) return bad("The order total is invalid.");

  const d = new Date();
  const reference = `NEAS-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const order = await sql.begin(async (tx) => {
    const [o] = await tx`insert into orders (reference, user_id, total, delivery_name, delivery_phone, delivery_email, delivery_address, payment_method, payment_slip_name, payment_slip_type, payment_slip_data, notes)
      values (${reference}, ${user.id}, ${total}, ${name}, ${phone}, ${email}, ${address}, ${paymentMethod}, ${safeSlipName}, ${slip.type}, ${slipData}, ${notes}) returning id, reference, total, status`;
    for (const line of lines) await tx`insert into order_items (order_id, product_id, name, code, unit_price, quantity) values (${o.id}, ${line.id}, ${line.name}, ${line.code}, ${line.price}, ${line.qty})`;
    return o;
  });
  await notifyNewOrder(order.id).catch(() => {});
  return ok({ order, bank: BANK });
}
