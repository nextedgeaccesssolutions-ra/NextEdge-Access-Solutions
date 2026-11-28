import { getSetting } from "./settings";
import { getServicePage, type ServicePage } from "./service-pages";

const SETTING_KEY = "service_page_solar_energy_industrial";

/** Returns source-controlled service content merged with administrator edits. */
export async function getManagedServicePage(id: string): Promise<ServicePage | null> {
  const base = getServicePage(id);
  if (!base || id !== "solar-energy-industrial") return base;
  const saved = await getSetting<Partial<ServicePage>>(SETTING_KEY, {});
  return {
    ...base,
    ...saved,
    id: base.id,
    scope: Array.isArray(saved.scope) ? saved.scope : base.scope,
    industries: Array.isArray(saved.industries) ? saved.industries : base.industries,
    experience: Array.isArray(saved.experience) ? saved.experience : base.experience,
    faqs: Array.isArray(saved.faqs) ? saved.faqs : base.faqs,
    enquiryLabel: base.enquiryLabel,
  };
}
