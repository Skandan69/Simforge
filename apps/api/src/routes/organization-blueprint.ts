import { Router, type RequestHandler } from "express";
import type { UserRole } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { blueprintApprovalUpdate, blueprintScope, mapBlueprint, organizationBlueprintSchema } from "../services/organization-blueprint.js";

export const requireBlueprintWrite: RequestHandler = (request, response, next) => {
  const { role } = getWorkspaceRequest(request).workspace;
  if (!(["Owner", "Admin"] as UserRole[]).includes(role)) {
    response.status(403).json({ error: "Only organization Owners and Admins can update the blueprint", code: "BLUEPRINT_WRITE_DENIED" });
    return;
  }
  next();
};

export const organizationBlueprintRouter = Router();
organizationBlueprintRouter.use(requireAuth, requireWorkspace);

organizationBlueprintRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const blueprint = await prisma.organizationBlueprint.findUnique({ where: blueprintScope(organizationId) });
  response.json(blueprint ? mapBlueprint(blueprint) : null);
});

organizationBlueprintRouter.post("/", requireBlueprintWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const input = organizationBlueprintSchema.parse(request.body);
  const blueprint = await prisma.organizationBlueprint.upsert({
    where: blueprintScope(organizationId),
    create: { organizationId, ...input, status: "DRAFT" },
    update: { ...input, status: "DRAFT" },
  });
  response.json(mapBlueprint(blueprint));
});

organizationBlueprintRouter.post("/approve", requireBlueprintWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const existing = await prisma.organizationBlueprint.findUnique({ where: blueprintScope(organizationId) });
  if (!existing) throw new HttpError("Save the blueprint before approving it", 409, "BLUEPRINT_DRAFT_REQUIRED");
  const blueprint = await prisma.organizationBlueprint.update({ where: blueprintScope(organizationId), data: blueprintApprovalUpdate() });
  response.json(mapBlueprint(blueprint));
});
