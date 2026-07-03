import assert from "node:assert/strict";
import test from "node:test";
import { ENTERPRISE_PERSONA_TEMPLATES, getEnterprisePersonaTemplate } from "@simforge/shared";
import { buildSophiaSystemPrompt } from "../ai/prompt-builder.js";
import { resolvePersonaRoleType } from "../ai/role-integrity.js";
import { personaTemplateToSimulationPersona } from "./persona-framework.js";

test("starter library contains every required enterprise persona", () => {
  const names = ENTERPRISE_PERSONA_TEMPLATES.map((template) => template.displayName);
  for (const expected of ["Customer Support Customer", "Angry Customer", "Calm Customer", "VIP Customer", "Sales Prospect", "Interviewer", "Hiring Manager", "Manager", "Employee", "HR Representative", "Executive", "Healthcare Patient", "Bank Customer", "Insurance Customer", "Retail Customer", "Compliance Officer", "Collections Customer"]) assert.ok(names.includes(expected));
  assert.equal(new Set(ENTERPRISE_PERSONA_TEMPLATES.map((template) => template.id)).size, 17);
});

test("persona configuration loading exposes complete reusable attributes", () => {
  const persona = getEnterprisePersonaTemplate("angry-customer");
  assert.ok(persona);
  assert.equal(persona.challengeLevel, "High");
  assert.ok(persona.allowedBehaviors.length > 0);
  assert.ok(persona.forbiddenBehaviors.length > 0);
  assert.ok(persona.roleIntegrityRules.length > 0);
});

test("template adapter injects framework configuration into the existing runtime persona", () => {
  const template = getEnterprisePersonaTemplate("bank-customer")!;
  const persona = personaTemplateToSimulationPersona(template);
  const prompt = buildSophiaSystemPrompt({
    organizationBlueprint: null,
    simulation: { title: "Disputed charge", description: "Handle a dispute", scenarioSetup: "A customer calls", successCriteria: "Resolve safely", difficulty: "Advanced", objectives: [], evaluationCriteria: [], persona },
    knowledgeSections: [], knowledgeDocuments: [], learnerProfile: null,
  });
  assert.match(prompt, /Bank customer/u);
  assert.match(prompt, /Challenge level: High/u);
  assert.match(prompt, /Allowed behaviours/u);
  assert.equal(resolvePersonaRoleType(template.role), "Customer");
});

test("unknown template and simulations without a persona retain safe fallbacks", () => {
  assert.equal(getEnterprisePersonaTemplate("unknown"), undefined);
  const prompt = buildSophiaSystemPrompt({ organizationBlueprint: null, simulation: { title: "General practice", description: "Practice", scenarioSetup: "A discussion", successCriteria: "Respond", difficulty: "Beginner", objectives: [], evaluationCriteria: [], persona: null }, knowledgeSections: [], knowledgeDocuments: [], learnerProfile: null });
  assert.match(prompt, /Enterprise simulation trainer/u);
  assert.match(prompt, /Assigned role type: Counterpart/u);
});
