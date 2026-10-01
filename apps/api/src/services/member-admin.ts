import type { UserRole } from "@simforge/shared";

export function canManageMembers(role: UserRole) {
  return role === "Owner" || role === "Admin";
}

export function assignableMemberRoles(role: UserRole): UserRole[] {
  if (role === "Owner") return ["Admin", "Trainer", "Manager", "Learner"];
  if (role === "Admin") return ["Trainer", "Manager", "Learner"];
  return [];
}

export function canAssignMemberRole(actorRole: UserRole, nextRole: UserRole) {
  return assignableMemberRoles(actorRole).includes(nextRole);
}

export function canManageMemberTargetRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === "Owner") return false;
  if (actorRole === "Owner") return true;
  if (actorRole === "Admin") return ["Trainer", "Manager", "Learner"].includes(targetRole);
  return false;
}
