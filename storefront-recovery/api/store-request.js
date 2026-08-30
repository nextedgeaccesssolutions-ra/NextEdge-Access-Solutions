const DEFAULT_CMS_ORIGIN = "https://neascontent-bhnm8kjp.manus.space";
const ALLOWED_TYPES = new Set(["service_booking", "meeting_request", "equipment_quote"]);

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validate(body) {
  if (!body || typeof body !== "object" || !ALLOWED_TYPES.has(body.type)) return null;
  if (body.website) return { spam: true };
  const name = text(body.name, 160);
  const email = text(body.email, 320);
  const details = text(body.details, 5000);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !details || body.consent !== true) return null;
  const items = Array.isArray(body.items)
    ? body.items.slice(0, 50).map((item) => ({ name: text(item?.name, 180), quantity: Number(item?.quantity) })).filter((item) => item.name && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 1000)
    : [];
  return {
    type: body.type,
    name,
    email,
    telephone: text(body.telephone, 80),
    company: text(body.company, 180),
    service: text(body.service, 160),
    location: text(body.location, 500),
    coordinates: text(body.coordinates, 120),
    preferredDate: text(body.preferredDate, 40),
    preferredTime: text(body.preferredTime, 40),
    details,
    items,
    consent: true,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "Method not allowed." });
  }

  const input = validate(request.body);
  if (input?.spam) return response.status(202).json({ success: true });
  if (!input) return response.status(400).json({ message: "Review the required name, email, details, and consent fields." });

  const cmsOrigin = process.env.MANUS_CMS_ORIGIN || DEFAULT_CMS_ORIGIN;
  try {
    const upstream = await fetch(`${cmsOrigin}/api/trpc/publicSite.submitContact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ json: { formName: `store_${input.type}`, payload: input } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`CMS returned ${upstream.status}`);
    const data = await upstream.json();
    if (data?.error) throw new Error("CMS rejected the request");
    response.setHeader("Cache-Control", "no-store");
    return response.status(202).json({ success: true });
  } catch {
    return response.status(502).json({ message: "The NEAS request service is temporarily unavailable. Email info.nextedgeaccesssolutions@gmail.com or try again shortly." });
  }
}
