import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "NEAS AI Workforce - Admin",
  robots: { index: false, follow: false },
};

// The workforce console moved to the dedicated NEAS APEX app. This route only
// verifies the admin session, then hands off - no workforce UI lives here.
export default async function AIWorkforcePage() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/admin/login");
  redirect("https://neas-apex.vercel.app/");
}
