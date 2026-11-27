/** Stable organization facts used by the public-site JSON-LD graph. */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NextEdge Access Solutions (NEAS) OPC",
  alternateName: "NEAS",
  url: "https://www.nextedge-access-solutions.com/",
  logo: "https://www.nextedge-access-solutions.com/img/logo.png",
  email: "info.nextedgeaccesssolutions@gmail.com",
  telephone: "+63 991 426 5886",
  areaServed: {
    "@type": "Country",
    name: "Philippines",
  },
  sameAs: [
    "https://www.facebook.com/NextEdgeAccessSolutionss",
    "https://www.instagram.com/nextedgeaccesssolutions",
    "https://www.linkedin.com/company/next-edge-access-solutions-neas",
    "https://www.youtube.com/@NextEdgeAccessSolutions",
    "https://www.tiktok.com/@nextedgeaccesssolutions",
  ],
} as const;
