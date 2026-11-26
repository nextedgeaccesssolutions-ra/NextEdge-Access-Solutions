import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const PROTOCOL_VERSION = "2025-03-26";
const SPECIALISTS: Record<string, string> = {
  ceo: "CEO",
  caio: "CAIO / AI Orchestration",
  sales: "Business Development & Sales",
  "rope-access": "Rope Access Technical",
  renewables: "Renewables & Wind",
  "offshore-power": "Offshore, Onshore & Power",
  operations: "Project Management & Operations",
  hseq: "HSEQ & Compliance",
  finance: "Finance & Administration",
  marketing: "Marketing & Global Expansion",
  training: "Training & Human Capital",
  "ai-tech": "AI Technology & Automation",
};

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

function authorized(request: Request): boolean {
  const expected = process.env.NEAS_ELEVENLABS_WORKFORCE_TOKEN || "";
  const supplied = request.headers.get("authorization") || "";
  if (!expected || !supplied.startsWith("Bearer ")) return false;
  const actual = Buffer.from(supplied.slice(7));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function rpc(id: JsonRpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, {
    headers: { "Cache-Control": "no-store" },
  });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, {
    headers: { "Cache-Control": "no-store" },
  });
}

function toolResult(value: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false,
  };
}

function toolError(message: string) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

const tools = [
  {
    name: "get_neas_public_services",
    description: "Read public NEAS company capabilities and contact channels. Use for general service enquiries; do not infer private customer, pricing, availability or project status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "capture_neas_business_enquiry",
    description: "Create a NEAS sales lead only when the caller explicitly asks NEAS to contact them or provides their details for a project enquiry. Saves the caller-provided business contact details and service interest. Does not send email, make a promise, quote a price or book a meeting.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company or organization name supplied by the caller, max 160 characters." },
        service: { type: "string", description: "NEAS service requested, max 180 characters." },
        contact: { type: "string", description: "Caller name or contact person, if provided." },
        email: { type: "string", description: "Business email, if explicitly provided." },
        phone: { type: "string", description: "Business phone or WhatsApp, if explicitly provided." },
        location: { type: "string", description: "Project location, include only if the caller provides it." },
        scope: { type: "string", description: "Short project scope supplied by the caller." },
      },
      required: ["company", "service"],
      additionalProperties: false,
    },
  },
  {
    name: "request_neas_specialist_review",
    description: "Create a specialist work request for administrator review. This only queues a draft work order with status needs_review; it does not approve, assign execution, change permissions, send external communications, or perform site work.",
    inputSchema: {
      type: "object",
      properties: {
        specialist: { type: "string", enum: Object.keys(SPECIALISTS), description: "The relevant NEAS specialist group." },
        objective: { type: "string", description: "Clear objective, max 1000 characters." },
        deliverable: { type: "string", description: "Proposed deliverable for human review, max 2000 characters." },
      },
      required: ["specialist", "objective", "deliverable"],
      additionalProperties: false,
    },
  },
];

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "get_neas_public_services") {
    return toolResult({
      company: "NextEdge Access Solutions (NEAS) OPC",
      website: "https://www.nextedge-access-solutions.com",
      services: [
        "Industrial rope access and facade inspection, maintenance, cleaning, repair and installation",
        "Wind turbine blade inspection, cleaning, repair and repainting",
        "Met mast and Lidar services",
        "Offshore, onshore, power plant and industrial services",
        "NDT and inspection, welding, mechanical and electrical works, cable pulling",
        "Telecom tower and cell-site services",
        "Rope access, work-at-height, rope rescue training, consultancy and PPE supply",
      ],
      contacts: {
        phone_whatsapp: "+63 991 426 5886",
        alternate_phone: "+63 995 770 8144",
        sales_email: "info.nextedgeaccesssolutions@gmail.com",
      },
      limitations: "Formal pricing, availability, certification claims and project commitments require confirmation by NEAS personnel.",
    });
  }

  if (name === "capture_neas_business_enquiry") {
    const company = clean(args.company, 160);
    const service = clean(args.service, 180);
    const contact = clean(args.contact, 120);
    const email = clean(args.email, 240);
    const phone = clean(args.phone, 60);
    const location = clean(args.location, 180);
    const scope = clean(args.scope, 1000);
    if (!company || !service) return toolError("Company and service are required.");
    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return toolError("The supplied email address is invalid. Ask the caller to repeat it.");
    const note = [location ? "Project location: " + location : "", scope ? "Project scope: " + scope : ""].filter(Boolean).join("\\n");
    const inserted = await sql`insert into aiw_leads(company,contact,email,phone,service,source,estimated_value,next_step,created_by) values(${company},${contact},${email},${phone},${service},'ElevenLabs voice agent',0,${note},null) returning id`;
    await sql`insert into aiw_workflow_runs(workflow,status,summary,lead_id,actor_id) values('Voice enquiry capture','completed',${"Caller-authorized enquiry captured for " + company},${inserted[0].id},null)`;
    return toolResult({ ok: true, lead_id: Number(inserted[0].id), message: "The caller-authorized enquiry was saved for NEAS sales review. No email or external message was sent." });
  }

  if (name === "request_neas_specialist_review") {
    const specialist = clean(args.specialist, 40);
    const objective = clean(args.objective, 1000);
    const deliverable = clean(args.deliverable, 2000);
    const agentName = SPECIALISTS[specialist];
    if (!agentName || !objective || !deliverable) return toolError("Choose a valid specialist and provide an objective and proposed deliverable.");
    await sql`create table if not exists aiw_specialist_tasks (
      id bigserial primary key, agent_id text not null, agent_name text not null,
      objective text not null, deliverable text not null,
      status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','completed')),
      created_by int references users(id) on delete set null,
      reviewed_by int references users(id) on delete set null,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`;
    const rows = await sql`insert into aiw_specialist_tasks(agent_id,agent_name,objective,deliverable,status,created_by) values(${specialist},${agentName},${objective},${deliverable},'needs_review',null) returning id`;
    await sql`insert into aiw_workflow_runs(workflow,status,summary,actor_id) values('Voice specialist request','needs_review',${"Voice request queued for " + agentName + " review"},null)`;
    return toolResult({ ok: true, work_order_id: Number(rows[0].id), status: "needs_review", message: "The specialist request is queued for administrator review. No specialist execution or external action has been authorized." });
  }

  return toolError("Unknown NEAS workforce tool.");
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ service: "NEAS ElevenLabs Workforce MCP", protocol: PROTOCOL_VERSION, status: "ready" }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: JsonRpcRequest;
  try { body = await request.json() as JsonRpcRequest; }
  catch { return rpcError(null, -32700, "Parse error"); }
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") return rpcError(body.id, -32600, "Invalid Request");

  if (body.method === "initialize") {
    return rpc(body.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "neas-ai-workforce", version: "1.0.0" },
    });
  }
  if (body.method === "notifications/initialized" || body.method === "notifications/cancelled") {
    return new NextResponse(null, { status: 202 });
  }
  if (body.method === "ping") return rpc(body.id, {});
  if (body.method === "tools/list") return rpc(body.id, { tools });

  if (body.method === "tools/call") {
    const params = body.params || {};
    const name = typeof params.name === "string" ? params.name : "";
    const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
      ? params.arguments as Record<string, unknown>
      : {};
    try {
      return rpc(body.id, await callTool(name, args));
    } catch (error) {
      const message = error instanceof Error ? error.message : "NEAS workforce tool failed.";
      return rpc(body.id, toolError(message));
    }
  }
  return rpcError(body.id, -32601, "Method not found");
}
