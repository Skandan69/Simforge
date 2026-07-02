import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { rankKnowledgeSections } from "./knowledge-retrieval.js";

export interface SophiaPromptContext {
  organizationBlueprint: null | { industry: string; teamSizeRange: string; primaryTrainingGoals: unknown; priorityCapabilities: unknown; successDefinition: string; costlyMistakes: string; nonNegotiables: string };
  simulation: { title: string; description: string; scenarioSetup: string; successCriteria: string; difficulty: string; objectives: string[]; persona: null | { name: string; role: string; personality: string; tone: string; difficultyBehavior: string; backgroundContext: string } };
  knowledgeSections: Array<{ title: string; summary: string; sectionType: string; importance: string; confidence: number; keywords: string[]; capabilities: string[] }>;
  learnerProfile: null | { overallScore: number; trend: string; confidence: string; simulationCount: number; capabilities: Array<{ name: string; score: number; change: number }> };
}

export async function loadSophiaPromptContext(input: { organizationId: string; learnerId: string; simulationId: string }): Promise<SophiaPromptContext> {
  const simulation = await prisma.simulation.findFirst({
    where: { id: input.simulationId, organizationId: input.organizationId },
    include: { persona: true, objectives: { orderBy: { sortOrder: "asc" } }, knowledgeBases: { select: { knowledgeBaseId: true } } },
  });
  if (!simulation) throw new Error("Simulation context not found");
  const knowledgeBaseIds = simulation.knowledgeBases.map((link) => link.knowledgeBaseId);
  const [blueprint, profile, candidates] = await Promise.all([
    prisma.organizationBlueprint.findFirst({ where: { organizationId: input.organizationId, status: "APPROVED" }, select: { industry: true, teamSizeRange: true, primaryTrainingGoals: true, priorityCapabilities: true, successDefinition: true, costlyMistakes: true, nonNegotiables: true } }),
    prisma.learnerCapabilityProfile.findUnique({ where: { organizationId_learnerId: { organizationId: input.organizationId, learnerId: input.learnerId } }, include: { capabilities: true } }),
    knowledgeBaseIds.length ? prisma.knowledgeIntelligenceSection.findMany({ where: { sectionType: { not: "Unknown" }, confidence: { gte: 0.5 }, source: { organizationId: input.organizationId, document: { knowledgeBaseId: { in: knowledgeBaseIds } } } }, select: { id: true, title: true, summary: true, sectionType: true, importance: true, confidence: true, keywords: true, capabilities: true }, orderBy: { confidence: "desc" }, take: 40 }) : [],
  ]);
  const query = `${simulation.title} ${simulation.description} ${simulation.scenarioSetup} ${simulation.objectives.map((objective) => objective.title).join(" ")}`;
  return {
    organizationBlueprint: blueprint,
    simulation: { title: simulation.title, description: simulation.description, scenarioSetup: simulation.scenarioSetup, successCriteria: simulation.successCriteria, difficulty: simulation.difficulty, objectives: simulation.objectives.map((objective) => objective.title), persona: simulation.persona ? { name: simulation.persona.name, role: simulation.persona.role, personality: simulation.persona.personality, tone: simulation.persona.tone, difficultyBehavior: simulation.persona.difficultyBehavior, backgroundContext: simulation.persona.backgroundContext } : null },
    knowledgeSections: rankKnowledgeSections(candidates, query, getEnv().AI_KNOWLEDGE_SECTION_LIMIT),
    learnerProfile: profile ? { overallScore: profile.overallScore, trend: profile.trend, confidence: profile.confidence, simulationCount: profile.simulationCount, capabilities: profile.capabilities.map((capability) => ({ name: capability.capabilityName, score: capability.currentScore, change: capability.change })) } : null,
  };
}
