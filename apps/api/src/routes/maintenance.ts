import { Router } from "express";
import { z } from "zod";
import type { UserRole } from "@simforge/shared";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { runLegacyEmbeddingBackfill } from "../services/legacy-embedding-backfill.js";

const maintenanceRoles: UserRole[] = ["Owner", "Admin"];
const backfillSchema = z.object({
  action: z.literal("repair-sprint19-legacy-embeddings"),
  dryRun: z.boolean().optional().default(false),
});

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth, requireWorkspace);

maintenanceRouter.post("/sprint19-legacy-embedding-backfill", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!maintenanceRoles.includes(role)) {
    throw new HttpError("Only Owners and Admins can run maintenance repairs", 403, "MAINTENANCE_DENIED");
  }
  const input = backfillSchema.parse(request.body);
  const result = await runLegacyEmbeddingBackfill(organizationId, { dryRun: input.dryRun });
  response.json(result);
});
