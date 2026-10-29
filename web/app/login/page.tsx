import AuthForm from "@/components/AuthForm";
import { enabled } from "@/lib/oauth";
export const metadata = { title: "Log in — NEAS Online Store" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const social = { google: enabled("google"), facebook: enabled("facebook") };
  const initialError = error === "unavailable" ? "That sign-in option isn't set up yet." : (error ?? "").slice(0, 200);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/store";
  return <div className="wrap" style={{ padding: "50px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div className="eyebrow">Customer account</div><h1>Log in or create an account</h1><p className="muted">Track your orders and check out faster.</p></div>
    <AuthForm portal="customer" next={safeNext} social={social} initialError={initialError} />
    <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 18 }}>NEAS staff? <a href="/admin/login">Admin log in</a></p>
  </div>;
}
