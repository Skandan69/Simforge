import { z } from "zod";
import type { OrganizationBlueprintInput, OrganizationBlueprintResponse } from "@simforge/shared";

export const TRAINING_GOALS = ["Customer Service", "Sales", "Compliance", "Leadership", "Product Knowledge", "Technical Skills", "Communication", "Onboarding"] as const;
export const BLUEPRINT_CAPABILITIES = ["Communication", "Product Knowledge", "Policy Compliance", "Empathy", "Problem Solving", "Decision Making"] as const;

export const organizationBlueprintSchema = z.object({
  industry: z.string().trim().min(2).max(80),
  teamSizeRange: z.string().trim().min(1).max(40),
  primaryTrainingGoals: z.array(z.enum(TRAINING_GOALS)).min(1).max(TRAINING_GOALS.length),
  priorityCapabilities: z.array(z.object({ capability: z.enum(BLUEPRINT_CAPABILITIES), priority: z.enum(["High", "Medium", "Low"]) })).length(BLUEPRINT_CAPABILITIES.length).superRefine((items, context) => {
    if (new Set(items.map((item) => item.capability)).size !== BLUEPRINT_CAPABILITIES.length) context.addIssue({ code: "custom", message: "Rate each capability once" });
  }),
  criticalDocumentsNotes: z.string().trim().max(2_000),
  successDefinition: z.string().trim().min(3).max(2_000),
  costlyMistakes: z.string().trim().min(3).max(2_000),
  nonNegotiables: z.string().trim().min(3).max(2_000),
}) satisfies z.ZodType<OrganizationBlueprintInput>;

export function blueprintScope(organizationId: string) {
  return { organizationId } as const;
}

export function blueprintApprovalUpdate() {
  return { status: "APPROVED" as const };
}

type BlueprintRecord = OrganizationBlueprintInput & {
  id: string;
  organizationId: string;
  status: "DRAFT" | "APPROVED";
  createdAt: Date;
  updatedAt: Date;
};

export function mapBlueprint(record: Omit<BlueprintRecord, "primaryTrainingGoals" | "priorityCapabilities"> & { primaryTrainingGoals: unknown; priorityCapabilities: unknown }): OrganizationBlueprintResponse {
  return {
    ...record,
    primaryTrainingGoals: record.primaryTrainingGoals as string[],
    priorityCapabilities: record.priorityCapabilities as OrganizationBlueprintInput["priorityCapabilities"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
