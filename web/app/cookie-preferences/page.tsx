import type { Metadata } from "next";
import CookiePreferencesPanel from "@/components/CookiePreferencesPanel";

export const metadata: Metadata = {
  title: "Cookie Preferences — NextEdge Access Solutions (NEAS)",
  description: "Manage or withdraw optional cookie consent for the NEAS website.",
  alternates: { canonical: "/cookie-preferences" },
};

export default function CookiePreferencesPage() {
  return <CookiePreferencesPanel />;
}
