"use client";
export default function LogoutButton() {
  return <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>Log out</button>;
}
