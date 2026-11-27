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
  address: {
    "@type": "PostalAddress",
    streetAddress: "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato",
    addressLocality: "Marilao",
    addressRegion: "Bulacan",
    postalCode: "3019",
    addressCountry: "PH",
  },
  areaServed: {
    "@type": "Country",
    name: "Philippines",
  },
  sameAs: [
    "https://www.facebook.com/NextEdgeAccessSolutions/",
    "https://www.instagram.com/nextedgeaccesssolutions.neas/",
    "https://ph.linkedin.com/company/nextedge-access-solutions-neas",
    "https://www.youtube.com/@NextEdgeAccessSolutions",
    "https://www.tiktok.com/@nextedgeaccesssolutions",
  ],
} as const;
