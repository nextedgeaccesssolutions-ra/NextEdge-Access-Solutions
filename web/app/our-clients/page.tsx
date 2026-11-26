import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";

// Client photos are changed through the admin database settings; render on each request
// so published image URLs are not frozen into a static build.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Our Clients | NextEdge Access Solutions",
  description: "Meet the organizations and industry partners connected with NextEdge Access Solutions across renewable energy, geodetic surveying and industrial services.",
  alternates: { canonical: "/our-clients" },
  openGraph: {
    title: "Our Clients | NextEdge Access Solutions",
    description: "Trusted relationships across renewable energy, geodetic surveying and industrial services.",
    url: "/our-clients",
    type: "website",
  },
};

const clients = [
  {
    name: "Triconti ECC",
    sector: "Wind Energy",
    description: "A wind energy client relationship referenced in NEAS's wind-sector experience.",
    initials: "TE",
    photoKey: "clientTriconti",
    fallbackImage: "/img/hero-wind.jpg",
    imageCaption: "NEAS wind-energy capability image · illustrative, not a Triconti project photograph",
  },
  {
    name: "Atimonan Windkraft",
    sector: "Wind Energy",
    description: "A wind energy client relationship referenced in NEAS's wind-sector experience.",
    initials: "AW",
    photoKey: "clientAtimonan",
    fallbackImage: "/img/0ce37cb33507.jpg",
    imageCaption: "NEAS wind-turbine service image · illustrative, not an Atimonan project photograph",
  },
  {
    name: "Philsurv Geodetic Engineer",
    sector: "Geodetic Surveying & Engineering",
    description: "A client name added to NEAS's selected client references.",
    initials: "PG",
    photoKey: "clientPhilsurv",
    fallbackImage: "/img/hero-metmast.jpg",
    imageCaption: "NEAS wind-measurement and met-mast capability image · illustrative, not a Philsurv project photograph",
  },
];

const sectors = [
  "Renewable Energy & Wind",
  "Rope Access & Working at Height",
  "Industrial Maintenance",
  "Offshore & Onshore Operations",
  "Telecommunications & Infrastructure",
  "Geodetic Surveying & Engineering",
];

export default async function OurClientsPage() {
  const photos = await getSetting<Record<string, string>>("site_photos", {});
  return (
    <main className="neas-clients">
      <style>{`
        .neas-clients{--gold:#d7ad68;--ink:#07131d;--panel:#102431;--muted:#aebfca;background:var(--ink);color:#f4f7f9;min-height:100vh;overflow:hidden;display:flow-root}
        .neas-clients *{box-sizing:border-box}
        .neas-clients .wrap{width:min(1160px,calc(100% - 48px));margin:0 auto}
        .neas-clients .hero{position:relative;padding:clamp(76px,10vw,132px) 0 88px;background:radial-gradient(ellipse at 78% 20%,rgba(215,173,104,.2),transparent 32%),radial-gradient(ellipse at 10% 90%,rgba(39,112,128,.24),transparent 42%),linear-gradient(120deg,#081722 0%,#102d39 55%,#0a1a25 100%);border-bottom:1px solid rgba(255,255,255,.1)}
        .neas-clients .hero:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent);pointer-events:none}
        .neas-clients .hero-inner{position:relative;z-index:1;max-width:850px}
        .neas-clients .eyebrow,.neas-clients .kicker{color:var(--gold);font-size:11px;font-weight:850;letter-spacing:.2em;text-transform:uppercase}
        .neas-clients h1{font-size:clamp(42px,7vw,76px);line-height:1.02;letter-spacing:-.055em;margin:18px 0;color:#fff}
        .neas-clients .hero-copy{font-size:clamp(16px,2vw,19px);line-height:1.8;color:#c4d2d9;max-width:760px;margin:0}
        .neas-clients .hero-rule{height:3px;width:76px;background:var(--gold);margin-top:30px;border-radius:5px}
        .neas-clients .section{padding:clamp(58px,8vw,94px) 0}
        .neas-clients .section-head{display:flex;justify-content:space-between;align-items:end;gap:28px;flex-wrap:wrap}
        .neas-clients h2{font-size:clamp(28px,4vw,44px);line-height:1.12;letter-spacing:-.035em;margin:12px 0;color:#fff}
        .neas-clients .section-copy{color:var(--muted);line-height:1.8;max-width:680px;margin:0}
        .neas-clients .client-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:38px}
        .neas-clients .client-card{min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:linear-gradient(155deg,#142d3a,#0d1e29 75%);box-shadow:0 18px 42px rgba(0,0,0,.16);transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
        .neas-clients .client-card:hover{transform:translateY(-5px);border-color:rgba(215,173,104,.48);box-shadow:0 24px 48px rgba(0,0,0,.25)}
        .neas-clients .client-photo{height:210px;position:relative;background:radial-gradient(circle at 75% 15%,rgba(215,173,104,.24),transparent 35%),linear-gradient(135deg,#173747,#0c1b27);display:grid;place-items:center;overflow:hidden}
        .neas-clients .client-photo img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s ease}
        .neas-clients .client-photo.fit{background:#fff}.neas-clients .client-photo.fit img{object-fit:contain;padding:14px;box-sizing:border-box}
        .neas-clients .client-card:hover .client-photo img{transform:scale(1.035)}
        .neas-clients .image-caption{position:absolute;inset:auto 0 0;padding:22px 14px 10px;background:linear-gradient(transparent,rgba(4,13,20,.82));color:#f3e4c8;font-size:10px;line-height:1.45;font-weight:700;letter-spacing:.035em}
        .neas-clients .photo-placeholder{width:76px;height:76px;border-radius:22px;border:1px solid rgba(215,173,104,.45);background:rgba(215,173,104,.12);display:grid;place-items:center;color:#f0d29c;font-weight:900;font-size:25px;letter-spacing:.04em}
        .neas-clients .client-body{padding:24px 24px 26px}
        .neas-clients .client-sector{color:var(--gold);font-size:10px;font-weight:850;letter-spacing:.16em;text-transform:uppercase}
        .neas-clients .client-card h3{font-size:21px;line-height:1.25;margin:10px 0;color:#fff}
        .neas-clients .client-card p{font-size:14px;color:#b3c2cb;line-height:1.75;margin:0}
        .neas-clients .sector-section{background:linear-gradient(180deg,#0b1a25,#0e202b);border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}
        .neas-clients .sector-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:32px}
        .neas-clients .sector-item{display:flex;align-items:center;gap:13px;padding:19px 20px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035);color:#dce6eb;font-size:14px;font-weight:650;min-height:66px}
        .neas-clients .sector-item:before{content:"";width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:var(--gold);box-shadow:0 0 14px rgba(215,173,104,.55)}
        .neas-clients .cta{margin:0;padding:clamp(28px,5vw,48px);border-radius:22px;background:linear-gradient(110deg,#b98d4e,#e0c184);color:#10212b;display:flex;align-items:center;justify-content:space-between;gap:28px;box-shadow:0 22px 54px rgba(0,0,0,.2)}
        .neas-clients .cta h2{font-size:clamp(25px,3.4vw,37px);color:#10212b;margin:0 0 10px}
        .neas-clients .cta p{color:#263b45;line-height:1.7;margin:0}
        .neas-clients .cta-link{display:inline-flex;white-space:nowrap;align-items:center;justify-content:center;padding:15px 22px;border-radius:9px;background:#0b202c;color:#fff;font-weight:800;text-decoration:none;transition:transform .2s ease,background .2s ease}
        .neas-clients .cta-link:hover{transform:translateY(-2px);background:#17394a}
        @media(max-width:900px){.neas-clients .client-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.neas-clients .sector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:620px){.neas-clients .wrap{width:min(100% - 32px,520px)}.neas-clients .hero{padding:76px 0 62px}.neas-clients .client-grid,.neas-clients .sector-grid{grid-template-columns:1fr}.neas-clients .client-photo{height:190px}.neas-clients .cta{align-items:flex-start;flex-direction:column;margin-bottom:0}}
        @media(prefers-reduced-motion:reduce){.neas-clients .client-card,.neas-clients .cta-link{transition:none}}
      `}</style>

      <section className="hero">
        <div className="wrap hero-inner">
          <div className="eyebrow">Partnerships · Performance · Trust</div>
          <h1>Our Clients</h1>
          <p className="hero-copy">Strong partnerships. Shared standards. Reliable delivery. We work alongside organizations across renewable energy, infrastructure and specialist technical services.</p>
          <div className="hero-rule" />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Selected client relationships</div>
              <h2>Trusted across demanding industries</h2>
              <p className="section-copy">NEAS supports projects and industry stakeholders with specialist access capabilities, maintenance support and a safety-led approach.</p>
            </div>
          </div>
          <div className="client-grid">
            {clients.map((client) => (
              <article className="client-card" key={client.name}>
                <div className={"client-photo" + (photos[client.photoKey] ? " fit" : "")}>
                  {(() => {
                    const hasApprovedPhoto = Boolean(photos[client.photoKey]);
                    const imageSrc = hasApprovedPhoto ? photos[client.photoKey] : client.fallbackImage;
                    return imageSrc ? (
                      <>
                        <img src={imageSrc} alt={hasApprovedPhoto ? client.name + " photo" : client.name + " industry capability illustration"} loading="lazy" />
                        {!hasApprovedPhoto && <div className="image-caption">{client.imageCaption}</div>}
                      </>
                    ) : <div className="photo-placeholder" aria-hidden="true">{client.initials}</div>;
                  })()}
                </div>
                <div className="client-body">
                  <div className="client-sector">{client.sector}</div>
                  <h3>{client.name}</h3>
                  <p>{client.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section sector-section">
        <div className="wrap">
          <div className="kicker">Industries we serve</div>
          <h2>Technical capability across critical sectors</h2>
          <p className="section-copy">Our service capabilities are designed for complex access and maintenance requirements across energy, infrastructure and industrial environments.</p>
          <div className="sector-grid">
            {sectors.map((sector) => <div className="sector-item" key={sector}>{sector}</div>)}
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="cta">
          <div>
            <h2>Let’s build the next project together.</h2>
            <p>Talk to NEAS about your project requirements, site conditions and service scope.</p>
          </div>
          <Link className="cta-link" href="/contact">Discuss a Project <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
