import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { CreateOrganizationInput, CurrentUserResponse } from "@simforge/shared";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { ensureProfile } from "../services/profile.js";

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(2).max(80),
  companySize: z.string().trim().min(1).max(40),
  country: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(1).max(80),
  logoUrl: z.url().optional(),
}) satisfies z.ZodType<CreateOrganizationInput>;

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${base || "organization"}-${randomUUID().slice(0, 6)}`;
}

export const organizationsRouter = Router();

organizationsRouter.post("/", requireAuth, async (request, response) => {
  const user = (request as AuthenticatedRequest).authUser;
  const input = organizationSchema.parse(request.body);
  const existingMembership = await prisma.membership.findFirst({ where: { userId: user.id } });

  if (existingMembership) {
    response.status(409).json({ error: "You already belong to an organization" });
    return;
  }

  const profile = await ensureProfile(user);
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: createSlug(input.name),
      industry: input.industry,
      companySize: input.companySize,
      country: input.country,
      timezone: input.timezone,
      logoUrl: input.logoUrl,
      createdBy: profile.id,
      memberships: {
        create: {
          userId: profile.id,
          role: "Owner",
        },
      },
      activities: {
        create: {
          actorId: profile.id,
          action: "organization.created",
          description: `${input.name} workspace created`,
        },
      },
    },
  });

  const payload: CurrentUserResponse = {
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
    },
    organization,
    role: "Owner",
  };

  response.status(201).json(payload);
});
