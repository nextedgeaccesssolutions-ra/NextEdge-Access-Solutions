/**
 * Server-side metadata for the six homepage services.
 *
 * The homepage itself is a static document (site/home.html) whose service copy
 * lives in an inline `SERVICES` object, read only by the browser. Social
 * crawlers do not run JavaScript, so a shared `/?service=<id>` link would
 * otherwise preview as the generic homepage. This map lets renderHomepage()
 * emit per-service Open Graph tags on the server.
 *
 * The copy is therefore stored twice. services.drift.test.ts parses home.html
 * and fails the build if the two ever disagree, so the duplication cannot rot
 * silently — update both, or the test will say so.
 */
export type ServiceMeta = { title: string; desc: string; image: string };

export const SERVICE_META: Record<string, ServiceMeta> = {
  "rope-access": {
    title: "Rope Access & Facade Works",
    desc: "IRATA-certified technicians perform inspection, maintenance, cleaning, and repair at height. Faster and more cost-effective than traditional scaffolding — with zero disruption to operations.",
    image: "/img/ce6c22d9bace.jpg",
  },
  "ndt-inspection": {
    title: "NDT & Industrial Inspection",
    desc: "Non-destructive testing services via rope access for offshore, onshore, marine, and industrial assets. Certified NDT expertise combined with rope access efficiency.",
    image: "/img/877206fcf5ba.jpg",
  },
  coatings: {
    title: "Blasting, Painting & Coatings",
    desc: "Comprehensive surface preparation, protective coating, and painting services for industrial structures, offshore platforms, and commercial buildings.",
    image: "/img/6447ca2a761e.jpg",
  },
  "metmast-telecom": {
    title: "Met Mast & Telecom Tower Services",
    desc: "NEAS delivers specialist rope access for Met Mast projects and telecom infrastructure across the Philippines — from civil works and erection to commissioning and annual maintenance.",
    image: "/img/0cc8f91dab71.jpg",
  },
  training: {
    title: "Training, Consultancy & PPE Supply",
    desc: "Professional training courses, safety consultancy, and certified PPE supply to ensure your teams work safely and in full compliance with international standards.",
    image: "/img/390f5ed3244c.jpg",
  },
  "wind-turbine": {
    title: "Wind Turbine Services",
    desc: "NEAS provides specialist rope access services for wind turbines across the Philippines — from blade inspection and repair to tower maintenance and decommissioning.",
    image: "/img/0ce37cb33507.jpg",
  },
};

/** Returns the service for a `?service=` value, or null when it is unknown. */
export function getServiceMeta(id: string | null | undefined): ServiceMeta | null {
  if (!id) return null;
  return Object.prototype.hasOwnProperty.call(SERVICE_META, id) ? SERVICE_META[id] : null;
}
