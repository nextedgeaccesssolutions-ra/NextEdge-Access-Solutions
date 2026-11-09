import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Admin log in — NEAS",
  description: "Secure staff sign-in for the NEAS administration portal.",
  robots: { index: false, follow: false },
};

export default function AdminLogin() {
  return <div className="wrap" style={{ padding: "50px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div className="eyebrow">Staff only</div><h1>Admin log in</h1><p className="muted">Manage prices, orders and customers.</p></div>
    <AuthForm portal="admin" next="/admin" />
  </div>;
}
