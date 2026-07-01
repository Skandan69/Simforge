import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceRequest,
  requireWorkspace,
} from "../middleware/workspace.js";
import {
  buildDeterministicEvaluation,
  canEvaluateSession,
  canReadSession,
  createPlaceholderAiResponse,
  sessionScope,
} from "../services/simulation-runtime.js";

const sessionIdSchema = z.string().uuid();
const includeReport = {
  simulation: { select: { id: true, title: true, status: true } },
  messages: { orderBy: { createdAt: "asc" as const } },
  evaluation: true,
  capabilityScores: { orderBy: { capabilityName: "asc" as const } },
} as const;

export const simulationSessionsRouter = Router();
simulationSessionsRouter.use(requireAuth, requireWorkspace);

async function getSession(id: string, organizationId: string) {
  const session = await prisma.simulationSession.findFirst({
    where: sessionScope(id, organizationId),
    include: includeReport,
  });
  if (!session)
    throw new HttpError(
      "Simulation session not found",
      404,
      "SESSION_NOT_FOUND",
    );
  return session;
}

simulationSessionsRouter.post("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const { simulationId } = z
    .object({ simulationId: z.string().uuid() })
    .parse(request.body);
  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, organizationId, status: "Active" },
    select: { id: true, title: true },
  });
  if (!simulation)
    throw new HttpError(
      "Active simulation not found",
      404,
      "SIMULATION_NOT_AVAILABLE",
    );
  const session = await prisma.simulationSession.create({
    data: {
      organizationId,
      simulationId: simulation.id,
      learnerId: user.id,
      messages: {
        create: {
          role: "system",
          content: `Simulation session started for ${simulation.title}.`,
        },
      },
    },
    include: includeReport,
  });
  response.status(201).json(session);
});

simulationSessionsRouter.get("/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const session = await getSession(
    sessionIdSchema.parse(request.params.id),
    organizationId,
  );
  if (!canReadSession(role, user.id, session.learnerId))
    throw new HttpError(
      "You cannot access this simulation session",
      403,
      "SESSION_ACCESS_DENIED",
    );
  response.json(session);
});

simulationSessionsRouter.post("/:id/messages", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const id = sessionIdSchema.parse(request.params.id);
  const { content } = z
    .object({ content: z.string().trim().min(1).max(8000) })
    .parse(request.body);
  const session = await getSession(id, organizationId);
  if (session.learnerId !== user.id)
    throw new HttpError(
      "Only the session learner can add messages",
      403,
      "SESSION_MESSAGE_DENIED",
    );
  if (session.status !== "IN_PROGRESS")
    throw new HttpError(
      "This simulation session is no longer in progress",
      409,
      "SESSION_NOT_ACTIVE",
    );
  const messages = await prisma.$transaction(async (transaction) => {
    const learnerMessage = await transaction.simulationMessage.create({
      data: { sessionId: session.id, role: "learner", content },
    });
    const aiMessage = await transaction.simulationMessage.create({
      data: {
        sessionId: session.id,
        role: "ai",
        content: createPlaceholderAiResponse(session.simulation.title),
      },
    });
    return { learnerMessage, aiMessage };
  });
  response.status(201).json(messages);
});

simulationSessionsRouter.post("/:id/evaluate", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const session = await getSession(
    sessionIdSchema.parse(request.params.id),
    organizationId,
  );
  if (!canEvaluateSession(role, user.id, session.learnerId))
    throw new HttpError(
      "You cannot evaluate this simulation session",
      403,
      "SESSION_EVALUATION_DENIED",
    );
  if (session.status === "FAILED")
    throw new HttpError(
      "Failed sessions cannot be evaluated",
      409,
      "SESSION_FAILED",
    );
  const learnerMessages = session.messages
    .filter((message) => message.role === "learner")
    .map((message) => message.content);
  if (!learnerMessages.length)
    throw new HttpError(
      "At least one learner message is required before evaluation",
      409,
      "NO_LEARNER_MESSAGES",
    );
  const result = buildDeterministicEvaluation(learnerMessages);
  await prisma.$transaction(async (transaction) => {
    await transaction.simulationEvaluation.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        overallScore: result.overallScore,
        strengths: result.strengths,
        improvementAreas: result.improvementAreas,
        evidence: result.evidence,
        recommendedNextPractice: result.recommendedNextPractice,
      },
      update: {
        overallScore: result.overallScore,
        strengths: result.strengths,
        improvementAreas: result.improvementAreas,
        evidence: result.evidence,
        recommendedNextPractice: result.recommendedNextPractice,
      },
    });
    await transaction.capabilityScore.deleteMany({
      where: { sessionId: session.id },
    });
    await transaction.capabilityScore.createMany({
      data: result.capabilityScores.map((score) => ({
        ...score,
        sessionId: session.id,
      })),
    });
    await transaction.simulationSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        overallScore: result.overallScore,
      },
    });
  });
  response.json(await getSession(session.id, organizationId));
});
