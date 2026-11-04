import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import MarketingClient from "./MarketingClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing Command Center — NEAS" };

export default async function MarketingAdminPage() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") {
    return <main className="wrap" style={{ padding: "56px 20px" }}>
      <div className="eyebrow">Restricted workspace</div>
      <h1>Administrator access required</h1>
      <p className="muted">The NEAS Marketing Command Center is available to authorized administrators.</p>
      <a className="btn btn-ghost" href="/admin">Return to Admin Panel</a>
    </main>;
  }
  return <MarketingClient user={{ name: user.name, email: user.email }} />;
}
