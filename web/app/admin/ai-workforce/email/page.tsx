import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureAiwGmailAccountsTable, gmailSendScopeApproved } from "@/lib/aiw-gmail";
import GmailWorkspaceClient from "./GmailWorkspaceClient";

export const dynamic = "force-dynamic";
const MAILBOXES = [
  { key: "info", email: "info.nextedgeaccesssolutions@gmail.com", label: "NEAS Information" },
  { key: "operations", email: "nextedgeaccesssolutions@gmail.com", label: "NEAS Operations" },
] as const;

export default async function AIWorkforceEmailPage({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/admin");
  const params = await searchParams;
  await ensureAiwGmailAccountsTable();
  const rows = await sql`select account_key,email,status,connected_at,expires_at,last_error from aiw_gmail_accounts`;
  const sendReady = gmailSendScopeApproved();
  const auditRows = await sql`select account_key,recipient,template_key,subject,status,error_code,created_at from aiw_gmail_send_audit order by id desc limit 20`;
  const byKey = new Map(rows.map((r) => [String(r.account_key), r]));
  const messages: Record<string,string> = {
    connected: "Google authorization verified and encrypted refresh token stored.",
    "missing-client": "Google OAuth Client ID is not configured.",
    "google-denied": "Google authorization was cancelled or denied.",
    "invalid-state": "OAuth state validation failed. Retry the connection.",
    "token-exchange-failed": "Google did not issue an access token. Check OAuth client and redirect URI.",
    "wrong-google-account": "The Google account selected did not match the mailbox assigned to this connection.",
    "refresh-token-missing": "Google did not return an offline refresh token. Revoke this app's access in Google Account permissions, then reconnect.",
    "missing-encryption-key": "TOKEN_ENCRYPTION_KEY is missing or invalid. Configure a dedicated 64-character hexadecimal key in Vercel.",
    "missing-scope": "Google did not grant both requested Gmail permissions. Reconnect and approve the requested permissions.",
    "connection-error": "Connection failed. Check server logs without exposing credentials.",
    "admin-required": "Administrator sign-in is required.",
  };
  return <main style={{maxWidth:900,margin:"40px auto",padding:"24px",color:"#e7edf4",background:"#07111b",minHeight:"70vh",borderRadius:18,fontFamily:"Inter,system-ui"}}>
    <Link href="/admin/ai-workforce" style={{color:"#ebc07e",textDecoration:"none"}}>← AI Workforce</Link>
    <p style={{color:"#ca9332",letterSpacing:".16em",fontSize:11,marginTop:24}}>NEAS AI WORKFORCE / INTEGRATIONS</p>
    <h1 style={{fontSize:30,margin:"6px 0"}}>Gmail account connections</h1>
    <p style={{color:"#9aabba",lineHeight:1.6}}>Connect both NEAS mailboxes separately. The workspace displays inbox metadata and creates Gmail drafts for human review. Outbound sending remains independently gated until Google approval, mailbox authorization, and NEAS activation checks are complete.</p>
    {params.gmail && <p role="status" style={{padding:12,border:"1px solid #ca933255",borderRadius:10,color:"#ebc07e"}}>{messages[params.gmail] ?? "Gmail connection status updated."}</p>}
    <section style={{display:"grid",gap:12,marginTop:22}}>
      {MAILBOXES.map((m) => {
        const row = byKey.get(m.key);
        const connected = row?.status === "connected";
        return <article key={m.key} style={{border:"1px solid #294153",borderRadius:14,padding:18,background:"#102235"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><b style={{fontSize:16}}>{m.label}</b><div style={{color:"#9aabba",marginTop:5}}>{m.email}</div></div>
            <span style={{color:connected?"#9ad0b2":"#ebc07e",fontSize:12}}>{connected?"Connected · verified":"Not connected"}</span>
          </div>
          {connected && <p style={{color:"#9aabba",fontSize:12}}>Authorized {row?.connected_at ? new Date(String(row.connected_at)).toLocaleString("en-PH") : ""}. Status: {String(row?.status)}.</p>}
          <a href={"/api/admin/gmail/connect?account="+m.key} style={{display:"inline-block",marginTop:12,padding:"10px 14px",borderRadius:9,background:"#ca9332",color:"#07111b",fontWeight:700,textDecoration:"none",fontSize:12}}>{connected?"Reconnect Google account":"Connect with Google"}</a>
        </article>;
      })}
    </section>
    <GmailWorkspaceClient />
    <section style={{marginTop:22,padding:14,border:"1px solid #294153",borderRadius:10,background:"#0d1d2b"}}><b>Outbound sending policy</b><p style={{color:sendReady?"#9ad0b2":"#ebc07e",fontSize:12,marginTop:8}}>{sendReady ? "Policy flags enabled. Actual sends still require the approved Gmail scope, an authorized mailbox, and an allowlisted recipient." : "DISABLED — waiting for Google gmail.compose scope approval and explicit NEAS activation."}</p><p style={{color:"#9aabba",fontSize:12}}>Only fixed quotation-follow-up and training-information templates are supported. Exact recipient allowlisting, idempotency, per-mailbox daily limits, and immutable attempt records are enforced server-side.</p></section>
    <section style={{marginTop:18,padding:14,border:"1px solid #294153",borderRadius:10}}><b>Recent outbound email audit</b>{auditRows.length ? auditRows.map((a) => <div key={String(a.created_at)+String(a.recipient)} style={{borderTop:"1px solid #294153",padding:"9px 0",fontSize:12,color:"#9aabba"}}><b style={{color:"#e7edf4"}}>{String(a.status).toUpperCase()}</b> · {String(a.account_key)} · {String(a.recipient)}<div>{String(a.template_key)} · {String(a.subject)}</div><div>{new Date(String(a.created_at)).toLocaleString("en-PH")}{a.error_code ? " · "+String(a.error_code) : ""}</div></div>) : <p style={{color:"#9aabba",fontSize:12}}>No outbound attempts recorded.</p>}</section>
    <aside style={{marginTop:22,padding:14,border:"1px solid #ca933244",borderRadius:10,color:"#c8b68f",fontSize:12,lineHeight:1.6}}>
      <b>Security and authority</b><br/>OAuth tokens are encrypted at rest using TOKEN_ENCRYPTION_KEY. Access is limited to administrators. Google authorization is separate for each mailbox. Outbound sending is fail-closed and remains disabled until Google approves the restricted send scope and NEAS completes the activation checks. Disconnect/revocation and automated inbox processing must be implemented and tested before describing the workforce as 24/7 operational.
    </aside>
  </main>;
}
