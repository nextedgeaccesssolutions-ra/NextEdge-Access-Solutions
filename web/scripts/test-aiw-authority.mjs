import assert from "node:assert/strict";
import test from "node:test";
import { resolveAiwSpecialistPermission } from "../lib/aiw-authority.ts";

test("uses the published default permission matrix before an administrator saves changes", () => {
  assert.equal(resolveAiwSpecialistPermission("SALES", null).allowed, true);
  assert.equal(resolveAiwSpecialistPermission("MODELS", null).allowed, false);
  assert.equal(resolveAiwSpecialistPermission("FINANCE", null).allowed, false);
});

test("blocks disabled specialists even when their authority level is elevated", () => {
  const decision = resolveAiwSpecialistPermission("SALES", {
    updatedAt: "2026-11-17T00:00:00.000Z",
    agents: [{ id: "lead-qualifier", enabled: false, authority: "execute_approved" }],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.match(decision.reason, /disabled/i);
});

test("blocks observe-only specialists from creating work orders", () => {
  const decision = resolveAiwSpecialistPermission("SALES", {
    updatedAt: "2026-11-17T00:00:00.000Z",
    agents: [{ id: "lead-qualifier", enabled: true, authority: "observe" }],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.match(decision.reason, /observe-only/i);
});

test("allows draft, recommend, and execute-after-approval work orders", () => {
  for (const authority of ["draft", "recommend", "execute_approved"]) {
    const decision = resolveAiwSpecialistPermission("SALES", {
      updatedAt: "2026-11-17T00:00:00.000Z",
      agents: [{ id: "lead-qualifier", enabled: true, authority }],
    });
    assert.equal(decision.allowed, true, authority);
  }
});

test("fails closed when a saved configuration omits a specialist", () => {
  assert.equal(resolveAiwSpecialistPermission("SALES", {
    updatedAt: "2026-11-17T00:00:00.000Z",
    agents: [],
  }).allowed, false);
});

test("rejects unknown specialist IDs", () => {
  const decision = resolveAiwSpecialistPermission("NOT_A_SPECIALIST", null);
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.workforceAgentId, null);
});

test("maps the professional communications specialist to the outreach permission", () => {
  assert.equal(resolveAiwSpecialistPermission("PRO", null).allowed, true);
  const blocked = resolveAiwSpecialistPermission("PRO", {
    updatedAt: "2026-11-17T00:00:00.000Z",
    agents: [],
  });
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) assert.match(blocked.reason, /disabled/i);
});

test("blocks PRO outreach when the saved outreach authority is observe-only", () => {
  const decision = resolveAiwSpecialistPermission("PRO", {
    updatedAt: "2026-11-17T00:00:00.000Z",
    agents: [{ id: "outreach", enabled: true, authority: "observe" }],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.match(decision.reason, /observe-only/i);
});
