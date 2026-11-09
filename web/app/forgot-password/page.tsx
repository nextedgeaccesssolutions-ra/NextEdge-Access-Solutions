import ForgotForm from "./ForgotForm";
import { emailConfigured } from "@/lib/reset";
export const metadata = { title: "Forgot Password — NEAS Customer Account", description: "Request a secure password-reset link for your NextEdge Access Solutions customer account.", robots: { index: false, follow: true } };
export default function Forgot() {
  return <div className="wrap" style={{ padding: "50px 20px", maxWidth: 480 }}>
    <div style={{ textAlign: "center", marginBottom: 22 }}><div className="eyebrow">Account help</div><h1>Forgot your password?</h1><p className="muted">Enter your account email and we&apos;ll send you a link to set a new password.</p></div>
    <ForgotForm emailOn={emailConfigured()} />
  </div>;
}
