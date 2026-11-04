import { useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowUpRight, BarChart3, Bell, CalendarDays,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, FileText, Inbox,
  LayoutDashboard, Link2, Megaphone, MessageSquare, PenSquare, Plus,
  Radio, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, Video,
  WandSparkles, Workflow
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const navigation = [
  { group: "WORKSPACE", items: [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "compose", label: "Compose", icon: PenSquare },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]},
  { group: "MANAGEMENT", items: [
    { id: "brands", label: "Brands", icon: ShieldCheck },
    { id: "accounts", label: "Social Accounts", icon: Radio },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "strategy", label: "Content Strategy", icon: Sparkles },
    { id: "automation", label: "Automation", icon: Workflow },
    { id: "creative", label: "Creative Studio", icon: WandSparkles },
    { id: "bio", label: "Link-in-Bio", icon: Link2 },
  ]},
  { group: "ADMINISTRATION", items: [
    { id: "team", label: "Team & Permissions", icon: Users },
    { id: "settings", label: "Settings", icon: Settings2 },
  ]},
];

const moduleDescriptions: Record<string, { title: string; description: string; next: string }> = {
  compose: { title: "Content composer", description: "Prepare platform-specific content for NEAS campaigns. Drafting and publishing integrations will be connected in the next implementation phase.", next: "Connect approved social accounts before enabling publishing." },
  calendar: { title: "Publishing calendar", description: "A unified calendar for planned, reviewed, scheduled and published content.", next: "Calendar events will appear after the content and scheduling API is connected." },
  inbox: { title: "Unified social inbox", description: "Bring supported comments, mentions and direct messages into one staff workflow.", next: "Inbox access requires platform permissions and connected accounts." },
  analytics: { title: "Marketing analytics", description: "Measure reach, impressions, engagement, audience growth and campaign performance using verified platform data.", next: "No metrics are fabricated. Connect platform APIs to populate this workspace." },
  brands: { title: "Brand workspaces", description: "Manage NEAS brand voice, approved claims, logos, colors and reusable content guidelines.", next: "The initial workspace is configured for NextEdge Access Solutions." },
  accounts: { title: "Social accounts", description: "Connect and monitor official social profiles through platform-authorized OAuth flows.", next: "No social accounts have been connected through this new module yet." },
  reports: { title: "Marketing reports", description: "Create weekly, monthly and campaign-level reports with exportable performance summaries.", next: "Reports become available when verified analytics sources are connected." },
  strategy: { title: "AI content strategy", description: "Plan campaigns around rope access, wind turbine maintenance, renewable energy, facade services, training and industrial maintenance.", next: "AI generation will use approved NEAS brand instructions and verified service information." },
  automation: { title: "Marketing automation", description: "Manage publishing queues, approval reminders, reporting schedules and failure alerts.", next: "Automations remain disabled until their triggers and platform connections are configured." },
  creative: { title: "Creative studio", description: "Organize campaign assets, social graphics, video concepts and platform-ready creative briefs.", next: "Media integration will reuse the existing NEAS asset storage where supported." },
  bio: { title: "Link-in-Bio", description: "Create campaign landing pages and track referral links for NEAS services and enquiries.", next: "Tracking and public page publishing will be enabled after the route and analytics integration." },
  team: { title: "Team & permissions", description: "Use the existing NEAS staff identity and role system for marketing access.", next: "Existing CMS roles are respected. No new user directory is created." },
  settings: { title: "Marketing settings", description: "Configure workspace defaults, brand rules, connected platforms and notification preferences.", next: "Secrets and OAuth credentials will be stored server-side, never in browser code." },
};

const servicePillars = [
  "Rope Access & Industrial Services",
  "Wind Turbine & Renewable Energy",
  "Facade Cleaning & Maintenance",
  "Met Mast & Telecom",
  "Offshore & Onshore Operations",
  "Safety, Rescue & Training",
];

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Activity }) {
  return <article className="rounded-xl border border-slate-800 bg-[#111c2d] p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span><Icon size={17} className="text-[#d29a3a]" /></div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{note}</p>
  </article>;
}

export default function Marketing() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [campaign, setCampaign] = useState("Rope Access & Industrial Services");
  const [savedPreview, setSavedPreview] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const current = useMemo(() => navigation.flatMap(group => group.items).find(item => item.id === active), [active]);
  const canAccess = Boolean(user && ["editor", "reviewer", "publisher", "admin"].includes(user.role));

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#07111f] text-sm text-slate-300">Checking NEAS staff access…</div>;
  if (!canAccess) return <div className="grid min-h-screen place-items-center bg-[#07111f] px-6 text-center text-white"><div className="max-w-md"><ShieldCheck className="mx-auto h-12 w-12 text-[#d29a3a]" /><h1 className="mt-5 text-3xl font-semibold">Staff access required</h1><p className="mt-3 text-sm leading-6 text-slate-400">Sign in with an approved NEAS staff account to access the marketing workspace.</p><Button onClick={() => startLogin()} className="mt-6 bg-[#d29a3a] text-[#07111f] hover:bg-[#e6b45c]">Sign in securely</Button><Link href="/admin" className="mt-4 block text-sm text-slate-400 underline">Return to NEAS admin</Link></div></div>;

  return <div className="min-h-screen bg-[#07111f] text-slate-100">
    <div className="flex min-h-screen">
      <aside className={`${mobileNavOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0c1727] lg:sticky lg:top-0 lg:flex lg:h-screen`}>
        <div className="flex h-[68px] items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d29a3a] text-[#07111f]"><Activity size={20}/></div>
          <div><p className="text-sm font-bold tracking-wide">NEAS <span className="text-[#d29a3a]">MARKETING</span></p><p className="text-[10px] text-slate-500">GLOBAL COMMAND CENTER</p></div>
        </div>
        <div className="border-b border-slate-800 px-4 py-4"><p className="text-xs font-semibold text-white">NextEdge Access Solutions</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Existing NEAS staff session</p></div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">{navigation.map(group => <div key={group.group}><p className="mb-2 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-500">{group.group}</p><div className="space-y-1">{group.items.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setActive(item.id); setMobileNavOpen(false); setShowNotice(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active === item.id ? "bg-[#3b2d1c] font-semibold text-[#efc274]" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><Icon size={16}/>{item.label}</button>; })}</div></div>)}</nav>
        <div className="border-t border-slate-800 p-4"><p className="truncate text-xs font-semibold text-white">{user?.name || "NEAS staff"}</p><p className="mt-1 text-[10px] capitalize text-slate-500">{user?.role} access</p><Link href="/admin" className="mt-3 inline-flex items-center gap-2 text-xs text-[#d29a3a] hover:text-[#efc274]">← Back to CMS admin</Link></div>
      </aside>
      {mobileNavOpen && <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden"/>}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-800 bg-[#0c1727]/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3"><button onClick={() => setMobileNavOpen(v => !v)} className="rounded-md p-2 text-slate-400 hover:bg-slate-800 lg:hidden" aria-label="Toggle navigation"><LayoutDashboard size={18}/></button><div><p className="text-xs text-slate-500">NEAS / Marketing</p><h1 className="text-sm font-semibold text-white md:text-base">{current?.label || "Dashboard"}</h1></div></div>
          <div className="flex items-center gap-2"><Badge className="hidden border border-emerald-900 bg-emerald-950/60 text-emerald-300 sm:inline-flex">STAGING WORKSPACE</Badge><button className="rounded-lg border border-slate-700 p-2 text-slate-400" aria-label="Notifications"><Bell size={16}/></button><Link href="/admin" className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 sm:inline-flex">NEAS CMS</Link></div>
        </header>
        {active === "overview" ? <div className="space-y-6 p-4 md:p-7">
          <section className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d29a3a]">Marketing operations</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Good morning, {user?.name?.split(" ")[0] || "NEAS Team"}</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">One workspace for NEAS content planning, social publishing, community management and performance reporting.</p></div><Button onClick={() => setActive("compose")} className="bg-[#d29a3a] text-[#07111f] hover:bg-[#e6b45c]"><Plus size={16}/> Create content</Button></section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total reach" value="—" note="Waiting for platform analytics" icon={Activity}/><MetricCard label="Published posts" value="—" note="No publishing source connected" icon={CheckCircle2}/><MetricCard label="Connected accounts" value="0" note="Connect an official social profile" icon={Radio}/><MetricCard label="Pending approvals" value="0" note="No marketing approvals yet" icon={Clock3}/></section>
          <section className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
            <article className="rounded-xl border border-slate-800 bg-[#111c2d] p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Workspace readiness</h3><p className="mt-1 text-xs text-slate-400">Initial integration checklist</p></div><Badge className="border border-amber-900 bg-amber-950/50 text-amber-300">Setup required</Badge></div><div className="mt-5 space-y-4">{[{title:"Existing NEAS staff authentication",detail:"Reuses the current CMS login and role checks",done:true},{title:"Marketing dashboard route",detail:"Integrated at /admin/marketing",done:true},{title:"Social account OAuth",detail:"Requires approved platform app credentials",done:false},{title:"Content and scheduling API",detail:"Requires isolated marketing data tables and server procedures",done:false},{title:"Analytics and inbox APIs",detail:"Requires platform permissions and connected accounts",done:false}].map(item => <div key={item.title} className="flex items-start gap-3"><div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${item.done ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{item.done ? <CheckCircle2 size={14}/> : <Clock3 size={14}/>}</div><div><p className="text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div></div>)}</div></article>
            <article className="rounded-xl border border-slate-800 bg-[#111c2d] p-5"><div className="flex items-center gap-2"><Sparkles size={17} className="text-[#d29a3a]"/><h3 className="font-semibold text-white">NEAS content pillars</h3></div><p className="mt-2 text-xs leading-5 text-slate-400">Configured focus areas for future AI-assisted campaigns.</p><div className="mt-4 flex flex-wrap gap-2">{servicePillars.map(p => <span key={p} className="rounded-full border border-slate-700 bg-[#0c1727] px-3 py-1.5 text-[11px] text-slate-300">{p}</span>)}</div></article>
          </section>
          <section className="rounded-xl border border-slate-800 bg-[#111c2d] p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-white">Recent activity</h3><p className="mt-1 text-xs text-slate-400">Live activity will appear when connected modules are enabled.</p></div><Activity size={17} className="text-slate-500"/></div><div className="mt-5 rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center"><Clock3 className="mx-auto text-slate-500" size={22}/><p className="mt-2 text-sm font-medium text-slate-300">No marketing activity yet</p><p className="mt-1 text-xs text-slate-500">Your existing NEAS CMS content and publishing records remain unchanged.</p></div></section>
        </div> : active === "compose" ? <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px] md:p-7"><section className="rounded-xl border border-slate-800 bg-[#111c2d] p-5"><h2 className="text-xl font-semibold text-white">Create a marketing draft</h2><p className="mt-1 text-sm text-slate-400">Prepare copy for review. This preview is local to this page and is not yet saved or published.</p><label className="mt-5 block text-xs font-semibold text-slate-300">Platform<select value={platform} onChange={e=>setPlatform(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0c1727] px-3 py-3 text-sm text-white"><option>LinkedIn</option><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>TikTok</option></select></label><label className="mt-4 block text-xs font-semibold text-slate-300">Campaign pillar<select value={campaign} onChange={e=>setCampaign(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0c1727] px-3 py-3 text-sm text-white">{servicePillars.map(p=><option key={p}>{p}</option>)}</select></label><label className="mt-4 block text-xs font-semibold text-slate-300">Post copy<textarea rows={9} value={caption} onChange={e=>{setCaption(e.target.value);setSavedPreview(false);}} placeholder="Write your NEAS campaign message…" className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-[#0c1727] px-3 py-3 text-sm leading-6 text-white placeholder:text-slate-600"/></label><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>setSavedPreview(true)} disabled={!caption.trim()} className="bg-[#d29a3a] text-[#07111f] hover:bg-[#e6b45c]">Preview draft</Button><Button variant="outline" onClick={()=>{setCaption("");setSavedPreview(false);}} className="border-slate-700 text-slate-300">Clear</Button></div>{savedPreview && <div className="mt-5 rounded-lg border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-200">Preview prepared for {platform}. It has not been saved, submitted for approval, or published.</div>}</section><aside className="rounded-xl border border-slate-800 bg-[#111c2d] p-5"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#d29a3a]"/><h3 className="font-semibold text-white">Publishing safeguards</h3></div><ul className="mt-4 space-y-3 text-xs leading-5 text-slate-400"><li>• Drafts must be saved to the marketing workspace before review.</li><li>• Review and publishing actions will use the existing NEAS role model.</li><li>• Only connected, authorized platform accounts can publish.</li><li>• Failed API requests must remain visible as failed—not reported as published.</li></ul></aside></div> : <div className="p-4 md:p-7"><section className="rounded-xl border border-slate-800 bg-[#111c2d] p-6 md:p-8"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3b2d1c] text-[#efc274]">{current ? <current.icon size={21}/> : <CircleHelp size={21}/>}</div><div><h2 className="text-xl font-semibold text-white">{moduleDescriptions[active]?.title || "Marketing workspace"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{moduleDescriptions[active]?.description}</p><div className="mt-5 rounded-lg border border-slate-700 bg-[#0c1727] p-4 text-sm text-slate-300"><div className="flex items-center gap-2 font-medium text-[#efc274]"><AlertCircle size={16}/> Integration status</div><p className="mt-2 text-xs leading-5 text-slate-400">{moduleDescriptions[active]?.next}</p></div><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setActive("accounts")} className="border-slate-700 text-slate-300">View social accounts</Button><Button variant="outline" onClick={()=>setActive("overview")} className="border-slate-700 text-slate-300">Back to dashboard</Button></div></div></div></section></div>}
      </main>
    </div>
  </div>;
}
