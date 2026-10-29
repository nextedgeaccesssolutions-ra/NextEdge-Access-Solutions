import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { enabled, fetchIdentity, isProvider } from "@/lib/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, req.url));
  if (!isProvider(provider) || !enabled(provider)) return fail("This sign-in option isn't available.");
  const jar = await cookies();
  let saved: { state?: string; provider?: string; next?: string } = {};
  try { saved = JSON.parse(jar.get("neas_oauth")?.value ?? "{}"); } catch {}
  jar.delete("neas_oauth");
  if (url.searchParams.get("error")) return fail("Sign-in was cancelled.");
  const code = url.searchParams.get("code");
  if (!code || !saved.state || saved.state !== url.searchParams.get("state") || saved.provider !== provider) return fail("Sign-in expired. Please try again.");

  let who;
  try { who = await fetchIdentity(req, provider, code); } catch (e) { return fail((e as Error).message); }

  const col = provider === "google" ? sql`google_id` : sql`facebook_id`;
  let user = (await sql`select id, role from users where ${col} = ${who.providerId}`)[0];
  if (!user) {
    const byEmail = (await sql`select id, role from users where email = ${who.email}`)[0];
    if (byEmail) {
      // Never auto-link a social login to an admin, and only trust Google (which we require to be
      // email-verified) for linking to an existing customer. Facebook does not guarantee a verified email.
      if (byEmail.role === "admin") return fail("This email belongs to a staff account. Please use the admin login.");
      if (provider !== "google") return fail("An account with this email already exists. Log in with your email and password.");
      await sql`update users set ${col} = ${who.providerId} where id = ${byEmail.id}`;
      user = byEmail;
    } else {
      user = (await sql`insert into users (email, name, role, ${col}) values (${who.email}, ${who.name.slice(0, 160)}, 'customer', ${who.providerId}) returning id, role`)[0];
    }
  }
  if (user.role === "admin") return fail("Staff accounts must use the admin login.");
  await createSession(user.id);
  return NextResponse.redirect(new URL(saved.next || "/store", req.url));
}
