import type { Request, RequestHandler } from "express";
import type { UserRole } from "@simforge/shared";
import type { AuthenticatedRequest } from "./auth.js";
import { prisma } from "../lib/prisma.js";
import { timeRequestStage } from "../lib/request-timing.js";
import { TtlCache } from "../lib/ttl-cache.js";

export interface WorkspaceRequest extends AuthenticatedRequest {
  workspace: {
    organizationId: string;
    role: UserRole;
  };
}

export function getWorkspaceRequest(request: Request) {
  return request as unknown as WorkspaceRequest;
}

const workspaceCache = new TtlCache<string, { organizationId: string; role: UserRole } | null>(15_000);

export const requireWorkspace: RequestHandler = async (
  request,
  response,
  next,
) => {
  const user = (request as AuthenticatedRequest).authUser;
  const workspace = workspaceCache.get(user.id) ?? await timeRequestStage(request, "workspace.resolve", async () => {
    const membership = await workspaceCache.getOrSet(user.id, async () => {
      const result = await prisma.membership.findFirst({
        where: { userId: user.id },
        orderBy: { joinedAt: "asc" },
      });
      return result ? { organizationId: result.organizationId, role: result.role } : null;
    });
    return membership;
  });

  if (!workspace) {
    response
      .status(404)
      .json({
        error: "Organization setup is required",
        code: "ORGANIZATION_REQUIRED",
      });
    return;
  }

  (request as WorkspaceRequest).workspace = {
    organizationId: workspace.organizationId,
    role: workspace.role,
  };
  next();
};

export const requireKnowledgeWrite: RequestHandler = (
  request,
  response,
  next,
) => {
  const { role } = (request as WorkspaceRequest).workspace;
  if (!(["Owner", "Admin", "Trainer"] as UserRole[]).includes(role)) {
    response
      .status(403)
      .json({
        error: "Your role has read-only access to Knowledge Studio",
        code: "READ_ONLY_ROLE",
      });
    return;
  }
  next();
};

export const requireSimulationRead: RequestHandler = (
  request,
  response,
  next,
) => {
  const { role } = (request as WorkspaceRequest).workspace;
  if (role === "Learner") {
    response
      .status(403)
      .json({
        error: "Simulation Studio is not available to learners yet",
        code: "SIMULATION_ACCESS_DENIED",
      });
    return;
  }
  next();
};

export const requireSimulationWrite: RequestHandler = (
  request,
  response,
  next,
) => {
  const { role } = (request as WorkspaceRequest).workspace;
  if (!(["Owner", "Admin", "Trainer"] as UserRole[]).includes(role)) {
    response
      .status(403)
      .json({
        error: "Your role has read-only access to Simulation Studio",
        code: "READ_ONLY_ROLE",
      });
    return;
  }
  next();
};
