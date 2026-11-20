import { describe, expect, it } from "vitest";
import { dedupePublicProducts } from "./catalog";

describe("dedupePublicProducts", () => {
  it("keeps one record per normalized product name and code, preferring SheetSync IDs", () => {
    const rows = [
      { id: "p-001", name: "Full Body Harness", code: "NEAS-01", image: "/older.jpg", price: 5000 },
      { id: "s-001", name: " full body   harness ", code: "neas-01", image: "", price: 5200 },
      { id: "s-002", name: "FULL BODY HARNESS", code: "NEAS-01", image: "/current.jpg", price: 5250 },
      { id: "s-003", name: "Full Body Harness - XL", code: "NEAS-01", image: "/xl.jpg", price: 5300 },
    ];

    const result = dedupePublicProducts(rows);

    expect(result.map((item) => item.id)).toEqual(["s-002", "s-003"]);
    expect(result[0].price).toBe(5250);
  });

  it("keeps unique products and does not mutate the input array", () => {
    const rows = [
      { id: "p-001", name: "Helmet", code: "H-01", image: "" },
      { id: "p-002", name: "Lanyard", code: "L-01", image: "/lanyard.jpg" },
    ];
    const before = rows.map((row) => ({ ...row }));

    expect(dedupePublicProducts(rows).map((row) => row.id)).toEqual(["p-002", "p-001"]);
    expect(rows).toEqual(before);
  });
});
