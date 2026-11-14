import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Clients | NextEdge Access Solutions",
  description: "Explore selected client relationships and industry experience supporting NextEdge Access Solutions across wind energy and industrial access services.",
  alternates: { canonical: "/our-clients" },
  openGraph: {
    title: "Our Clients | NextEdge Access Solutions",
    description: "Industry relationships and experience across wind energy, rope access and industrial services.",
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
  },
  {
    name: "Atimonan Windkraft",
    sector: "Wind Energy",
    description: "A wind energy client relationship referenced in NEAS's wind-sector experience.",
    initials: "AW",
  },
  {
    name: "Philsurv Geodetic Engineer",
    sector: "Geodetic Surveying & Engineering",
    description: "A client name added to NEAS's selected client references.",
    initials: "PG",
  },
];

const sectors = [
  "Renewable Energy & Wind",
  "Rope Access & Working at Height",
  "Industrial Maintenance",
  "Offshore & Onshore Operations",
  "Telecommunications & Infrastructure",
];

export default function OurClientsPage() {
  return (
    <main className="neas-clients">
      <style>{`
        .neas-clients{background:#07111b;color:#eef4f8;min-height:100vh}
        .neas-clients *{box-sizing:border-box}
        .neas-clients .clients-wrap{width:min(1120px,calc(100% - 40px));margin:0 auto}
        .neas-clients .clients-hero{padding:112px 0 76px;background:radial-gradient(ellipse at 82% 10%,rgba(185,132,54,.22),transparent 38%),linear-gradient(135deg,#081521,#102b35 68%,#0c1b27);border-bottom:1px solid rgba(255,255,255,.1)}
        .neas-clients .eyebrow{color:#d5ad69;text-transform:uppercase;letter-spacing:.19em;font-size:12px;font-weight:800}
        .neas-clients h1{font-size:clamp(38px,6vw,66px);line-height:1.04;letter-spacing:-.04em;margin:18px 0;color:#fff;max-width:780px}
        .neas-clients .hero-copy{font-size:18px;line-height:1.75;color:#c2d0d8;max-width:720px}
        .neas-clients .client-section{padding:76px 0}
        .neas-clients .section-kicker{font-size:12px;color:#d5ad69;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
        .neas-clients h2{font-size:clamp(28px,4vw,42px);line-height:1.15;margin:12px 0 14px;color:#fff}
        .neas-clients .section-copy{color:#aebdc7;line-height:1.75;max-width:700px}
        .neas-clients .client-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:34px}
        .neas-clients .client-card{padding:30px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:linear-gradient(145deg,#122633,#0c1a25);min-height:210px;display:flex;gap:20px;align-items:flex-start}
        .neas-clients .client-mark{width:64px;height:64px;flex:0 0 64px;border-radius:14px;display:grid;place-items:center;background:rgba(213,173,105,.12);border:1px solid rgba(213,173,105,.32);color:#e5c58e;font-weight:900;font-size:20px;letter-spacing:.04em}
        .neas-clients .client-sector{color:#d5ad69;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
        .neas-clients .client-card h3{font-size:22px;margin:8px 0;color:#fff}
        .neas-clients .client-card p{font-size:14px;color:#aebdc7;line-height:1.65}
        .neas-clients .sector-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:30px}
        .neas-clients .sector-item{padding:18px 20px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#0d1c27;color:#d9e3e9;font-weight:650;font-size:14px}
        .neas-clients .cta-panel{margin:0 0 76px;padding:36px;border-radius:18px;background:linear-gradient(110deg,#b58b4c,#d8b779);color:#10202b;display:flex;align-items:center;justify-content:space-between;gap:24px}
        .neas-clients .cta-panel h2{font-size:clamp(24px,3vw,34px);color:#10202b;margin:0 0 8px}
        .neas-clients .cta-panel p{color:#243743;line-height:1.65}
        .neas-clients .cta-link{display:inline-flex;white-space:nowrap;align-items:center;justify-content:center;padding:13px 20px;border-radius:8px;background:#0c202b;color:#fff;font-weight:800;text-decoration:none}
        @media(max-width:700px){.neas-clients .client-grid,.neas-clients .sector-grid{grid-template-columns:1fr}.neas-clients .client-section{padding:54px 0}.neas-clients .clients-hero{padding:94px 0 58px}.neas-clients .client-card{padding:22px}.neas-clients .cta-panel{align-items:flex-start;flex-direction:column;padding:26px}}
      `}</style>
      <section className="clients-hero">
        <div className="clients-wrap">
          <div className="eyebrow">Partnerships · Performance · Trust</div>
          <h1>Our Clients</h1>
          <p className="hero-copy">Building trusted working relationships through safe access, dependable execution, and technical solutions for demanding industrial and renewable energy environments.</p>
        </div>
      </section>

      <section className="client-section">
        <div className="clients-wrap">
          <div className="section-kicker">Selected client relationships</div>
          <h2>Working alongside the energy sector</h2>
          <p className="section-copy">NEAS supports projects and industry stakeholders with specialist access capabilities, maintenance support, and a safety-led approach. The client names below are drawn from NEAS's existing wind energy client references.</p>
          <div className="client-grid">
            {clients.map((client) => (
              <article className="client-card" key={client.name}>
                <div className="client-mark" aria-hidden="true">{client.initials}</div>
                <div>
                  <div className="client-sector">{client.sector}</div>
                  <h3>{client.name}</h3>
                  <p>{client.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="client-section" style={{background:"#0a1721",borderTop:"1px solid rgba(255,255,255,.07)",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
        <div className="clients-wrap">
          <div className="section-kicker">Industries we serve</div>
          <h2>Technical capability across critical sectors</h2>
          <p className="section-copy">Our service capabilities are designed for complex access and maintenance requirements across energy, infrastructure, and industrial environments.</p>
          <div className="sector-grid">
            {sectors.map((sector) => <div className="sector-item" key={sector}>{sector}</div>)}
          </div>
        </div>
      </section>

      <section className="clients-wrap">
        <div className="cta-panel">
          <div>
            <h2>Let’s build the next project together.</h2>
            <p>Talk to NEAS about your project requirements, site conditions, and service scope.</p>
          </div>
          <Link className="cta-link" href="/contact">Discuss a Project ↗</Link>
        </div>
      </section>
    </main>
  );
}
