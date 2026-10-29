import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Admin log in — NEAS" };
export default function AdminLogin() {
  return <div className="wrap" style={{ padding: "50px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div className="eyebrow">Staff only</div><h1>Admin log in</h1><p className="muted">Manage prices, orders and customers.</p></div>
    <AuthForm portal="admin" next="/admin" />
  </div>;
}
