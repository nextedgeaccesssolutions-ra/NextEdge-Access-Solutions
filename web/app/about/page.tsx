import type { Metadata } from "next";
import Link from "next/link";

const ORIGIN = "https://www.nextedge-access-solutions.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "About NEAS | Rope Access & Industrial Solutions Philippines" },
  description:
    "Get to know NextEdge Access Solutions (NEAS), a Philippines-based industrial access and renewable energy solutions company. Discover our experience, values, safety approach and capabilities.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About NEAS | NextEdge Access Solutions",
    description:
      "Meet NEAS: specialist rope access, renewable energy, industrial inspection and height-safety solutions, built on technical experience and a safety-led approach.",
    url: "/about",
    type: "website",
    images: [{ url: "/img/ce6c22d9bace.jpg", alt: "NEAS rope access technicians at work" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About NEAS | NextEdge Access Solutions",
    description:
      "Learn about NEAS, our experience, values and specialist industrial access capabilities.",
    images: ["/img/ce6c22d9bace.jpg"],
  },
};

const values = [
  {
    number: "01",
    title: "Integrity",
    copy: "We act honestly, communicate transparently and take responsibility for the quality and safety of our work.",
  },
  {
    number: "02",
    title: "Innovation",
    copy: "We look for practical, efficient access methods and solutions that respond to the real needs of each asset and site.",
  },
  {
    number: "03",
    title: "Commitment",
    copy: "We stay focused on agreed scope, workmanship, safe execution and dependable project delivery.",
  },
  {
    number: "04",
    title: "Collaboration",
    copy: "We work closely with clients, contractors and technical partners to achieve shared project objectives.",
  },
];

const capabilities = [
  { title: "Rope Access & Work at Height", copy: "Specialist access for inspection, maintenance, facade works, repairs and difficult-to-reach structures.", image: "/img/ce6c22d9bace.jpg" },
  { title: "Renewable Energy", copy: "Field support for wind, solar and met mast assets, including inspection and maintenance scopes.", image: "/img/0ce37cb33507.jpg" },
  { title: "Industrial Inspection", copy: "Inspection and condition-assessment support for industrial, marine, offshore and onshore facilities.", image: "/img/877206fcf5ba.jpg" },
  { title: "Protective Coatings", copy: "Surface preparation, painting and protective coating works for structures and industrial assets.", image: "/img/6447ca2a761e.jpg" },
  { title: "Telecom & Infrastructure", copy: "Access and field services for met mast, telecom towers and supporting infrastructure.", image: "/img/0cc8f91dab71.jpg" },
  { title: "Training & Safety Support", copy: "Safety consultancy, training support and PPE supply aligned with the requirements of each engagement.", image: "/img/390f5ed3244c.jpg" },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About NextEdge Access Solutions",
  description:
    "Company profile, experience, values and industrial access capabilities of NextEdge Access Solutions (NEAS).",
  url: `${ORIGIN}/about`,
  about: {
    "@type": "Organization",
    name: "NextEdge Access Solutions (NEAS) OPC",
    url: ORIGIN,
    areaServed: { "@type": "Country", name: "Philippines" },
    knowsAbout: [
      "Industrial rope access",
      "Renewable energy",
      "Wind turbine services",
      "Industrial inspection",
      "Offshore and onshore services",
      "Work at height and safety",
      "Telecommunications infrastructure",
    ],
  },
};

export default function AboutPage() {
  return (
    <div className="neas-about">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\\\u003c"),
        }}
      />

      <section className="na-hero">
        <div className="na-wrap">
          <nav className="na-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><span>About NEAS</span>
          </nav>
          <p className="na-eyebrow">NextEdge Access Solutions · NEAS OPC</p>
          <h1>Engineering access.<br /><em>Enabling progress.</em></h1>
          <p className="na-hero-copy">
            We deliver specialist rope access, industrial and renewable energy
            solutions that help clients work safely, efficiently and confidently
            at height and in challenging environments.
          </p>
          <div className="na-actions">
            <Link className="na-button na-button-gold" href="/services">Explore our services</Link>
            <Link className="na-button na-button-outline" href="/contact">Talk to our team</Link>
          </div>
        </div>
      </section>

      <section className="na-intro">
        <div className="na-wrap na-intro-grid">
          <div className="na-photo-frame">
            <img src="/img/ce6c22d9bace.jpg" alt="Industrial rope access work at height" />
            <div className="na-photo-caption"><strong>NextEdge Access Solutions</strong><span>Technical capability. Safety-led delivery.</span></div>
          </div>
          <div className="na-intro-copy">
            <p className="na-eyebrow">Who we are</p>
            <h2>Practical expertise for complex access challenges.</h2>
            <p>
              NextEdge Access Solutions (NEAS) is a Philippines-based provider
              of specialist access, industrial and renewable energy services.
              We support commercial and industrial clients with solutions for
              assets and structures where conventional access can be difficult,
              disruptive or inefficient.
            </p>
            <p>
              Our approach brings together hands-on industry experience,
              technical planning and a strong focus on safe execution. Our
              leadership brings more than 20 years of local and international
              industry experience, including exposure to projects in the
              Philippines, Qatar and Saudi Arabia.
            </p>
            <p>
              Every engagement starts with understanding the site, the asset,
              the work scope and the client's operational priorities. We then
              work to identify a suitable, responsible and cost-conscious
              delivery approach.
            </p>
            <div className="na-proof">
              <div><strong>20+ years</strong><span>Leadership industry experience</span></div>
              <div><strong>Multi-sector</strong><span>Industrial & energy focus</span></div>
              <div><strong>Safety-led</strong><span>Planned work execution</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="na-purpose">
        <div className="na-wrap na-purpose-grid">
          <article>
            <p className="na-eyebrow">Our vision</p>
            <h2>To be a trusted access and industrial solutions partner.</h2>
            <p>We aim to contribute to safer, more efficient and more sustainable operations by connecting clients with capable people, practical methods and dependable technical services.</p>
          </article>
          <article>
            <p className="na-eyebrow">Our mission</p>
            <h2>Deliver work that clients can rely on.</h2>
            <p>We are committed to understanding each project, applying appropriate technical expertise, prioritising safety and building lasting working relationships through integrity and consistent performance.</p>
          </article>
        </div>
      </section>

      <section className="na-values">
        <div className="na-wrap">
          <div className="na-section-heading">
            <p className="na-eyebrow">What guides us</p>
            <h2>Our core values</h2>
            <p>The principles behind how we plan, communicate, collaborate and deliver.</p>
          </div>
          <div className="na-value-grid">
            {values.map((value) => (
              <article className="na-value-card" key={value.number}>
                <span>{value.number}</span>
                <h3>{value.title}</h3>
                <p>{value.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="na-capabilities">
        <div className="na-wrap">
          <div className="na-section-heading">
            <p className="na-eyebrow">What we do</p>
            <h2>Our industries & capabilities</h2>
            <p>Integrated field services for demanding assets, infrastructure and work-at-height environments.</p>
          </div>
          <div className="na-cap-grid">
            {capabilities.map((item) => (
              <article className="na-cap-card" key={item.title}>
                <div className="na-cap-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></div>
                <div className="na-cap-body"><h3>{item.title}</h3><p>{item.copy}</p></div>
              </article>
            ))}
          </div>
          <div className="na-cap-link"><Link href="/services">View all services <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="na-approach">
        <div className="na-wrap na-approach-grid">
          <div>
            <p className="na-eyebrow">Our approach</p>
            <h2>Safety and planning are built into the work.</h2>
            <p>Work at height and industrial environments demand preparation. We place emphasis on understanding the task, assessing site conditions, selecting appropriate methods and equipment, and coordinating with the client's site team before work begins.</p>
            <ul>
              <li>Scope review and site-specific planning</li>
              <li>Task risk assessment and method considerations</li>
              <li>Competent personnel and appropriate equipment</li>
              <li>Coordination, supervision and clear communication</li>
              <li>Quality checks and close-out documentation as required</li>
            </ul>
            <p className="na-small-note">Personnel, certifications, equipment and work methods are matched to the specific project scope and applicable client and regulatory requirements.</p>
          </div>
          <img className="na-approach-image" src="/img/877206fcf5ba.jpg" alt="Industrial inspection work by rope access" loading="lazy" />
        </div>
      </section>

      <section className="na-cta">
        <div className="na-wrap na-cta-inner">
          <div><p className="na-eyebrow">Let's discuss your requirements</p><h2>Have a project that needs specialist access?</h2><p>Tell us about your asset, site location, work scope and target schedule. Our team can help assess the next steps.</p></div>
          <Link className="na-button na-button-gold" href="/contact">Contact NEAS</Link>
        </div>
      </section>

      <style>{`
        .neas-about{--na-navy:#071D29;--na-navy2:#102f40;--na-gold:#CA9332;--na-sand:#EBC07E;color:#1c303a;background:#fff}
        .neas-about *{box-sizing:border-box}
        .na-wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}
        .na-hero{position:relative;isolation:isolate;overflow:hidden;background:linear-gradient(105deg,rgba(7,29,41,.97) 0%,rgba(7,29,41,.82) 58%,rgba(7,29,41,.55) 100%),url('/img/hero-city.jpg') center/cover no-repeat;color:#fff;padding:clamp(72px,10vw,124px) 0}
        .na-breadcrumb{display:flex;gap:10px;align-items:center;margin-bottom:34px;color:#c5d2d9;font-size:13px}
        .na-breadcrumb a{color:inherit;text-decoration:none}.na-breadcrumb a:hover{color:var(--na-sand)}
        .na-eyebrow{margin:0 0 13px;color:var(--na-gold);font-size:11px;font-weight:850;letter-spacing:.17em;text-transform:uppercase}
        .na-hero .na-eyebrow{color:var(--na-sand)}
        .na-hero h1{max-width:850px;margin:0;color:#fff;font-size:clamp(42px,6.5vw,76px);font-weight:850;line-height:1.02;letter-spacing:-.045em}
        .na-hero h1 em{color:var(--na-sand);font-style:normal}
        .na-hero-copy{max-width:710px;margin:24px 0 0;color:#d7e1e6;font-size:clamp(16px,2vw,19px);line-height:1.8}
        .na-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
        .na-button{display:inline-flex;align-items:center;justify-content:center;min-height:49px;padding:0 22px;border:1px solid rgba(255,255,255,.45);border-radius:6px;text-decoration:none;font-size:13px;font-weight:800;transition:transform .2s ease,background .2s ease}
        .na-button:hover{transform:translateY(-2px)}
        .na-button-gold{background:var(--na-sand);border-color:var(--na-sand);color:var(--na-navy)}
        .na-button-outline{color:#fff;background:rgba(255,255,255,.04)}
        .na-intro{padding:clamp(58px,8vw,96px) 0}
        .na-intro-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(34px,6vw,76px);align-items:center}
        .na-photo-frame{position:relative;min-height:450px;overflow:hidden;border-radius:12px;background:#e9eff2}
        .na-photo-frame>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .na-photo-caption{position:absolute;left:18px;right:18px;bottom:18px;display:flex;flex-direction:column;gap:4px;padding:18px 20px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(7,29,41,.88);color:#fff}
        .na-photo-caption strong{font-size:15px}.na-photo-caption span{color:#c7d3da;font-size:12px}
        .na-intro-copy h2,.na-section-heading h2,.na-purpose h2,.na-approach h2,.na-cta h2{margin:0 0 18px;color:var(--na-navy);font-size:clamp(29px,4vw,45px);line-height:1.12;letter-spacing:-.03em}
        .na-intro-copy>p:not(.na-eyebrow){color:#536772;font-size:15px;line-height:1.8}
        .na-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px;padding-top:22px;border-top:1px solid #e0e7ea}
        .na-proof div{display:flex;flex-direction:column;gap:5px}.na-proof strong{color:var(--na-navy);font-size:18px}.na-proof span{color:#687b85;font-size:11px;line-height:1.45}
        .na-purpose{padding:clamp(52px,7vw,78px) 0;background:var(--na-navy);color:#fff}
        .na-purpose-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,80px)}
        .na-purpose .na-eyebrow{color:var(--na-sand)}
        .na-purpose h2{color:#fff;font-size:clamp(27px,3.5vw,38px)}
        .na-purpose article>p:last-child{max-width:510px;color:#c7d4db;line-height:1.8;font-size:14px}
        .na-values,.na-capabilities{padding:clamp(58px,8vw,92px) 0}
        .na-section-heading{max-width:720px;margin-bottom:34px}
        .na-section-heading>p:last-child{margin:0;color:#5c707a;line-height:1.75}
        .na-value-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .na-value-card{padding:25px 22px;border:1px solid #dce5e9;border-radius:10px;background:#fff;box-shadow:0 8px 22px rgba(7,29,41,.045)}
        .na-value-card>span{color:var(--na-gold);font-size:12px;font-weight:900;letter-spacing:.1em}
        .na-value-card h3{margin:20px 0 9px;color:var(--na-navy);font-size:20px}
        .na-value-card p{margin:0;color:#60737d;font-size:13px;line-height:1.7}
        .na-capabilities{background:#f3f6f7}
        .na-cap-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .na-cap-card{overflow:hidden;border:1px solid #dce5e9;border-radius:10px;background:#fff}
        .na-cap-image{aspect-ratio:16/9;overflow:hidden;background:#dce5e9}
        .na-cap-image img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
        .na-cap-card:hover .na-cap-image img{transform:scale(1.04)}
        .na-cap-body{padding:20px 21px 22px}
        .na-cap-body h3{margin:0 0 9px;color:var(--na-navy);font-size:18px;line-height:1.3}
        .na-cap-body p{margin:0;color:#60737d;font-size:13px;line-height:1.7}
        .na-cap-link{margin-top:26px}.na-cap-link a{color:#8b5c16;font-weight:850;text-decoration:none}.na-cap-link a:hover{text-decoration:underline}
        .na-approach{padding:clamp(58px,8vw,92px) 0}
        .na-approach-grid{display:grid;grid-template-columns:1fr .9fr;gap:clamp(30px,6vw,76px);align-items:center}
        .na-approach h2{font-size:clamp(29px,4vw,42px)}
        .na-approach p:not(.na-eyebrow){color:#566b76;font-size:14px;line-height:1.8}
        .na-approach ul{display:grid;gap:11px;margin:22px 0;padding-left:20px;color:#304954;font-size:14px;line-height:1.6}
        .na-approach li::marker{color:var(--na-gold)}
        .na-approach .na-small-note{padding:14px 16px;border-left:3px solid var(--na-gold);background:#f3f6f7;font-size:12px}
        .na-approach-image{width:100%;min-height:390px;height:100%;max-height:500px;object-fit:cover;border-radius:12px}
        .na-cta{padding:clamp(44px,6vw,66px) 0;background:var(--na-navy);color:#fff}
        .na-cta-inner{display:flex;align-items:center;justify-content:space-between;gap:28px}
        .na-cta .na-eyebrow{color:var(--na-sand)}
        .na-cta h2{max-width:690px;color:#fff;font-size:clamp(28px,4vw,40px)}
        .na-cta p:not(.na-eyebrow){max-width:700px;margin:0;color:#c8d5dc;line-height:1.7;font-size:14px}
        .na-cta .na-button{flex-shrink:0}
        .neas-about a:focus-visible{outline:3px solid var(--na-gold);outline-offset:4px}
        @media(max-width:900px){.na-intro-grid,.na-approach-grid{grid-template-columns:1fr 1fr;gap:28px}.na-value-grid{grid-template-columns:repeat(2,1fr)}.na-cap-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:650px){.na-wrap{width:min(100% - 28px,1160px)}.na-intro-grid,.na-purpose-grid,.na-approach-grid{grid-template-columns:1fr}.na-photo-frame{min-height:310px}.na-value-grid,.na-cap-grid{grid-template-columns:1fr}.na-proof{grid-template-columns:1fr;gap:13px}.na-approach-image{min-height:260px}.na-cta-inner{align-items:flex-start;flex-direction:column}}
        @media(prefers-reduced-motion:reduce){.na-button,.na-cap-image img{transition:none}.na-button:hover{transform:none}}
      `}</style>
    </div>
  );
}
