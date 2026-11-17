import assert from "node:assert/strict";
import test from "node:test";
import { isValidEmailAddress } from "../lib/aiw-email-validation.ts";

test("accepts valid NEAS recipient addresses", () => {
  for (const address of ["ops@example.com", "jane.doe+neas@example.co.uk", "a_b-c@example.io"]) {
    assert.equal(isValidEmailAddress(address), true, address);
  }
});

test("rejects malformed addresses", () => {
  for (const address of ["", "@example.com", "a@", "a@@example.com", ".a@example.com", "a..b@example.com", "a@example..com", "a@-example.com", "a@example-.com", "a@b.c", "a@example.com\n"]) {
    assert.equal(isValidEmailAddress(address), false, JSON.stringify(address));
  }
});

test("rejects local parts and domains beyond RFC length bounds", () => {
  assert.equal(isValidEmailAddress(`${"a".repeat(65)}@example.com`), false);
  assert.equal(isValidEmailAddress(`a@${"b".repeat(64)}.com`), false);
  assert.equal(isValidEmailAddress(`${"a".repeat(65)}@${"b".repeat(180)}.com`), false);
});

test("rejects oversized and repeated-dot input without regex backtracking", () => {
  assert.equal(isValidEmailAddress(`a@${".".repeat(100_000)} `), false);
  assert.equal(isValidEmailAddress(`a@${".".repeat(250)}`), false);
});
