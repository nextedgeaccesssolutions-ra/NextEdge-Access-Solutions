import { getUser } from "./auth";
export async function requireAdmin() {
  const u = await getUser();
  return u && u.role === "admin" ? u : null;
}
