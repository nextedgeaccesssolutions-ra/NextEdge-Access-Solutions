import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

const siteName = "NextEdge Access Solutions (NEAS)";
const siteDescription = "Rope access, working-at-height safety, renewable energy and certified height-safety equipment from NextEdge Access Solutions in the Philippines.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextedge-access-solutions.com"),
  title: "NEAS Online Store — NextEdge Access Solutions",
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName,
    title: "NEAS Online Store — NextEdge Access Solutions",
    description: siteDescription,
    url: "/",
    images: [{ url: "/img/hero-city.jpg", alt: "NextEdge Access Solutions — industrial access and height safety" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEAS Online Store — NextEdge Access Solutions",
    description: siteDescription,
    images: ["/img/hero-city.jpg"],
  },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" /></head>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="ftr"><div className="wrap"><span>© 2026 NextEdge Access Solutions (NEAS) OPC · <a href="/privacy-policy">Privacy Policy</a></span><span>sales@nextedge-access-solutions.com · +63 991 426 5886</span></div></footer>
      </body>
    </html>
  );
}
