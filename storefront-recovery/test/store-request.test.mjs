import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../api/store-request.js";

test("a valid quote preserves selected equipment for the Admin inbox", () => {
  const result = validate({
    type: "equipment_quote",
    name: "NEAS verification",
    email: "verification@example.com",
    details: "Verify quotation routing",
    consent: true,
    items: [{ name: "Full-Body Rope Access Harness", quantity: 2 }],
  });
  assert.deepEqual(result.items, [{ name: "Full-Body Rope Access Harness", quantity: 2 }]);
  assert.equal(result.type, "equipment_quote");
});

test("invalid or unconsented submissions are rejected", () => {
  assert.equal(validate({ type: "equipment_quote", name: "Test", email: "bad", details: "Test", consent: true }), null);
  assert.equal(validate({ type: "equipment_quote", name: "Test", email: "test@example.com", details: "Test", consent: false }), null);
});

test("the honeypot absorbs automated submissions without contacting the CMS", () => {
  assert.deepEqual(validate({ type: "service_booking", website: "spam.example" }), { spam: true });
});
