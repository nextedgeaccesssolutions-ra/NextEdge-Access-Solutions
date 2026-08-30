const DEFAULT_CMS_ORIGIN = "https://neascontent-bhnm8kjp.manus.space";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ message: "Method not allowed." });
  }

  const cmsOrigin = process.env.MANUS_CMS_ORIGIN || DEFAULT_CMS_ORIGIN;
  try {
    const upstream = await fetch(`${cmsOrigin}/api/trpc/publicSite.globals?input=${encodeURIComponent(JSON.stringify({ json: null }))}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error(`CMS returned ${upstream.status}`);
    const data = await upstream.json();
    const globals = data?.result?.data?.json;
    const catalog = Array.isArray(globals)
      ? globals.find((entry) => String(entry?.name || "").trim().toLowerCase() === "store catalog")
      : null;
    let products = null;
    if (catalog?.content) {
      const parsed = JSON.parse(catalog.content);
      products = Array.isArray(parsed) ? parsed : parsed?.products;
    }
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json({ products });
  } catch {
    response.setHeader("Cache-Control", "public, s-maxage=30");
    return response.status(200).json({ products: null });
  }
}
