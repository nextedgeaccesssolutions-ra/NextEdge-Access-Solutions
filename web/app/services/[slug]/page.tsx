import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceQuoteForm from "@/components/ServiceQuoteForm";
import { SERVICE_META } from "@/lib/services";
import { SERVICE_PAGES, getServicePage } from "@/lib/service-pages";

const ORIGIN = "https://www.nextedge-access-solutions.com";
const PHONE = "+639914265886";
const WHATSAPP = "639914265886";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_PAGES.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getServicePage((await params).slug);
  if (!page) return {};
  const path = `/services/${page.id}`;
  const image = SERVICE_META[page.id].image;
  return {
    title: { absolute: page.title },
    description: page.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: page.title, description: page.metaDescription, url: path, type: "website", images: [{ url: image }] },
    twitter: { card: "summary_large_image", title: page.title, description: page.metaDescription, images: [image] },
  };
}

function jsonLd(page: NonNullable<ReturnType<typeof getServicePage>>) {
  const url = `${ORIGIN}/services/${page.id}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: page.h1,
      serviceType: page.enquiryLabel,
      description: page.metaDescription,
      url,
      areaServed: { "@type": "Country", name: "Philippines" },
      provider: {
        "@type": "LocalBusiness",
        name: "NextEdge Access Solutions (NEAS) OPC",
        url: ORIGIN,
        telephone: "+63 991 426 5886",
        email: "sales@nextedge-access-solutions.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "B15 Lot 6 Marilao Grand Villas, Barangay Loma de Gato",
          addressLocality: "Marilao",
          addressRegion: "Bulacan",
          addressCountry: "PH",
        },
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: page.enquiryLabel,
        itemListElement: page.scope.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s } })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Services", item: `${ORIGIN}/services` },
        { "@type": "ListItem", position: 3, name: page.enquiryLabel, item: url },
      ],
    },
  ];
}

export default async function ServicePageView({ params }: { params: Promise<{ slug: string }> }) {
  const page = getServicePage((await params).slug);
  if (!page) notFound();
  const image = SERVICE_META[page.id].image;
  const others = SERVICE_PAGES.filter((p) => p.id !== page.id);
  const waText = encodeURIComponent(`Hello NEAS, I'd like a quote for ${page.enquiryLabel}.`);

  return (
    <main className="neas-svc">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)).replace(/</g, "\\u003c") }} />

      <section className="hero" style={{ backgroundImage: `linear-gradient(100deg,rgba(7,29,41,.96) 0%,rgba(7,29,41,.88) 48%,rgba(7,29,41,.55) 100%),url(${image})` }}>
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span aria-hidden="true">/</span> <Link href="/services">Services</Link> <span aria-hidden="true">/</span> <span>{page.enquiryLabel}</span>
          </nav>
          <div className="eyebrow">{page.eyebrow}</div>
          <h1>{page.h1}</h1>
          <p className="lead">{page.intro}</p>
          <div className="ctas">
            <a className="btn primary" href="#quote">Request a quotation</a>
            <a className="btn" href={`tel:${PHONE}`}>Call (+63) 991 426 5886</a>
            <a className="btn" href={`https://wa.me/${WHATSAPP}?text=${waText}`} target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid2">
          <div>
            <h2>What we do</h2>
            <ul className="ticks">{page.scope.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h2>Who we work with</h2>
            <ul className="ticks">{page.industries.map((s) => <li key={s}>{s}</li>)}</ul>
            <h2 className="mt">Why NEAS</h2>
            <p>IRATA-certified (No. 2/2322), with ARAA, SRAA and OPITO certification and more than 20 years of combined experience on projects in the Philippines, Dubai, Qatar and Saudi Arabia.</p>
          </div>
        </div>
      </section>

      <section className="band alt">
        <div className="wrap">
          <h2>Relevant experience</h2>
          <ul className="chips">{page.experience.map((s) => <li key={s}>{s}</li>)}</ul>
          {page.testimonial && (
            <blockquote>
              <p>&ldquo;{page.testimonial.quote}&rdquo;</p>
              <cite>{page.testimonial.author}</cite>
            </blockquote>
          )}
        </div>
      </section>

      <section className="band" id="quote">
        <div className="wrap grid2">
          <div>
            <h2>Get a quotation</h2>
            <p>Tell us the location, the structure or asset, and what needs doing. The team replies by email with next steps and a quotation.</p>
            <p className="contact">
              <a href={`tel:${PHONE}`}>(+63) 991 426 5886</a><br />
              <a href="tel:+639957708144">(+63) 995 770 8144</a><br />
              <a href="mailto:sales@nextedge-access-solutions.com">sales@nextedge-access-solutions.com</a>
            </p>
            {page.id === "training" && <p><Link className="inline" href="/store">Browse certified PPE in the NEAS store →</Link></p>}
          </div>
          <ServiceQuoteForm service={page.enquiryLabel} />
        </div>
      </section>

      <section className="band alt">
        <div className="wrap">
          <h2>Frequently asked questions</h2>
          <div className="faqs">
            {page.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Other NEAS services</h2>
          <ul className="others">
            {others.map((o) => (
              <li key={o.id}><Link href={`/services/${o.id}`}>{o.enquiryLabel} →</Link></li>
            ))}
            <li><Link href="/store">Certified PPE store →</Link></li>
          </ul>
        </div>
      </section>

      <style>{`
        .neas-svc{--navy:#071D29;--navy2:#0d2a3a;--gold:#EBC07E;--gold2:#CA9332;--text:#f4f7f9;--muted:#d3dde3;background:var(--navy);color:var(--text);display:flow-root}
        .neas-svc *{box-sizing:border-box}
        .neas-svc .wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
        .neas-svc .hero{background-size:cover;background-position:center;padding:clamp(56px,9vw,112px) 0 clamp(48px,7vw,88px)}
        .neas-svc .crumbs{font-size:13px;color:var(--muted);margin-bottom:22px}
        .neas-svc .crumbs a{color:var(--muted)}
        .neas-svc .eyebrow{color:var(--gold);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
        .neas-svc h1{font-size:clamp(32px,5.5vw,58px);line-height:1.07;letter-spacing:-.03em;margin:14px 0 18px;max-width:820px;color:#fff}
        .neas-svc .lead{font-size:clamp(16px,2vw,19px);line-height:1.7;color:var(--muted);max-width:720px;margin:0}
        .neas-svc .ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
        .neas-svc .btn{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:8px;border:1px solid rgba(255,255,255,.35);color:#fff;font-weight:700;text-decoration:none}
        .neas-svc .btn:hover{border-color:var(--gold)}
        .neas-svc .btn.primary{background:var(--gold);border-color:var(--gold);color:var(--navy)}
        .neas-svc .btn.primary:hover{background:#f3d29c}
        .neas-svc .band{padding:clamp(44px,6vw,72px) 0}
        .neas-svc .band.alt{background:var(--navy2)}
        .neas-svc h2{font-size:clamp(22px,3vw,30px);margin:0 0 18px;color:#fff}
        .neas-svc h2.mt{margin-top:32px}
        .neas-svc p{line-height:1.75;color:var(--muted);margin:0 0 12px}
        .neas-svc .grid2{display:grid;grid-template-columns:1fr;gap:40px}
        @media(min-width:860px){.neas-svc .grid2{grid-template-columns:1fr 1fr;gap:56px}}
        .neas-svc .ticks{list-style:none;padding:0;margin:0;display:grid;gap:10px}
        .neas-svc .ticks li{padding-left:28px;position:relative;line-height:1.55}
        .neas-svc .ticks li:before{content:"";position:absolute;left:0;top:.45em;width:14px;height:8px;border-left:2px solid var(--gold);border-bottom:2px solid var(--gold);transform:rotate(-45deg)}
        .neas-svc .chips{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:10px}
        .neas-svc .chips li{border:1px solid rgba(235,192,126,.45);border-radius:999px;padding:8px 14px;font-size:14px}
        .neas-svc blockquote{margin:30px 0 0;padding:22px 24px;border-left:3px solid var(--gold);background:rgba(255,255,255,.04);border-radius:0 8px 8px 0;max-width:760px}
        .neas-svc blockquote p{font-size:18px;color:#fff;margin:0 0 8px}
        .neas-svc cite{color:var(--gold);font-style:normal;font-weight:700}
        .neas-svc .contact a,.neas-svc a.inline{color:var(--gold);font-weight:700}
        .neas-svc .faqs{display:grid;gap:10px;max-width:860px}
        .neas-svc details{border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:16px 18px;background:rgba(255,255,255,.03)}
        .neas-svc summary{cursor:pointer;font-weight:700;color:#fff}
        .neas-svc details p{margin:12px 0 0}
        .neas-svc .others{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
        .neas-svc .others a{display:block;padding:16px 18px;border:1px solid rgba(255,255,255,.16);border-radius:8px;color:#fff;text-decoration:none;font-weight:700}
        .neas-svc .others a:hover{border-color:var(--gold);color:var(--gold)}
        .neas-svc .quote-form{display:grid;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:22px}
        .neas-svc .quote-form .row{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:560px){.neas-svc .quote-form .row{grid-template-columns:1fr 1fr}}
        .neas-svc .quote-form label{display:grid;gap:6px;font-size:14px;font-weight:600;color:#fff}
        .neas-svc .quote-form input,.neas-svc .quote-form textarea{width:100%;font:inherit;font-weight:400;color:var(--navy);background:#fff;border:1px solid #9fb3bf;border-radius:6px;padding:10px 12px}
        .neas-svc .quote-form input:focus,.neas-svc .quote-form textarea:focus{outline:3px solid var(--gold);outline-offset:1px}
        .neas-svc .quote-form button{min-height:48px;border:0;border-radius:8px;background:var(--gold);color:var(--navy);font-weight:800;font-size:16px;cursor:pointer}
        .neas-svc .quote-form button:disabled{opacity:.7;cursor:progress}
        .neas-svc .quote-form .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
        .neas-svc .quote-error{color:#ffb4a8;margin:0}
        .neas-svc .quote-done{border:1px solid var(--gold);border-radius:12px;padding:22px;background:rgba(235,192,126,.08)}
        .neas-svc .quote-done strong{color:#fff;font-size:18px}
        .neas-svc a:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
      `}</style>
    </main>
  );
}
