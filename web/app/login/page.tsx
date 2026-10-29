import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Log in — NEAS Online Store" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/store";
  return <div className="wrap" style={{ padding: "50px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div className="eyebrow">Customer account</div><h1>Log in or create an account</h1><p className="muted">Track your orders and check out faster.</p></div>
    <AuthForm portal="customer" next={safeNext} />
    <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 18 }}>NEAS staff? <a href="/admin/login">Admin log in</a></p>
  </div>;
}
