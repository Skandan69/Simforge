import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRoleIntegrityRules,
  personaBoundaryConfig,
  resolvePersonaRoleType,
  roleIntegrityRecovery,
  validatePersonaResponse,
} from "./role-integrity.js";

test("customer cannot claim agent-side billing or refund actions", () => {
  const drift = validatePersonaResponse(
    "I need to verify the duplicate transaction and confirm a few billing details before I can review refund eligibility.",
    "Frustrated customer",
  );
  assert.equal(drift.valid, false);
  assert.equal(drift.roleType, "Customer");
  assert.ok(drift.violations.includes("CUSTOMER_INTERNAL_VERIFICATION"));
  assert.match(roleIntegrityRecovery("Customer"), /I need you to look into this from your side/u);
});

test("customer may ask the learner to verify and provide requested details", () => {
  const response = "I need you to check why I was charged twice. I can give you the dates of the charges if that helps.";
  assert.deepEqual(validatePersonaResponse(response, "VIP customer").violations, []);
});

test("generic assistant and coaching language is rejected for every persona", () => {
  for (const role of Object.keys(personaBoundaryConfig)) {
    assert.equal(validatePersonaResponse("As your assistant, your answer should explain the policy.", role).valid, false);
  }
});

test("current and future role families resolve to extensible boundaries", () => {
  const cases = [
    ["Customer requesting a refund", "Customer"],
    ["Regional Manager", "Manager"],
    ["New employee", "Employee"],
    ["Job interviewer", "Interviewer"],
    ["Enterprise sales prospect", "Sales Prospect"],
    ["Chief Executive Officer", "Executive"],
    ["HR partner", "HR"],
    ["Healthcare patient", "Healthcare Patient"],
    ["External regulator", "Counterpart"],
  ] as const;
  for (const [role, expected] of cases) assert.equal(resolvePersonaRoleType(role), expected);
});

test("prompt rules preserve immersion during abusive or off-topic derailment", () => {
  const rules = buildRoleIntegrityRules("Angry customer").prompt;
  assert.match(rules, /Ask the learner to perform learner-side actions/u);
  assert.match(rules, /abusive, sexual, or seriously off-topic/u);
  assert.match(rules, /refuse in one brief in-character sentence/u);
  assert.doesNotMatch(rules, /break character/u);
});
