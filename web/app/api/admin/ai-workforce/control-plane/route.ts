import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { cronToken } from "@/lib/cron-token";
import { generateAIGatewayText, mapRegistryProvider, clearRegistryRouteCache } from "@/lib/ai-gateway";
import { aiwSupabase as supabase, aiwAudit, type AiwRow } from "@/lib/aiw-supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = AiwRow;
const response = (data: unknown, status = 200) => NextResponse.json(data, { status });

async function requireAdmin() {
  const user = await getUser();
  return user?.role === "admin" ? user : null;
}

async function audit(actorId: number, action: string, resourceType: string, resourceId: string | null, outcome: "success" | "denied" | "failure" | "pending", details: Row = {}) {
  await aiwAudit("human", String(actorId), action, resourceType, resourceId, outcome, details);
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return response({ error: "Admin access required." }, 403);
  try {
    const [agents, tasks, approvals, schedules, events, auditEvents, modelRoutes] = await Promise.all([
      supabase("aiw_agents?select=agent_id,name,department,department_code,sort_order,manager_agent_id,job_description,skills,system_prompt,tools,permissions,approval_level,enabled,execution_mode,runtime_status,last_execution_at,next_scheduled_at,performance_score&order=sort_order.asc"),
      supabase("aiw_tasks?select=id,title,objective,agent_id,parent_task_id,department_code,status,priority,dependencies,attempt_count,max_attempts,requires_approval,approval_category,created_by,assigned_by,created_at,updated_at,due_at,error_message&order=created_at.desc&limit=100"),
      supabase("aiw_approvals?select=id,task_id,category,title,details,status,requested_by,reviewed_by,review_note,requested_at,reviewed_at&order=requested_at.desc&limit=100"),
      supabase("aiw_schedules?select=id,name,description,cadence,cron_expression,timezone,enabled,agent_id,last_run_at,next_run_at&order=name.asc"),
      supabase("aiw_task_events?select=id,task_id,event_type,actor_type,actor_id,message,created_at&order=created_at.desc&limit=50"),
      supabase("aiw_audit_events?select=id,actor_type,actor_id,action,resource_type,resource_id,outcome,details,created_at&order=created_at.desc&limit=50"),
      supabase("aiw_model_routes?select=id,route_name,provider,model,enabled,priority,data_classification,config&order=priority.asc"),
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
      modelRoutes,
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
      // Dual-approval: critical actions need TWO distinct human approvers.
      const DUAL_APPROVAL_CATEGORIES = ["contract","payment","safety_signoff","database_destructive","credentials_access","production_deploy","security_policy"];
      const requiresApproval = approvalCategories.includes(category);
      const approvalsRequired = DUAL_APPROVAL_CATEGORIES.includes(category) ? 2 : requiresApproval ? 1 : 0;
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
          body: JSON.stringify({
            task_id: task.id, category, title,
            details: { objective, approvalsRequired, policy: approvalsRequired === 2 ? "dual_approval" : "single_approval" },
            requested_by: String(user.id),
            approvals_required: approvalsRequired, approval_count: 0, approved_by_ids: [],
          }),
        });
      }
      await audit(user.id, "task.create", "aiw_task", String(task.id), requiresApproval ? "pending" : "success", { agentId, priority, requiresApproval, approvalsRequired });
      return response({ ok: true, task, requiresApproval, approvalsRequired }, 201);
    }
    if (action === "saveAgentProfile") {
      const agentId = String(body.agentId || "").trim().toLowerCase().slice(0, 100);
      const systemPrompt = String(body.systemPrompt || "").trim().slice(0, 12000);
      const executionMode = String(body.executionMode || "draft_only");
      const approvalLevel = Number(body.approvalLevel);
      if (!agentId || !systemPrompt || !["draft_only", "execute_approved", "disabled"].includes(executionMode) || !Number.isInteger(approvalLevel) || approvalLevel < 1 || approvalLevel > 5) {
        return response({ error: "Valid agent, system prompt, execution mode and approval level are required." }, 400);
      }
      const updated = await supabase(`aiw_agents?agent_id=eq.${encodeURIComponent(agentId)}&select=agent_id`, {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ system_prompt: systemPrompt, execution_mode: executionMode, approval_level: approvalLevel, updated_at: new Date().toISOString() }),
      }) as Row[];
      if (!updated.length) return response({ error: "Agent profile not found." }, 404);
      await audit(user.id, "agent.profile.update", "aiw_agent", agentId, "success", { executionMode, approvalLevel });
      return response({ ok: true, agentId });
    }
    if (action === "reviewApproval") {
      const id = String(body.id || "");
      const decision = String(body.decision || "");
      const note = String(body.note || "").trim().slice(0, 2000);
      if (!id || !["approved", "rejected"].includes(decision)) return response({ error: "A valid approval ID and decision are required." }, 400);
      const pending = await supabase(`aiw_approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending&select=id,task_id,category,requested_by,approvals_required,approval_count,approved_by_ids&limit=1`) as Row[];
      if (!pending.length) return response({ error: "Approval is no longer pending." }, 409);
      if (String(pending[0].requested_by) === String(user.id)) return response({ error: "A requester cannot approve their own request. A second authorized administrator must review it." }, 403);
      const required = Number(pending[0].approvals_required ?? 1) === 2 ? 2 : 1;
      const already: string[] = Array.isArray(pending[0].approved_by_ids) ? (pending[0].approved_by_ids as unknown[]).map(String) : [];
      if (already.includes(String(user.id))) return response({ error: "This administrator has already recorded an approval. A second, distinct administrator must approve." }, 409);
      if (decision === "rejected") {
        await supabase(`aiw_approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "rejected", reviewed_by: String(user.id), review_note: note, reviewed_at: new Date().toISOString(), approval_count: already.length }),
        });
        await supabase(`aiw_tasks?id=eq.${encodeURIComponent(String(pending[0].task_id))}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "cancelled", awaiting_second_approval: false, updated_at: new Date().toISOString() }),
        });
        await audit(user.id, "approval.rejected", "aiw_approval", id, "success", { taskId: pending[0].task_id, category: pending[0].category, required });
        return response({ ok: true, id, decision, quorum: `${already.length}/${required}` });
      }
      const nextApprovers = [...already, String(user.id)];
      const quorumReached = nextApprovers.length >= required;
      await supabase(`aiw_approvals?id=eq.${encodeURIComponent(id)}&status=eq.pending`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify(quorumReached
          ? { status: "approved", reviewed_by: String(user.id), review_note: note, reviewed_at: new Date().toISOString(), approval_count: nextApprovers.length, approved_by_ids: nextApprovers, first_approved_by: nextApprovers[0] ?? null }
          : { approval_count: nextApprovers.length, approved_by_ids: nextApprovers, first_approved_by: nextApprovers[0], review_note: `First approval recorded (${nextApprovers.length}/${required}). Awaiting second administrator.` }),
      });
      await supabase(`aiw_tasks?id=eq.${encodeURIComponent(String(pending[0].task_id))}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify(quorumReached
          ? { status: "queued", awaiting_second_approval: false, updated_at: new Date().toISOString() }
          : { status: "needs_approval", awaiting_second_approval: true, updated_at: new Date().toISOString() }),
      });
      await supabase("aiw_task_events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ task_id: pending[0].task_id, event_type: quorumReached ? `approval_${decision}` : "approval_first", actor_type: "human", actor_id: String(user.id), message: note || (quorumReached ? `Approval quorum reached (${nextApprovers.length}/${required}).` : `First approval recorded (${nextApprovers.length}/${required}). Awaiting second administrator.`), payload: { approvalId: id, category: pending[0].category, quorum: `${nextApprovers.length}/${required}` } }),
      });
      await audit(user.id, quorumReached ? `approval.${decision}` : "approval.first", "aiw_approval", id, quorumReached ? "success" : "pending", { taskId: pending[0].task_id, category: pending[0].category, quorum: `${nextApprovers.length}/${required}` });
      return response({ ok: true, id, decision, quorum: `${nextApprovers.length}/${required}`, quorumReached });
    }
    if (action === "setModelRoute") {
      const id = String(body.id || "");
      const enabled = body.enabled === true;
      if (!id) return response({ error: "A model route ID is required." }, 400);
      const found = await supabase(`aiw_model_routes?id=eq.${encodeURIComponent(id)}&select=id,route_name,provider,model,enabled,data_classification&limit=1`) as Row[];
      if (!found.length) return response({ error: "Model route not found." }, 404);
      const route = found[0];
      const routeName = String(route.route_name || id);
      // Turning a provider off only ever reduces capability, so it needs no proof.
      if (!enabled) {
        await supabase(`aiw_model_routes?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ enabled: false }),
        });
        clearRegistryRouteCache();
        await audit(user.id, "model_route.disable", "aiw_model_route", id, "success", { routeName, provider: route.provider });
        return response({ ok: true, id, enabled: false, verified: false, message: `${routeName} is disabled. No inference will be routed to it.` });
      }
      // The registry's own policy is that a provider stays disabled until
      // credentials, data handling and a live health check are verified. So
      // enabling runs the probe first and only writes on an exact-match reply;
      // a route is never marked live on the strength of an assertion.
      // Routes now drive provider selection, so the check must exercise THIS
      // route's provider and model. A registry row naming a provider with no
      // implementation can never be enabled, rather than passing on the
      // strength of whatever path happened to be live.
      const routeProvider = mapRegistryProvider(route.provider);
      const routeModel = String(route.model ?? "").trim();
      if (!routeProvider) {
        await audit(user.id, "model_route.enable", "aiw_model_route", id, "denied", { routeName, provider: route.provider, reason: "provider_not_implemented" });
        return response({ error: `${routeName} names provider "${String(route.provider)}", which this runtime has no implementation for. Enabling it would route inference nowhere.`, verified: false }, 409);
      }
      if (!routeModel) {
        await audit(user.id, "model_route.enable", "aiw_model_route", id, "denied", { routeName, reason: "model_missing" });
        return response({ error: `${routeName} has no model set, so there is nothing to route to.`, verified: false }, 409);
      }
      const probe = await generateAIGatewayText(
        { system: "You are the NEAS model-route health check. Follow the user instruction exactly.", user: "Reply with exactly: NEAS_ROUTE_OK" },
        { request: req, provider: routeProvider, model: routeModel },
      );
      if ("error" in probe) {
        await audit(user.id, "model_route.enable", "aiw_model_route", id, "denied", { routeName, provider: route.provider, reason: String(probe.error).slice(0, 400) });
        return response({ error: `Live health check failed, so ${routeName} stays disabled: ${probe.error}`, verified: false }, 503);
      }
      if (probe.text.trim() !== "NEAS_ROUTE_OK") {
        await audit(user.id, "model_route.enable", "aiw_model_route", id, "denied", { routeName, provider: route.provider, reason: "health_check_validation_failed" });
        return response({ error: `${routeName} returned inference text but failed the exact-match health validation, so it stays disabled.`, verified: false }, 503);
      }
      const updated = await supabase(`aiw_model_routes?id=eq.${encodeURIComponent(id)}&select=id,route_name,enabled`, {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ enabled: true }),
      }) as Row[];
      if (!updated.length) return response({ error: "The health check passed but the registry update returned no record. The route is unchanged." }, 502);
      clearRegistryRouteCache();
      await audit(user.id, "model_route.enable", "aiw_model_route", id, "success", { routeName, provider: route.provider, verifiedModel: probe.model, dataClassification: route.data_classification });
      return response({ ok: true, id, enabled: true, verified: true, model: probe.model, message: `${routeName} verified live via ${probe.model} and enabled.` });
    }
    if (action === "setSchedule") {
      const id = String(body.id || "");
      const enabled = body.enabled === true;
      if (!id) return response({ error: "A schedule ID is required." }, 400);
      const found = await supabase(`aiw_schedules?id=eq.${encodeURIComponent(id)}&select=id,name,cadence,enabled,agent_id&limit=1`) as Row[];
      if (!found.length) return response({ error: "Schedule not found." }, 404);
      const schedule = found[0];
      const scheduleName = String(schedule.name || id);
      if (!enabled) {
        await supabase(`aiw_schedules?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ enabled: false }),
        });
        await audit(user.id, "schedule.disable", "aiw_schedule", id, "success", { scheduleName });
        return response({ ok: true, id, enabled: false, message: `${scheduleName} is paused. The scheduler will skip it.` });
      }
      // Refuse to show a schedule as active unless something can actually run it.
      // Without the cron token the scheduler route cannot authenticate, so an
      // enabled row would read as live while never executing.
      if (!cronToken()) {
        await audit(user.id, "schedule.enable", "aiw_schedule", id, "denied", { scheduleName, reason: "scheduler_not_configured" });
        return response({ error: `The scheduler runtime is not configured, so enabling ${scheduleName} would display it as active while nothing runs. Add the cron token to the Vercel environment and deploy /api/cron/aiw-scheduler first.` }, 503);
      }
      const agentId = String(schedule.agent_id || "").toLowerCase();
      if (!agentId) return response({ error: `${scheduleName} has no owning agent, so the scheduler would have nothing to assign. Assign an agent before enabling it.` }, 409);
      const agents = await supabase(`aiw_agents?agent_id=eq.${encodeURIComponent(agentId)}&select=agent_id,name,enabled,execution_mode&limit=1`) as Row[];
      if (!agents.length || agents[0].enabled !== true || agents[0].execution_mode === "disabled") {
        await audit(user.id, "schedule.enable", "aiw_schedule", id, "denied", { scheduleName, reason: "agent_unavailable", agentId });
        return response({ error: `The owning agent (${agentId}) is disabled, so ${scheduleName} would never produce work. Enable the agent first.` }, 409);
      }
      const updated = await supabase(`aiw_schedules?id=eq.${encodeURIComponent(id)}&select=id,name,enabled`, {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ enabled: true }),
      }) as Row[];
      if (!updated.length) return response({ error: "The schedule update returned no record. It is unchanged." }, 502);
      await audit(user.id, "schedule.enable", "aiw_schedule", id, "success", { scheduleName, agentId, cadence: schedule.cadence ?? null });
      return response({ ok: true, id, enabled: true, message: `${scheduleName} is active. The scheduler will queue work for ${String(agents[0].name)} on its next run.` });
    }
    return response({ error: "Unsupported action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workforce action failed.";
    return response({ error: message }, message.includes("not configured") ? 503 : 502);
  }
}
