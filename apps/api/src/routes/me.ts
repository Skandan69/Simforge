import { Router } from "express";
import type { CurrentUserResponse } from "@simforge/shared";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { ensureProfile } from "../services/profile.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (request, response) => {
  const user = (request as AuthenticatedRequest).authUser;
  const profile = await ensureProfile(user);
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { organization: true },
  });

  const payload: CurrentUserResponse = {
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
    },
    organization: membership?.organization ?? null,
    role: membership?.role ?? null,
  };

  response.json(payload);
});
