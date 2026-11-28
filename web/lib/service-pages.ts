/**
 * Content for the standalone service landing pages at /services/<id>.
 *
 * Every fact here comes from the NEAS company profile (services, credentials,
 * projects, partners, testimonials). Do not add prices, figures, clients or
 * certifications that the profile does not state: these pages are indexed by
 * search engines and quoted by AI search, so an invented claim spreads.
 *
 * The ids match SERVICE_META in lib/services.ts, so homepage share links
 * (/?service=<id>) and these pages describe the same six services.
 */
import { SERVICE_META } from "./services";

export type ServicePage = {
  id: string;
  image?: string;
  /** Page <title> and H1: leads with the search phrase buyers use. */
  title: string;
  h1: string;
  /** ~150 characters, shown in Google results. */
  metaDescription: string;
  eyebrow: string;
  intro: string;
  /** What NEAS does under this service, from the company profile. */
  scope: string[];
  /** Who typically buys it. */
  industries: string[];
  /** Project experience relevant to this service. */
  experience: string[];
  testimonial?: { quote: string; author: string };
  faqs: { q: string; a: string }[];
  /** Pre-filled in the quote form's service field and the email subject. */
  enquiryLabel: string;
};

const CREDENTIALS =
  "NEAS holds IRATA certification (No. 2/2322), with ARAA and SRAA rope access certification and OPITO offshore certification. Individual technicians hold IRATA, OPITO BOSIET, first aid, COSH/BOSH and IOSH certificates.";

const PRICING_ANSWER =
  "Pricing depends on the scope, location, access method and duration of the work. Send the project details through the form on this page or call (+63) 991 426 5886, and the team will prepare a quotation.";

export const SERVICE_PAGES: ServicePage[] = [
  {
    id: "rope-access",
    title: "Rope Access & Facade Services Philippines | IRATA Certified | NEAS",
    h1: "Rope Access & Facade Services in the Philippines",
    metaDescription:
      "IRATA-certified rope access for high-rise facades: window cleaning, resealing, glass and ACP installation, leak testing, repainting and facade audits. Get a quote.",
    eyebrow: "IRATA No. 2/2322 · Facade & building works at height",
    intro:
      "Rope access lets IRATA-certified technicians reach any part of a building facade without scaffolding, gondolas or cranes. Work starts faster, costs less to set up, and causes little disruption to the people using the building.",
    scope: [
      "Window cleaning and glass buffing",
      "Facade audit, inspection and cleaning",
      "Resealing, waterproofing and AAMA leak testing",
      "Glass, frame and ACP (aluminium composite panel) installation",
      "Repainting and protective painting",
      "Anchor bolt and lifeline installation",
      "Facade LED installation and window tinting",
      "Residential gutter, roof and window cleaning",
    ],
    industries: [
      "High-rise commercial buildings",
      "Condominiums and residential towers",
      "Hotels and malls",
      "Curtainwall and facade contractors",
    ],
    experience: [
      "Burj Khalifa, Dubai",
      "King Abdullah Financial District (KAFD), Saudi Arabia",
      "Princess Noura University, Saudi Arabia",
      "Zigzag Tower, Qatar",
    ],
    testimonial: {
      quote:
        "We needed urgent facade repairs on a high-rise building, and NEAS responded quickly with a cost-effective rope access solution.",
      author: "Engr. Manuel Marfil",
    },
    faqs: [
      {
        q: "Is rope access cheaper than scaffolding or a gondola?",
        a: "For most facade work it is, because there is no scaffold to erect or gondola to install. Technicians rig from roof anchors and reach the work area directly, which shortens set-up time and keeps the ground floor clear.",
      },
      { q: "Are your rope access technicians certified?", a: CREDENTIALS },
      {
        q: "Can you work on an occupied building?",
        a: "Yes. Rope access needs only a small exclusion zone below the work area, so offices, shops and residents can carry on using the building while the work is done.",
      },
      { q: "How much does facade rope access work cost?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Rope Access & Facade Works",
  },
  {
    id: "wind-turbine",
    title: "Wind Turbine Blade Inspection & Repair Philippines | NEAS",
    h1: "Wind Turbine Blade Inspection, Repair & Maintenance",
    metaDescription:
      "Rope access wind turbine services in the Philippines: blade inspection and repair, nacelle and blade cleaning, repainting, Gurney flap, lifeline and Lidar. Request a quote.",
    eyebrow: "Onshore wind · Rope access blade services",
    intro:
      "NEAS reaches turbine blades and towers by rope access, so inspection and repair can go ahead without large cranes or blade removal. That means less downtime for the turbine and a lower cost per intervention.",
    scope: [
      "Blade inspection and blade repair",
      "Nacelle and blade cleaning",
      "Repainting",
      "G90 Gurney flap / Anakata installation",
      "Lifeline system installation",
      "Anchor bolt installation",
      "Lidar services",
    ],
    industries: [
      "Wind farm owners and operators",
      "Wind energy developers",
      "Turbine O&M contractors",
    ],
    experience: [
      "Wind turbine inspection, repair and maintenance in the Philippines",
      "Wind-sector client relationships with Triconti ECC Renewables and Atimonan Windkraft",
      "Partnership with ProfEC Ventus, a wind energy testing and calibration laboratory",
    ],
    faqs: [
      {
        q: "Do you need a crane to repair turbine blades?",
        a: "Not for most inspection and repair work. Technicians descend from the nacelle on ropes and work directly on the blade, which avoids mobilising a large crane.",
      },
      {
        q: "Are your technicians certified for work at height?",
        a: CREDENTIALS,
      },
      {
        q: "Do you install aerodynamic add-ons such as Gurney flaps?",
        a: "Yes. NEAS installs G90 Gurney flaps (Anakata) on turbine blades, as well as lifeline systems and anchor bolts.",
      },
      { q: "How is wind turbine work priced?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Wind Turbine Services",
  },
  {
    id: "metmast-telecom",
    title: "Met Mast & Telecom Tower Services Philippines | NEAS",
    h1: "Met Mast and Telecom Tower Services",
    metaDescription:
      "Met mast erection, Lidar supply and installation, telecom tower civil works, antenna installation, commissioning and maintenance across the Philippines. Get a quote.",
    eyebrow: "Wind measurement & telecom infrastructure",
    intro:
      "From civil works to the last antenna, NEAS erects, equips and maintains met masts and telecom towers, and its rope access teams handle the work at height safely.",
    scope: [
      "Met mast civil works and tower erection",
      "Met mast apparatus supply",
      "Lidar supply and installation",
      "Telecom tower civil works and tower erection",
      "Antenna installation",
      "Commissioning and decommissioning",
      "Annual and quarterly tower maintenance",
      "Met mast and telecom consultancy",
    ],
    industries: [
      "Wind energy developers",
      "Geodetic and survey firms",
      "Telecom operators and tower companies",
    ],
    experience: [
      "Met mast tower erections in the Philippines",
      "Telecom tower installations in the Philippines",
      "Work with PhilSurv Geodetic (land surveying and LiDAR)",
    ],
    faqs: [
      {
        q: "Do you supply the met mast equipment as well as install it?",
        a: "Yes. NEAS covers civil works, apparatus supply, tower erection, and Lidar supply and installation.",
      },
      {
        q: "Can you maintain existing telecom towers?",
        a: "Yes. NEAS offers annual and quarterly maintenance, plus commissioning and decommissioning of telecom towers.",
      },
      { q: "Is your team certified to climb towers?", a: CREDENTIALS },
      { q: "How do I get a price for a tower project?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Met Mast & Telecom Tower Services",
  },
  {
    id: "ndt-inspection",
    title: "NDT & Industrial Inspection by Rope Access Philippines | NEAS",
    h1: "NDT and Industrial Inspection by Rope Access",
    metaDescription:
      "Non-destructive testing, welding inspection, third-party and drone inspection by rope access for offshore, onshore and industrial assets. Request a quotation.",
    eyebrow: "Offshore · Onshore · Industrial assets",
    intro:
      "Combining NDT expertise with rope access lets NEAS inspect hard-to-reach parts of plants, tanks, structures and offshore assets without the cost and delay of scaffolding.",
    scope: [
      "NDT via rope access, and ground NDT",
      "Welding and weld inspection",
      "Third-party inspection",
      "Drone inspection",
      "Torquing, cable pulling, and mechanical and electrical work",
      "Pipe repair",
      "Lifting operations and standby rescue",
    ],
    industries: [
      "Oil and gas, offshore and onshore",
      "Power plants",
      "Petrochemical and industrial plants",
      "Marine assets",
    ],
    experience: ["Offshore projects in Dubai and Qatar", "RasGas, Qatar"],
    faqs: [
      {
        q: "Why use rope access for NDT?",
        a: "It puts a certified inspector at the test point without scaffolding, which cuts set-up time and shutdown duration, especially on tall or offshore structures.",
      },
      { q: "What certifications does your team hold?", a: CREDENTIALS },
      {
        q: "Do you provide standby rescue?",
        a: "Yes. NEAS provides standby rescue cover alongside its industrial rope access and lifting operations.",
      },
      { q: "How is inspection work priced?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "NDT & Industrial Inspection",
  },
  {
    id: "coatings",
    title: "Industrial Blasting, Painting & Coatings at Height | NEAS",
    h1: "Blasting, Painting and Protective Coatings at Height",
    metaDescription:
      "Surface preparation, blasting, protective coatings, repainting and waterproofing for industrial structures, offshore platforms and buildings, by rope access. Get a quote.",
    eyebrow: "Surface preparation · Protective coatings",
    intro:
      "NEAS prepares and coats structures that are hard to reach, from industrial plant and offshore platforms to building exteriors, using rope access instead of full scaffolding.",
    scope: [
      "Blasting and surface preparation",
      "Protective coating and industrial painting",
      "Building repainting",
      "Waterproofing",
      "Concrete repair",
    ],
    industries: [
      "Industrial plants",
      "Offshore platforms",
      "Commercial buildings",
    ],
    experience: [
      "Offshore projects in Dubai and Qatar",
      "International high-rise projects in the Middle East",
    ],
    faqs: [
      {
        q: "Can you paint or coat a structure without scaffolding?",
        a: "Yes. Rope access technicians reach the surface directly, which suits tall structures, tanks, towers and facades where scaffolding is slow or costly.",
      },
      {
        q: "Are your painters certified?",
        a: "Yes. Among the team's individual certifications are painter certifications, alongside IRATA rope access, OPITO offshore and industrial safety training.",
      },
      { q: "How is coating work priced?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Blasting, Painting & Coatings",
  },
  {
    id: "training",
    title: "IRATA Rope Access & Work at Height Training Philippines | NEAS",
    h1: "Rope Access and Work-at-Height Training",
    metaDescription:
      "Rope access training (IRATA/SPRAT levels 1–3), work at height, rope rescue, PPE inspection, met mast and telecom tower training, plus certified PPE supply. Enquire now.",
    eyebrow: "Training · Consultancy · Certified PPE",
    intro:
      "NEAS trains and equips teams to work at height safely, with courses taught by working rope access technicians and certified PPE from leading brands.",
    scope: [
      "Rope access training, IRATA/SPRAT levels 1, 2 and 3",
      "Work at height (WAH) training",
      "Rope rescue training",
      "PPE inspection training",
      "Met mast tower and telecom tower training",
      "Rope access, met mast and telecom consultancy",
      "Certified PPE from Skylotec, Singing Rock, Cousin Trestec, SMC, Climbing Technology, FallProtec, Harken and KStrong",
    ],
    industries: [
      "Construction and facade contractors",
      "Wind, telecom and tower companies",
      "Industrial and offshore employers",
      "Individual technicians",
    ],
    experience: [
      "Partnership with IRMAP (Integrated Risk Management Association of the Philippines)",
      "Training accreditations in rope access, offshore and onshore safety, first aid and health and safety",
    ],
    testimonial: {
      quote:
        "The company consistently delivers excellent product and service quality, dependable delivery and collection.",
      author: "Jesus Torrelino",
    },
    faqs: [
      {
        q: "Which rope access levels do you train?",
        a: "NEAS offers rope access training for IRATA/SPRAT levels 1, 2 and 3, as well as work at height, rope rescue and PPE inspection courses.",
      },
      {
        q: "Can you train our whole team on site?",
        a: "Contact the team with your headcount, location and the course you need, and they will confirm the options.",
      },
      {
        q: "Do you sell the PPE as well?",
        a: "Yes. Certified height-safety and rope access PPE is available in the NEAS online store, with harnesses, helmets, ropes, descenders, ascenders, connectors, lanyards and more.",
      },
      {
        q: "How much does training cost?",
        a: "Course fees depend on the course, level and group size. Send your details through the form on this page and the team will reply with the schedule and fees.",
      },
    ],
    enquiryLabel: "Training, Consultancy & PPE",
  },
  {
    id: "renewable-energy",
    image: SERVICE_META["wind-turbine"].image,
    title: "Renewable Energy Project Services Philippines | NEAS",
    h1: "Renewable Energy Project Support in the Philippines",
    metaDescription:
      "NEAS supports wind energy projects with turbine blade inspection and repair, met mast erection, Lidar installation and specialist work-at-height services. Enquire now.",
    eyebrow: "Renewable energy · Wind measurement · Field services",
    intro:
      "NEAS supports renewable energy projects through specialist wind turbine, met mast and Lidar services. Our teams provide field support for wind measurement infrastructure and work at height across the project lifecycle.",
    scope: [
      "Wind turbine blade inspection and repair",
      "Blade and nacelle cleaning and repainting",
      "Gurney flap installation",
      "Met mast civil works and tower erection",
      "Met mast apparatus supply",
      "Lidar supply and installation",
      "Lifeline and anchor bolt installation",
    ],
    industries: [
      "Wind energy developers",
      "Wind farm owners and operators",
      "Renewable energy project contractors",
      "Wind measurement and survey teams",
    ],
    experience: [
      "Wind-sector relationships with Triconti ECC Renewables and Atimonan Windkraft",
      "Partnership with ProfEC Ventus, a wind energy testing and calibration laboratory",
      "Met mast tower erection and Lidar installation services in the Philippines",
    ],
    faqs: [
      {
        q: "What renewable energy services does NEAS provide?",
        a: "NEAS provides wind turbine blade inspection and repair, blade cleaning and repainting, Gurney flap installation, met mast erection, and Lidar supply and installation.",
      },
      {
        q: "Can NEAS support wind measurement campaigns?",
        a: "NEAS provides met mast civil works, tower erection, apparatus supply, and Lidar supply and installation. Share your project location and measurement requirements for a scope review.",
      },
      {
        q: "Does NEAS provide wind turbine blade maintenance?",
        a: "Yes. The listed scope includes blade inspection and repair, cleaning, repainting, and Gurney flap installation.",
      },
      { q: "How can I request a project quotation?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Renewable Energy Project Services",
  },
  {
    id: "offshore-onshore",
    image: SERVICE_META["ndt-inspection"].image,
    title: "Offshore & Onshore Industrial Services Philippines | NEAS",
    h1: "Offshore and Onshore Industrial Services",
    metaDescription:
      "NEAS provides rope access, NDT and inspection, protective coatings, maintenance and standby rescue support for offshore, onshore and industrial assets.",
    eyebrow: "Offshore · Onshore · Power and industrial assets",
    intro:
      "NEAS combines specialist rope access with industrial inspection, maintenance and protective coating capabilities for hard-to-reach assets. Services can be scoped for offshore and onshore facilities, power plants and industrial sites.",
    scope: [
      "Rope access for inspection and maintenance",
      "Non-destructive testing and welding inspection",
      "Third-party and drone inspection",
      "Blasting, surface preparation and protective coatings",
      "Industrial painting, waterproofing and concrete repair",
      "Mechanical and electrical support, cable pulling and torquing",
      "Lifting operations and standby rescue",
    ],
    industries: [
      "Oil and gas facilities",
      "Offshore platforms and marine assets",
      "Power plants",
      "Petrochemical and industrial facilities",
    ],
    experience: [
      "Offshore project experience in Dubai and Qatar, as stated in the company profile",
      "RasGas, Qatar, listed in the company experience profile",
      "International high-rise and industrial project exposure in the Middle East",
    ],
    faqs: [
      {
        q: "What offshore and onshore services does NEAS offer?",
        a: "The service scope includes rope access, NDT and welding inspection, third-party and drone inspection, protective coatings, industrial painting, mechanical and electrical support, lifting operations and standby rescue.",
      },
      {
        q: "Can NEAS support hard-to-reach inspection points?",
        a: "Yes. NEAS combines rope access with inspection capabilities to reach difficult areas on industrial and marine assets. The final method is confirmed after reviewing the asset, hazards and work scope.",
      },
      {
        q: "Does NEAS provide protective coating services?",
        a: "Yes. The listed scope includes blasting, surface preparation, protective coatings, industrial painting, waterproofing and concrete repair.",
      },
      { q: "How do I request a quotation?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Offshore & Onshore Industrial Services",
  },
  {
    id: "solar-energy-industrial",
    image: "/img/hero-power.webp",
    title: "Solar Energy & Industrial Services Philippines | NEAS",
    h1: "Solar Energy & Industrial Services",
    metaDescription: "NEAS supports solar energy and industrial projects in the Philippines with specialist access, project support, inspection, maintenance and industrial services.",
    eyebrow: "Solar PV · Renewable Energy · Industrial Support",
    intro: "NEAS provides specialist access and industrial field support for solar energy and power infrastructure projects. We work with project owners, EPC contractors and operations teams to scope practical support for site access, inspection, maintenance and industrial work packages.",
    scope: [
      "Solar PV project and site support",
      "Solar farm and rooftop PV inspection assistance",
      "Solar module and structure cleaning support",
      "Access planning and rope access for difficult-to-reach areas",
      "Structural inspection and condition assessment",
      "Industrial NDT and inspection support",
      "Surface preparation, protective coatings and maintenance",
      "Power infrastructure and electrical project support, subject to applicable licensing and approvals",
    ],
    industries: [
      "Utility-scale solar farms",
      "Commercial and industrial rooftop solar projects",
      "Solar EPC and O&M contractors",
      "Power plants and energy infrastructure operators",
      "Industrial facilities and maintenance contractors",
    ],
    experience: [
      "NEAS provides specialist rope access, inspection, maintenance and renewable-energy field support capabilities",
      "Project scope, workforce requirements and applicable technical approvals are confirmed before mobilization",
    ],
    faqs: [
      {
        q: "What solar energy services does NEAS provide?",
        a: "NEAS can scope solar project support, site access, inspection assistance, cleaning support, structural inspection and industrial maintenance work packages based on the project's requirements.",
      },
      {
        q: "Can NEAS support solar farm maintenance?",
        a: "NEAS can discuss inspection, cleaning support and industrial maintenance requirements with solar asset owners and O&M contractors. The exact scope is confirmed after reviewing the site, access conditions and work method.",
      },
      {
        q: "Does NEAS provide industrial rope access?",
        a: "Yes. NEAS provides rope access services for difficult-to-reach structures and industrial assets, subject to a site-specific access and safety assessment.",
      },
      {
        q: "Can NEAS support renewable energy contractors?",
        a: "NEAS can coordinate specialist access and industrial field support for renewable energy project owners, EPC contractors and O&M teams.",
      },
      {
        q: "Does NEAS undertake electrical installation and commissioning?",
        a: "Electrical work is subject to applicable Philippine licensing, competent personnel, project approvals and the agreed scope. Share your requirements so NEAS can confirm the appropriate delivery arrangement.",
      },
      { q: "How can clients request a project quotation?", a: PRICING_ANSWER },
    ],
    enquiryLabel: "Solar Energy & Industrial Services",
  },
];

export function getServicePage(id: string): ServicePage | null {
  return SERVICE_PAGES.find(p => p.id === id) ?? null;
}
