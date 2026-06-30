import { Router } from "express";
import type { DashboardResponse } from "@simforge/shared";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, async (request, response) => {
  const user = (request as AuthenticatedRequest).authUser;
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { organization: true },
  });

  if (!membership) {
    response.status(404).json({
      error: "Organization setup is required",
      code: "ORGANIZATION_REQUIRED",
    });
    return;
  }

  const [users, activities]: [number, Array<{
    id: string;
    action: string;
    description: string;
    createdAt: Date;
    actor: { fullName: string | null; email: string } | null;
  }>] = await Promise.all([
    prisma.membership.count({ where: { organizationId: membership.organizationId } }),
    prisma.activity.findMany({
      where: { organizationId: membership.organizationId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { fullName: true, email: true } } },
    }),
  ]);

  const payload: DashboardResponse = {
    organization: membership.organization,
    role: membership.role,
    kpis: {
      users,
      knowledgeBases: 0,
      simulations: 0,
      assessments: 0,
    },
    recentActivity: activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
      actorName: activity.actor?.fullName ?? activity.actor?.email ?? "System",
    })),
  };

  response.json(payload);
});
