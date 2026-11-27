import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_PAGES } from "@/lib/service-pages";
import { localBusinessSchema } from "@/lib/organization-schema";

const ORIGIN = "https://www.nextedge-access-solutions.com";
const canonical = `${ORIGIN}/locations/marilao-bulacan`;

export const metadata: Metadata = {
  title: "NEAS Marilao Bulacan | Rope Access & Industrial Services",
  description:
    "Contact NextEdge Access Solutions (NEAS) OPC in Marilao, Bulacan for rope access, façade maintenance, wind turbine support, industrial inspection, telecom, training and PPE enquiries.",
  alternates: { canonical: "/locations/marilao-bulacan" },
  openGraph: {
    title: "NextEdge Access Solutions | Marilao, Bulacan",
    description:
      "NEAS is based in Marilao, Bulacan, providing specialist rope access, inspection, maintenance, training and equipment solutions.",
    url: canonical,
    type: "website",
    images: [{ url: "/img/logo.png", alt: "NextEdge Access Solutions logo" }],
  },
  twitter: {
    card: "summary",
    title: "NextEdge Access Solutions | Marilao, Bulacan",
    description:
      "Rope access, inspection, maintenance, training and PPE enquiries in Marilao, Bulacan.",
  },
};

export default function MarilaoLocationPage() {
  return (
    <main className="neas-location">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema).replace(/</g, "\\u003c"),
        }}
      />
      <section className="hero">
        <div className="wrap">
          <nav aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Marilao, Bulacan</span>
          </nav>
          <p className="eyebrow">NEAS Bulacan Office</p>
          <h1>Rope Access & Industrial Services in Marilao, Bulacan</h1>
          <p className="lead">
            NextEdge Access Solutions (NEAS) OPC is based at Marilao Grand Villas,
            Barangay Loma de Gato, Marilao, Bulacan. Contact the team to discuss
            rope access, façade maintenance, wind energy, industrial inspection,
            telecommunications, training and work-at-height equipment.
          </p>
          <div className="actions">
            <a className="primary" href="/#contact">Request a project quotation</a>
            <a href="tel:+639914265886">Call +63 991 426 5886</a>
          </div>
        </div>
      </section>

      <section className="wrap content">
        <div className="details">
          <article>
            <h2>NEAS office address</h2>
            <address>
              B 15 Lot 6, Marilao Grand Villas<br />
              Barangay Loma de Gato<br />
              Marilao, Bulacan 3019<br />
              Philippines
            </address>
            <p>
              <strong>Telephone:</strong> <a href="tel:+639914265886">+63 991 426 5886</a><br />
              <strong>Email:</strong> <a href="mailto:info.nextedgeaccesssolutions@gmail.com">info.nextedgeaccesssolutions@gmail.com</a>
            </p>
            <a
              className="map-link"
              href="https://www.google.com/maps/search/?api=1&query=B%2015%20Lot%206%20Marilao%20Grand%20Villas%2C%20Loma%20de%20Gato%2C%20Marilao%2C%20Bulacan%203019%2C%20Philippines"
              target="_blank"
              rel="noopener noreferrer"
            >
              View NEAS location in Google Maps →
            </a>
          </article>
          <article>
            <h2>Serving projects across the Philippines</h2>
            <p>
              The Marilao office is the business contact point for project
              enquiries. Service coverage, mobilisation, personnel availability
              and site-specific requirements are confirmed during quotation.
            </p>
            <p>
              For an accurate proposal, include your project site, scope of work,
              approximate quantities, access constraints and target schedule.
            </p>
            <a className="primary" href="/#contact">Send a project enquiry</a>
          </article>
        </div>

        <section className="services">
          <h2>NEAS services</h2>
          <p>Explore the specialist service pages for scope details and project enquiries.</p>
          <div className="service-grid">
            {SERVICE_PAGES.map(service => (
              <Link key={service.id} href={`/services/${service.id}`}>
                <strong>{service.enquiryLabel}</strong>
                <span>{service.metaDescription}</span>
                <em>View service details →</em>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <style>{`
        .neas-location{--navy:#071D29;--navy2:#0d2a3a;--gold:#EBC07E;--gold2:#CA9332;--text:#f4f7f9;--muted:#d3dde3;background:var(--navy);color:var(--text);display:flow-root}
        .neas-location *{box-sizing:border-box}
        .neas-location .wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
        .neas-location .hero{padding:clamp(56px,9vw,112px) 0;background:linear-gradient(110deg,#071d29,#17404b)}
        .neas-location nav{font-size:13px;color:#d3dde3;margin-bottom:26px}
        .neas-location nav a{color:var(--gold)}
        .neas-location .eyebrow{color:var(--gold);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
        .neas-location h1{font-size:clamp(32px,5vw,58px);line-height:1.08;letter-spacing:-.03em;max-width:850px;margin:14px 0 18px;color:#fff}
        .neas-location .lead{font-size:clamp(16px,2vw,19px);line-height:1.75;max-width:820px;color:var(--muted)}
        .neas-location .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
        .neas-location .actions a,.neas-location .primary{display:inline-flex;padding:13px 19px;border-radius:8px;border:1px solid rgba(255,255,255,.35);font-weight:700;color:#fff;text-decoration:none}
        .neas-location .actions .primary,.neas-location a.primary{background:var(--gold);border-color:var(--gold);color:var(--navy)}
        .neas-location .content{padding-top:54px;padding-bottom:76px}
        .neas-location .details{display:grid;grid-template-columns:1fr;gap:26px}
        @media(min-width:800px){.neas-location .details{grid-template-columns:1fr 1fr;gap:36px}}
        .neas-location article{padding:28px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.035)}
        .neas-location h2{font-size:25px;margin:0 0 16px;color:#fff}
        .neas-location address,.neas-location article p{font-style:normal;line-height:1.8;color:var(--muted);margin:0 0 16px}
        .neas-location article a:not(.primary){color:var(--gold);font-weight:700}
        .neas-location .map-link{display:inline-block;margin-top:8px}
        .neas-location .services{margin-top:56px}
        .neas-location .services>p{color:var(--muted);line-height:1.7}
        .neas-location .service-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:24px}
        @media(min-width:700px){.neas-location .service-grid{grid-template-columns:1fr 1fr}}
        .neas-location .service-grid a{display:flex;flex-direction:column;gap:10px;padding:20px;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;text-decoration:none}
        .neas-location .service-grid a:hover{border-color:var(--gold)}
        .neas-location .service-grid span{font-size:14px;line-height:1.65;color:var(--muted)}
        .neas-location .service-grid em{font-style:normal;font-size:13px;color:var(--gold);font-weight:700}
      `}</style>
    </main>
  );
}
