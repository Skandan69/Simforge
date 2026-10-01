import assert from "node:assert/strict";
import test from "node:test";
import { assignableMemberRoles, canAssignMemberRole, canManageMembers, canManageMemberTargetRole } from "./member-admin.js";

test("only owners and admins can manage workspace members", () => {
  assert.equal(canManageMembers("Owner"), true);
  assert.equal(canManageMembers("Admin"), true);
  assert.equal(canManageMembers("Trainer"), false);
  assert.equal(canManageMembers("Manager"), false);
  assert.equal(canManageMembers("Learner"), false);
});

test("admins cannot create or modify privileged peers", () => {
  assert.deepEqual(assignableMemberRoles("Admin"), ["Trainer", "Manager", "Learner"]);
  assert.equal(canAssignMemberRole("Admin", "Admin"), false);
  assert.equal(canManageMemberTargetRole("Admin", "Admin"), false);
  assert.equal(canManageMemberTargetRole("Admin", "Owner"), false);
  assert.equal(canManageMemberTargetRole("Admin", "Trainer"), true);
});

test("owners can manage every non-owner role but cannot demote the owner membership", () => {
  assert.equal(canAssignMemberRole("Owner", "Admin"), true);
  assert.equal(canManageMemberTargetRole("Owner", "Admin"), true);
  assert.equal(canManageMemberTargetRole("Owner", "Learner"), true);
  assert.equal(canManageMemberTargetRole("Owner", "Owner"), false);
});
