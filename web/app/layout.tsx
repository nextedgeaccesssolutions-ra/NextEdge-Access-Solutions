import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import ChatBot from "@/components/ChatBot";
import ScrollReveal from "@/components/ScrollReveal";
import CookieConsent from "@/components/CookieConsent";
import AnalyticsLoader from "@/components/AnalyticsLoader";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextedge-access-solutions.com"),
  title: { default: "NextEdge Access Solutions (NEAS) — Rope Access & Height Safety Philippines", template: "%s | NEAS Philippines" },
  description: "NEAS is a Philippine company providing certified rope access services, IRATA/SPRAT training, NDT inspections, and height-safety equipment. Based in Cebu, serving clients across the Philippines.",
  keywords: ["rope access Philippines", "IRATA training Philippines", "height safety equipment", "rope access Cebu", "SPRAT training", "NDT inspection Philippines", "work at height", "PPE Philippines"],
  authors: [{ name: "NextEdge Access Solutions (NEAS) OPC" }],
  icons: { icon: "/favicon.png" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://www.nextedge-access-solutions.com",
    siteName: "NextEdge Access Solutions (NEAS)",
    title: "NextEdge Access Solutions — Certified Rope Access Philippines",
    description: "Certified rope access services, IRATA/SPRAT training, and height-safety equipment in the Philippines.",
    images: [{ url: "/img/logo.png", width: 400, height: 400, alt: "NEAS Logo" }],
  },
  twitter: {
    card: "summary",
    title: "NextEdge Access Solutions — Rope Access Philippines",
    description: "Certified rope access services, training and equipment in the Philippines.",
    images: ["/img/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PH">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" /></head>
      <body>
        <Header />
        <main>{children}</main>
        <ScrollReveal />
        <ChatBot />
        <CookieConsent />
        <AnalyticsLoader />
        <footer className="ftr"><div className="wrap"><span>© 2026 NextEdge Access Solutions (NEAS) OPC · <a href="/privacy-policy">Privacy Policy</a> · <a href="/cookie-policy">Cookie Policy</a> · <a href="/cookie-preferences">Cookie Preferences</a></span><span>sales@nextedge-access-solutions.com · +63 991 426 5886</span></div></footer>
      </body>
    </html>
  );
}
