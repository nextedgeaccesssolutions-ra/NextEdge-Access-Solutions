import assert from "node:assert/strict";
import test from "node:test";
import { explainGmailFailure } from "../lib/aiw-gmail-errors.ts";

test("explains a disabled Gmail API", () => {
  assert.equal(explainGmailFailure(403, "accessNotConfigured")?.code, "gmail_api_disabled");
  assert.equal(explainGmailFailure(403, "SERVICE_DISABLED")?.code, "gmail_api_disabled");
});

test("asks for a full reconnect when Gmail permissions are missing", () => {
  assert.equal(explainGmailFailure(403, "insufficientPermissions")?.code, "gmail_scope_insufficient");
});

test("treats 401 as an expired authorization", () => {
  assert.equal(explainGmailFailure(401, "authError")?.code, "gmail_reauth_required");
});

test("reports rate limiting", () => {
  assert.equal(explainGmailFailure(429, "unknown")?.code, "gmail_rate_limited");
});

test("unknown 403 reasons keep Google's reason in the message", () => {
  const result = explainGmailFailure(403, "somethingNew");
  assert.equal(result?.code, "gmail_authorization_failed");
  assert.match(result?.message ?? "", /somethingNew/);
});

test("other server errors are left to the caller", () => {
  assert.equal(explainGmailFailure(500, "backendError"), null);
});
