import { describe, expect, it } from "vitest";
import { organizationSchema } from "./organization-schema";

describe("NEAS organization structured data", () => {
  it("publishes stable organization identity and canonical website", () => {
    expect(organizationSchema["@type"]).toBe("Organization");
    expect(organizationSchema.url).toBe("https://www.nextedge-access-solutions.com/");
    expect(organizationSchema.logo).toMatch(/^https:\/\//);
    expect(organizationSchema.email).toContain("@");
    expect(organizationSchema.telephone).toMatch(/^\+63/);
    expect(organizationSchema.areaServed.name).toBe("Philippines");
  });

  it("does not advertise the outdated Cebu location", () => {
    const serialized = JSON.stringify(organizationSchema).toLowerCase();
    expect(serialized).not.toContain("cebu");
    expect(serialized).toContain("philippines");
  });
});
