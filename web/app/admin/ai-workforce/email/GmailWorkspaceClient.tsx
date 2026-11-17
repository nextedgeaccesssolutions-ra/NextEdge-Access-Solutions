"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

type Account = "info" | "operations";
type Mail = { id: string; threadId: string; from: string; subject: string; date: string; unread: boolean };
type Audit = { id: number; account_key: string | null; action: string; outcome: string; provider_code: string | null; detail: string; created_at: string };

const styles: Record<string, CSSProperties> = {
  panel: { border: "1px solid #294153", borderRadius: 14, padding: 18, background: "#0c1b29", marginTop: 18 },
  field: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid #385269", background: "#07111b", color: "#e7edf4", marginTop: 6 },
  button: { padding: "10px 14px", borderRadius: 8, border: 0, background: "#ca9332", color: "#07111b", fontWeight: 700, cursor: "pointer" },
  muted: { color: "#9aabba", fontSize: 12, lineHeight: 1.6 },
};

export default function GmailWorkspaceClient() {
  const [account, setAccount] = useState<Account>("info");
  const [messages, setMessages] = useState<Mail[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function loadAudit() {
    const response = await fetch("/api/admin/gmail/audit", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setAudit(Array.isArray(data.events) ? data.events : []);
  }

  async function loadInbox() {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/gmail/inbox?account=" + account + "&maxResults=20", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Inbox could not be loaded.");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setStatus("Inbox metadata loaded. Message bodies are not stored in the NEAS workspace.");
      await loadAudit();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Inbox could not be loaded.");
    } finally { setBusy(false); }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/gmail/drafts", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ account, to, subject, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Draft creation failed.");
      setStatus("Gmail draft created successfully. It has not been sent.");
      setTo(""); setSubject(""); setBody("");
      await loadAudit();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Draft creation failed.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void loadAudit(); }, []);

  return <section style={styles.panel}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div><h2 style={{fontSize:19,margin:"0 0 4px"}}>NEAS Gmail workspace</h2><p style={styles.muted}>Read authorized inbox metadata and prepare drafts. Outbound sending is locked.</p></div>
      <span style={{fontSize:11,fontWeight:700,color:"#ebc07e",border:"1px solid #ca933255",borderRadius:99,padding:"6px 10px"}}>SENDING DISABLED</span>
    </div>
    <label style={{display:"block",fontSize:12,color:"#c8d3dd",marginTop:14}}>Mailbox
      <select value={account} onChange={e=>{setAccount(e.target.value as Account);setMessages([]);setStatus("");}} style={styles.field}>
        <option value="info">NEAS Information — info.nextedgeaccesssolutions@gmail.com</option>
        <option value="operations">NEAS Operations — nextedgeaccesssolutions@gmail.com</option>
      </select>
    </label>
    <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
      <button type="button" onClick={loadInbox} disabled={busy} style={styles.button}>{busy?"Working…":"Load inbox metadata"}</button>
    </div>
    {status && <p role="status" style={{...styles.muted,marginTop:12,color:status.includes("successfully")||status.includes("loaded")?"#9ad0b2":"#ebc07e"}}>{status}</p>}
    <div style={{display:"grid",gap:10,marginTop:14}}>
      {messages.map(m=><article key={m.id} style={{border:"1px solid #294153",borderRadius:10,padding:12,background:"#102235"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:13}}>{m.subject || "(No subject)"}</b>{m.unread&&<span style={{fontSize:10,color:"#ebc07e"}}>UNREAD</span>}</div>
        <p style={{...styles.muted,margin:"5px 0"}}>{m.from} · {m.date}</p>
      </article>)}
      {messages.length===0&&<p style={styles.muted}>No inbox metadata loaded yet. Connect the mailbox above, then load its inbox.</p>}
    </div>
    <form onSubmit={createDraft} style={{borderTop:"1px solid #294153",marginTop:20,paddingTop:18,display:"grid",gap:12}}>
      <h3 style={{fontSize:16,margin:0}}>Prepare an email draft</h3>
      <label style={{fontSize:12,color:"#c8d3dd"}}>Recipient<input required type="email" value={to} onChange={e=>setTo(e.target.value)} style={styles.field} placeholder="recipient@company.com"/></label>
      <label style={{fontSize:12,color:"#c8d3dd"}}>Subject<input required maxLength={240} value={subject} onChange={e=>setSubject(e.target.value)} style={styles.field} placeholder="Project enquiry follow-up"/></label>
      <label style={{fontSize:12,color:"#c8d3dd"}}>Message<textarea required maxLength={100000} value={body} onChange={e=>setBody(e.target.value)} style={{...styles.field,minHeight:130,resize:"vertical"}} placeholder="Write your message…"/></label>
      <div><button type="submit" disabled={busy} style={styles.button}>{busy?"Saving…":"Create Gmail draft"}</button></div>
      <p style={styles.muted}>This action saves a draft in the selected Gmail mailbox. It does not send the message.</p>
    </form>
    <div style={{borderTop:"1px solid #294153",marginTop:20,paddingTop:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><h3 style={{fontSize:15,margin:0}}>Recent security audit</h3><button type="button" onClick={loadAudit} style={{...styles.button,padding:"7px 10px",fontSize:11}}>Refresh</button></div>
      <div style={{display:"grid",gap:8,marginTop:12}}>
        {audit.slice(0,10).map(event=><div key={event.id} style={{display:"flex",justifyContent:"space-between",gap:12,borderBottom:"1px solid #294153",paddingBottom:8}}>
          <div><b style={{fontSize:12}}>{event.action.replace(/_/g," ")}</b><p style={{...styles.muted,margin:"3px 0"}}>{event.account_key || "System"} · {event.detail}</p></div>
          <span style={{fontSize:10,color:event.outcome==="success"?"#9ad0b2":event.outcome==="blocked"?"#ebc07e":"#f0a2a2",whiteSpace:"nowrap"}}>{event.outcome}</span>
        </div>)}
        {audit.length===0&&<p style={styles.muted}>No audit events recorded yet.</p>}
      </div>
    </div>
  </section>;
}
