import { Router } from "express";
import { z } from "zod";
import type { UserRole, WorkspaceMember, WorkspaceMembersResponse } from "@simforge/shared";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, invalidateWorkspaceCache, requireWorkspace } from "../middleware/workspace.js";
import { getEnv } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { assignableMemberRoles, canAssignMemberRole, canManageMembers, canManageMemberTargetRole } from "../services/member-admin.js";

const manageableRoleSchema = z.enum(["Admin", "Trainer", "Manager", "Learner"]);
const inviteMemberSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  fullName: z.string().trim().min(1).max(120).optional(),
  role: manageableRoleSchema.default("Learner"),
});
const updateRoleSchema = z.object({ role: manageableRoleSchema });

function memberSummary(record: {
  id: string;
  role: UserRole;
  joinedAt: Date;
  user: { id: string; email: string; fullName: string | null };
}): WorkspaceMember {
  return {
    membershipId: record.id,
    userId: record.user.id,
    email: record.user.email,
    fullName: record.user.fullName,
    role: record.role,
    joinedAt: record.joinedAt.toISOString(),
  };
}

export const membersRouter = Router();
membersRouter.use(requireAuth, requireWorkspace);

membersRouter.use((request, _response, next) => {
  const { role } = getWorkspaceRequest(request).workspace;
  if (!canManageMembers(role)) throw new HttpError("Only workspace Owners and Admins can manage members", 403, "MEMBER_ADMIN_DENIED");
  next();
});

membersRouter.get("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const members = await prisma.membership.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  const payload: WorkspaceMembersResponse = {
    canManageMembers: true,
    assignableRoles: assignableMemberRoles(role),
    members: members.map(memberSummary),
  };
  response.json(payload);
});

membersRouter.post("/invite", async (request, response) => {
  const actor = getWorkspaceRequest(request).authUser;
  const { organizationId, role: actorRole } = getWorkspaceRequest(request).workspace;
  const input = inviteMemberSchema.parse(request.body);
  if (!canAssignMemberRole(actorRole, input.role))
    throw new HttpError("You cannot assign that workspace role", 403, "ROLE_ASSIGNMENT_DENIED");

  const existingProfile = await prisma.profile.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    select: { id: true, email: true, fullName: true },
  });

  if (existingProfile) {
    const existingMembership = await prisma.membership.findFirst({ where: { userId: existingProfile.id } });
    if (existingMembership?.organizationId === organizationId)
      throw new HttpError("This user already belongs to the workspace", 409, "ALREADY_MEMBER");
    if (existingMembership)
      throw new HttpError("This account already belongs to another workspace", 409, "USER_IN_ANOTHER_WORKSPACE");

    const membership = await prisma.$transaction(async (transaction) => {
      const created = await transaction.membership.create({
        data: { organizationId, userId: existingProfile.id, role: input.role },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });
      await transaction.activity.create({
        data: {
          organizationId,
          actorId: actor.id,
          action: "member.added",
          description: `${existingProfile.email} added as ${input.role}`,
        },
      });
      return created;
    });
    invalidateWorkspaceCache(existingProfile.id);
    response.status(201).json({ invited: false, member: memberSummary(membership) });
    return;
  }

  const env = getEnv();
  const frontend = env.FRONTEND_URL ?? env.WEB_URL;
  const redirectTo = `${frontend.replace(/\/$/, "")}/auth/callback?next=/dashboard`;
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: input.fullName ? { full_name: input.fullName } : undefined,
  });
  if (error || !data.user)
    throw new HttpError("Unable to send the invitation. Check the email address and authentication email configuration.", 502, "INVITE_FAILED");

  try {
    const membership = await prisma.$transaction(async (transaction) => {
      const profile = await transaction.profile.create({
        data: {
          id: data.user.id,
          email: input.email,
          fullName: input.fullName ?? null,
        },
      });
      const created = await transaction.membership.create({
        data: { organizationId, userId: profile.id, role: input.role },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      });
      await transaction.activity.create({
        data: {
          organizationId,
          actorId: actor.id,
          action: "member.invited",
          description: `${input.email} invited as ${input.role}`,
        },
      });
      return created;
    });
    invalidateWorkspaceCache(data.user.id);
    response.status(201).json({ invited: true, member: memberSummary(membership) });
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw error;
  }
});

membersRouter.patch("/:membershipId/role", async (request, response) => {
  const actor = getWorkspaceRequest(request).authUser;
  const { organizationId, role: actorRole } = getWorkspaceRequest(request).workspace;
  const input = updateRoleSchema.parse(request.body);
  const target = await prisma.membership.findFirst({
    where: { id: request.params.membershipId, organizationId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  if (!target) throw new HttpError("Workspace member not found", 404, "MEMBER_NOT_FOUND");
  if (!canManageMemberTargetRole(actorRole, target.role as UserRole) || !canAssignMemberRole(actorRole, input.role))
    throw new HttpError("You cannot change this member's role", 403, "ROLE_ASSIGNMENT_DENIED");

  const updated = await prisma.$transaction(async (transaction) => {
    const membership = await transaction.membership.update({
      where: { id: target.id },
      data: { role: input.role },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    await transaction.activity.create({
      data: {
        organizationId,
        actorId: actor.id,
        action: "member.role_changed",
        description: `${target.user.email} changed from ${target.role} to ${input.role}`,
      },
    });
    return membership;
  });
  invalidateWorkspaceCache(target.userId);
  response.json({ member: memberSummary(updated) });
});

membersRouter.delete("/:membershipId", async (request, response) => {
  const actor = getWorkspaceRequest(request).authUser;
  const { organizationId, role: actorRole } = getWorkspaceRequest(request).workspace;
  const target = await prisma.membership.findFirst({
    where: { id: request.params.membershipId, organizationId },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  if (!target) throw new HttpError("Workspace member not found", 404, "MEMBER_NOT_FOUND");
  if (!canManageMemberTargetRole(actorRole, target.role as UserRole))
    throw new HttpError("You cannot remove this workspace member", 403, "MEMBER_REMOVE_DENIED");

  await prisma.$transaction([
    prisma.membership.delete({ where: { id: target.id } }),
    prisma.activity.create({
      data: {
        organizationId,
        actorId: actor.id,
        action: "member.removed",
        description: `${target.user.email} removed from the workspace`,
      },
    }),
  ]);
  invalidateWorkspaceCache(target.userId);
  response.status(204).end();
});
