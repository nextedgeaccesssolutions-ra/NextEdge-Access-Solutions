import assert from "node:assert/strict";
import test from "node:test";
import { getAiwSkill, listAiwSkills } from "../lib/aiw-skills.ts";

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

test("every workforce specialist resolves to a non-empty skill", () => {
  const agents = ["JARVIS","SALES","MARKETING","CONTENT","SKILLS","PERFORMANCE","AUTHORITY","APPROACH","HUMAN","EMPATHY","PRO","ENGINEERING","QUALIFY","QUALITY","INTEGRITY","ADVANCED","MODELS","BRANCHES","CODE","FINANCE","CUSTOMER","PROJECTS","AUDIT"];
  for (const agent of agents) {
    const skill = getAiwSkill(agent);
    assert.ok(skill.id, agent);
    assert.ok(skill.instructions.length > 200, agent);
  }
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
