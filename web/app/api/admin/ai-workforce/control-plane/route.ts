import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://smlxekhbaefbvdbfxpew.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type Row = Record<string, unknown>;
const response = (data: unknown, status = 200) => NextResponse.json(data, { status });

async function requireAdmin() {
  const user = await getUser();
  return user?.role === "admin" ? user : null;
}

async function supabase(path: string, init: RequestInit = {}) {
  if (!SUPABASE_KEY) throw new Error("SUPABASE_SECRET_KEY is not configured in the Vercel server environment. Add the Supabase project secret key to Production and Preview; never expose it as NEXT_PUBLIC.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Supabase request failed (${res.status}): ${raw.slice(0, 300)}`);
  return raw ? JSON.parse(raw) : null;
}

async function audit(actorId: number, action: string, resourceType: string, resourceId: string | null, outcome: "success" | "denied" | "failure" | "pending", details: Row = {}) {
  await supabase("aiw_audit_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor_type: "human", actor_id: String(actorId), action, resource_type: resourceType, resource_id: resourceId, outcome, details }),
  });
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return response({ error: "Admin access required." }, 403);
  try {
    const [agents, tasks, approvals, schedules, events, auditEvents] = await Promise.all([
      supabase("aiw_agents?select=agent_id,name,department,department_code,sort_order,manager_agent_id,job_description,skills,tools,permissions,approval_level,enabled,execution_mode,runtime_status,last_execution_at,next_scheduled_at,performance_score&order=sort_order.asc"),
      supabase("aiw_tasks?select=id,title,objective,agent_id,parent_task_id,department_code,status,priority,dependencies,attempt_count,max_attempts,requires_approval,approval_category,created_by,assigned_by,created_at,updated_at,due_at,error_message&order=created_at.desc&limit=100"),
      supabase("aiw_approvals?select=id,task_id,category,title,details,status,requested_by,reviewed_by,review_note,requested_at,reviewed_at&order=requested_at.desc&limit=100"),
      supabase("aiw_schedules?select=id,name,description,cadence,cron_expression,timezone,enabled,agent_id,last_run_at,next_run_at&order=name.asc"),
      supabase("aiw_task_events?select=id,task_id,event_type,actor_type,actor_id,message,created_at&order=created_at.desc&limit=50"),
      supabase("aiw_audit_events?select=id,actor_type,actor_id,action,resource_type,resource_id,outcome,details,created_at&order=created_at.desc&limit=50"),
    ]);
    const taskRows = tasks as Row[];
    const agentRows = agents as Row[];
    return response({
      ok: true,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      agents,
      tasks,
      approvals,
      schedules,
      events,
      auditEvents,
      metrics: {
        agentProfiles: agentRows.length,
        enabledProfiles: agentRows.filter((a) => a.enabled === true).length,
        configuredRuntimes: agentRows.filter((a) => a.runtime_status !== "not_configured").length,
        queuedTasks: taskRows.filter((t) => t.status === "queued" || t.status === "assigned").length,
        runningTasks: taskRows.filter((t) => t.status === "running").length,
        blockedTasks: taskRows.filter((t) => t.status === "blocked" || t.status === "dead_letter").length,
        pendingApprovals: (approvals as Row[]).filter((a) => a.status === "pending").length,
        enabledSchedules: (schedules as Row[]).filter((s) => s.enabled === true).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workforce control plane.";
    const status = message.includes("not configured") ? 503 : 502;
    return response({ error: message, source: "supabase", configured: status !== 503 }, status);
  }
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return response({ error: "Admin access required." }, 403);
  try {
    const body = await req.json() as Row;
    const action = String(body.action || "");
    if (action === "createTask") {
      const title = String(body.title || "").trim().slice(0, 180);
      const objective = String(body.objective || "").trim().slice(0, 6000);
      const agentId = String(body.agentId || "").trim().toLowerCase().slice(0, 100);
      const priority = ["low", "normal", "high", "critical"].includes(String(body.priority)) ? String(body.priority) : "normal";
      const category = String(body.approvalCategory || "");
      const approvalCategories = ["external_communication","contract","payment","hiring","safety_signoff","database_destructive","credentials_access","production_deploy","security_policy","other"];
      const requiresApproval = approvalCategories.includes(category);
      if (!title || !objective || !agentId) return response({ error: "Title, objective and assigned agent are required." }, 400);
      const found = await supabase(`aiw_agents?agent_id=eq.${encodeURIComponent(agentId)}&select=agent_id,name,department_code,enabled,execution_mode&limit=1`) as Row[];
      if (!found.length || found[0].enabled !== true) return response({ error: "Selected agent is unavailable or disabled." }, 409);
      const idempotencyKey = String(body.idempotencyKey || crypto.randomUUID()).slice(0, 160);
      const taskRows = await supabase("aiw_tasks", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title, objective, agent_id: agentId, department_code: found[0].department_code,
          status: requiresApproval ? "needs_approval" : "queued",
          priority, input: body.input && typeof body.input === "object" ? body.input : {},
          created_by: String(user.id), assigned_by: String(user.id), idempotency_key: idempotencyKey,
          requires_approval: requiresApproval, approval_category: requiresApproval ? category : null,
          max_delegation_depth: 0,
        }),
      }) as Row[];
      const task = taskRows[0];
      if (!task) return response({ error: "Task creation returned no record." }, 502);
      await supabase("aiw_task_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ task_id: task.id, event_type: "task_created", actor_type: "human", actor_id: String(user.id), message: `Task assigned to ${found[0].name}.`, payload: { priority, requiresApproval } }),
      });
      if (requiresApproval) {
        await supabase("aiw_approvals", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ task_id: task.id, category, title, details: { objective }, requested_by: String(user.id) }),
        });
      }
      await audit(user.id, "task.create", "aiw_task", String(task.id), requiresApproval ? "pending" : "success", { agentId, priority, requiresApproval });
      return response({ ok: true, task, requiresApproval }, 201);
    }
    if (action === "reviewApproval") {
      const id = String(body.id || "");
      const decision = String(body.decision || "");
      const note = String(body.note || "").trim().slice(0, 2000);
      if (!id || !["approved", "rejected"].includes(decision)) return response({ error: "A valid approval ID and decision are required." }, 400);
      const pending = await supabase(`aiw_approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending&select=id,task_id,category,requested_by&limit=1`) as Row[];
      if (!pending.length) return response({ error: "Approval is no longer pending." }, 409);
      if (String(pending[0].requested_by) === String(user.id)) return response({ error: "A requester cannot approve their own request. A second authorized administrator must review it." }, 403);
      await supabase(`aiw_approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: decision, reviewed_by: String(user.id), review_note: note, reviewed_at: new Date().toISOString() }),
      });
      await supabase(`aiw_tasks?id=eq.${encodeURIComponent(String(pending[0].task_id))}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: decision === "approved" ? "queued" : "cancelled", updated_at: new Date().toISOString() }),
      });
      await supabase("aiw_task_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ task_id: pending[0].task_id, event_type: `approval_${decision}`, actor_type: "human", actor_id: String(user.id), message: note || `Approval ${decision} by administrator.`, payload: { approvalId: id, category: pending[0].category } }),
      });
      await audit(user.id, `approval.${decision}`, "aiw_approval", id, "success", { taskId: pending[0].task_id, category: pending[0].category });
      return response({ ok: true, id, decision });
    }
    return response({ error: "Unsupported action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workforce action failed.";
    return response({ error: message }, message.includes("not configured") ? 503 : 502);
  }
}
