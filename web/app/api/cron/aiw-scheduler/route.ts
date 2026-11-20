import { timingSafeEqual } from "node:crypto";
import { ok, bad } from "@/lib/http";
import { cronToken } from "@/lib/cron-token";
import { rateLimitRequest } from "@/lib/rate-limit";
import { aiwSupabase, aiwAudit, aiwNextRunAt, type AiwRow } from "@/lib/aiw-supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Runtime for the AI Workforce schedule registry.
 *
 *  Until this route existed, rows in aiw_schedules had no consumer, so an
 *  "enabled" schedule displayed as active while nothing ever ran. This claims
 *  each due schedule atomically and queues one task for its owning agent.
 *
 *  It creates work for human-reviewed queues only. It does not execute agent
 *  work, send anything externally, or spend. Auth: "Authorization: Bearer
 *  <token>" or "?token=<token>", matching /api/cron/publish. */
async function run(req: Request) {
  const limited = rateLimitRequest(req, "cron-aiw-scheduler", 4, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
  const expected = cronToken();
  if (!expected) return bad("The AI Workforce scheduler is not configured.", 503);
  if (!given || !same(given, expected)) return bad("Not authorized.", 401);
  // Production-only, so a preview deployment can never queue work into the
  // live workforce tables while a change is still under review.
  if (process.env.VERCEL_ENV !== "production") return bad("The AI Workforce scheduler is disabled outside Production.", 403);

  const startedAt = new Date();
  const results: { schedule: string; name: string; outcome: string; detail?: string; taskId?: string }[] = [];

  let due: AiwRow[] = [];
  try {
    due = await aiwSupabase(
      `aiw_schedules?enabled=eq.true&or=(next_run_at.is.null,next_run_at.lte.${startedAt.toISOString()})&select=id,name,description,cadence,agent_id,next_run_at&order=name.asc&limit=25`,
    ) as AiwRow[];
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Could not read the schedule registry.", 502);
  }

  for (const schedule of due) {
    const id = String(schedule.id);
    const name = String(schedule.name || "Unnamed schedule");
    const agentId = String(schedule.agent_id || "").toLowerCase();
    try {
      // Claim the slot first. The filter repeats the due-condition so two
      // overlapping invocations cannot both advance the same row.
      const previous = schedule.next_run_at ? String(schedule.next_run_at) : "";
      const claimFilter = previous
        ? `aiw_schedules?id=eq.${encodeURIComponent(id)}&next_run_at=eq.${encodeURIComponent(previous)}`
        : `aiw_schedules?id=eq.${encodeURIComponent(id)}&next_run_at=is.null`;
      const claimed = await aiwSupabase(claimFilter, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ next_run_at: aiwNextRunAt(String(schedule.cadence || "daily"), startedAt), last_run_at: startedAt.toISOString() }),
      }) as AiwRow[];
      if (!claimed?.length) {
        results.push({ schedule: id, name, outcome: "skipped", detail: "Already claimed by a concurrent run." });
        continue;
      }

      if (!agentId) {
        results.push({ schedule: id, name, outcome: "skipped", detail: "No owning agent is assigned." });
        await aiwAudit("system", "scheduler", "schedule.skipped", "aiw_schedule", id, "failure", { reason: "no_agent" });
        continue;
      }

      const agents = await aiwSupabase(
        `aiw_agents?agent_id=eq.${encodeURIComponent(agentId)}&select=agent_id,name,department_code,enabled,execution_mode&limit=1`,
      ) as AiwRow[];
      const agent = agents[0];
      if (!agent || agent.enabled !== true || agent.execution_mode === "disabled") {
        results.push({ schedule: id, name, outcome: "skipped", detail: `Agent ${agentId} is unavailable or disabled.` });
        await aiwAudit("system", "scheduler", "schedule.skipped", "aiw_schedule", id, "denied", { reason: "agent_unavailable", agentId });
        continue;
      }

      const objective = String(schedule.description || "").trim()
        || `Scheduled run of "${name}". Produce the recurring deliverable for this cadence and state any information still required.`;
      // Deterministic key: a replayed cron call for the same slot is rejected by
      // the idempotency constraint instead of queueing the task twice.
      const idempotencyKey = `schedule:${id}:${previous || startedAt.toISOString()}`.slice(0, 160);

      const taskRows = await aiwSupabase("aiw_tasks", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title: `${name} · scheduled`.slice(0, 180),
          objective: objective.slice(0, 6000),
          agent_id: agentId,
          department_code: agent.department_code,
          status: "queued",
          priority: "normal",
          input: { source: "scheduler", scheduleId: id, cadence: schedule.cadence ?? null, claimedAt: startedAt.toISOString() },
          idempotency_key: idempotencyKey,
          requires_approval: false,
          approval_category: null,
          max_delegation_depth: 0,
        }),
      }) as AiwRow[];

      const task = taskRows?.[0];
      if (!task) {
        results.push({ schedule: id, name, outcome: "duplicate", detail: "This slot was already queued." });
        continue;
      }

      await aiwSupabase("aiw_task_events", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          task_id: task.id,
          event_type: "task_created",
          actor_type: "system",
          actor_id: "scheduler",
          message: `Queued by the "${name}" schedule for ${String(agent.name)}.`,
          payload: { scheduleId: id, cadence: schedule.cadence ?? null },
        }),
      });
      await aiwAudit("system", "scheduler", "schedule.run", "aiw_schedule", id, "success", { taskId: String(task.id), agentId, cadence: schedule.cadence ?? null });
      results.push({ schedule: id, name, outcome: "queued", taskId: String(task.id) });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown scheduler error.";
      // A duplicate idempotency key is the expected outcome of a replayed slot,
      // not a failure worth alerting on.
      const duplicate = /duplicate key|already exists|23505/i.test(detail);
      results.push({ schedule: id, name, outcome: duplicate ? "duplicate" : "failed", detail: duplicate ? "This slot was already queued." : detail });
      if (!duplicate) await aiwAudit("system", "scheduler", "schedule.run", "aiw_schedule", id, "failure", { error: detail.slice(0, 500) }).catch(() => {});
    }
  }

  return ok({
    ran: startedAt.toISOString(),
    checked: due.length,
    queued: results.filter((r) => r.outcome === "queued").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    results,
  });
}

export const GET = run;
export const POST = run;
