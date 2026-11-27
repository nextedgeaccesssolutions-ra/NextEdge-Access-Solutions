import { requireAdmin } from "@/lib/admin";
import { syncWebsiteCatalog } from "@/lib/sheet-writeback";
import { bad, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const result = await syncWebsiteCatalog();
  if (result.skipped) return bad(result.skipped, 503);
  if (result.error) return bad(result.error, 502);
  return ok({ result: result.result });
}
