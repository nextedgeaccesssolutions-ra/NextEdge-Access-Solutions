"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Agent = { id: string; name: string; lane: string; role: string; status: "ready" | "standby" | "review"; metric: string; color: string; };
type Lead = { id: number; company: string; contact: string; email: string; phone: string; service: string; source: string; stage: string; value: number; next_step: string; contact_status: string; created_at: string; };
type Draft = { id: number; lead_id: number; channel: string; subject: string; body: string; status: string; created_at: string; company: string; };
type Run = { id: number; workflow: string; status: string; summary: string; created_at: string; };
type SpecialistTask = { id:number; agent_id:string; agent_name:string; objective:string; deliverable:string; status:string; created_at:string; };
type Skill = { id:string; name:string; domain:string; description:string; agentIds:string[]; };
type State = { leads: Lead[]; drafts: Draft[]; runs: Run[]; tasks: SpecialistTask[]; skills: Skill[]; aiReady: boolean; aiProvider: string | null; specialistAiReady: boolean; specialistAiProvider: string | null; metrics: { leads: number; qualified: number; proposals: number; pipeline: number; drafts: number }; };
type Tab = "command" | "agents" | "skills" | "workbench" | "leads" | "outreach" | "approvals" | "performance";

const AGENTS: Agent[] = [
  { id:"JARVIS",name:"JARVIS Orchestrator",lane:"COMMAND",role:"Coordinates specialist work, budgets, permissions, handoffs and outcome reporting",status:"ready",metric:"On-time workflow completion",color:"#d6a84f" },
  { id:"SALES",name:"Sales & CRM",lane:"REVENUE",role:"Qualifies prospects, manages pipeline, prepares deal plans and follow-ups",status:"ready",metric:"Qualified-to-won conversion",color:"#e4b65d" },
  { id:"MARKETING",name:"Marketing Growth",lane:"REVENUE",role:"Plans SEO, campaigns, channel strategy and measurable demand generation",status:"ready",metric:"Marketing-qualified leads",color:"#9bc4b2" },
  { id:"CONTENT",name:"Creative Studio",lane:"REVENUE",role:"Creates brand-aligned posts, campaign copy, scripts and sales collateral",status:"ready",metric:"Approved content throughput",color:"#b3a2dc" },
  { id:"SKILLS",name:"Skills & Competency",lane:"PEOPLE",role:"Maps role competencies, training needs, certifications and capability gaps",status:"ready",metric:"Competency coverage",color:"#a7b8d4" },
  { id:"PERFORMANCE",name:"Performance Intelligence",lane:"GOVERNANCE",role:"Tracks agent and commercial KPIs, service levels, conversion and delivery outcomes",status:"ready",metric:"KPI attainment",color:"#9ac9d1" },
  { id:"AUTHORITY",name:"Authority & Governance",lane:"GOVERNANCE",role:"Enforces role permissions, approval thresholds, audit trails and escalation paths",status:"ready",metric:"Policy compliance",color:"#c2b5a0" },
  { id:"APPROACH",name:"Client Approach Strategy",lane:"REVENUE",role:"Builds account plans, value propositions, stakeholder maps and ethical outreach sequences",status:"ready",metric:"Meeting conversion",color:"#df9b83" },
  { id:"HUMAN",name:"Human Relationship",lane:"RELATIONSHIPS",role:"Supports account ownership, context-aware handoffs and long-term client relationships",status:"ready",metric:"Client retention",color:"#9ac9d1" },
  { id:"EMPATHY",name:"Customer Experience & Empathy",lane:"RELATIONSHIPS",role:"Reviews tone, customer needs, complaints and respectful response quality",status:"ready",metric:"Customer satisfaction",color:"#b3a2dc" },
  { id:"PRO",name:"Professional Communications",lane:"RELATIONSHIPS",role:"Maintains consistent professional proposals, emails, reports and meeting briefs",status:"ready",metric:"Communication quality",color:"#a9c28b" },
  { id:"ENGINEERING",name:"Engineering & Technical",lane:"DELIVERY",role:"Organizes technical scope reviews, method statements and competent-person review packs",status:"ready",metric:"Technical completeness",color:"#d2a5a5" },
  { id:"QUALIFY",name:"Tender & Qualification",lane:"COMMERCIAL",role:"Screens tender eligibility, client requirements, deadlines and submission evidence",status:"ready",metric:"Bid readiness",color:"#a7b8d4" },
  { id:"QUALITY",name:"Quality Assurance",lane:"DELIVERY",role:"Checks deliverables, document control, acceptance criteria and corrective actions",status:"ready",metric:"First-pass acceptance",color:"#c2b5a0" },
  { id:"INTEGRITY",name:"Integrity & Compliance",lane:"GOVERNANCE",role:"Checks factual accuracy, conflicts, privacy, legal boundaries and ethical conduct",status:"ready",metric:"Integrity exceptions",color:"#df9b83" },
  { id:"ADVANCED",name:"Advanced Intelligence",lane:"INTELLIGENCE",role:"Synthesizes approved business data into research, forecasts and decision briefs",status:"ready",metric:"Decision usefulness",color:"#9bc4b2" },
  { id:"MODELS",name:"Model & Tool Orchestration",lane:"INTELLIGENCE",role:"Routes tasks to approved models and tools with cost, latency and quality controls",status:"ready",metric:"Task success per cost",color:"#b3a2dc" },
  { id:"BRANCHES",name:"Branches & Department Coordination",lane:"OPERATIONS",role:"Coordinates service lines, regional handoffs, workload and ownership boundaries",status:"ready",metric:"Handoff completion",color:"#a9c28b" },
  { id:"CODE",name:"Code & Automation Engineering",lane:"ENGINEERING",role:"Maintains approved integrations, internal tools, tests and automation workflows",status:"ready",metric:"Automation reliability",color:"#d2a5a5" },
  { id:"FINANCE",name:"Finance & Commercial",lane:"COMMERCIAL",role:"Checks costing, cash exposure, margin assumptions and proposal risk",status:"ready",metric:"Margin integrity",color:"#df9b83" },
  { id:"CUSTOMER",name:"Customer Operations",lane:"RELATIONSHIPS",role:"Routes inquiries, tracks response commitments and maintains customer service records",status:"ready",metric:"Response SLA",color:"#9ac9d1" },
  { id:"PROJECTS",name:"Project Delivery",lane:"DELIVERY",role:"Checks schedule, resourcing, mobilization and delivery readiness",status:"ready",metric:"Delivery confidence",color:"#a9c28b" },
  { id:"AUDIT",name:"Independent QA & Risk Review",lane:"GOVERNANCE",role:"Performs independent evidence review and flags unresolved operational risks",status:"ready",metric:"Review findings closed",color:"#c2b5a0" },
];

const STAGES = ["new","qualified","discovery","proposal","negotiation","won","lost"];
const peso = (n:number) => "₱" + Math.round(n || 0).toLocaleString("en-PH");
const dt = (s:string) => new Date(s).toLocaleDateString("en-PH",{day:"2-digit",month:"short"});
async function request(action:string, payload:Record<string,unknown> = {}) {
  const r = await fetch("/api/admin/ai-workforce",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...payload})});
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

export default function AIWorkforceClient(){
  const [tab,setTab]=useState<Tab>("command");
  const [data,setData]=useState<State|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [company,setCompany]=useState("");
  const [contact,setContact]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [service,setService]=useState("Rope Access & Industrial Services");
  const [source,setSource]=useState("Website inquiry");
  const [value,setValue]=useState("");
  const [selectedLead,setSelectedLead]=useState<number| "">("");
  const [channel,setChannel]=useState("email");
  const [draft,setDraft]=useState<Draft|null>(null);
  const [goal,setGoal]=useState("Generate qualified leads and book discovery calls for NEAS rope access, renewable and industrial services.");
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState<string|null>("JARVIS");
  const [selectedAgent,setSelectedAgent]=useState("JARVIS");
  const [agentObjective,setAgentObjective]=useState("");

  const load=useCallback(async()=>{
    try{const r=await fetch("/api/admin/ai-workforce",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Unable to load workforce");setData(j);}catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{load();},[load]);
  const flash=(s:string)=>{setNotice(s);window.setTimeout(()=>setNotice(""),4000);};
  const run=async(action:string,payload:Record<string,unknown>={},success="Saved")=>{
    setBusy(true);setError("");
    try{const r=await request(action,payload);if(r.draft)setDraft(r.draft);flash(success);await load();return r;}
    catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}
  };
  const filtered=useMemo(()=> (data?.leads||[]).filter(l=>(l.company+" "+l.contact+" "+l.service+" "+l.stage).toLowerCase().includes(query.toLowerCase())),[data,query]);
  const lead=data?.leads.find(l=>l.id===Number(selectedLead));
  const selectedSkill=data?.skills?.find(skill=>skill.agentIds.includes(selectedAgent));
  const nav:[Tab,string,string][]=[["command","Command graph","◈"],["agents","Agent matrix","⌘"],["skills","Skill library","?"],["workbench","Specialist workbench","✧"],["leads","Lead pipeline","↗"],["outreach","Human outreach","✉"],["approvals","Human approvals","◉"],["performance","Performance","▥"]];

  return <div className="wf">
    <style jsx global>{`
      .wf{--ink:#e7edf4;--muted:#8292a5;--line:rgba(164,185,205,.14);--panel:rgba(12,24,37,.88);--gold:#ca9332;--sand:#ebc07e;color:var(--ink);font:14px/1.5 Inter,ui-sans-serif,system-ui;background:radial-gradient(ellipse at 48% -20%,rgba(202,147,50,.13),transparent 48%),#07111b;border:1px solid #203346;border-radius:18px;min-height:780px;overflow:hidden;box-shadow:0 24px 70px rgba(2,8,15,.35)}
      .wf *{box-sizing:border-box}.wf button,.wf input,.wf textarea,.wf select{font:inherit}.wf button{cursor:pointer}
      .wf-shell{display:grid;grid-template-columns:224px minmax(0,1fr);min-height:780px}
      .wf-side{background:rgba(4,13,22,.8);border-right:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:22px}
      .wf-brand{display:flex;align-items:center;gap:10px;padding:4px 7px 18px;border-bottom:1px solid var(--line)}.wf-mark{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;color:#07111b;background:linear-gradient(145deg,#f0d39a,#b47b26);font-weight:900;font-size:18px;box-shadow:0 0 24px #ca933244}.wf-brand b{letter-spacing:.12em;font-size:13px}.wf-brand small{display:block;color:var(--muted);font-size:10px;letter-spacing:.1em;text-transform:uppercase}
      .wf-navlabel{font-size:9px;color:#71869a;letter-spacing:.18em;text-transform:uppercase;padding:0 9px 6px}.wf-nav{display:grid;gap:4px}.wf-nav button{display:flex;gap:10px;align-items:center;text-align:left;width:100%;border:1px solid transparent;border-radius:9px;padding:10px;color:#a9b8c7;background:transparent;font-size:12px}.wf-nav button:hover,.wf-nav button.on{color:#f1d8a9;background:linear-gradient(90deg,#ca93321d,#ca933207);border-color:#ca933244}.wf-nav button span:first-child{width:18px;color:#d4ac67;font-size:16px}
      .wf-sidefoot{margin-top:auto;border:1px solid var(--line);border-radius:12px;padding:12px;background:#0b1a28}.wf-sidefoot small{color:var(--muted);display:block;font-size:10px}.wf-sidefoot b{font-size:12px;color:#e9c98e}
      .wf-main{min-width:0;padding:22px 24px 28px}.wf-top{display:flex;justify-content:space-between;gap:14px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:20px}.wf-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#d2aa68}.wf-title{font-size:25px;letter-spacing:-.04em;margin:2px 0 3px;font-weight:650}.wf-sub{color:var(--muted);font-size:12px}.wf-live{display:flex;align-items:center;gap:7px;border:1px solid #43856b55;color:#9ad0b2;background:#17392a44;border-radius:99px;padding:6px 10px;font-size:10px;white-space:nowrap}.wf-dot{width:6px;height:6px;border-radius:50%;background:#6bd19b;box-shadow:0 0 10px #6bd19b}
      .wf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.wf-stat{background:linear-gradient(145deg,#122538,#0b1926);border:1px solid var(--line);border-radius:12px;padding:13px 14px}.wf-stat label{font-size:9px;letter-spacing:.13em;color:#91a4b6;text-transform:uppercase}.wf-stat strong{display:block;font-size:23px;letter-spacing:-.04em;margin-top:5px;color:#f0d5a4}.wf-stat small{font-size:10px;color:#7f91a3}
      .wf-card{background:linear-gradient(145deg,rgba(18,36,53,.92),rgba(9,22,34,.94));border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}.wf-card h3{font-size:13px;margin:0 0 4px;letter-spacing:.01em}.wf-card p{color:var(--muted);font-size:11px;margin:0 0 12px}.wf-row{display:flex;justify-content:space-between;gap:12px;align-items:center}.wf-button{border:1px solid #ca933255;background:#ca933219;color:#f1d7a7;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:650}.wf-button:hover{background:#ca933233}.wf-button:disabled{opacity:.5;cursor:not-allowed}.wf-button.ghost{border-color:var(--line);background:#ffffff08;color:#c4d0db}.wf-button.danger{border-color:#b65c5c55;color:#f0aaaa;background:#7d25251c}
      .wf-columns{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(270px,.85fr);gap:12px}.wf-orbit{position:relative;min-height:430px;border:1px solid #29465b;border-radius:16px;overflow:hidden;background:radial-gradient(ellipse at center,#102b40 0%,#081725 48%,#06111c 100%)}.wf-orbit:before,.wf-orbit:after{content:"";position:absolute;inset:9%;border:1px solid #2c6a7b55;border-radius:50%;pointer-events:none}.wf-orbit:after{inset:19%;border-color:#ca933255;transform:rotate(-18deg) scaleX(1.28)}.wf-orbit-grid{position:absolute;inset:0;background-image:linear-gradient(#4b81900d 1px,transparent 1px),linear-gradient(90deg,#4b81900d 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(ellipse,#000 25%,transparent 78%)}.wf-orbit-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.wf-orbit-lines path{fill:none;stroke:#ca9332;stroke-width:1.15;opacity:.72;stroke-dasharray:5 5;animation:wf-flow 16s linear infinite}.wf-orbit-lines path:nth-child(even){stroke:#50c7e7;opacity:.55;animation-direction:reverse}.wf-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:180px;height:132px;display:grid;place-content:center;text-align:center;border:1px solid #e2b75d;border-radius:28px;background:linear-gradient(145deg,#1a3d52,#091a29);box-shadow:0 0 0 9px #ca93321a,0 0 34px #ca933277,inset 0 0 28px #51c9e522;z-index:2}.wf-core:before{content:"";position:absolute;inset:-16px;border:2px solid #e6a84d88;border-radius:38px;animation:wf-pulse 3s ease-in-out infinite}.wf-core b{font-size:14px;letter-spacing:.12em;color:#f1d5a0}.wf-core small{font-size:9px;color:#8fc6d6;letter-spacing:.18em;margin-top:5px}.wf-core-icon{font-size:25px;color:#8ed8ed;margin-bottom:5px}.wf-orbit-agent{position:absolute;z-index:3;width:150px;min-height:62px;padding:9px 10px;border:1px solid #47758a;border-radius:12px;background:linear-gradient(145deg,#102b40ee,#071522f2);box-shadow:0 8px 24px #0008;text-align:left;color:#e6edf3}.wf-orbit-agent:before{content:"";position:absolute;inset:-5px;border:1px solid #ca933266;border-radius:15px;pointer-events:none}.wf-orbit-agent b{display:block;font-size:10px;letter-spacing:.07em;color:#f0d5a4}.wf-orbit-agent small{display:block;font-size:9px;color:#91b7c8;margin-top:4px}.wf-orbit-agent span{position:absolute;right:9px;top:9px;width:7px;height:7px;border-radius:50%;background:#65d5ac;box-shadow:0 0 9px #65d5ac}.wf-orbit-agent.a1{left:5%;top:10%}.wf-orbit-agent.a2{left:3%;top:43%}.wf-orbit-agent.a3{right:3%;top:43%}.wf-orbit-agent.a4{right:5%;bottom:10%}.wf-orbit-agent.a5{left:50%;bottom:4%;transform:translateX(-50%)}.wf-orbit-agent.a6{right:5%;top:10%}.wf-orbit-status{position:absolute;left:50%;top:7%;transform:translateX(-50%);z-index:2;padding:5px 12px;border:1px solid #3e8a86;border-radius:99px;color:#8be0c3;background:#09251fee;font-size:9px;letter-spacing:.14em;white-space:nowrap}.wf-orbit-footer{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);z-index:2;color:#8bb5c7;font-size:9px;letter-spacing:.12em;text-align:center;white-space:nowrap}.wf-orbit-agent:hover{border-color:#e5b95f;box-shadow:0 0 20px #ca933255;transform:translateY(-2px)}.wf-orbit-agent.a5:hover{transform:translate(-50%,-2px)}@keyframes wf-flow{to{stroke-dashoffset:-100}}@keyframes wf-pulse{0%,100%{opacity:.45;transform:scale(.98)}50%{opacity:1;transform:scale(1.04)}}@media(max-width:680px){.wf-orbit{min-height:560px}.wf-core{width:140px;height:110px}.wf-orbit-agent{width:128px}.wf-orbit-agent.a1{left:2%;top:12%}.wf-orbit-agent.a6{right:2%;top:12%}.wf-orbit-agent.a2{left:2%;top:40%}.wf-orbit-agent.a3{right:2%;top:40%}.wf-orbit-agent.a4{right:2%;bottom:11%}.wf-orbit-agent.a5{left:2%;bottom:11%;transform:none}.wf-orbit-agent.a5:hover{transform:translateY(-2px)}.wf-orbit-status{top:3%}.wf-orbit-footer{bottom:2%;font-size:8px}}
      .wf-list{display:grid;gap:8px}.wf-item{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px;background:#091725}.wf-item b{font-size:11px;display:block}.wf-item small{font-size:10px;color:var(--muted)}.wf-pill{font-size:9px;color:#d7bd8d;border:1px solid #c9a76b44;border-radius:99px;padding:3px 7px;white-space:nowrap}
      .wf-tablewrap{overflow:auto;border:1px solid var(--line);border-radius:12px}.wf table{width:100%;border-collapse:collapse;min-width:680px}.wf th,.wf td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);font-size:11px}.wf th{font-size:9px;color:#8297aa;text-transform:uppercase;letter-spacing:.13em;background:#0a1927}.wf td{color:#d4dee8}.wf tr:last-child td{border:0}
      .wf-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wf-field{display:grid;gap:5px;color:#a7b6c5;font-size:10px}.wf-field input,.wf-field textarea,.wf-field select,.wf-search{width:100%;border:1px solid #30475a;background:#071522;color:#e4edf5;border-radius:8px;padding:10px 11px;outline:none}.wf-field input:focus,.wf-field textarea:focus,.wf-field select:focus,.wf-search:focus{border-color:#ca9332}.wf-field textarea{min-height:110px;resize:vertical}.wf-span{grid-column:1/-1}.wf-agentgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.wf-agent{border:1px solid var(--line);background:#0a1a29;border-radius:12px;padding:13px;text-align:left;color:var(--ink)}.wf-agent:hover,.wf-agent.selected{border-color:#ca9332aa;background:#102438}.wf-agenthead{display:flex;align-items:center;gap:9px}.wf-orb{width:29px;height:29px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:800;border:1px solid #ca933255;color:#e6c48c;background:radial-gradient(circle at 35% 30%,#ca933255,#091725)}.wf-agent b{font-size:11px}.wf-agent p{margin:8px 0 0;color:#8fa1b2;font-size:10px}.wf-agent small{font-size:8px;color:#c5a46b;letter-spacing:.14em}
      .wf-empty{color:#8498aa;text-align:center;padding:25px 10px;font-size:11px}.wf-note{border:1px solid #ca933244;background:#ca93320d;color:#d9c49f;padding:10px 12px;border-radius:10px;font-size:10px;margin-bottom:12px}.wf-error{border:1px solid #a94f4f66;background:#62252522;color:#ffc0b5;padding:10px;border-radius:9px;margin-bottom:12px;font-size:11px}.wf-success{color:#a9d6b9;font-size:10px}
      .wf-kanban{display:grid;grid-template-columns:repeat(7,minmax(170px,1fr));gap:9px;overflow:auto}.wf-lane{background:#071522;border:1px solid var(--line);border-radius:11px;padding:10px;min-height:170px}.wf-lane h4{font-size:9px;letter-spacing:.14em;color:#c9aa72;text-transform:uppercase;margin:0 0 9px}.wf-lead{border:1px solid var(--line);background:#102235;border-radius:8px;padding:9px;margin-bottom:7px}.wf-lead b{display:block;font-size:10px}.wf-lead small{font-size:9px;color:#91a3b4}
      @media(max-width:900px){.wf-shell{grid-template-columns:1fr}.wf-side{border-right:0;border-bottom:1px solid var(--line);padding:12px;gap:10px}.wf-brand{padding:0 4px 10px}.wf-nav{display:flex;overflow:auto}.wf-navlabel,.wf-sidefoot{display:none}.wf-nav button{white-space:nowrap;width:auto}.wf-main{padding:16px 12px}.wf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wf-columns{grid-template-columns:1fr}}
      @media(max-width:580px){.wf-title{font-size:21px}.wf-top{align-items:flex-start;flex-direction:column}.wf-agentgrid{grid-template-columns:1fr}.wf-graph{grid-template-columns:repeat(2,minmax(0,1fr))}.wf-node:nth-child(3n):after{display:block}.wf-node:nth-child(2n):after{display:none}.wf-form{grid-template-columns:1fr}.wf-span{grid-column:auto}}
    `}</style>
    <div style={{display:"flex",justifyContent:"flex-end",padding:"9px 16px",background:"#07111b",borderBottom:"1px solid #203346"}}><a href="/admin/ai-workforce/email" style={{color:"#ebc07e",fontSize:11,fontWeight:700,textDecoration:"none",border:"1px solid #ca933255",borderRadius:8,padding:"7px 11px"}}>✉ Gmail account connections →</a></div>
    <div className="wf-shell">
      <aside className="wf-side">
        <div className="wf-brand"><div className="wf-mark">N</div><div><b>NEAS INTELLIGENCE</b><small>Human + AI workforce</small></div></div>
        <div><div className="wf-navlabel">Command workspace</div><nav className="wf-nav">{nav.map(([id,label,icon])=><button key={id} className={tab===id?"on":""} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav></div>
        <div className="wf-sidefoot"><small>OPERATING MODE</small><b>HYBRID · HUMAN-GOVERNED</b><small style={{marginTop:8}}>AI prepares. Humans authorize.</small></div>
      </aside>
      <main className="wf-main">
        <header className="wf-top"><div><div className="wf-kicker">NextEdge Access Solutions · Business OS</div><h1 className="wf-title">{nav.find(n=>n[0]===tab)?.[1] || "Command"}</h1><div className="wf-sub">One coordinated workforce. Every action traceable. Every result measurable.</div></div><div className="wf-live"><span className="wf-dot"/>{data?(data.specialistAiReady?"LIVE AI WORKFORCE READY":"AI GATEWAY AUTH NOT AVAILABLE"):"CONNECTING"}</div></header>
        {error&&<div className="wf-error">{error}</div>}{notice&&<div className="wf-success">{notice}</div>}
        {!data?<div className="wf-card wf-empty">Loading NEAS workforce intelligence…</div>:<>
        {tab==="command"&&<>
          <div className="wf-grid">
            <div className="wf-stat"><label>Active leads</label><strong>{data.metrics.leads}</strong><small>Tracked opportunities</small></div>
            <div className="wf-stat"><label>Qualified pipeline</label><strong>{data.metrics.qualified}</strong><small>Qualification stage and beyond</small></div>
            <div className="wf-stat"><label>Pipeline value</label><strong>{peso(data.metrics.pipeline)}</strong><small>Entered opportunity values</small></div>
            <div className="wf-stat"><label>Outreach drafts</label><strong>{data.metrics.drafts}</strong><small>Awaiting human review</small></div>
          </div>
          <div className="wf-columns">
            <section className="wf-card"><div className="wf-row"><div><h3>Human-matrix workflow</h3><p>Business process graph · specialist hand-offs · approval gates</p></div><span className="wf-pill">LIVE DATA</span></div>
              <div className="wf-orbit" role="img" aria-label="JARVIS orchestrator coordinating six specialist AI agents">
                <div className="wf-orbit-grid"/>
                <svg className="wf-orbit-lines" viewBox="0 0 900 430" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M450 215 C350 130 230 75 105 65"/><path d="M450 215 C300 215 190 215 95 215"/><path d="M450 215 C600 215 710 215 805 215"/><path d="M450 215 C560 300 690 355 790 365"/><path d="M450 215 C450 290 450 340 450 390"/><path d="M450 215 C560 130 690 75 795 65"/>
                  <path d="M105 65 C210 110 300 160 450 215"/><path d="M95 215 C230 215 330 215 450 215"/><path d="M805 215 C670 215 570 215 450 215"/><path d="M790 365 C660 320 560 270 450 215"/><path d="M450 390 C450 320 450 270 450 215"/><path d="M795 65 C680 110 580 160 450 215"/>
                </svg>
                <div className="wf-orbit-status">TASK BUDGET · ACTIVE</div>
                <div className="wf-core"><div className="wf-core-icon">✧</div><b>JARVIS</b><small>ORCHESTRATOR CORE</small></div>
                <div className="wf-orbit-agent a1"><span/><b>01 · ANALYSIS</b><small>Research · Intelligence · Strategy</small></div>
                <div className="wf-orbit-agent a2"><span/><b>02 · EXECUTION</b><small>Sales · Marketing · Outreach</small></div>
                <div className="wf-orbit-agent a3"><span/><b>03 · OPTIMIZATION</b><small>Automation · Performance · Growth</small></div>
                <div className="wf-orbit-agent a4"><span/><b>04 · REVIEW</b><small>Quality · Integrity · Compliance</small></div>
                <div className="wf-orbit-agent a5"><span/><b>05 · DELIVERY</b><small>Engineering · Projects · Clients</small></div>
                <div className="wf-orbit-agent a6"><span/><b>06 · COORDINATION</b><small>Delegation · Workflow · Approvals</small></div>
                <div className="wf-orbit-footer">HUMAN GOVERNANCE · SHARED INTELLIGENCE · TRACEABLE RESULTS</div>
              </div>
              <div className="wf-note" style={{marginTop:12}}>External actions remain gated: no proposal issue, email send, purchase commitment, contract acceptance or safety authorization without the required human approval.</div>
            </section>
            <section className="wf-card"><h3>Executive priorities</h3><p>Business-first operating queue</p><div className="wf-list">
              {[["01","Respond to new inquiries","Sales Agent · qualify and assign"],["02","Prepare high-fit proposals","Finance + service specialists"],["03","Create authority-building content","Marketing + Creative Studio"],["04","Follow up open opportunities","Human-reviewed outreach"]].map(x=><div className="wf-item" key={x[0]}><span className="wf-pill">{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}
            </div><button className="wf-button" style={{marginTop:12}} onClick={()=>setTab("leads")}>Open lead pipeline →</button></section>
          </div>
          <section className="wf-card" style={{marginTop:12}}><div className="wf-row"><div><h3>Latest opportunities</h3><p>Real records entered in this portal</p></div><button className="wf-button" onClick={()=>setTab("leads")}>Manage leads</button></div>{data.leads.length?<div className="wf-tablewrap"><table><thead><tr><th>Company</th><th>Service</th><th>Stage</th><th>Value</th><th>Added</th></tr></thead><tbody>{data.leads.slice(0,6).map(l=><tr key={l.id}><td>{l.company}</td><td>{l.service}</td><td>{l.stage}</td><td>{peso(l.value)}</td><td>{dt(l.created_at)}</td></tr>)}</tbody></table></div>:<div className="wf-empty">No leads yet. Add your first opportunity in Lead Pipeline.</div>}</section>
        </>}
        {tab==="agents"&&<>
          <div className="wf-note">All 23 specialist roles are now available for bounded internal work orders, with role-specific instructions, persistent task records and human review. External actions and regulated sign-offs remain restricted by the authority matrix.</div>
          <div className="wf-agentgrid">{AGENTS.map(a=><button key={a.id} className={"wf-agent "+(expanded===a.id?"selected":"")} onClick={()=>setExpanded(expanded===a.id?null:a.id)}><div className="wf-agenthead"><span className="wf-orb" style={{borderColor:a.color+"88",color:a.color}}>{a.id.slice(0,2)}</span><div><b>{a.name}</b><small style={{display:"block"}}>{a.lane} · {a.status.toUpperCase()}</small></div></div><p>{a.role}</p>{expanded===a.id&&<p style={{color:"#e1c58e"}}>Primary KPI: {a.metric}. Scoped task execution is available; external actions require human approval.</p>}<span className="wf-button" style={{display:"inline-block",marginTop:9}} onClick={e=>{e.stopPropagation();setSelectedAgent(a.id);setTab("workbench");}}>Open workbench →</span></button>)}</div>
        </>}
        {tab==="leads"&&<>
          <div className="wf-columns">
            <section className="wf-card"><h3>Capture a new opportunity</h3><p>Record a real prospect. Avoid storing sensitive personal information that is not needed.</p>
              <form className="wf-form" onSubmit={async e=>{e.preventDefault();const r=await run("createLead",{company,contact,email,phone,service,source,value:Number(value)||0},"Lead captured");if(r){setCompany("");setContact("");setEmail("");setPhone("");setValue("");}}}>
                <label className="wf-field">Company / organization<input required maxLength={160} value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company name"/></label>
                <label className="wf-field">Contact person<input maxLength={120} value={contact} onChange={e=>setContact(e.target.value)} placeholder="Name / role"/></label>
                <label className="wf-field">Business email<input type="email" maxLength={240} value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
                <label className="wf-field">Business phone<input maxLength={60} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+63…"/></label>
                <label className="wf-field">Service interest<select value={service} onChange={e=>setService(e.target.value)}>{["Rope Access & Industrial Services","Wind Turbine / Renewable Energy","Met Mast & Telecom Towers","Offshore / Onshore / Power Plant","Facade / Waterproofing / Cleaning","NDT / Inspection / Welding","Training / Consultancy / PPE"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label className="wf-field">Lead source<select value={source} onChange={e=>setSource(e.target.value)}>{["Website inquiry","Referral","LinkedIn","Email research","Industry event","Existing client","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label className="wf-field wf-span">Estimated opportunity value (PHP)<input type="number" min="0" step="1000" value={value} onChange={e=>setValue(e.target.value)} placeholder="Optional"/></label>
                <div className="wf-span"><button className="wf-button" disabled={busy||!company.trim()}>+ Save opportunity</button></div>
              </form>
            </section>
            <section className="wf-card"><h3>Pipeline board</h3><p>Move deals only when the stage is supported by a real client interaction.</p><div className="wf-kanban">{STAGES.map(stage=><div className="wf-lane" key={stage}><h4>{stage}</h4>{data.leads.filter(l=>l.stage===stage).map(l=><div className="wf-lead" key={l.id}><b>{l.company}</b><small>{l.service}<br/>{peso(l.value)}</small><select aria-label={"Stage for "+l.company} value={l.stage} onChange={e=>run("updateStage",{id:l.id,stage:e.target.value},"Pipeline updated")} style={{marginTop:7,width:"100%",background:"#071522",color:"#e4edf5",border:"1px solid #30475a",borderRadius:6,padding:5,fontSize:10}}>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select><button className="wf-button ghost" style={{marginTop:7,width:"100%"}} onClick={()=>{setSelectedLead(l.id);setTab("outreach")}}>Prepare outreach</button></div>)}</div>)}</div></section>
          </div>
          <section className="wf-card" style={{marginTop:12}}><div className="wf-row"><div><h3>All opportunities</h3><p>Search and track every prospect</p></div><input className="wf-search" style={{maxWidth:250}} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company / service"/></div><div className="wf-tablewrap"><table><thead><tr><th>Company</th><th>Contact</th><th>Service</th><th>Stage</th><th>Contact preference</th><th>Value</th><th>Source</th><th>Next step</th><th>Action</th></tr></thead><tbody>{filtered.map(l=><tr key={l.id}><td>{l.company}</td><td>{l.contact||"—"}<br/>{l.email}</td><td>{l.service}</td><td>{l.stage}</td><td><select aria-label={"Contact preference for "+l.company} value={l.contact_status||"unreviewed"} onChange={e=>run("updateContactStatus",{id:l.id,status:e.target.value},"Contact preference updated")} style={{background:"#071522",color:"#e4edf5",border:"1px solid #30475a",borderRadius:6,padding:5,fontSize:10}}><option value="unreviewed">Unreviewed</option><option value="permitted">Permitted</option><option value="opted_out">Opted out</option></select></td><td>{peso(l.value)}</td><td>{l.source}</td><td><input aria-label={"Next step for "+l.company} maxLength={300} defaultValue={l.next_step} key={l.id+":"+l.next_step} placeholder="Add next step" onBlur={e=>{const v=e.target.value.trim();if(v!==l.next_step)run("updateNextStep",{id:l.id,nextStep:v},"Next step saved");}} style={{minWidth:160,background:"#071522",color:"#e4edf5",border:"1px solid #30475a",borderRadius:6,padding:5,fontSize:10}}/></td><td><button className="wf-button ghost" onClick={()=>{setSelectedLead(l.id);setTab("outreach")}}>Outreach</button></td></tr>)}</tbody></table></div></section>
        </>}
        {tab==="outreach"&&<>
          <div className="wf-note">Human-led relationship development: create tailored drafts, review the recipient and business relevance, then send from your own approved business mailbox or use the call script. The system does not impersonate a person or auto-send cold outreach.</div>
          <div className="wf-columns"><section className="wf-card"><h3>Prepare a personal client approach</h3><p>Natural, relevant, professional communication with a clear next step.</p>
            <div className="wf-form">
              <label className="wf-field wf-span">Select lead<select value={selectedLead} onChange={e=>setSelectedLead(e.target.value?Number(e.target.value):"")}><option value="">Choose a prospect</option>{data.leads.map(l=><option key={l.id} value={l.id}>{l.company} · {l.service}</option>)}</select></label>
              <label className="wf-field">Contact channel<select value={channel} onChange={e=>setChannel(e.target.value)}><option value="email">Email introduction</option><option value="call">Cold-call / discovery script</option><option value="linkedin">LinkedIn connection note</option></select></label>
              <label className="wf-field">Desired outcome<select value={goal} onChange={e=>setGoal(e.target.value)}><option>Generate qualified leads and book discovery calls for NEAS rope access, renewable and industrial services.</option><option>Arrange a technical discovery meeting and request scope documents.</option><option>Re-engage an existing client and identify upcoming maintenance requirements.</option><option>Introduce NEAS training, work-at-height and rope rescue capabilities.</option></select></label>
              <div className="wf-span"><button className="wf-button" disabled={busy||!lead} onClick={()=>run("draftOutreach",{leadId:Number(selectedLead),channel,goal},"Outreach draft prepared")}>✦ Generate tailored {channel} draft</button></div>
            </div>
            {draft&&<div style={{marginTop:14}} className="wf-card"><div className="wf-row"><h3>{draft.channel==="call"?"Call guide":"Outreach draft"}</h3><span className="wf-pill">{draft.status}</span></div><b style={{display:"block",fontSize:12,margin:"10px 0"}}>{draft.subject}</b><textarea readOnly value={draft.body} className="wf-field" style={{width:"100%",minHeight:220,background:"#071522",color:"#e4edf5",border:"1px solid #30475a",borderRadius:8,padding:12}}/><div className="wf-row" style={{marginTop:10}}><button className="wf-button ghost" onClick={()=>navigator.clipboard.writeText(draft.body)}>Copy draft</button>{draft.channel==="email"&&lead?.email&&<a className="wf-button" href={"mailto:"+encodeURIComponent(lead.email)+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body)}>Open in email app →</a>}</div></div>}
          </section><section className="wf-card"><h3>Human interaction principles</h3><p>Be credible, relevant and respectful. No fake familiarity or fabricated relationship.</p><div className="wf-list">{[["Research before reaching out","Use public company context and a relevant service reason."],["Personalize honestly","Use the recipient's actual role and company; no invented referrals."],["Offer value first","Share a capability, checklist or useful technical insight."],["Ask for a small next step","Request a short discovery call or scope review."],["Respect preferences","Record opt-outs and suppress future contact where requested."],["Track the outcome","Log response, meeting, proposal and next action."]].map((x,i)=><div className="wf-item" key={x[0]}><span className="wf-pill">0{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div></section></div>
        </>}
        {tab==="approvals"&&<>
          <div className="wf-note">Approvals are a separate human authority layer. No external email, quotation, campaign publication, purchase or contract commitment should be issued by an agent without the required authorized approval.</div>
          <section className="wf-card"><h3>Drafts awaiting review</h3><p>Review outreach and proposed actions before they leave NEAS systems.</p>{data.drafts.length?<div className="wf-tablewrap"><table><thead><tr><th>Company</th><th>Channel</th><th>Subject / purpose</th><th>Status</th><th>Created</th><th>Review</th></tr></thead><tbody>{data.drafts.map(d=><tr key={d.id}><td>{d.company}</td><td>{d.channel}</td><td>{d.subject}</td><td>{d.status}</td><td>{dt(d.created_at)}</td><td>{d.status==="draft"?<button className="wf-button" disabled={busy} onClick={()=>run("reviewDraft",{id:d.id},"Draft marked reviewed")}>Mark reviewed</button>:<span className="wf-pill">Reviewed</span>}</td></tr>)}</tbody></table></div>:<div className="wf-empty">No outreach drafts are waiting for review.</div>}</section>
          <section className="wf-card" style={{marginTop:12}}><h3>Authority matrix</h3><div className="wf-tablewrap"><table><thead><tr><th>Action</th><th>AI authority</th><th>Human control</th></tr></thead><tbody>{[["Research / classify / summarize","Autonomous within access","Audit sampling"],["Draft posts, emails and proposals","Prepare draft only","Review and approve before issue"],["Update internal lead stage","Authorized internal update","Audit trail and role check"],["Send external email / cold outreach","No autonomous send","Explicit human send action"],["Publish social campaigns / paid ads","Prepare and schedule proposal","Manager approval"],["Prices, contracts, purchase and payment","No autonomous commitment","Owner / delegated authority"],["Safety plans, anchor or engineering sign-off","Assistive drafting only","Competent person approval"]].map(x=><tr key={x[0]}><td>{x[0]}</td><td>{x[1]}</td><td>{x[2]}</td></tr>)}</tbody></table></div></section>
        </>}
        {tab==="skills"&&<>
          <div className="wf-note">Nine versioned specialist skill packs are loaded server-side. The browser receives only skill descriptions and role mappings; internal prompt instructions stay on the server.</div>
          <div className="wf-agentgrid">{(data.skills||[]).map(skill=><article className="wf-card" key={skill.id}>
            <div className="wf-kicker">{skill.domain}</div><h3>{skill.name}</h3><p>{skill.description}</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>{skill.agentIds.map(id=><span className="wf-pill" key={id}>{id}</span>)}</div>
            <button className="wf-button" style={{marginTop:12}} onClick={()=>{const agent=AGENTS.find(a=>skill.agentIds.includes(a.id));if(agent){setSelectedAgent(agent.id);setTab("workbench");}}}>Run this skill</button>
          </article>)}</div>
        </>}
        {tab==="workbench"&&<>
          <div className="wf-note">All specialist roles can now create persistent, role-scoped work orders. Outputs are internal drafts for review. This does not grant authority to send communications, publish campaigns, commit prices, approve engineering or safety work, or sign contracts.</div>
          <div className="wf-columns">
            <section className="wf-card"><h3>Launch a specialist work order</h3><p>Select a specialist and define the business outcome. The system applies the role's scope, controls and review requirements.</p>
              <div className="wf-note" style={{marginTop:10}}>{selectedSkill?<>Active skill: <b>{selectedSkill.name}</b> | {selectedSkill.description}</>:"No skill mapping found for this specialist."}</div>
              <div className="wf-form">
                <label className="wf-field wf-span">Specialist<select value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)}>{AGENTS.map(a=><option key={a.id} value={a.id}>{a.name} · {a.lane}</option>)}</select></label>
                <label className="wf-field wf-span">Objective / task brief<textarea value={agentObjective} onChange={e=>setAgentObjective(e.target.value)} maxLength={3000} placeholder="Describe the deliverable, client/project context, constraints and deadline." /></label>
                <div className="wf-span"><button className="wf-button" disabled={busy||agentObjective.trim().length<12} onClick={()=>run("specialistTask",{agentId:selectedAgent,objective:agentObjective},"Specialist work order created")}>✦ Run specialist</button></div>
              </div>
            </section>
            <section className="wf-card"><h3>Execution and governance</h3><p>Every run is logged and reviewable.</p><div className="wf-list">
              {[[ "01","Role-scoped","Uses the selected specialist's responsibility and limits." ],[ "02","Traceable","Persists objective, output, owner and timestamp." ],[ "03","Human review","Work orders enter review before external use." ],[ "04","Safety boundary","No autonomous engineering, HSE or legal authorization." ]].map(x=><div className="wf-item" key={x[0]}><span className="wf-pill">{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}
            </div></section>
          </div>
          <section className="wf-card" style={{marginTop:12}}><h3>Specialist work queue</h3><p>Latest saved work orders and draft deliverables.</p>{data.tasks?.length?<div className="wf-list">{data.tasks.map(t=><article className="wf-item" key={t.id}><span className="wf-pill">#{t.id}</span><div style={{minWidth:0,flex:1}}><b>{t.agent_name} · {t.status}</b><small>{t.objective} · {dt(t.created_at)}</small><pre style={{whiteSpace:"pre-wrap",fontSize:10,color:"#c7d5e2",margin:"9px 0 0",fontFamily:"inherit"}}>{t.deliverable}</pre></div></article>)}</div>:<div className="wf-empty">No specialist work orders yet. Launch the first task above.</div>}</section>
        </>}
        {tab==="performance"&&<>
          <div className="wf-grid"><div className="wf-stat"><label>Lead records</label><strong>{data.metrics.leads}</strong><small>All tracked sources</small></div><div className="wf-stat"><label>Qualified</label><strong>{data.metrics.qualified}</strong><small>Qualified + later stages</small></div><div className="wf-stat"><label>Proposal stage</label><strong>{data.metrics.proposals}</strong><small>Proposal, negotiation and won</small></div><div className="wf-stat"><label>Pipeline amount</label><strong>{peso(data.metrics.pipeline)}</strong><small>Manually entered estimates</small></div></div>
          <section className="wf-card"><h3>Business outcome ledger</h3><p>These metrics are derived from the NEAS AI Workforce lead records, not from external CRM or accounting systems.</p><div className="wf-tablewrap"><table><thead><tr><th>Workflow</th><th>Status</th><th>Latest event</th><th>Recorded result</th></tr></thead><tbody>{data.runs.map(r=><tr key={r.id}><td>{r.workflow}</td><td>{r.status}</td><td>{dt(r.created_at)}</td><td>{r.summary}</td></tr>)}</tbody></table></div>{!data.runs.length&&<div className="wf-empty">No workflow runs recorded yet. New lead and outreach actions will appear here.</div>}</section>
        </>}
        </>}
      </main>
    </div>
  </div>;
}
