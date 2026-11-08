import { bad, ok } from "@/lib/http";
import { sendMail } from "@/lib/notify";
import { rateLimitRequest } from "@/lib/rate-limit";
import { validateContactInput } from "@/lib/contact";

export const dynamic = "force-dynamic";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]!);

export async function POST(req: Request) {
  const limited = rateLimitRequest(req, "public-contact-form", 5, 15 * 60_000);
  if (limited) return limited;
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) return bad("Your enquiry is too large. Please shorten the message.", 413);

  const raw = await req.json().catch(() => ({}));
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  // Quietly discard automated submissions that fill the visually-hidden honeypot.
  if (typeof body.website === "string" && body.website.trim()) return ok({ success: true });

  if (Buffer.byteLength(JSON.stringify(body), "utf8") > 64 * 1024) return bad("Your enquiry is too large. Please shorten the message.", 413);
  const validated = validateContactInput(body);
  if (!validated.data) return bad(validated.error || "Please check your enquiry details.");

  const data = validated.data;
  const subject = `Website enquiry: ${data.service || "General"} — ${data.name}`;
  const html = [
    "<h2>New NEAS website enquiry</h2>",
    `<p><b>Name:</b> ${escapeHtml(data.name)}</p>`,
    `<p><b>Company:</b> ${escapeHtml(data.company || "Not provided")}</p>`,
    `<p><b>Email:</b> ${escapeHtml(data.email)}</p>`,
    `<p><b>Phone:</b> ${escapeHtml(data.phone || "Not provided")}</p>`,
    `<p><b>Service:</b> ${escapeHtml(data.service || "General enquiry")}</p>`,
    `<p><b>Message:</b><br>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>`,
    "<p>Reply directly to this email to contact the enquirer.</p>",
  ].join("");

  const sent = await sendMail(
    "sales@nextedge-access-solutions.com",
    subject,
    html,
    "website_inquiry",
    data.email,
  );

  if (!sent) {
    return bad("Your enquiry could not be sent right now. Please call or WhatsApp NEAS instead.", 503);
  }
  return ok({ success: true, message: "Your enquiry has been submitted successfully. The NEAS team will follow up." });
}
