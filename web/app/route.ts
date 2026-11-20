import { renderHomepage } from "@/lib/homepage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  // `?service=<id>` is the deep link the service modal's share button builds. It
  // selects the Open Graph tags for crawlers; the browser opens the matching
  // modal client-side. Unknown values are ignored and render the plain homepage.
  const service = new URL(request.url).searchParams.get("service");
  return new Response(await renderHomepage(service), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
}
