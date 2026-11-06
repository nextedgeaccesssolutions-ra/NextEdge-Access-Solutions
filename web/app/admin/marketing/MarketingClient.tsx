"use client";

import { useMemo, useState } from "react";

type Props = { user: { name: string; email: string } };
type NavItem = readonly [id: string, label: string, icon: string];
type NavGroup = { readonly group: string; readonly items: readonly NavItem[] };
const nav: readonly NavGroup[] = [
  { group: "WORKSPACE", items: [["overview", "Dashboard", "▦"], ["compose", "Compose", "✎"], ["calendar", "Calendar", "▦"], ["inbox", "Inbox", "✉"], ["analytics", "Analytics", "▥"]] },
  { group: "MANAGEMENT", items: [["brands", "Brands", "◇"], ["accounts", "Social Accounts", "◎"], ["reports", "Reports", "▤"], ["strategy", "Content Strategy", "✧"], ["automation", "Automation", "⌘"], ["creative", "Creative Studio", "✦"], ["bio", "Link-in-Bio", "↗"]] },
  { group: "ADMINISTRATION", items: [["team", "Team & Permissions", "♙"], ["settings", "Settings", "⚙"]] },
];

const descriptions: Record<string, { title: string; body: string; note: string }> = {
  calendar: { title: "Publishing calendar", body: "Plan, review and schedule NEAS content across connected social channels.", note: "Calendar events will be loaded from the marketing content API after the data model and scheduling service are implemented." },
  inbox: { title: "Unified social inbox", body: "Manage supported direct messages, comments, mentions and community conversations from one workspace.", note: "Requires official platform app permissions and connected social accounts." },
  analytics: { title: "Marketing analytics", body: "Review reach, impressions, engagement, audience growth, video views and campaign results.", note: "Only verified platform metrics will be displayed. No sample or fabricated performance data is used." },
  brands: { title: "Brand management", body: "Manage NEAS brand voice, approved service claims, visual identity and reusable campaign guidelines.", note: "Initial workspace: NextEdge Access Solutions." },
  accounts: { title: "Social account connections", body: "Connect Facebook Pages, Instagram Business, LinkedIn, YouTube and TikTok using official OAuth authorization.", note: "OAuth credentials and tokens must be configured server-side before connecting accounts." },
  reports: { title: "Marketing reports", body: "Prepare weekly, monthly, quarterly and campaign-level reports for management review.", note: "Report exports will be enabled after verified analytics ingestion is connected." },
  strategy: { title: "AI content strategy", body: "Plan campaigns around rope access, wind turbine maintenance, renewable energy, facade services, industrial maintenance and training.", note: "AI generation will use approved NEAS brand instructions and verified service information." },
  automation: { title: "Marketing automation", body: "Configure content queues, approval reminders, publishing schedules and failed-post alerts.", note: "Automations remain disabled until each trigger, permission and failure path is configured." },
  creative: { title: "Creative Studio", body: "Organize social graphics, campaign briefs, video concepts, thumbnails and approved brand assets.", note: "The existing NEAS media storage will be reused where compatible." },
  bio: { title: "Link-in-Bio", body: "Build campaign landing pages and track referral links for NEAS service enquiries.", note: "Public page publishing and click analytics will be connected in a later phase." },
  team: { title: "Team & permissions", body: "Keep marketing access within the existing NEAS administrator account and permission boundary.", note: "This workspace currently inherits the existing admin-only access check." },
  settings: { title: "Marketing settings", body: "Configure brand defaults, social integrations, notification preferences and publishing policies.", note: "Secrets and OAuth tokens will never be exposed in browser code." },
};

const pillars = ["Rope Access & Industrial Services", "Wind Turbine & Renewable Energy", "Facade Cleaning & Maintenance", "Met Mast & Telecom", "Offshore & Onshore Operations", "Safety, Rescue & Training"];

export default function MarketingClient({ user }: Props) {
  const [active, setActive] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platform, setPlatform] = useState("LinkedIn");
  const [pillar, setPillar] = useState(pillars[0]);
  const [copy, setCopy] = useState("");
  const [preview, setPreview] = useState(false);
  const current = useMemo(() => nav.flatMap(g => g.items).find(i => i[0] === active), [active]);
  const firstName = user.name?.trim().split(/\s+/)[0] || "NEAS Team";

  const select = (id: string) => { setActive(id); setMobileOpen(false); setPreview(false); };

  return <div className="mc-shell">
    <aside className={"mc-sidebar " + (mobileOpen ? "mc-sidebar-open" : "")}>
      <div className="mc-brand"><span className="mc-mark">N</span><span><b>NEAS <em>MARKETING</em></b><small>GLOBAL COMMAND CENTER</small></span></div>
      <div className="mc-workspace"><b>NextEdge Access Solutions</b><small><i/> Existing administrator session</small></div>
      <nav className="mc-nav" aria-label="Marketing navigation">
        {nav.map(group => <section key={group.group}><label>{group.group}</label>{group.items.map(([id, label, icon]) => <button key={id} onClick={() => select(id)} className={active === id ? "active" : ""}><span>{icon}</span>{label}</button>)}</section>)}
      </nav>
      <div className="mc-user"><b>{user.name}</b><small>{user.email}</small><a href="/admin">← Back to NEAS Admin</a></div>
    </aside>
    {mobileOpen && <button className="mc-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)}/>}
    <main className="mc-main">
      <header className="mc-top"><div className="mc-top-title"><button className="mc-menu-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu">☰</button><div><small>NEAS / Marketing</small><b>{current?.[1] || "Dashboard"}</b></div></div><div className="mc-top-actions"><span className="mc-staging">STAGING WORKSPACE</span><a href="/admin">NEAS ADMIN</a></div></header>
      {active === "overview" ? <div className="mc-content">
        <div className="mc-welcome"><div><label>MARKETING OPERATIONS</label><h1>Good morning, {firstName}</h1><p>One workspace for NEAS content planning, social publishing, community management and performance reporting.</p></div><button onClick={() => select("compose")} className="mc-primary">＋ Create content</button></div>
        <div className="mc-metrics">
          {[["TOTAL REACH","—","Awaiting platform analytics","◉"],["PUBLISHED POSTS","—","No publishing source connected","✓"],["CONNECTED ACCOUNTS","0","Connect an official social profile","◎"],["PENDING APPROVALS","0","No marketing approvals yet","◷"]].map(([label,value,note,icon]) => <article key={label}><div><span>{label}</span><b>{icon}</b></div><strong>{value}</strong><small>{note}</small></article>)}
        </div>
        <div className="mc-columns">
          <section className="mc-panel"><div className="mc-panel-head"><div><h2>Workspace readiness</h2><p>Initial integration checklist</p></div><span className="mc-warning">SETUP REQUIRED</span></div>
            {[
              ["Existing NEAS admin authentication","Uses the current website admin session",true],
              ["Marketing dashboard route","Integrated inside the existing admin application",true],
              ["Social account OAuth","Requires approved platform app credentials",false],
              ["Content and scheduling API","Requires isolated marketing tables and server endpoints",false],
              ["Analytics and unified inbox","Requires platform permissions and connected accounts",false],
            ].map(([title,detail,done]) => <div className="mc-check" key={String(title)}><span className={done ? "done" : ""}>{done ? "✓" : "◷"}</span><div><b>{title}</b><small>{detail}</small></div></div>)}
          </section>
          <section className="mc-panel"><div className="mc-panel-head"><div><h2>NEAS content pillars</h2><p>Configured campaign focus areas</p></div><span className="mc-spark">✧</span></div><div className="mc-tags">{pillars.map(p => <span key={p}>{p}</span>)}</div><div className="mc-callout"><b>Brand governance</b><p>AI-generated marketing copy must use approved service information. Do not invent certifications, clients, project outcomes or safety guarantees.</p></div></section>
        </div>
        <section className="mc-panel mc-activity"><h2>Recent marketing activity</h2><p>Live activity will appear when connected modules are enabled.</p><div className="mc-empty"><span>◷</span><b>No marketing activity yet</b><small>Existing NEAS CMS content, orders and customer records remain unchanged.</small></div></section>
      </div> : active === "compose" ? <div className="mc-content mc-compose">
        <section className="mc-panel"><h2>Content composer</h2><p>Prepare a platform-specific marketing draft for internal review.</p><div className="mc-field"><label>Platform</label><select value={platform} onChange={e=>setPlatform(e.target.value)}><option>LinkedIn</option><option>Facebook</option><option>Instagram</option><option>YouTube</option><option>TikTok</option></select></div><div className="mc-field"><label>Campaign pillar</label><select value={pillar} onChange={e=>setPillar(e.target.value)}>{pillars.map(p=><option key={p}>{p}</option>)}</select></div><div className="mc-field"><label>Post copy</label><textarea rows={9} value={copy} onChange={e=>{setCopy(e.target.value);setPreview(false);}} placeholder="Write your NEAS campaign message…"/></div><div className="mc-buttons"><button className="mc-primary" disabled={!copy.trim()} onClick={()=>setPreview(true)}>Preview draft</button><button className="mc-secondary" onClick={()=>{setCopy("");setPreview(false);}}>Clear</button></div>{preview && <div className="mc-notice">Preview prepared for {platform} · {pillar}. This is a browser-only preview; it has not been saved, approved or published.</div>}</section>
        <aside className="mc-panel"><h2>Publishing safeguards</h2><ul><li>Drafts must be saved before review.</li><li>Review and publishing actions will use NEAS permissions.</li><li>Only authorized connected platform accounts can publish.</li><li>Failed API requests must never be shown as successful posts.</li></ul></aside>
      </div> : <div className="mc-content"><section className="mc-panel mc-module"><div className="mc-module-icon">✧</div><div><label>MARKETING MODULE</label><h2>{descriptions[active]?.title || "Marketing workspace"}</h2><p>{descriptions[active]?.body}</p><div className="mc-callout"><b>Integration status</b><p>{descriptions[active]?.note}</p></div><div className="mc-buttons"><button className="mc-secondary" onClick={()=>select("accounts")}>View social accounts</button><button className="mc-secondary" onClick={()=>select("overview")}>Back to dashboard</button></div></div></section></div>}
    </main>
    <style jsx>{`
      .mc-shell{min-height:100vh;display:flex;background:#07111f;color:#e7edf6;font-family:Inter,system-ui,sans-serif;font-size:14px}
      .mc-sidebar{width:258px;flex:0 0 258px;background:#0c1727;border-right:1px solid #243247;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;height:100vh}
      .mc-brand{height:68px;display:flex;align-items:center;gap:11px;padding:0 18px;border-bottom:1px solid #243247}.mc-mark{width:34px;height:34px;border-radius:9px;background:#d29a3a;color:#07111f;display:grid;place-items:center;font-weight:900;font-size:18px}.mc-brand b{display:block;font-size:13px;letter-spacing:.04em}.mc-brand em{color:#d29a3a;font-style:normal}.mc-brand small,.mc-workspace small,.mc-user small{display:block;font-size:10px;color:#8291a7;margin-top:4px}
      .mc-workspace{padding:16px 18px;border-bottom:1px solid #243247}.mc-workspace b{font-size:12px}.mc-workspace i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#39c58b;margin-right:5px}
      .mc-nav{padding:20px 12px;overflow:auto;flex:1}.mc-nav section{margin-bottom:23px}.mc-nav label{display:block;padding:0 10px 8px;color:#74839a;font-size:10px;letter-spacing:.15em;font-weight:700}.mc-nav button{display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;color:#9ba9bd;border-radius:7px;padding:10px;text-align:left;font:inherit;font-size:12px;cursor:pointer}.mc-nav button span{width:17px;text-align:center;font-size:15px}.mc-nav button:hover{background:#18263a;color:white}.mc-nav button.active{background:#3a2c1d;color:#f0c477;font-weight:700}
      .mc-user{border-top:1px solid #243247;padding:16px 18px}.mc-user b{display:block;font-size:12px}.mc-user a{display:inline-block;margin-top:12px;color:#d29a3a;font-size:11px;text-decoration:none}
      .mc-main{min-width:0;flex:1}.mc-top{height:68px;position:sticky;top:0;z-index:10;background:rgba(12,23,39,.96);backdrop-filter:blur(10px);border-bottom:1px solid #243247;display:flex;align-items:center;justify-content:space-between;padding:0 26px}.mc-top-title{display:flex;align-items:center;gap:12px}.mc-top-title small{display:block;color:#8190a5;font-size:10px}.mc-top-title b{display:block;margin-top:3px;font-size:14px}.mc-top-actions{display:flex;align-items:center;gap:12px}.mc-top-actions a,.mc-staging{font-size:10px;color:#aebbd0;text-decoration:none;border:1px solid #34435a;border-radius:6px;padding:7px 9px}.mc-staging{color:#78d8ae;border-color:#245743;background:#102b25}.mc-menu-toggle{display:none;background:transparent;color:#dbe5f3;border:1px solid #34435a;border-radius:7px;padding:8px}
      .mc-content{max-width:1500px;margin:auto;padding:28px}.mc-welcome{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}.mc-welcome label,.mc-module label{color:#d29a3a;font-size:10px;letter-spacing:.2em;font-weight:800}.mc-welcome h1{font-size:29px;margin:8px 0;color:#fff}.mc-welcome p,.mc-panel>p{color:#91a0b5;font-size:13px;line-height:1.6;margin:0}.mc-primary{border:0;border-radius:7px;background:#d29a3a;color:#07111f;padding:11px 15px;font-weight:800;cursor:pointer}.mc-primary:disabled{opacity:.45;cursor:not-allowed}.mc-secondary{border:1px solid #34435a;border-radius:7px;background:#111c2d;color:#c7d2e1;padding:10px 14px;font-weight:600;cursor:pointer}
      .mc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.mc-metrics article,.mc-panel{background:#111c2d;border:1px solid #26364b;border-radius:10px}.mc-metrics article{padding:16px}.mc-metrics article div{display:flex;justify-content:space-between;color:#91a0b5;font-size:10px;letter-spacing:.08em}.mc-metrics article div b{color:#d29a3a;font-size:16px}.mc-metrics strong{display:block;color:white;font-size:28px;margin:12px 0 3px}.mc-metrics small{color:#8392a7;font-size:10px}
      .mc-columns{display:grid;grid-template-columns:1.3fr .9fr;gap:14px}.mc-panel{padding:19px}.mc-panel h2{margin:0;color:#f3f6fb;font-size:15px}.mc-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:18px}.mc-panel-head p,.mc-activity>p{margin:5px 0 0;color:#8392a7;font-size:11px}.mc-warning{font-size:9px;letter-spacing:.08em;color:#e8bd70;border:1px solid #664c26;border-radius:5px;padding:5px 7px}.mc-check{display:flex;gap:11px;align-items:flex-start;margin:15px 0}.mc-check>span{width:21px;height:21px;flex:0 0 21px;border-radius:50%;display:grid;place-items:center;background:#26364b;color:#9ba9bd;font-size:11px}.mc-check>span.done{background:#123b30;color:#79d9ae}.mc-check b,.mc-check small{display:block}.mc-check b{font-size:12px;color:#dce5f0}.mc-check small{font-size:10px;color:#8291a7;margin-top:4px}.mc-spark{color:#d29a3a;font-size:20px}.mc-tags{display:flex;flex-wrap:wrap;gap:8px;margin:17px 0}.mc-tags span{border:1px solid #34435a;background:#0c1727;border-radius:20px;padding:7px 10px;color:#bdc9d8;font-size:10px}.mc-callout{border:1px solid #34435a;background:#0c1727;border-radius:8px;padding:13px;margin-top:17px}.mc-callout b{font-size:11px;color:#e9bf76}.mc-callout p{font-size:11px;line-height:1.6;color:#91a0b5;margin:6px 0 0}.mc-activity{margin-top:14px}.mc-empty{margin-top:16px;border:1px dashed #34435a;border-radius:8px;padding:26px;text-align:center}.mc-empty span,.mc-empty b,.mc-empty small{display:block}.mc-empty span{font-size:21px;color:#8392a7}.mc-empty b{margin-top:7px;font-size:12px}.mc-empty small{margin-top:5px;font-size:10px;color:#8291a7}
      .mc-compose{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:15px}.mc-field{display:grid;gap:7px;margin-top:17px}.mc-field label{font-size:11px;font-weight:700;color:#c4cfdd}.mc-field select,.mc-field textarea{width:100%;border:1px solid #34435a;background:#0c1727;color:#e7edf6;border-radius:7px;padding:11px;font:inherit}.mc-field textarea{resize:vertical;line-height:1.6}.mc-buttons{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.mc-notice{margin-top:16px;padding:12px;border:1px solid #664c26;background:#302514;border-radius:7px;color:#edc67e;font-size:12px}.mc-compose ul{padding-left:18px;color:#91a0b5;font-size:12px;line-height:1.8}.mc-module{display:flex;gap:18px;max-width:900px}.mc-module-icon{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;background:#3a2c1d;color:#edc477;border-radius:9px;font-size:21px}.mc-module h2{font-size:21px;margin:7px 0}.mc-module p{color:#91a0b5;line-height:1.7;max-width:700px}
      .mc-backdrop{display:none}
      @media(max-width:1050px){.mc-sidebar{width:230px;flex-basis:230px}.mc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.mc-columns{grid-template-columns:1fr}}
      @media(max-width:700px){.mc-sidebar{display:none;position:fixed;z-index:40;inset:0 auto 0 0;width:270px;height:100vh}.mc-sidebar.mc-sidebar-open{display:flex}.mc-backdrop{display:block;position:fixed;z-index:35;inset:0;border:0;background:#0009}.mc-menu-toggle{display:block}.mc-top{padding:0 14px}.mc-top-actions a{display:none}.mc-content{padding:18px 13px}.mc-welcome{align-items:flex-start;flex-direction:column}.mc-welcome h1{font-size:24px}.mc-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mc-metrics article{padding:12px}.mc-metrics strong{font-size:24px}.mc-compose{grid-template-columns:1fr}.mc-module{padding:17px;gap:12px}.mc-staging{font-size:8px}}
    `}</style>
  </div>;
}
