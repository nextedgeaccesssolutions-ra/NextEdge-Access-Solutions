import Link from "next/link";
import { getUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Header() {
  const user = await getUser().catch(() => null);
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <a href="/" className="brand"><img src="/img/logo.png" alt="NEAS logo" /><div><b>NEXTEDGE</b><span>Access Solutions · OPC</span></div></a>
        <nav className="nav" aria-label="Main">
          <a href="/">Home</a>
          <Link href="/store">Online Store</Link>
          {user?.role === "admin" && <Link href="/admin">Admin Panel</Link>}
          {user ? <><Link href="/account">My Account</Link><LogoutButton /></> : <Link href="/login">Log in / Sign up</Link>}
          <a className="cta" href="/#contact">Get a Quote</a>
        </nav>
      </div>
    </header>
  );
}
