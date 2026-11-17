import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getMkUser } from "@/lib/marketing";
import AIWorkforceClient from "./AIWorkforceClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "NEAS AI Workforce — Admin", robots: { index: false } };
export default async function AIWorkforcePage() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  const mkUser = await getMkUser();
  if (user.role !== "admin" || !mkUser || mkUser.tenant) return <div style={{padding:40}}><h1>NEAS administrator access required</h1></div>;
  return <AIWorkforceClient />;
}