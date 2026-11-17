import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verify the database connection used by the admin workforce without
    // exposing connection details or requiring an authenticated session.
    await sql`select 1 as ok`;
    return Response.json(
      {
        ok: true,
        service: "neas-web",
        database: "ok",
        timestamp: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "unknown").slice(0, 40)
      : "unknown";
    console.warn("[health] database connectivity check failed", { code });
    return Response.json(
      {
        ok: false,
        service: "neas-web",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
}
