import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { DEFAULT_BRAND, generate } from "@/lib/marketing";
import { getSetting, setSetting } from "@/lib/settings";
import { resolveAiwSpecialistPermission } from "@/lib/aiw-authority";
import { getAiwSkill, listAiwSkills } from "@/lib/aiw-skills";
import { loadConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const stages = ["new","qualified","discovery","proposal","negotiation","won","lost"] as const;
const channels = ["email","call","linkedin"] as const;
const WORKFORCE_KEY = "neas_ai_workforce_config";
const WORKFORCE_LEVELS = ["observe", "draft", "recommend", "execute_approved"] as const;
const WORKFORCE_IDS = new Set(["orchestrator","lead-research","lead-qualifier","outreach","proposal-closer","relationship","marketing-strategy","seo","content","video","publisher","rope-access","renewables","offshore-power","estimator","contracts","finance","hseq","integrity","agent-quality","model-router","code-engineer","knowledge","human-interaction"]);
type WorkforceConfig = { agents: { id: string; enabled: boolean; authority: (typeof WORKFORCE_LEVELS)[number] }[]; updatedAt: string | null };
const EMPTY_WORKFORCE: WorkforceConfig = { agents: [], updatedAt: null };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0,max);
async function admin() { const user = await getUser(); return user?.role === "admin" ? user : null; }
async function ensureSpecialistTaskTable() {
  await sql`create table if not exists aiw_specialist_tasks (
    id bigserial primary key, agent_id text not null, agent_name text not null,
    objective text not null, deliverable text not null,
    status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','completed')),
    created_by int references users(id) on delete set null,
    reviewed_by int references users(id) on delete set null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`;
  await sql`create index if not exists aiw_specialist_tasks_created_idx on aiw_specialist_tasks(created_at desc)`;
}

export async function GET() {
  const user = await admin();
  if (!user) return json({ error: "Admin access required." }, 403);
  try {
    await loadConfig(true);
    await ensureSpecialistTaskTable();
    const [leads,drafts,runs,tasks,metrics] = await Promise.all([
      sql`select id, company, contact, email, phone, service, source, stage, estimated_value, next_step, contact_status, created_at from aiw_leads order by created_at desc limit 500`,
      sql`select d.id, d.lead_id, d.channel, d.subject, d.body, d.status, d.created_at, l.company from aiw_outreach_drafts d join aiw_leads l on l.id=d.lead_id order by d.created_at desc limit 200`,
      sql`select id, workflow, status, summary, created_at from aiw_workflow_runs order by created_at desc limit 50`,
      sql`select id, agent_id, agent_name, objective, deliverable, status, created_at from aiw_specialist_tasks order by created_at desc limit 100`,
      sql`select count(*)::int as leads,
        count(*) filter (where stage in ('qualified','discovery','proposal','negotiation','won'))::int as qualified,
        count(*) filter (where stage in ('proposal','negotiation','won'))::int as proposals,
        coalesce(sum(estimated_value) filter (where stage not in ('lost','won')),0)::float as pipeline,
        (select count(*)::int from aiw_outreach_drafts where status = 'draft') as drafts
        from aiw_leads`
    ]);
    const workforceConfig = await getSetting<WorkforceConfig>(WORKFORCE_KEY, EMPTY_WORKFORCE);
    return json({
      workforceConfig,
      skills: listAiwSkills(),
      aiReady: Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
      aiProvider: process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : null,
      leads: leads.map(x=>({...x,id:Number(x.id),value:Number(x.estimated_value),estimated_value:undefined,created_at:new Date(x.created_at).toISOString()})),
      drafts: drafts.map(x=>({...x,id:Number(x.id),lead_id:Number(x.lead_id),created_at:new Date(x.created_at).toISOString()})),
      runs: runs.map(x=>({...x,id:Number(x.id),created_at:new Date(x.created_at).toISOString()})),
      tasks: tasks.map(x=>({...x,id:Number(x.id),created_at:new Date(x.created_at).toISOString()})),
      metrics: metrics[0]
    });
  } catch (e) {
    return json({ error: "AI Workforce data is not ready. Database migration may be pending.", detail: process.env.NODE_ENV === "development" ? String(e) : undefined }, 503);
  }
}

export async function POST(req: Request) {
  const user = await admin();
  if (!user) return json({ error: "Admin access required." }, 403);
  const origin = req.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== new URL(req.url).host) return json({ error: "Bad origin." }, 403); } catch { return json({ error: "Bad origin." }, 403); } }
  const b = await req.json().catch(()=>null);
  if (!b || typeof b !== "object") return json({ error: "Invalid request." }, 400);
  try {
    await ensureSpecialistTaskTable();
    if (b.action === "saveWorkforceConfig") {
      if (!Array.isArray(b.agents) || b.agents.length > WORKFORCE_IDS.size) return json({ error: "Invalid workforce configuration." }, 400);
      const seen = new Set<string>();
      const agents: WorkforceConfig["agents"] = [];
      for (const item of b.agents) {
        if (!item || typeof item.id !== "string" || !WORKFORCE_IDS.has(item.id) || seen.has(item.id)) return json({ error: "Unknown or duplicate specialist." }, 400);
        if (typeof item.enabled !== "boolean" || !(WORKFORCE_LEVELS as readonly string[]).includes(item.authority)) return json({ error: "Invalid specialist permission." }, 400);
        seen.add(item.id);
        agents.push({ id: item.id, enabled: item.enabled, authority: item.authority });
      }
      const config: WorkforceConfig = { agents, updatedAt: new Date().toISOString() };
      await setSetting(WORKFORCE_KEY, config);
      return json({ ok: true, workforceConfig: config });
    }
    if (b.action === "createLead") {
      const company=text(b.company,160), contact=text(b.contact,120), email=text(b.email,240), phone=text(b.phone,60);
      const service=text(b.service,180), source=text(b.source,100) || "Manual entry";
      const value=Number(b.value)||0;
      if (!company || !service || value < 0 || !Number.isFinite(value)) return json({error:"Company, service and a valid non-negative opportunity value are required."},400);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Enter a valid business email."},400);
      const row=await sql`insert into aiw_leads(company,contact,email,phone,service,source,estimated_value,created_by) values(${company},${contact},${email},${phone},${service},${source},${value},${user.id}) returning id`;
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Lead capture','completed',${"Opportunity captured: "+company},${row[0].id},${user.id})`;
      return json({ok:true,id:Number(row[0].id)});
    }
    if (b.action === "updateStage") {
      const id=Number(b.id), stage=String(b.stage);
      if (!Number.isSafeInteger(id) || !(stages as readonly string[]).includes(stage)) return json({error:"Invalid lead stage."},400);
      const row=await sql`update aiw_leads set stage=${stage},updated_at=now() where id=${id} returning company`;
      if (!row.length) return json({error:"Lead not found."},404);
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Pipeline progression','completed',${row[0].company+" moved to "+stage},${id},${user.id})`;
      return json({ok:true});
    }
    if (b.action === "draftOutreach") {
      const workforceConfig = await getSetting<WorkforceConfig>(WORKFORCE_KEY, EMPTY_WORKFORCE);
      const outreachPermission = resolveAiwSpecialistPermission("PRO", workforceConfig);
      if (!outreachPermission.allowed) return json({error:outreachPermission.reason},403);
      const leadId=Number(b.leadId), channel=String(b.channel);
      if (!Number.isSafeInteger(leadId) || !(channels as readonly string[]).includes(channel)) return json({error:"Select a valid lead and outreach channel."},400);
      const lead=(await sql`select * from aiw_leads where id=${leadId}`)[0];
      if (!lead) return json({error:"Lead not found."},404);
      if (lead.contact_status === "opted_out") return json({error:"This contact has opted out. Outreach is blocked."},409);
      const goal=text(b.goal,500) || "Arrange an introductory discussion";
      const context=`Channel: ${channel}. Prospect company: ${lead.company}. Contact name/role: ${lead.contact || "not supplied"}. Service interest: ${lead.service}. Source: ${lead.source}. Business email: ${lead.email || "not supplied"}. Goal: ${goal}. Write only what is supported by this information. Do not invent research or a prior relationship. NEAS identity: NextEdge Access Solutions (NEAS) OPC, Philippines. Website: https://www.nextedge-access-solutions.com. WhatsApp: +63 991 426 5886.`;
      let subject="", body="";
      if (channel === "call") {
        subject="Discovery call guide";
        body=`OPENING
Good day, may I speak with ${lead.contact || "the person responsible for maintenance or operations"}?

INTRODUCTION
I'm reaching out from NextEdge Access Solutions (NEAS). We support organizations with ${String(lead.service).toLowerCase()}.

RELEVANCE
I wanted to understand whether you have any upcoming maintenance, access, inspection or work-at-height requirements where a specialist contractor may be useful.

DISCOVERY QUESTIONS
1. Are there any planned projects or maintenance windows in the next 3–6 months?
2. What scope or site constraints should a contractor understand?
3. Who is the right person to coordinate a technical discussion?

NEXT STEP
Would a short introductory call or capability briefing be useful?

If this is not relevant, I will respect that and won't continue contacting you.

CALL NOTES
Record only factual answers, objections, requested follow-up and contact preferences.`;
      } else {
        await loadConfig(true);
        const result=await generate("outreach",context,{brand:DEFAULT_BRAND});
        if ("error" in result) return json({error:result.error},503);
        body=result.text;
        subject=channel==="linkedin"?"Introduction | NEAS capability overview":`Introduction | NEAS ${lead.service}`;
      }
      const saved=await sql`insert into aiw_outreach_drafts(lead_id,channel,subject,body,created_by) values(${leadId},${channel},${subject},${body},${user.id}) returning id,created_at`;
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Personalized outreach draft','needs_review',${channel+" draft created for "+lead.company},${leadId},${user.id})`;
      return json({ok:true,draft:{id:Number(saved[0].id),lead_id:leadId,channel,subject,body,status:"draft",created_at:new Date(saved[0].created_at).toISOString(),company:lead.company}});
    }
    if (b.action === "updateContactStatus") {
      const id=Number(b.id), status=String(b.status);
      if (!Number.isSafeInteger(id) || !["unreviewed","permitted","opted_out"].includes(status)) return json({error:"Invalid contact status."},400);
      const row=await sql`update aiw_leads set contact_status=${status},updated_at=now() where id=${id} returning company`;
      if (!row.length) return json({error:"Lead not found."},404);
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Contact preference update','completed',${row[0].company+" contact status set to "+status},${id},${user.id})`;
      return json({ok:true});
    }
    if (b.action === "updateNextStep") {
      const id=Number(b.id), nextStep=text(b.nextStep,300);
      if (!Number.isSafeInteger(id)) return json({error:"Invalid lead."},400);
      const row=await sql`update aiw_leads set next_step=${nextStep},updated_at=now() where id=${id} returning company`;
      if (!row.length) return json({error:"Lead not found."},404);
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Next step update','completed',${row[0].company+" next step updated"},${id},${user.id})`;
      return json({ok:true});
    }
    if (b.action === "reviewDraft") {
      const id=Number(b.id);
      if (!Number.isSafeInteger(id)) return json({error:"Invalid draft."},400);
      const row=await sql`update aiw_outreach_drafts set status='reviewed',reviewed_by=${user.id} where id=${id} and status='draft' returning lead_id`;
      if (!row.length) return json({error:"Draft not found or no longer awaiting review."},409);
      await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Human outreach review','completed',${"Outreach draft #"+id+" reviewed by an administrator"},${row[0].lead_id},${user.id})`;
      return json({ok:true});
    }

    if (b.action === "specialistTask") {
      const agentId=text(b.agentId,32).toUpperCase();
      const objective=text(b.objective,3000);
      const roles:Record<string,{name:string;scope:string;deliverables:string[];guardrail:string}> = {
        JARVIS:{name:"JARVIS Orchestrator",scope:"Break the objective into owned workstreams, sequence dependencies and coordinate handoffs.",deliverables:["Objective and success criteria","Workstream owners and dependencies","Priority sequence and checkpoints","Escalations and decision gates"],guardrail:"Coordinate only; do not override delegated authority."},
        SALES:{name:"Sales & CRM",scope:"Qualify the opportunity, map stakeholders and recommend a next commercial action.",deliverables:["Qualification summary","Buying signals and missing information","Recommended next contact","CRM update checklist"],guardrail:"No fabricated client facts, unsolicited sending or deal commitment."},
        MARKETING:{name:"Marketing Growth",scope:"Develop an evidence-led demand generation and channel plan.",deliverables:["Audience and positioning","SEO/content/campaign plan","Channel and cadence recommendations","Measurement and conversion KPIs"],guardrail:"No publication, ad spend or performance claims without approval/evidence."},
        CONTENT:{name:"Creative Studio",scope:"Prepare brand-aligned creative concepts and copy for NEAS.",deliverables:["Creative concept and message","Draft copy / storyboard","Visual direction using NEAS brand palette","Review checklist"],guardrail:"Draft only; verify claims, rights and brand assets before publication."},
        SKILLS:{name:"Skills & Competency",scope:"Map required competencies, role evidence and training gaps.",deliverables:["Competency matrix","Evidence required","Gap and training plan","Reassessment criteria"],guardrail:"Never invent certifications or declare personnel competent without verified evidence."},
        PERFORMANCE:{name:"Performance Intelligence",scope:"Define measurable indicators and review supplied operational data.",deliverables:["KPI definitions","Baseline and data gaps","Review cadence","Corrective-action recommendations"],guardrail:"Do not fabricate metrics; distinguish measured results from targets."},
        AUTHORITY:{name:"Authority & Governance",scope:"Map permissions, approval thresholds and escalation requirements.",deliverables:["Decision-rights map","Approval checkpoints","Segregation-of-duties risks","Audit evidence checklist"],guardrail:"Cannot grant legal authority or bypass system access controls."},
        APPROACH:{name:"Client Approach Strategy",scope:"Build an ethical account approach and value proposition.",deliverables:["Account hypothesis","Stakeholder map to validate","Relevant NEAS value proposition","Outreach sequence draft"],guardrail:"No invented relationships, contact details or claims."},
        HUMAN:{name:"Human Relationship",scope:"Plan accountable client ownership and human handoffs.",deliverables:["Relationship owner and backup","Handoff context","Client communication cadence","Follow-up commitments"],guardrail:"Do not impersonate staff or claim a conversation occurred."},
        EMPATHY:{name:"Customer Experience & Empathy",scope:"Review customer-facing language for clarity, respect and responsiveness.",deliverables:["Customer need summary","Tone and empathy review","Response draft","Service recovery options"],guardrail:"Protect personal data; do not infer sensitive traits."},
        PRO:{name:"Professional Communications",scope:"Draft clear business communications and reports.",deliverables:["Communication objective","Recommended structure","Draft text","Fact-check and approval checklist"],guardrail:"No unsupported statements or unauthorized issue."},
        ENGINEERING:{name:"Engineering & Technical",scope:"Organize technical scope and identify competent-person review needs.",deliverables:["Scope breakdown","Technical information required","Method statement / inspection pack outline","Technical risks and review gates"],guardrail:"Advisory drafting only; no design certification, engineering approval or safety sign-off."},
        QUALIFY:{name:"Tender & Qualification",scope:"Assess bid requirements and submission readiness from supplied documents.",deliverables:["Eligibility checklist","Mandatory submission evidence","Clarification questions","Bid/no-bid risk summary"],guardrail:"No legal interpretation or submission without authorized review."},
        QUALITY:{name:"Quality Assurance",scope:"Define acceptance criteria and document quality checks.",deliverables:["Quality checklist","Inspection and test evidence","Nonconformance workflow","Closeout requirements"],guardrail:"Do not certify work or close nonconformities without evidence and authority."},
        INTEGRITY:{name:"Integrity & Compliance",scope:"Identify factual, privacy, ethical and compliance risks.",deliverables:["Evidence and claim review","Privacy and consent checks","Conflict / integrity risks","Escalation recommendations"],guardrail:"Flag issues; not legal advice or formal compliance certification."},
        ADVANCED:{name:"Advanced Intelligence",scope:"Synthesize provided business context into a decision brief.",deliverables:["Decision question","Evidence and assumptions","Options and trade-offs","Recommendation and confidence"],guardrail:"Do not present assumptions as verified external intelligence."},
        MODELS:{name:"Model & Tool Orchestration",scope:"Specify safe model/tool routing for the requested workflow.",deliverables:["Task decomposition","Tool and model requirements","Data access boundaries","Cost, quality and fallback controls"],guardrail:"Use only configured integrations and least-privilege access."},
        BRANCHES:{name:"Branches & Department Coordination",scope:"Coordinate service-line ownership and cross-functional handoffs.",deliverables:["Department responsibility map","Handoff sequence","Regional/service dependencies","Escalation route"],guardrail:"No implied authority over external partners or unassigned staff."},
        CODE:{name:"Code & Automation Engineering",scope:"Prepare a technical implementation plan and validation criteria.",deliverables:["Requirements and affected systems","Implementation sequence","Security and failure-mode review","Test and rollback plan"],guardrail:"No production code deployment or secret changes from this work order."},
        FINANCE:{name:"Finance & Commercial",scope:"Structure costing, cash exposure and margin checks from supplied figures.",deliverables:["Cost inputs and assumptions","Pricing/margin calculation plan","Cash-flow and payment-term risks","Commercial approval checklist"],guardrail:"No payment, accounting entry, binding quotation or financial commitment."},
        CUSTOMER:{name:"Customer Operations",scope:"Organize inquiry handling, response SLAs and service records.",deliverables:["Inquiry classification","Required response information","SLA and owner","Customer update draft"],guardrail:"No external message sent automatically."},
        PROJECTS:{name:"Project Delivery",scope:"Plan schedule, resources, mobilization and delivery readiness.",deliverables:["Scope and milestones","Resource/equipment requirements","Mobilization dependencies","Delivery risk register"],guardrail:"No mobilization, purchase or work authorization without approval."},
        AUDIT:{name:"Independent QA & Risk Review",scope:"Independently challenge the proposed work against evidence and controls.",deliverables:["Evidence gaps","Control failures or conflicts","Risk rating and rationale","Required corrective actions"],guardrail:"Cannot self-approve work it produced; independent human review remains required."}
      };
      const role=roles[agentId];
      if(!role) return json({error:"Unknown specialist."},400);
      if(objective.length<12) return json({error:"Provide a clear task objective of at least 12 characters."},400);
      const skill = getAiwSkill(agentId);
      await loadConfig(true);
      const workforceConfig = await getSetting<WorkforceConfig>(WORKFORCE_KEY, EMPTY_WORKFORCE);
      const permission = resolveAiwSpecialistPermission(agentId, workforceConfig);
      if (!permission.allowed) return json({error:permission.reason},403);
      const taskBrief=[
        "SPECIALIST: "+role.name+" ("+agentId+")",
        "ROLE SCOPE: "+role.scope,
        "ADVANCED SKILL: "+skill.name+" ("+skill.domain+")\n"+skill.instructions,
        "USER OBJECTIVE: "+objective,
        "REQUIRED DELIVERABLES: "+role.deliverables.join("; "),
        "AUTHORITY / SAFETY LIMIT: "+role.guardrail,
        "NEAS CONTEXT: NextEdge Access Solutions (NEAS) OPC, Philippines. Services include rope access, renewable energy, offshore/onshore, wind turbine and met mast services, telecom, industrial maintenance, inspection, training and PPE.",
        "INSTRUCTIONS: Produce the actual specialist work product, not a generic template. Use clear headings, actionable steps, assumptions, dependencies, missing information and measurable acceptance criteria. Use only facts supplied. Mark unknowns as [TO VERIFY]. If the objective is underspecified, state what is missing and provide a useful preliminary draft. Never claim external research or actions that were not performed. Keep the authority limit explicit."
      ].join("\\n\\n");
      const generated=await generate("specialist",taskBrief,{brand:DEFAULT_BRAND});
      if("error" in generated) return json({error:generated.error},503);
      const deliverable=generated.text+"\\n\\nGOVERNANCE STATUS\\nInternal AI-generated draft · human review required\\nAUTHORITY / SAFETY CONTROL\\n"+role.guardrail;
      const saved=await sql`insert into aiw_specialist_tasks(agent_id,agent_name,objective,deliverable,status,created_by) values(${agentId},${role.name},${objective},${deliverable},'needs_review',${user.id}) returning id,created_at`;
      await sql`insert into aiw_workflow_runs(workflow,status,summary,actor_id) values(${"Specialist: "+role.name},'needs_review',${"Work order #"+saved[0].id+" created for review"},${user.id})`;
      return json({ok:true,task:{id:Number(saved[0].id),agent_id:agentId,agent_name:role.name,objective,deliverable,status:"needs_review",created_at:new Date(saved[0].created_at).toISOString()}});
    }
    return json({error:"Unknown action."},400);
  } catch (e) {
    return json({error:"Unable to complete the requested action.",detail:process.env.NODE_ENV==="development"?String(e):undefined},500);
  }
}
