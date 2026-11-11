import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { homepageSeo } from "@/data/homeSeo";
import { SiteNotification } from "@/components/SiteNotification";
import { quoteNotificationCopy } from "@/components/siteNotificationCopy";

const STORE_URL = "https://neas-store-booking.vercel.app/#quote";

const services = [
  ["01", "Residential", "Rope-access cleaning, building maintenance, deep cleaning, gutter work, plumbing, electrical, and property-care support.", "rope"],
  ["02", "Commercial", "High-rise exterior upkeep, façade repairs, window cleaning, leak detection, resealing, and painting.", "commercial"],
  ["03", "Construction", "Industrial rigging, lifeline installation, structural additions, high-risk work support, and safety-net systems.", "wind"],
  ["04", "Industrial", "Confined-space access, plant care, tank cleaning, inspections, shutdown logistics, and technical maintenance.", "training"],
  ["05", "Telecom", "Tower climbing, antenna installation, cable rigging, line testing, safety inspections, and remote-site support.", "rope"],
  ["06", "Met Mast Tower", "Mast safety systems, component rigging, sensor checks, structural analysis, alignment, and maintenance.", "wind"],
  ["07", "PPE Supplies", "Fall-protection systems, harnesses, rope-access equipment, anchors, helmets, and protective gear.", "commercial"],
  ["08", "Training & Consultancy", "Work-at-height courses, rescue protocols, compliance guidance, risk assessments, and safety audits.", "training"],
] as const;

const people = [
  ["WC", "William Castaneda", "General Manager"],
  ["JG", "Junrey Granaderos", "Business Development / Sales & Marketing Manager"],
  ["JR", "Julius Romero", "Sales Consultant & HSE Manager"],
  ["JC", "John Eric Cagat", "Safety Consultant"],
] as const;

const equipment = [
  {
    category: "Rope Access PPE",
    name: "Full-Body Rope Access Harness",
    specification: "Professional fall-protection and rope-access configuration, selected for the intended work environment.",
    note: "Fit, certification, brand, and compatibility are confirmed by NEAS before supply.",
  },
  {
    category: "Head Protection",
    name: "Work-at-Height Safety Helmet",
    specification: "Protective headwear for rope-access, construction, industrial, telecom, and renewable-energy applications.",
    note: "Model, accessories, and applicable certification are confirmed before quotation.",
  },
  {
    category: "Access Systems",
    name: "Low-Stretch Access Rope",
    specification: "Rope-access equipment for controlled ascent, descent, positioning, and compatible access systems.",
    note: "Diameter, length, termination, and system compatibility are confirmed by NEAS.",
  },
  {
    category: "PPE Kits",
    name: "Rope Access Starter Kit",
    specification: "A coordinated quotation set for core rope-access PPE and connecting components.",
    note: "Final contents depend on role, task, site rules, and required certification.",
  },
  {
    category: "Installed Protection",
    name: "Lifeline & Anchor Systems",
    specification: "Fall-protection support for construction, commercial, wind, telecom, and industrial sites.",
    note: "Site assessment, design basis, installation scope, and inspection requirements are reviewed first.",
  },
] as const;

const resources = [
  ["What Is Rope Access", "Definition-stage rope access education", "https://www.nextedge-access-solutions.com/resources/what-is-rope-access/"],
  ["Work At Height Planning", "Scope preparation and risk-control questions", "https://www.nextedge-access-solutions.com/resources/work-at-height-planning/"],
  ["Rope Access Safety Guide", "Safety and buyer due diligence", "https://www.nextedge-access-solutions.com/resources/rope-access-safety-guide/"],
  ["Work At Height Rescue Planning", "Readiness for safety stakeholders", "https://www.nextedge-access-solutions.com/resources/work-at-height-rescue-planning/"],
] as const;

function QuoteForm() {
  const [sent, setSent] = useState(false);
  const [notification, setNotification] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);
  const submit = trpc.publicSite.submitContact.useMutation({
    onSuccess: () => {
      setSent(true);
      setNotification(quoteNotificationCopy.success);
    },
    onError: () => {
      setNotification(quoteNotificationCopy.error);
    },
  });

  return (
    <>
      {notification && <SiteNotification {...notification} onDismiss={() => setNotification(null)} />}
      {sent ? (
        <div className="rounded-2xl bg-white p-8 text-[#132b34]">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#b6ef3c]"><Check size={21} /></div>
          <h3 className="mt-5 text-2xl font-semibold">Enquiry received.</h3>
          <p className="mt-2 text-sm text-[#577078]">The NEAS team will review your project details and contact you shortly.</p>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            submit.mutate({
              formName: "homepage_quote",
              payload: {
                name: String(form.get("name") || ""),
                company: String(form.get("company") || ""),
                email: String(form.get("email") || ""),
                service: String(form.get("service") || ""),
                details: String(form.get("details") || ""),
              },
            });
          }}
          className="grid gap-4 rounded-2xl bg-white p-6 text-[#132b34] md:grid-cols-2 md:p-8"
        >
          <label className="text-sm font-semibold">Name<input name="name" required placeholder="Your full name" className="mt-2 w-full rounded-md border border-[#dce7e4] px-3 py-3 font-normal outline-none focus:border-[#78ad32] focus:ring-2 focus:ring-[#b6ef3c]/30" /></label>
          <label className="text-sm font-semibold">Company<input name="company" required placeholder="Company name" className="mt-2 w-full rounded-md border border-[#dce7e4] px-3 py-3 font-normal outline-none focus:border-[#78ad32] focus:ring-2 focus:ring-[#b6ef3c]/30" /></label>
          <label className="text-sm font-semibold">Email<input name="email" required type="email" placeholder="name@company.com" className="mt-2 w-full rounded-md border border-[#dce7e4] px-3 py-3 font-normal outline-none focus:border-[#78ad32] focus:ring-2 focus:ring-[#b6ef3c]/30" /></label>
          <label className="text-sm font-semibold">Service<select name="service" className="mt-2 w-full rounded-md border border-[#dce7e4] bg-white px-3 py-3 font-normal outline-none focus:border-[#78ad32] focus:ring-2 focus:ring-[#b6ef3c]/30"><option>Rope Access Services</option><option>Wind Turbine Services</option><option>Commercial Services</option><option>Training & Courses</option><option>PPE & Equipment</option></select></label>
          <label className="text-sm font-semibold md:col-span-2">Project details<textarea name="details" required rows={4} placeholder="Location, scope and preferred schedule" className="mt-2 w-full resize-none rounded-md border border-[#dce7e4] px-3 py-3 font-normal outline-none focus:border-[#78ad32] focus:ring-2 focus:ring-[#b6ef3c]/30" /></label>
          <button disabled={submit.isPending} className="inline-flex h-12 items-center justify-center gap-3 rounded-md bg-[#b6ef3c] px-6 font-semibold text-[#132b34] transition-transform active:scale-[.97] disabled:opacity-60 md:col-span-2 md:justify-self-start">{submit.isPending ? "Sending…" : "Send enquiry"}<ArrowUpRight size={18} /></button>
        </form>
      )}
    </>
  );
}

function TeamDropdown() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78ad32]">About Us <ChevronDown size={14} className="transition-transform group-open:rotate-180" /></summary>
      <div className="mt-2 rounded-lg border border-[#dce7e4] bg-white p-4 shadow-xl md:absolute md:left-1/2 md:w-80 md:-translate-x-1/2">
        <a href="#about" className="block rounded-md p-2 font-semibold hover:bg-[#f0f4f2]">About NEAS</a>
        <a href="#team" className="mt-1 flex items-center gap-2 rounded-md p-2 font-semibold hover:bg-[#f0f4f2]"><Users size={15} /> Our Team</a>
        <div className="mt-2 border-t border-[#e4ece9] pt-2">
          {people.map(([, name, role]) => <a key={name} href="#team" className="block rounded-md px-2 py-2 hover:bg-[#f0f4f2]"><span className="block text-xs font-semibold">{name}</span><span className="text-[11px] leading-4 text-[#667b80]">{role}</span></a>)}
        </div>
      </div>
    </details>
  );
}

function EquipmentCarousel() {
  const [index, setIndex] = useState(0);
  const item = equipment[index];
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + equipment.length) % equipment.length);

  return (
    <div className="mt-10 grid overflow-hidden rounded-xl border border-[#d8e3df] bg-white shadow-sm md:grid-cols-[.8fr_1.2fr]">
      <div className="grid min-h-72 place-items-center bg-[radial-gradient(circle_at_50%_40%,#d9f59f,#7fa536_60%,#153b43)] p-8 text-[#102f39]">
        <div className="text-center"><ShoppingBag className="mx-auto" size={58} strokeWidth={1.5} /><p className="mt-5 text-xs font-bold uppercase tracking-[.2em]">{item.category}</p></div>
      </div>
      <div className="flex min-h-72 flex-col justify-between p-7 md:p-10">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Company-profile equipment preview</p><h3 className="mt-4 text-3xl font-semibold">{item.name}</h3><p className="mt-5 text-base leading-7 text-[#587078]">{item.specification}</p><p className="mt-4 rounded-md bg-[#f0f4f2] p-4 text-sm leading-6 text-[#587078]">{item.note}</p></div>
        <div className="mt-7 flex items-center justify-between"><div className="flex gap-2" aria-label="Equipment slide selection">{equipment.map((product, dot) => <button key={product.name} onClick={() => setIndex(dot)} aria-label={`Show ${product.name}`} aria-current={dot === index} className={`h-2.5 rounded-full transition-all ${dot === index ? "w-8 bg-[#6b9631]" : "w-2.5 bg-[#c7d4cf]"}`} />)}</div><div className="flex gap-2"><button onClick={() => move(-1)} aria-label="Previous equipment item" className="grid h-10 w-10 place-items-center rounded-full border border-[#cbd9d4] hover:bg-[#f0f4f2]"><ChevronLeft size={18} /></button><button onClick={() => move(1)} aria-label="Next equipment item" className="grid h-10 w-10 place-items-center rounded-full bg-[#102f39] text-white hover:bg-[#1a4650]"><ChevronRight size={18} /></button></div></div>
      </div>
    </div>
  );
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const [projectCategory, setProjectCategory] = useState("All");
  const { data: projects = [] } = trpc.publicSite.projects.useQuery();
  const { data: managedNavigation = [] } = trpc.publicSite.navigation.useQuery();
  const { data: globals = [] } = trpc.publicSite.globals.useQuery();
  const { data: publishedPages = [] } = trpc.publicSite.pages.useQuery();
  const projectCategories = useMemo(() => ["All", ...Array.from(new Set(projects.map((project) => project.service)))], [projects]);
  const filteredProjects = projectCategory === "All" ? projects : projects.filter((project) => project.service === projectCategory);
  const navigation = managedNavigation.length ? managedNavigation : [
    { id: -1, label: "Home", href: "#top", displayOrder: 0, isVisible: true },
    { id: -2, label: "About Us", href: "#about", displayOrder: 1, isVisible: true },
    { id: -3, label: "Services", href: "#services", displayOrder: 2, isVisible: true },
    { id: -4, label: "Projects", href: "#projects", displayOrder: 3, isVisible: true },
    { id: -5, label: "Resources", href: "#resources", displayOrder: 4, isVisible: true },
    { id: -6, label: "Online Store", href: "#store", displayOrder: 5, isVisible: true },
  ];
  const announcement = globals.find((section) => section.name.toLowerCase() === "announcement")?.content || "Safe · Reliable · Professional";
  const footerNote = globals.find((section) => section.name.toLowerCase() === "footer")?.content || "Safety, precision, and dependable delivery.";
  const cmsHomeBlocks = useMemo(() => {
    const home = publishedPages.find((page) => page.slug === "home");
    if (!home) return [] as Array<{ id: string; type: string; content: { title?: string; body?: string; tone?: string; imageUrl?: string }; visible?: boolean }>;
    try { return JSON.parse(home.layout) as Array<{ id: string; type: string; content: { title?: string; body?: string; tone?: string; imageUrl?: string }; visible?: boolean }>; } catch { return []; }
  }, [publishedPages]);

  useEffect(() => {
    document.title = homepageSeo.title;
    const upsertMeta = (name: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    upsertMeta("description", homepageSeo.description);
    upsertMeta("keywords", homepageSeo.keywords.join(", "));
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#132b34]">
      <div className="bg-[#102f39] px-5 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#c7d5d5]"><div className="container flex items-center justify-between gap-4"><span>{announcement}</span><span className="hidden items-center gap-3 text-right sm:flex"><a href="tel:+639914265886" className="hover:text-white">Mob: +63 991 426 5886</a><span aria-hidden="true">·</span><a href="mailto:info.nextedgeaccesssolutions@gmail.com" className="hover:text-white">Email: info.nextedgeaccesssolutions@gmail.com</a><span aria-hidden="true">·</span><a href={STORE_URL} target="_blank" rel="noreferrer" className="hover:text-white">Website</a></span></div></div>
      <header className="sticky top-0 z-30 border-b border-[#dce7e4] bg-white/95 backdrop-blur">
        <div className="container flex h-[76px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3"><img src="/manus-storage/NEASPNG1.1_22de2ec7.png" alt="NextEdge Access Solutions logo" className="h-12 w-12 rounded-full object-cover" /><span className="text-sm font-bold tracking-[.12em]">NEXTEDGE<br /><span className="text-[10px] font-normal tracking-[.22em] text-[#667b80]">ACCESS SOLUTIONS.</span></span></Link>
          <button className="rounded p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}><Menu /></button>
          <nav className={`${open ? "absolute left-0 right-0 top-[76px] border-b border-[#dce7e4] bg-white p-5" : "hidden"} md:static md:block`} aria-label="Main navigation">
            <div className="flex flex-col gap-4 text-sm font-medium md:flex-row md:items-center md:gap-5">{navigation.map((item) => item.label.toLowerCase() === "about us" ? <TeamDropdown key={item.id} /> : <a key={item.id} href={item.href}>{item.label}</a>)}<a href={STORE_URL} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#b6ef3c] px-4 py-2 font-semibold">Request a Quote <ArrowUpRight size={15} /></a></div>
          </nav>
        </div>
      </header>
      <main id="top">
        <section className="relative overflow-hidden bg-[#102f39] text-white"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(182,239,60,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(182,239,60,.12) 1px,transparent 1px)", backgroundSize: "48px 48px" }} /><div className="container relative grid min-h-[620px] items-center gap-12 py-24 md:grid-cols-[1.2fr_.8fr] md:py-32"><div><p className="mb-6 text-xs font-bold uppercase tracking-[.25em] text-[#b6ef3c]">NextEdge Access Solutions · Philippines</p><h1 className="max-w-3xl text-5xl font-medium leading-[.98] tracking-[-.04em] md:text-7xl">Height is not a limit.<br /><span className="text-[#b6ef3c]">It is our expertise.</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#c7d5d5]">Next-generation rope access, inspection, maintenance, training, and equipment solutions for complex work at height.</p><div className="mt-9 flex flex-wrap gap-3"><a href="#contact" className="icon-shift inline-flex h-12 items-center gap-3 rounded-md bg-[#b6ef3c] px-6 font-semibold text-[#102f39]">Discuss your project <ArrowUpRight size={18} /></a><a href="#services" className="icon-shift inline-flex h-12 items-center gap-3 rounded-md border border-[#5e7a7d] px-6 font-semibold text-white">Explore services <ChevronRight size={18} /></a></div></div><div className="relative mx-auto w-full max-w-sm"><div className="aspect-square rounded-full border border-[#89a5a1]/40 bg-[radial-gradient(circle_at_50%_50%,#325961,#102f39_68%)] p-8"><div className="grid h-full place-items-center rounded-full border border-[#b6ef3c]/30"><div className="text-center"><ShieldCheck className="mx-auto mb-5 text-[#b6ef3c]" size={63} /><p className="text-5xl font-semibold">20<span className="text-[#b6ef3c]">+</span></p><p className="mt-2 max-w-[130px] text-xs leading-5 text-[#b9cbcb]">years of combined local and international experience</p></div></div></div></div></div><div className="container relative grid grid-cols-2 border-t border-[#41636a] py-5 text-[10px] font-semibold uppercase tracking-[.25em] text-[#9bb1b2] sm:grid-cols-4"><span>Residential</span><span>Commercial & Construction</span><span>Telecom & Wind Energy</span><span>Industrial</span></div></section>
        {cmsHomeBlocks.some((block) => block.visible !== false) && <section aria-label="CMS published homepage content" className="border-b border-[#dce7e4] bg-white py-16"><div className="container grid gap-4 md:grid-cols-2">{cmsHomeBlocks.filter((block) => block.visible !== false).map((block) => <article key={block.id} className={`overflow-hidden rounded-xl ${block.content.tone === "deep" ? "bg-[#102f39] text-white" : block.content.tone === "mint" ? "bg-[#e8f4e9]" : "border border-[#dce7e4] bg-white"}`}>{block.content.imageUrl && <img src={block.content.imageUrl} alt="" className="h-56 w-full object-cover" />}<div className="p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#6b9631]">{block.type}</p><h2 className="mt-3 text-3xl font-semibold">{block.content.title}</h2>{block.content.body && <p className="mt-4 leading-7 opacity-80">{block.content.body}</p>}</div></article>)}</div></section>}
        <section id="about" className="container grid gap-12 py-24 md:grid-cols-2 md:py-32"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">About us</p><h2 className="mt-5 max-w-lg text-4xl font-medium leading-tight tracking-[-.035em] md:text-6xl">Access solutions engineered around <span className="text-[#6b9631]">your operation.</span></h2></div><div className="flex flex-col justify-center"><p className="max-w-xl text-lg leading-8 text-[#587078]">From high-rise façades to wind, telecom, construction, and industrial assets, NEAS brings together experienced professionals, efficient access methods, and dependable project delivery.</p><a href="#team" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#243f48]">Meet the team <ArrowUpRight size={17} /></a></div></section>
        <section id="team" className="bg-[#f0f4f2] py-24"><div className="container"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Our team · 2026 company profile</p><h2 className="mt-5 max-w-2xl text-4xl font-medium leading-tight tracking-[-.035em] md:text-6xl">People who understand the work—and what it takes to deliver.</h2><div className="mt-14 grid gap-4 md:grid-cols-4">{people.map(([initials, name, role]) => <article key={name} className="hover-lift border-t-2 border-[#b6ef3c] pt-5"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#102f39] font-semibold text-[#b6ef3c]">{initials}</div><h3 className="mt-5 text-xl font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-[#668087]">{role}</p></article>)}</div></div></section>
        <section id="services" className="container py-24 md:py-32"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Official service portfolio</p><h2 className="mt-5 text-4xl font-medium tracking-[-.035em] md:text-6xl">Specialized services for<br /><span className="text-[#6b9631]">high-risk environments.</span></h2></div><a href="https://www.nextedge-access-solutions.com/services/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold">View detailed service scopes <ArrowUpRight size={17} /></a></div><div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{services.map(([no, title, text, tone]) => <article key={title} className="group hover-lift hover-glow overflow-hidden rounded-md border border-[#dce7e4] bg-white"><div className={`flex h-36 items-end justify-between p-5 ${tone === "rope" ? "bg-[linear-gradient(135deg,#1a4650,#102f39)]" : tone === "wind" ? "bg-[linear-gradient(135deg,#587c72,#1a454c)]" : tone === "commercial" ? "bg-[linear-gradient(135deg,#dce8df,#93b2a1)]" : "bg-[linear-gradient(135deg,#b6ef3c,#6b9631)]"}`}><span className="text-5xl font-semibold text-white/80">{no}</span><ArrowUpRight className="text-white transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></div><div className="p-5"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#668087]">{text}</p><a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Discuss this service <ChevronRight size={15} /></a></div></article>)}</div></section>
        <section id="projects" className="bg-[#102f39] py-24 text-white"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b6ef3c]">Recent projects</p><h2 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-.035em] md:text-6xl">Experience without borders.</h2></div><p className="max-w-md text-lg leading-8 text-[#c7d5d5]">Verified work published by the NEAS team, from local operations to projects abroad.</p></div>{projects.length > 0 && <div className="mt-9 flex flex-wrap gap-2" aria-label="Filter projects by service category">{projectCategories.map((category) => <button key={category} onClick={() => setProjectCategory(category)} aria-pressed={projectCategory === category} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${projectCategory === category ? "border-[#b6ef3c] bg-[#b6ef3c] text-[#102f39]" : "border-[#55757b] text-[#c7d5d5] hover:border-[#b6ef3c] hover:text-white"}`}>{category}</button>)}</div>}{filteredProjects.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{filteredProjects.map((project) => <article key={project.id} className="hover-lift overflow-hidden rounded-md border border-[#41636a] bg-[#163d47]"><div className="flex h-36 items-end justify-between bg-[linear-gradient(135deg,#1a4650,#6b9631)] p-5"><span className="text-4xl font-semibold text-white/80">{String(project.displayOrder + 1).padStart(2, "0")}</span><span className="text-xs font-bold uppercase tracking-[.15em] text-[#d7f3a8]">{project.service}</span></div><div className="p-5"><h3 className="text-xl font-semibold">{project.title}</h3><p className="mt-2 text-xs font-semibold uppercase tracking-[.14em] text-[#b6ef3c]">{project.location}</p><p className="mt-4 text-sm leading-6 text-[#c7d5d5]">{project.summary}</p></div></article>)}</div> : <div className="mt-10 rounded-md border border-dashed border-[#5e7a7d] p-8 text-sm text-[#c7d5d5]">{projects.length ? "No published projects match this category." : "Recent projects will appear here after authorized staff publish them from the CMS."}</div>}</div></section>
        <section id="courses" className="container grid gap-10 py-24 md:grid-cols-2 md:py-32"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Training & consultancy</p><h2 className="mt-5 text-4xl font-medium tracking-[-.035em] md:text-6xl">Build capability.<br /><span className="text-[#6b9631]">Strengthen safety.</span></h2></div><div className="flex flex-col justify-center"><p className="text-lg leading-8 text-[#587078]">Professional learning for rope access, work at height, rescue, PPE inspection, telecom, and Met Mast operations.</p><a href="#contact" className="mt-8 inline-flex items-center gap-2 font-semibold">Course enquiries <ArrowUpRight size={17} /></a></div></section>
        <section id="resources" className="bg-[#f0f4f2] py-24"><div className="container"><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-end"><div className="overflow-hidden rounded-md"><img src="/manus-storage/rope-access-detail_4367e3dd.png" alt="Rope access technician working at height" className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105" /></div><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Resource hub</p><h2 className="mt-4 text-4xl font-medium md:text-5xl">Resources for safer access planning conversations.</h2></div><a href="https://www.nextedge-access-solutions.com/resources/" target="_blank" rel="noreferrer" className="icon-shift inline-flex items-center gap-2 font-semibold">Browse all resources <ArrowUpRight size={17} /></a></div></div><div className="mt-10 grid gap-4 md:grid-cols-4">{resources.map(([title, summary, href]) => <a key={title} href={href} target="_blank" rel="noreferrer" className="hover-lift rounded-md border border-[#dce7e4] bg-white p-5"><span className="text-xs font-bold uppercase tracking-[.16em] text-[#6b9631]">Planning</span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#668087]">{summary}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Read guide <ChevronRight size={15} /></span></a>)}</div></div></section>
        <section id="store" className="border-y border-[#dce7e4] bg-[#f0f4f2] py-24"><div className="container"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#6b9631]">Online store</p><h2 className="mt-4 max-w-3xl text-4xl font-medium md:text-5xl">Equipment and access support, booked in one place.</h2><p className="mt-4 max-w-2xl text-lg leading-8 text-[#587078]">Request approved rope-access PPE, schedule a site service, or arrange a browser voice/video meeting with the NEAS team.</p></div><a href={STORE_URL} target="_blank" rel="noreferrer" className="icon-shift inline-flex items-center gap-2 rounded-md bg-[#b6ef3c] px-5 py-3 font-semibold text-[#132b34]">Open Store & Booking <ArrowUpRight size={17} /></a></div><EquipmentCarousel /><p className="mt-4 text-xs leading-5 text-[#668087]">Preview data is derived from the 2026 NEAS Company Profile. Product brand, stock, certification, technical specification, and suitability are confirmed by NEAS during quotation.</p></div></section>
        <section id="contact" className="bg-[#163d47] py-24 text-white"><div className="container grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b6ef3c]">Let’s work safely at height</p><h2 className="mt-5 text-4xl font-medium leading-tight md:text-6xl">Tell us what your project needs.</h2><p className="mt-6 max-w-md leading-7 text-[#c7d5d5]">Share your site, scope, and target schedule. Your enquiry will appear directly in the protected NEAS admin workspace.</p></div><QuoteForm /></div></section>
      </main>
      <footer className="bg-[#102f39] py-12 text-[#c7d5d5]"><div className="container grid gap-10 text-sm md:grid-cols-4"><div><div className="flex items-center gap-3 text-white"><img src="/manus-storage/NEASPNG1.1_22de2ec7.png" alt="NextEdge Access Solutions logo" className="h-[50px] w-[50px] rounded-full object-cover" /><span className="font-bold tracking-[.12em]">NextEdge Access Solutions.</span></div><p className="mt-5 text-xs leading-6 text-[#9bb1b2]">NEW ENERGY. ELEVATED ACCESS.</p></div><div><h3 className="font-semibold text-white">Services</h3><div className="mt-4 space-y-2 text-[#9bb1b2]"><p>Rope Access</p><p>Wind Turbine Maintenance</p><p>Telecom Tower Services</p><p>Commercial Services</p></div></div><div><h3 className="font-semibold text-white">Company</h3><div className="mt-4 space-y-2 text-[#9bb1b2]"><a href="#about" className="block">About NEAS</a><a href="#team" className="block">Our Team</a><a href="#courses" className="block">Safety Standards</a><Link href="/admin" className="block">Admin Portal</Link></div></div><div><h3 className="font-semibold text-white">Contact office</h3><p className="mt-4 leading-6 text-[#9bb1b2]">Bulacan Office<br />Marilao, Bulacan, Philippines<br /><br /><a href="tel:+639914265886" className="hover:text-white">+63 991 426 5886</a><br /><a href="mailto:info.nextedgeaccesssolutions@gmail.com" className="hover:text-white">info.nextedgeaccesssolutions@gmail.com</a><br /><a href={STORE_URL} target="_blank" rel="noreferrer" className="hover:text-white">Website</a></p></div></div><div className="container mt-10 border-t border-[#41636a] pt-6 text-xs text-[#789496]">© 2026 NextEdge Access Solutions. {footerNote}</div></footer>
      <a href={STORE_URL} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#b6ef3c] px-5 py-3 text-sm font-bold text-[#102f39] shadow-[0_14px_35px_rgba(8,35,43,.32)] transition hover:-translate-y-1 hover:bg-[#c4f45c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b6ef3c]/40" aria-label="Request a quote through the NEAS Store and Booking site"><ShoppingBag size={18} /> Request a Quote <ArrowUpRight size={16} /></a>
    </div>
  );
}
