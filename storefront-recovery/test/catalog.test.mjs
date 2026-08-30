import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRODUCTS, MODES, hashForMode, modeFromHash, selectedItems, validateCatalog } from "../public/catalog.js";

test("#quote opens the quotation panel on first load", () => {
  assert.equal(modeFromHash("#quote"), MODES.QUOTE);
  assert.equal(hashForMode(MODES.QUOTE), "#quote");
});

test("request modes have stable deep links", () => {
  assert.equal(modeFromHash("#meeting-request"), MODES.MEETING);
  assert.equal(modeFromHash("#booking"), MODES.SERVICE);
});

test("selected items include only positive integer quantities", () => {
  const cart = { [DEFAULT_PRODUCTS[0].name]: 2, [DEFAULT_PRODUCTS[1].name]: 0, [DEFAULT_PRODUCTS[2].name]: -1 };
  assert.deepEqual(selectedItems(DEFAULT_PRODUCTS, cart), [{ name: DEFAULT_PRODUCTS[0].name, quantity: 2 }]);
});

test("CMS catalog validation keeps valid entries and rejects an invalid catalog", () => {
  assert.deepEqual(validateCatalog([{ name: "Rescue kit", category: "Kits", note: "Reviewed" }]), [{ name: "Rescue kit", category: "Kits", note: "Reviewed" }]);
  assert.equal(validateCatalog([{ category: "Kits" }]), null);
  assert.equal(validateCatalog([]), null);
});
