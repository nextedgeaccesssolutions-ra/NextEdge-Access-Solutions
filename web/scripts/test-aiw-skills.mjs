import assert from "node:assert/strict";
import test from "node:test";
import { resolveAiwSpecialistPermission } from "../lib/aiw-authority.ts";
import { getAiwSkill, listAiwSkills } from "../lib/aiw-skills.ts";

const SPECIALIST_IDS = [
  "JARVIS", "SALES", "MARKETING", "CONTENT", "SKILLS", "PERFORMANCE",
  "AUTHORITY", "APPROACH", "HUMAN", "EMPATHY", "PRO", "ENGINEERING",
  "QUALIFY", "QUALITY", "INTEGRITY", "ADVANCED", "MODELS", "BRANCHES",
  "CODE", "FINANCE", "CUSTOMER", "PROJECTS", "AUDIT",
];

test("skill registry exposes a substantial, unique skill library", () => {
  const skills = listAiwSkills();
  assert.ok(skills.length >= 10);
  assert.ok(skills.some((skill) => skill.id === "ai-gateway-reliability"));
  assert.equal(new Set(skills.map((skill) => skill.id)).size, skills.length);
  for (const skill of skills) {
    assert.ok(skill.name.length > 5);
    assert.ok(skill.description.length > 20);
    assert.ok(skill.agentIds.length > 0);
  }
});

test("all 23 specialists resolve through explicit skills and authority mappings", () => {
  assert.equal(SPECIALIST_IDS.length, 23);
  for (const agent of SPECIALIST_IDS) {
    const skill = getAiwSkill(agent);
    assert.ok(skill.agentIds.includes(agent), `${agent} must have an explicit skill assignment`);
    assert.ok(skill.instructions.trim().length > 200, agent);

    const defaultDecision = resolveAiwSpecialistPermission(agent, null);
    assert.ok(defaultDecision.workforceAgentId, `${agent} must map to a server-side authority ID`);

    const missingSavedAuthority = resolveAiwSpecialistPermission(agent, {
      updatedAt: "2026-11-22T00:00:00.000Z",
      agents: [],
    });
    assert.equal(missingSavedAuthority.allowed, false, `${agent} must fail closed when saved authority is missing`);
  }
});

test("unknown specialists do not silently inherit the executive skill", () => {
  assert.throws(
    () => getAiwSkill("NOT_A_SPECIALIST"),
    /No documented AI Workforce skill is registered/,
  );
});

test("model and code specialists resolve to the AI Gateway reliability skill", () => {
  assert.equal(getAiwSkill("MODELS").id, "ai-gateway-reliability");
  assert.equal(getAiwSkill("CODE").id, "ai-gateway-reliability");
});

test("skill metadata returned to UI excludes private prompt instructions", () => {
  for (const skill of listAiwSkills()) {
    assert.equal("instructions" in skill, false);
  }
});
