"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Item = { label: string; value: number };
type SearchItem = { label: string; clicks: number; impressions: number; ctr: number; position: number };
type Data = {
  connected: boolean; period: string; checkedAt: string;
  realtime: { activeUsers: number; pages: Item[]; countries: Item[] };
  totals: { users: number; newUsers: number; sessions: number; pageviews: number; engagementRate: number; avgEngagementSec: number; conversions: number };
  comparison?: { users: number; sessions: number; pageviews: number };
  daily: { date: string; users: number; sessions: number }[];
  topPages: Item[]; sources: Item[]; countries: Item[]; devices: Item[];
  searchConsole?: { configured: boolean; error?: string; clicks?: number; impressions?: number; ctr?: number; position?: number; queries?: SearchItem[]; pages?: SearchItem[]; daily?: { date: string; clicks: number; impressions: number }[] };
};
const fmt = (n: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n || 0);
const dur = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s || 0}s`;
function csvCell(v: unknown) { const s = String(v ?? ""); return '"' + s.replace(/"/g, '""') + '"'; }
function downloadCsv(data: Data) {
  const rows: unknown[][] = [["section","label","value","secondary","tertiary"]];
  for (const [label, value] of Object.entries(data.totals)) rows.push(["GA4 overview", label, value]);
  for (const x of data.daily) rows.push(["GA4 daily", x.date, x.users, x.sessions]);
  for (const x of data.topPages) rows.push(["Top pages", x.label, x.value]);
  for (const x of data.sources) rows.push(["Traffic sources", x.label, x.value]);
  for (const x of data.countries) rows.push(["Countries", x.label, x.value]);
  for (const x of data.devices) rows.push(["Devices", x.label, x.value]);
  for (const x of data.searchConsole?.queries || []) rows.push(["Search queries", x.label, x.clicks, x.impressions, x.position]);
  const csv = rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "neas-website-analytics.csv"; a.click(); URL.revokeObjectURL(url);
}
function Card({ title, value, note }: { title: string; value: string; note?: string }) {
  return <div className="card" style={{ minWidth: 0 }}><div className="muted" style={{ fontSize: 13 }}>{title}</div><div style={{ fontSize: 27, fontWeight: 800, marginTop: 5 }}>{value}</div>{note && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{note}</div>}</div>;
}
function RankedList({ title, items, unit }: { title: string; items: Item[]; unit: string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return <div className="card"><b>{title}</b>{items.length ? <div style={{ marginTop: 12 }}>{items.map((i,n) => <div key={i.label} style={{ marginBottom: 12 }}><div style={{ display:"flex",justifyContent:"space-between",gap:8,fontSize:13 }}><span title={i.label} style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.label}</span><b>{fmt(i.value)}</b></div><div style={{height:5,background:"#eef1f5",borderRadius:5,marginTop:5}}><div style={{height:5,width:`${Math.max(0,Math.min(100,i.value/max*100))}%`,background:"#f97316",borderRadius:5}} /></div></div>)}</div> : <p className="muted">No data available for this period.</p>}<p className="muted" style={{fontSize:11,marginBottom:0}}>{unit}</p></div>;
}
function Trend({ daily }: { daily: Data["daily"] }) {
  if (!daily.length) return <p className="muted">No daily traffic data returned for this period.</p>;
  const w=720,h=190,p=30,max=Math.max(1,...daily.flatMap(d=>[d.sessions,d.users]));
  const x=(i:number)=>p+(i*Math.max(1,w-2*p))/Math.max(1,daily.length-1), y=(v:number)=>h-p-(v/max)*(h-2*p);
  const path=(k:"sessions"|"users")=>daily.map((d,i)=>`${i?"L":"M"}${x(i)},${y(d[k])}`).join(" ");
  return <div><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily sessions and users" style={{width:"100%",height:"auto"}}><line x1={p} x2={w-p} y1={h-p} y2={h-p} stroke="#dbe1e8"/><path d={path("sessions")} fill="none" stroke="#f97316" strokeWidth="3"/><path d={path("users")} fill="none" stroke="#1e3a8a" strokeWidth="2.5"/><text x={p} y={h-7} fontSize="11" fill="#64748b">{daily[0].date}</text><text x={w-p} y={h-7} textAnchor="end" fontSize="11" fill="#64748b">{daily[daily.length-1].date}</text><text x={p} y={15} fontSize="11" fill="#64748b">Peak {fmt(max)}</text></svg><div className="muted" style={{display:"flex",gap:18,fontSize:12}}><span><b style={{color:"#f97316"}}>━</b> Sessions</span><span><b style={{color:"#1e3a8a"}}>━</b> Users</span></div></div>;
}
function SearchTable({ title, items }: { title: string; items: SearchItem[] }) {
  return <div className="card"><b>{title}</b>{items?.length ? <div style={{overflowX:"auto",marginTop:10}}><table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}><thead><tr>{["Query / page","Clicks","Impressions","CTR","Position"].map(x=><th key={x} style={{textAlign:"left",padding:"8px 6px",borderBottom:"1px solid var(--line)"}}>{x}</th>)}</tr></thead><tbody>{items.map((x,i)=><tr key={x.label+i}><td style={{padding:"8px 6px",maxWidth:260,overflowWrap:"anywhere"}}>{x.label}</td><td>{fmt(x.clicks)}</td><td>{fmt(x.impressions)}</td><td>{fmt(x.ctr)}%</td><td>{fmt(x.position)}</td></tr>)}</tbody></table></div>:<p className="muted">No Search Console rows returned yet.</p>}</div>;
}
export default function GoogleAnalytics() {
  const [data,setData]=useState<Data|null>(null), [error,setError]=useState(""), [busy,setBusy]=useState(false), [days,setDays]=useState(28);
  const load=useCallback(async(d:number)=>{setBusy(true);try{const r=await fetch(`/api/admin/ga4?days=${d}`,{cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Unable to load Google Analytics.");setData(j as Data);setError("");}catch(e){setError(e instanceof Error?e.message:"Connection failed.");}finally{setBusy(false);}},[]);
  useEffect(()=>{void load(days);},[days,load]);
  useEffect(()=>{const id=window.setInterval(()=>{if(document.visibilityState==="visible")void load(days);},60_000);return()=>window.clearInterval(id);},[days,load]);
  const t=data?.totals, comparison=data?.comparison;
  const delta=(current:number,previous:number)=>previous===0?(current===0?"0%":"New"): `${current>=previous?"+":""}${fmt((current-previous)/previous*100)}%`;
  return <div className="wrap" style={{padding:"0 20px 28px",maxWidth:1100}}>
    <div className="card" style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><b>Google Analytics 4 · Website performance</b><p className="muted" style={{margin:"4px 0 0",fontSize:13}}>Live visitors refresh every minute · {data?.period??`Last ${days} days`} · Asia/Manila</p>{data?.checkedAt&&<p className="muted" style={{fontSize:11,margin:"5px 0 0"}}>Connected · Updated {new Date(data.checkedAt).toLocaleTimeString("en-PH")}</p>}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[7,28,90].map(d=><button key={d} type="button" className={"btn "+(days===d?"btn-primary":"btn-ghost")} onClick={()=>setDays(d)} disabled={busy}>{d} days</button>)}<button type="button" className="btn btn-ghost" onClick={()=>void load(days)} disabled={busy}>{busy?"Loading…":"↻ Refresh"}</button><button type="button" className="btn btn-ghost" onClick={()=>data&&downloadCsv(data)} disabled={!data}>Export CSV</button></div></div>{error&&<p role="alert" style={{color:"#b91c1c",marginBottom:0}}>{error}</p>}</div>
    {data&&t&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:12}}><div className="card"><div className="muted" style={{fontSize:13}}>● Active users right now</div><div style={{fontSize:42,fontWeight:850,marginTop:4}}>{fmt(data.realtime.activeUsers)}</div><p className="muted" style={{fontSize:12,margin:0}}>Last 30 minutes</p></div><RankedList title="Live: pages being viewed" items={data.realtime.pages} unit="Active users"/><RankedList title="Live: visitor countries" items={data.realtime.countries} unit="Active users"/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginBottom:12}}>
        <Card title="Users" value={fmt(t.users)} note={`vs previous period: ${delta(t.users,comparison?.users??0)}`}/><Card title="New users" value={fmt(t.newUsers)}/><Card title="Sessions" value={fmt(t.sessions)} note={`vs previous: ${delta(t.sessions,comparison?.sessions??0)}`}/><Card title="Page views" value={fmt(t.pageviews)} note={`vs previous: ${delta(t.pageviews,comparison?.pageviews??0)}`}/><Card title="Engagement rate" value={`${fmt(t.engagementRate)}%`}/><Card title="Avg. engagement / user" value={dur(t.avgEngagementSec)}/><Card title="Key events" value={fmt(t.conversions)} note="GA4 key events configured in property"/>
      </div>
      <div className="card" style={{marginBottom:12}}><b>Daily traffic trend</b><div style={{marginTop:10}}><Trend daily={data.daily}/></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:12}}><RankedList title="Top pages" items={data.topPages} unit="Page views"/><RankedList title="Traffic sources" items={data.sources} unit="Sessions · source / medium"/><RankedList title="Countries" items={data.countries} unit="Users"/><RankedList title="Devices" items={data.devices} unit="Sessions"/></div>
      <div className="card" style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><b>Google Search Console · SEO performance</b><span className="muted" style={{fontSize:12}}>{data.searchConsole?.configured?"Property configured":"Setup required"}</span></div>
        {!data.searchConsole?.configured?<p className="muted" style={{fontSize:13}}>Set the server-side GSC_SITE_URL variable to the exact verified Search Console property URL. Grant the GA4 service account access to that property and enable the Search Console API.</p>:data.searchConsole.error?<p role="alert" style={{color:"#a16207",fontSize:13}}>{data.searchConsole.error}</p>:<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:14}}><Card title="Search clicks" value={fmt(data.searchConsole.clicks||0)}/><Card title="Impressions" value={fmt(data.searchConsole.impressions||0)}/><Card title="Average CTR" value={`${fmt(data.searchConsole.ctr||0)}%`}/><Card title="Average position" value={fmt(data.searchConsole.position||0)}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12,marginTop:12}}><SearchTable title="Top organic search queries" items={data.searchConsole.queries||[]}/><SearchTable title="Top organic landing pages" items={data.searchConsole.pages||[]}/></div></>}
      </div>
    </>}
    {!data&&!error&&<div className="card"><p className="muted" style={{margin:0}}>Loading website analytics…</p></div>}
  </div>;
}
