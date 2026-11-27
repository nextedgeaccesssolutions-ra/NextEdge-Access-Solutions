import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_META } from "@/lib/services";
import { SERVICE_PAGES } from "@/lib/service-pages";
import { getManagedServicePage } from "@/lib/managed-service-pages";

const ORIGIN = "https://www.nextedge-access-solutions.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Rope Access & Industrial Services Philippines | NEAS" },
  description:
    "Explore NEAS rope access, facade works, NDT inspection, protective coatings, wind turbine, renewable energy, offshore, onshore, met mast, telecom, training and PPE services across the Philippines.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Rope Access & Industrial Services Philippines | NEAS",
    description:
      "Specialist rope access, inspection, maintenance, renewable energy and height-safety services for industrial and commercial projects across the Philippines.",
    url: "/services",
    type: "website",
    images: [{ url: "/img/hero-city.jpg", alt: "NextEdge Access Solutions industrial services" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rope Access & Industrial Services Philippines | NEAS",
    description:
      "Explore specialist access, inspection, renewable energy and industrial services from NEAS.",
    images: ["/img/hero-city.jpg"],
  },
};

function serviceImage(service: { id: string; image?: string }) {
  const meta = SERVICE_META[service.id];
  return service.image ?? meta?.image ?? "/img/hero-city.jpg";
}

export default async function ServicesDirectoryPage() {
  const services = (await Promise.all(
    SERVICE_PAGES.map((service) => getManagedServicePage(service.id)),
  )).filter((service): service is NonNullable<typeof service> => Boolean(service));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rope Access & Industrial Services | NextEdge Access Solutions",
    description:
      "NEAS service directory covering rope access, industrial inspection, coatings, renewable energy, offshore and onshore support, met mast, telecom, training and PPE.",
    url: `${ORIGIN}/services`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: services.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: service.enquiryLabel,
        url: `${ORIGIN}/services/${service.id}`,
      })),
    },
  };

  return (
    <main className="neas-services-directory">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <section className="nsd-hero">
        <div className="nsd-wrap">
          <nav className="nsd-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span>Services</span>
          </nav>
          <p className="nsd-eyebrow">NextEdge Access Solutions · NEAS OPC</p>
          <h1>Specialist Access &amp; Industrial Services</h1>
          <p className="nsd-lead">
            Safe, reliable and professional solutions for hard-to-reach work,
            industrial assets and renewable energy projects across the Philippines.
          </p>
          <div className="nsd-actions">
            <Link className="nsd-btn nsd-btn-primary" href="/contact">Request a quotation</Link>
            <a className="nsd-btn" href="tel:+639914265886">Call +63 991 426 5886</a>
          </div>
        </div>
      </section>

      <section className="nsd-listing" aria-labelledby="nsd-services-title">
        <div className="nsd-wrap">
          <div className="nsd-intro">
            <p className="nsd-eyebrow">What we do</p>
            <h2 id="nsd-services-title">Our Services</h2>
            <p>
              Explore our specialist capabilities and select a service to review
              its scope, relevant experience and project enquiry options.
            </p>
          </div>

          <div className="nsd-grid">
            {services.map((service) => (
              <article className="nsd-card" key={service.id}>
                <Link
                  className="nsd-card-image"
                  href={`/services/${service.id}`}
                  aria-label={`View ${service.enquiryLabel}`}
                >
                  <img
                    src={serviceImage(service)}
                    alt={service.h1}
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <div className="nsd-card-body">
                  <p className="nsd-card-eyebrow">{service.eyebrow}</p>
                  <h3><Link href={`/services/${service.id}`}>{service.enquiryLabel}</Link></h3>
                  <p className="nsd-card-copy">{service.metaDescription}</p>
                  <Link className="nsd-card-link" href={`/services/${service.id}`}>
                    View service details <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nsd-cta">
        <div className="nsd-wrap nsd-cta-inner">
          <div>
            <p className="nsd-eyebrow">Discuss your project</p>
            <h2>Need a specialist access solution?</h2>
            <p>Share your site location, asset, scope and target schedule. Our team can review your requirements and advise on the next steps.</p>
          </div>
          <Link className="nsd-btn nsd-btn-primary" href="/contact">Contact NEAS</Link>
        </div>
      </section>

      <style>{`
        .neas-services-directory{--nsd-navy:#071D29;--nsd-navy2:#0d2a3a;--nsd-gold:#EBC07E;--nsd-gold2:#CA9332;color:#132b38;background:#fff}
        .neas-services-directory *{box-sizing:border-box}
        .nsd-wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}
        .nsd-hero{background:linear-gradient(112deg,rgba(7,29,41,.97),rgba(7,29,41,.82)),url('/img/hero-city.jpg') center/cover no-repeat;color:#fff;padding:clamp(58px,8vw,100px) 0}
        .nsd-crumbs{display:flex;gap:10px;align-items:center;color:#d4dee4;font-size:13px;margin-bottom:28px}
        .nsd-crumbs a{color:#d4dee4;text-decoration:none}
        .nsd-eyebrow{margin:0 0 12px;color:var(--nsd-gold2);font-size:12px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
        .nsd-hero .nsd-eyebrow{color:var(--nsd-gold)}
        .nsd-hero h1{max-width:850px;margin:0;color:#fff;font-size:clamp(34px,5.6vw,62px);line-height:1.06;letter-spacing:-.035em}
        .nsd-lead{max-width:740px;margin:22px 0 0;color:#d7e1e7;font-size:clamp(16px,2vw,19px);line-height:1.75}
        .nsd-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
        .nsd-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:1px solid rgba(255,255,255,.5);border-radius:7px;color:#fff;text-decoration:none;font-weight:750}
        .nsd-btn-primary{background:var(--nsd-gold);border-color:var(--nsd-gold);color:var(--nsd-navy)}
        .nsd-btn:focus-visible,.nsd-card a:focus-visible{outline:3px solid var(--nsd-gold2);outline-offset:3px}
        .nsd-listing{padding:clamp(48px,7vw,82px) 0}
        .nsd-intro{max-width:760px;margin-bottom:34px}
        .nsd-intro h2,.nsd-cta h2{margin:0 0 12px;color:var(--nsd-navy);font-size:clamp(28px,4vw,42px);line-height:1.12}
        .nsd-intro>p:last-child,.nsd-cta p:not(.nsd-eyebrow){margin:0;color:#526774;line-height:1.75}
        .nsd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
        .nsd-card{min-width:0;overflow:hidden;border:1px solid #dce5e9;border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(7,29,41,.07);display:flex;flex-direction:column}
        .nsd-card-image{display:block;aspect-ratio:16/9;overflow:hidden;background:#e8eef1}
        .nsd-card-image img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
        .nsd-card:hover .nsd-card-image img{transform:scale(1.035)}
        .nsd-card-body{display:flex;flex:1;flex-direction:column;padding:22px}
        .nsd-card-eyebrow{margin:0 0 9px;color:#94651f;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
        .nsd-card h3{margin:0 0 12px;font-size:21px;line-height:1.25;color:var(--nsd-navy)}
        .nsd-card h3 a{color:inherit;text-decoration:none}
        .nsd-card-copy{margin:0 0 20px;color:#526774;font-size:14px;line-height:1.7}
        .nsd-card-link{display:inline-flex;align-items:center;gap:8px;margin-top:auto;color:#94651f;font-weight:800;text-decoration:none}
        .nsd-card-link:hover{text-decoration:underline}
        .nsd-cta{background:#f2f6f8;border-top:1px solid #e0e8ec;padding:48px 0}
        .nsd-cta-inner{display:flex;align-items:center;justify-content:space-between;gap:24px}
        .nsd-cta h2{font-size:clamp(25px,3.5vw,36px)}
        .nsd-cta .nsd-btn{border-color:var(--nsd-gold);white-space:nowrap}
        @media(max-width:900px){.nsd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:600px){.nsd-wrap{width:min(100% - 28px,1160px)}.nsd-grid{grid-template-columns:1fr;gap:16px}.nsd-card-body{padding:18px}.nsd-cta-inner{align-items:flex-start;flex-direction:column}}
        @media(prefers-reduced-motion:reduce){.nsd-card-image img{transition:none}}
      `}</style>
    </main>
  );
}
