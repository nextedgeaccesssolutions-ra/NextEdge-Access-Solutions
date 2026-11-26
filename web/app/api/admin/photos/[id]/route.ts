import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { bad } from "@/lib/http";

const MAX = 4 * 1024 * 1024; // stay under the 4.5 MB function response limit
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Admin-only: returns the bytes of a product's current photo (stored upload or external link) for the photo backup. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const { id } = await params;
  const [p] = await sql`select image_url from products where id = ${id}`;
  if (!p) return bad("Product not found.", 404);
  const url: string = p.image_url || "";
  if (!url) return bad("This product has no photo.", 404);

  const local = url.match(/^\/api\/img\/([a-f0-9]{16})$/);
  if (local) {
    const [r] =
      await sql`select mime, data from product_images where id = ${local[1]}`;
    if (!r) return bad("Stored photo is missing.", 404);
    return new Response(new Uint8Array(r.data), {
      headers: { "content-type": r.mime, "cache-control": "no-store" },
    });
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return bad("Photo link is not valid.", 422);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:")
    return bad("Photo link is not valid.", 422);
  try {
    const r = await fetch(u, {
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
      headers: { accept: "image/*" },
    });
    if (!r.ok) return bad(`Photo host answered ${r.status}.`, 502);
    const type = (r.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!TYPES.includes(type))
      return bad("Link did not return a JPG, PNG, WebP or GIF image.", 502);
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > MAX) return bad("Photo is larger than 4 MB.", 413);
    return new Response(buf, {
      headers: { "content-type": type, "cache-control": "no-store" },
    });
  } catch {
    return bad("Could not download the photo from its host.", 502);
  }
}
