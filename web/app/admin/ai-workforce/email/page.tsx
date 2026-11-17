import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
const MAILBOXES = [
  { key: "info", email: "info.nextedgeaccesssolutions@gmail.com", label: "NEAS Information" },
  { key: "operations", email: "nextedgeaccesssolutions@gmail.com", label: "NEAS Operations" },
] as const;

export default async function AIWorkforceEmailPage({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/admin");
  const params = await searchParams;
  let rows: Array<Record<string, unknown>> = [];
  let migrationReady = true;
  try { rows = await sql`select account_key,email,status,connected_at,expires_at,last_error from aiw_gmail_accounts`; }
  catch { migrationReady = false; }
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
    "connection-error": "Connection failed. Check server logs without exposing credentials.",
    "admin-required": "Administrator sign-in is required.",
  };
  return <main style={{maxWidth:900,margin:"40px auto",padding:"24px",color:"#e7edf4",background:"#07111b",minHeight:"70vh",borderRadius:18,fontFamily:"Inter,system-ui"}}>
    <Link href="/admin/ai-workforce" style={{color:"#ebc07e",textDecoration:"none"}}>← AI Workforce</Link>
    <p style={{color:"#ca9332",letterSpacing:".16em",fontSize:11,marginTop:24}}>NEAS AI WORKFORCE / INTEGRATIONS</p>
    <h1 style={{fontSize:30,margin:"6px 0"}}>Gmail account connections</h1>
    <p style={{color:"#9aabba",lineHeight:1.6}}>Connect both NEAS mailboxes separately. Google consent is required for each account. This integration is restricted to mailbox reading and draft preparation; it does not send email.</p>
    {!migrationReady && <p role="alert" style={{padding:12,border:"1px solid #b9783b",borderRadius:10,color:"#f0c48a"}}>Database migration required: run the existing web/scripts/migrate.mjs migration before connecting mailboxes.</p>}
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
    <aside style={{marginTop:22,padding:14,border:"1px solid #ca933244",borderRadius:10,color:"#c8b68f",fontSize:12,lineHeight:1.6}}>
      <b>Security and authority</b><br/>OAuth tokens are encrypted at rest using TOKEN_ENCRYPTION_KEY. Access is limited to administrators. The selected Google scopes allow reading mail and creating drafts; outbound sending remains disabled by the NEAS workforce policy. Disconnect/revocation and automated inbox processing must be implemented and tested before describing the workforce as 24/7 operational.
    </aside>
  </main>;
}
