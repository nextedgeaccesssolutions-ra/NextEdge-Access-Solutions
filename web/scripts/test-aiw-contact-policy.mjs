import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isOptedOutRecipient } from "../lib/aiw-contact-policy.ts";

test("blocks a recipient when any matching NEAS contact record opted out", () => {
  assert.equal(isOptedOutRecipient("buyer@example.com", [
    { email: "buyer@example.com", contact_status: "permitted" },
    { email: "buyer@example.com", contact_status: "opted_out" },
  ]), true);
});

test("matches recipient email case-insensitively and ignores surrounding whitespace", () => {
  assert.equal(isOptedOutRecipient(" Buyer@Example.com ", [
    { email: "buyer@example.com", contact_status: "opted_out" },
  ]), true);
});

test("does not block a permitted or unreviewed contact without an opt-out", () => {
  assert.equal(isOptedOutRecipient("buyer@example.com", [
    { email: "buyer@example.com", contact_status: "permitted" },
    { email: "buyer@example.com", contact_status: "unreviewed" },
  ]), false);
});

test("does not block a different recipient or an empty recipient", () => {
  const contacts = [{ email: "other@example.com", contact_status: "opted_out" }];
  assert.equal(isOptedOutRecipient("buyer@example.com", contacts), false);
  assert.equal(isOptedOutRecipient(" ", contacts), false);
});

test("Gmail send route checks the live opt-out register before calling Gmail", () => {
  const route = readFileSync(new URL("../app/api/admin/gmail/send/route.ts", import.meta.url), "utf8");
  const lookup = route.indexOf("select email, contact_status from aiw_leads where lower(email)=${recipient}");
  const block = route.indexOf('recordBlocked("recipient_opted_out")');
  const send = route.indexOf('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.ok(lookup >= 0, "recipient lookup must use the normalized address in aiw_leads");
  assert.ok(block > lookup, "the opt-out match must be blocked after lookup");
  assert.ok(send > block, "opt-out enforcement must run before the Gmail send request");
});
