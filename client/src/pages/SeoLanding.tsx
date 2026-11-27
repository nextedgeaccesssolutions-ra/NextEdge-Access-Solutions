import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ArrowUpRight, CheckCircle2, MapPin, Phone } from "lucide-react";

const SITE = "https://www.nextedge-access-solutions.com";
const PHONE = "+63 991 426 5886";
const ADDRESS = "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato, Marilao, Bulacan 3019, Philippines";

type Landing = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  intro: string;
  audience: string[];
  scope: string[];
  considerations: string[];
  faqs: { q: string; a: string }[];
};

const pages: Landing[] = [
  {
    slug: "rope-access-facade",
    title: "Rope Access & Façade Services",
    metaTitle: "Rope Access & Façade Services | NEAS Philippines",
    description: "Explore NEAS rope access and façade maintenance services in the Philippines, including inspection, cleaning, repairs and sealant application.",
    intro: "NEAS supports building owners, property managers and contractors with access solutions for elevated and difficult-to-reach work. Rope access can provide a practical alternative to larger access systems when the site assessment, task and rescue arrangements support its use.",
    audience: ["Commercial property owners and facility managers", "Building maintenance and construction contractors", "Industrial sites with elevated structures"],
    scope: ["Façade visual inspection and condition reporting", "Exterior cleaning and high-level maintenance", "Sealant application, resealing and leak investigation support", "Painting, minor repairs and installation support", "Work-at-height planning and access coordination"],
    considerations: ["Site access, anchor suitability and edge protection", "Weather limits, exclusion zones and public protection", "Task-specific risk assessment and rescue planning", "Material compatibility and manufacturer application requirements"],
    faqs: [
      { q: "What types of buildings can use rope access?", a: "Rope access may suit high-rise, commercial and industrial structures where a documented assessment confirms safe access, suitable systems and an effective rescue plan." },
      { q: "Can NEAS support façade sealant work?", a: "NEAS can discuss façade sealant application, resealing and related elevated maintenance scopes. Final methods and materials are confirmed after reviewing the building and project requirements." }
    ]
  },
  {
    slug: "wind-turbine-maintenance",
    title: "Wind Turbine Inspection & Maintenance",
    metaTitle: "Wind Turbine Maintenance & Inspection | NEAS",
    description: "NEAS supports wind energy projects with rope access inspection, blade maintenance coordination and work-at-height services for renewable assets.",
    intro: "Wind assets require disciplined access planning, task coordination and clear safety controls. NEAS supports renewable-energy operators and project teams with rope-access capability and maintenance support discussions for wind turbine environments.",
    audience: ["Wind farm owners and operators", "Renewable-energy EPC and O&M contractors", "Blade, inspection and specialist maintenance providers"],
    scope: ["Rope-access support for elevated inspection tasks", "Blade and external component maintenance support", "Work-at-height access planning and rescue readiness", "Project mobilisation and site coordination", "Met mast and renewable asset access support"],
    considerations: ["Turbine isolation and site permit requirements", "Wind speed, weather and OEM operating limits", "Technician competency and task-specific authorisations", "Rescue arrangements, equipment compatibility and reporting"],
    faqs: [
      { q: "Does NEAS work with wind energy projects?", a: "NEAS offers wind-energy and work-at-height service discussions for renewable projects. Scope, location, personnel requirements and competency evidence are reviewed before mobilisation." },
      { q: "Can turbine work be planned around an outage?", a: "Project planning can be coordinated around the operator's approved outage, access window and permit-to-work process, subject to availability and agreed scope." }
    ]
  },
  {
    slug: "ndt-industrial-inspection",
    title: "NDT & Industrial Inspection Support",
    metaTitle: "NDT & Industrial Inspection Support | NEAS",
    description: "Discuss rope-access inspection and industrial maintenance support for offshore, onshore, marine and plant environments with NEAS Philippines.",
    intro: "Industrial inspection needs safe access, defined inspection criteria and traceable reporting. NEAS supports discussions for rope-access inspection and maintenance scopes across industrial, marine, offshore and onshore environments.",
    audience: ["Plant owners and maintenance departments", "Offshore, onshore and marine operators", "Inspection companies and shutdown contractors"],
    scope: ["Visual inspection access support", "Rope-access support for NDT work packages", "Tank, structural and plant access coordination", "Shutdown and maintenance mobilisation support", "Inspection planning and work-at-height controls"],
    considerations: ["Inspection method, acceptance criteria and qualified personnel", "Permit-to-work, isolation and confined-space controls", "Dropped-object prevention and simultaneous operations", "Inspection records, findings and client reporting requirements"],
    faqs: [
      { q: "Can inspection be performed using rope access?", a: "Rope access may provide access for suitable inspection tasks. The inspection method, personnel qualifications, equipment and site controls must be agreed before work begins." },
      { q: "Does NEAS support offshore and onshore scopes?", a: "NEAS can review offshore, onshore, marine and industrial requirements and confirm whether the requested scope matches its available capability and mobilisation arrangements." }
    ]
  },
  {
    slug: "met-mast-telecom",
    title: "Met Mast & Telecommunications Tower Services",
    metaTitle: "Met Mast & Telecom Tower Services | NEAS",
    description: "NEAS provides project support for met mast access, tower maintenance, antenna works and telecommunications infrastructure at height.",
    intro: "Telecommunications and meteorological mast assets require controlled access, equipment handling and coordination with site operators. NEAS supports tower and met mast work packages with a focus on planning, safe execution and clear project communication.",
    audience: ["Telecom operators and tower companies", "Wind resource and met mast developers", "EPC, survey and infrastructure contractors"],
    scope: ["Tower access and elevated maintenance support", "Antenna, cable and equipment installation coordination", "Met mast erection and maintenance support", "Sensor and instrument access assistance", "Inspection, rigging and work-at-height planning"],
    considerations: ["RF exposure controls and site owner permissions", "Structural loading and approved lifting/rigging plans", "Electrical isolation and equipment handling", "Weather, rescue and dropped-object controls"],
    faqs: [
      { q: "Can NEAS support met mast projects?", a: "NEAS can review met mast installation, access and maintenance requirements, including project location, equipment, design information and mobilisation needs." },
      { q: "Does tower work require site coordination?", a: "Yes. Access permissions, RF safety, isolation, structural limits, rescue arrangements and the operator's permit-to-work process must be established before mobilisation." }
    ]
  },
  {
    slug: "training-consultancy",
    title: "Work-at-Height Training & Safety Consultancy",
    metaTitle: "Work at Height Training & Consultancy | NEAS",
    description: "Explore NEAS work-at-height, rope access, rescue planning, PPE inspection and safety consultancy services in the Philippines.",
    intro: "Competence and preparation are essential for work at height. NEAS supports organisations seeking practical training and consultancy discussions covering access methods, rescue readiness, equipment and site safety requirements.",
    audience: ["Employers managing work-at-height activities", "HSE and operations teams", "Contractors developing rescue and access procedures"],
    scope: ["Work-at-height training enquiries", "Rope-access and rescue capability discussions", "Risk assessment and method statement support", "PPE inspection programme consultancy", "Safety audits and operational readiness reviews"],
    considerations: ["Course objectives and applicable training standards", "Trainer and assessor credentials for the requested programme", "Learner prerequisites and practical facilities", "Employer-specific procedures and local regulatory requirements"],
    faqs: [
      { q: "Can NEAS discuss customised training?", a: "Yes. Training enquiries can be reviewed against the learner group, work environment, learning objectives and required standard before a programme is proposed." },
      { q: "Can NEAS help review rescue arrangements?", a: "NEAS can discuss rescue planning and work-at-height safety requirements. Any formal assessment or approval must be aligned with the applicable competent-person and regulatory requirements." }
    ]
  },
  {
    slug: "ppe-supply",
    title: "Rope Access & Work-at-Height PPE Supply",
    metaTitle: "Rope Access PPE & Safety Equipment | NEAS",
    description: "Request rope access PPE, fall protection equipment, harnesses, ropes, connectors and work-at-height equipment quotations from NEAS.",
    intro: "Selecting equipment requires more than choosing a product. Compatibility, certification, intended use, user fit and inspection history all matter. NEAS helps clients discuss equipment requirements and quotation options for work-at-height operations.",
    audience: ["Rope access and industrial contractors", "HSE, procurement and maintenance teams", "Training providers and equipment resellers"],
    scope: ["Harnesses, helmets and fall-protection equipment", "Ropes, connectors, descenders and ascenders", "Anchors, lifeline and access-system components", "PPE inspection and equipment lifecycle discussions", "Equipment quotation and supply coordination"],
    considerations: ["Applicable standards and manufacturer documentation", "System compatibility and intended application", "User fit, training and inspection requirements", "Stock availability, lead times and product traceability"],
    faqs: [
      { q: "Can NEAS quote for rope access equipment?", a: "Yes. Share the required product type, specification, quantity, delivery location and preferred brand so the team can confirm availability and prepare a quotation." },
      { q: "How should PPE suitability be confirmed?", a: "Equipment must be selected against the task, applicable standards, manufacturer instructions, system compatibility and the user's competence. Seek competent technical advice where required." }
    ]
  }
];

function upsertMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, name);
    document.head.appendChild(node);
  }
  node.content = content;
}

function SeoHead({ title, description, canonical, schema }: { title: string; description: string; canonical: string; schema: Record<string, unknown> }) {
  useEffect(() => {
    document.title = title;
    upsertMeta("description", description);
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", canonical, "property");
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
    let script = document.getElementById("neas-page-schema") as HTMLScriptElement | null;
    if (!script) { script = document.createElement("script"); script.id = "neas-page-schema"; script.type = "application/ld+json"; document.head.appendChild(script); }
    script.textContent = JSON.stringify(schema);
    return () => { script?.remove(); };
  }, [title, description, canonical, schema]);
  return null;
}

function PageShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f6f8f6] text-[#173b3f]">
    <header className="bg-[#102f39] px-5 py-5 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a href="/" className="font-bold tracking-wide">NEXTEDGE ACCESS SOLUTIONS</a>
        <a href="/#contact" className="rounded-md bg-[#b6ef3c] px-4 py-2 text-sm font-bold text-[#102f39]">Request a quote</a>
      </div>
    </header>
    <section className="bg-[#163d47] px-5 py-16 text-white md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#b6ef3c]">Safe · Reliable · Professional</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d4e0de]">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/#contact" className="inline-flex items-center gap-2 rounded-md bg-[#b6ef3c] px-5 py-3 font-semibold text-[#102f39]">Discuss your project <ArrowUpRight size={17}/></a>
          <a href="tel:+639914265886" className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-3 font-semibold"><Phone size={17}/> {PHONE}</a>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-6xl px-5 py-14">{children}</div>
    <footer className="bg-[#102f39] px-5 py-10 text-sm text-[#d4e0de]">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 md:flex-row">
        <div><strong className="text-white">NextEdge Access Solutions (NEAS) OPC</strong><p className="mt-2">Marilao, Bulacan, Philippines</p></div>
        <nav className="flex flex-wrap gap-4"><a href="/">Home</a><a href="/#services">Services</a><a href="/#contact">Contact</a><a href="https://www.facebook.com/NextEdgeAccessSolutions/" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.linkedin.com/company/nextedge-access-solutions-neas/" target="_blank" rel="noreferrer">LinkedIn</a></nav>
      </div>
    </footer>
  </main>;
}

function ServicePage({ page }: { page: Landing }) {
  const canonical = `${SITE}/services/${page.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE}/#organization`, name: "NextEdge Access Solutions (NEAS) OPC", url: SITE, telephone: PHONE, email: "info.nextedgeaccesssolutions@gmail.com", address: { "@type": "PostalAddress", streetAddress: "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato", addressLocality: "Marilao", addressRegion: "Bulacan", postalCode: "3019", addressCountry: "PH" } },
      { "@type": "Service", name: page.title, description: page.description, provider: { "@id": `${SITE}/#organization` }, areaServed: { "@type": "Country", name: "Philippines" }, url: canonical }
    ]
  };
  return <>
    <SeoHead title={page.metaTitle} description={page.description} canonical={canonical} schema={schema}/>
    <PageShell title={page.title} description={page.intro}>
      <section className="grid gap-10 md:grid-cols-[1.2fr_.8fr]">
        <div>
          <h2 className="text-3xl font-semibold">Service scope</h2>
          <p className="mt-4 leading-8 text-[#587078]">Every project begins with a review of the site, work scope, access requirements and client procedures. The final method, personnel and deliverables are confirmed before mobilisation.</p>
          <ul className="mt-6 space-y-3">{page.scope.map(item=><li key={item} className="flex gap-3"><CheckCircle2 className="mt-1 shrink-0 text-[#6b9631]" size={19}/><span>{item}</span></li>)}</ul>
          <h2 className="mt-12 text-2xl font-semibold">Who we support</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-[#587078]">{page.audience.map(item=><li key={item}>{item}</li>)}</ul>
        </div>
        <aside className="h-fit rounded-xl border border-[#dce6e1] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Planning considerations</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#587078]">{page.considerations.map(item=><li key={item}>• {item}</li>)}</ul>
          <a href="/#contact" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#315d43]">Request a project review <ArrowUpRight size={16}/></a>
        </aside>
      </section>
      <section className="mt-14 border-t border-[#dce6e1] pt-10">
        <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">{page.faqs.map(f=><article key={f.q} className="rounded-lg bg-white p-6"><h3 className="font-semibold">{f.q}</h3><p className="mt-3 text-sm leading-7 text-[#587078]">{f.a}</p></article>)}</div>
      </section>
      <section className="mt-14 rounded-xl bg-[#e8f1ee] p-7 md:p-10">
        <h2 className="text-2xl font-semibold">Discuss your {page.title.toLowerCase()} requirements</h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#587078]">Send NEAS your project location, scope, site conditions and target schedule. The team can review the information and confirm the appropriate next steps.</p>
        <a href="/#contact" className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#163d47] px-5 py-3 font-semibold text-white">Contact NEAS <ArrowUpRight size={17}/></a>
      </section>
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Explore related NEAS services</h2>
        <div className="mt-4 flex flex-wrap gap-3">{pages.filter(p=>p.slug!==page.slug).map(p=><Link key={p.slug} href={`/services/${p.slug}`} className="rounded-full border border-[#cbdad4] bg-white px-4 py-2 text-sm hover:border-[#6b9631]">{p.title}</Link>)}</div>
      </section>
    </PageShell>
  </>;
}

function MarilaoLocationPage() {
  const canonical = `${SITE}/locations/marilao-bulacan`;
  const title = "Rope Access & Industrial Services in Marilao, Bulacan";
  const description = "Contact NextEdge Access Solutions (NEAS) OPC in Marilao, Bulacan for rope access, façade maintenance, industrial inspection, telecom, wind energy, training and PPE enquiries.";
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE}/#localbusiness`,
    name: "NextEdge Access Solutions (NEAS) OPC",
    url: SITE,
    telephone: PHONE,
    email: "info.nextedgeaccesssolutions@gmail.com",
    address: { "@type": "PostalAddress", streetAddress: "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato", addressLocality: "Marilao", addressRegion: "Bulacan", postalCode: "3019", addressCountry: "PH" },
    areaServed: [{ "@type": "City", name: "Marilao" }, { "@type": "AdministrativeArea", name: "Bulacan" }, { "@type": "Country", name: "Philippines" }],
    sameAs: ["https://www.facebook.com/NextEdgeAccessSolutions/","https://www.instagram.com/nextedgeaccesssolutions.neas/","https://www.linkedin.com/company/nextedge-access-solutions-neas/"]
  };
  return <>
    <SeoHead title="NEAS Marilao Bulacan | Rope Access & Industrial Services" description={description} canonical={canonical} schema={schema}/>
    <PageShell title={title} description={description}>
      <div className="grid gap-10 md:grid-cols-[1.1fr_.9fr]">
        <section>
          <h2 className="text-3xl font-semibold">Your NEAS contact point in Marilao</h2>
          <p className="mt-5 leading-8 text-[#587078]">NextEdge Access Solutions (NEAS) OPC is based at Marilao Grand Villas, Barangay Loma de Gato, Marilao, Bulacan. The team receives enquiries for specialist access, maintenance, inspection, renewable-energy, telecommunications, training and work-at-height equipment requirements.</p>
          <h3 className="mt-8 text-xl font-semibold">Services available for project discussion</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{pages.map(p=><Link key={p.slug} href={`/services/${p.slug}`} className="rounded-lg border border-[#dce6e1] bg-white p-4 font-medium hover:border-[#6b9631]">{p.title}<span className="mt-1 block text-sm font-normal text-[#6b7f7b]">View service details →</span></Link>)}</div>
        </section>
        <aside className="h-fit rounded-xl bg-white p-7 shadow-sm ring-1 ring-[#dce6e1]">
          <div className="flex gap-3"><MapPin className="text-[#6b9631]" size={22}/><div><h3 className="font-semibold">NEAS Bulacan Office</h3><p className="mt-2 leading-7 text-[#587078]">{ADDRESS}</p></div></div>
          <div className="mt-6 flex gap-3"><Phone className="text-[#6b9631]" size={21}/><div><h3 className="font-semibold">Call the team</h3><a className="mt-1 block text-[#315d43]" href="tel:+639914265886">{PHONE}</a></div></div>
          <a className="mt-7 inline-flex w-full items-center justify-center rounded-md bg-[#163d47] px-5 py-3 font-semibold text-white" href="https://www.google.com/maps/search/?api=1&query=B%2015%20Lot%206%20Marilao%20Grand%20Villas%20Marilao%20Bulacan%203019%20Philippines" target="_blank" rel="noreferrer">Open location in Google Maps <ArrowUpRight size={16}/></a>
        </aside>
      </div>
      <section className="mt-14 rounded-xl bg-[#e8f1ee] p-8"><h2 className="text-2xl font-semibold">Request a site or service discussion</h2><p className="mt-3 leading-7 text-[#587078]">Include your project location, service required, approximate quantities, access constraints and preferred schedule so the NEAS team can assess your enquiry.</p><a href="/#contact" className="mt-5 inline-flex rounded-md bg-[#b6ef3c] px-5 py-3 font-semibold text-[#102f39]">Send an enquiry</a></section>
    </PageShell>
  </>;
}

export default function SeoLanding() {
  const [isLocation, locationParams] = useRoute("/locations/:slug");
  const [isService, serviceParams] = useRoute("/services/:slug");
  if (isLocation && locationParams?.slug === "marilao-bulacan") return <MarilaoLocationPage/>;
  if (isService) {
    const page = pages.find(item => item.slug === serviceParams?.slug);
    if (page) return <ServicePage page={page}/>;
  }
  return <PageShell title="Page not found" description="The requested NEAS service page could not be found."><a href="/" className="font-semibold underline">Return to NEAS homepage</a></PageShell>;
}
