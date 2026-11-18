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
  const policyRows = await sql`select automatic_send_enabled from aiw_gmail_policy where id=1 limit 1`;
  const sendReady = gmailSendScopeApproved() && policyRows[0]?.automatic_send_enabled === true;
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
  return <main className="neas-gmail-page" style={{width:"min(calc(100% - 32px),900px)",maxWidth:"100%",boxSizing:"border-box",margin:"clamp(12px,4vw,40px) auto",padding:"clamp(14px,3vw,24px)",color:"#e7edf4",background:"#07111b",minHeight:"70vh",borderRadius:18,fontFamily:"Inter,system-ui",overflow:"hidden"}}>
    <style>{`.neas-gmail-page,.neas-gmail-page *{box-sizing:border-box;min-width:0;max-width:100%}.neas-gmail-page{width:min(calc(100% - 32px),900px);max-width:100%;overflow-x:clip}.neas-gmail-page p{white-space:normal;overflow-wrap:anywhere;word-break:break-word}.neas-gmail-page h1{font-size:clamp(23px,4vw,30px);line-height:1.2;overflow-wrap:anywhere}.neas-gmail-page p,.neas-gmail-page a,.neas-gmail-page span,.neas-gmail-page div{overflow-wrap:anywhere}.neas-gmail-page section{min-width:0;width:100%;max-width:100%;overflow-wrap:anywhere}.neas-gmail-page section p{display:block;width:100%;max-width:100%;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}.neas-gmail-page .neas-gmail-policy{width:100%;max-width:100%;min-width:0;overflow:hidden}.neas-gmail-page .neas-gmail-policy p{display:block;width:100%;max-width:100%;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.5}@media(max-width:600px){.neas-gmail-page{width:100%;max-width:100vw;margin:0;padding:16px 12px 112px;border-radius:0;min-height:100vh;overflow-x:hidden}.neas-gmail-page section[style*="display: grid"]{grid-template-columns:minmax(0,1fr)!important}.neas-gmail-page article{padding:12px!important}.neas-gmail-page article>div:first-child{display:grid!important;grid-template-columns:minmax(0,1fr);gap:8px}.neas-gmail-page article a{display:flex!important;width:100%;min-height:44px;align-items:center;justify-content:center;text-align:center}.neas-gmail-page h2{font-size:18px!important}.neas-gmail-page .neas-gmail-policy{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:12px!important;overflow:hidden!important;contain:inline-size}.neas-gmail-page .neas-gmail-policy b,.neas-gmail-page .neas-gmail-policy p{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;hyphens:auto;line-height:1.55!important}.neas-gmail-page .neas-gmail-policy p{font-size:12px!important}.neas-gmail-page .neas-gmail-policy p+p{margin-top:10px!important}}`}</style>
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
    <section className="neas-gmail-policy" style={{marginTop:22,padding:14,border:"1px solid #294153",borderRadius:10,background:"#0d1d2b",width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box",overflow:"hidden"}}><b>Outbound sending policy</b><p style={{maxWidth:"100%",whiteSpace:"normal",overflowWrap:"anywhere",wordBreak:"break-word",color:sendReady?"#9ad0b2":"#ebc07e",fontSize:12,marginTop:8}}>{sendReady ? "Policy flags enabled. Actual sends still require the approved Gmail scope, an authorized mailbox, and an allowlisted recipient." : "DISABLED — waiting for Google gmail.compose scope approval and explicit NEAS activation."}</p><p style={{color:"#9aabba",fontSize:12}}>Only fixed quotation-follow-up and training-information templates are supported. Exact recipient allowlisting, idempotency, per-mailbox daily limits, and immutable attempt records are enforced server-side.</p></section>
    <section style={{marginTop:18,padding:14,border:"1px solid #294153",borderRadius:10}}><b>Recent outbound email audit</b>{auditRows.length ? auditRows.map((a) => <div key={String(a.created_at)+String(a.recipient)} style={{borderTop:"1px solid #294153",padding:"9px 0",fontSize:12,color:"#9aabba"}}><b style={{color:"#e7edf4"}}>{String(a.status).toUpperCase()}</b> · {String(a.account_key)} · {String(a.recipient)}<div>{String(a.template_key)} · {String(a.subject)}</div><div>{new Date(String(a.created_at)).toLocaleString("en-PH")}{a.error_code ? " · "+String(a.error_code) : ""}</div></div>) : <p style={{color:"#9aabba",fontSize:12}}>No outbound attempts recorded.</p>}</section>
    <aside style={{marginTop:22,padding:14,border:"1px solid #ca933244",borderRadius:10,color:"#c8b68f",fontSize:12,lineHeight:1.6}}>
      <b>Security and authority</b><br/>OAuth tokens are encrypted at rest using TOKEN_ENCRYPTION_KEY. Access is limited to administrators. The selected Google scopes allow reading mail and creating drafts; outbound sending remains disabled by the NEAS workforce policy. Disconnect/revocation and automated inbox processing must be implemented and tested before describing the workforce as 24/7 operational.
    </aside>
  </main>;
}
