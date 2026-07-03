import { raw, Router } from "express";
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
  canStartSimulation,
  createPlaceholderAiResponse,
  createPlaceholderOpeningMessage,
  sessionScope,
} from "../services/simulation-runtime.js";
import { prepareCapabilityProfileUpdate, updateLearnerCapabilityProfile } from "../services/capability-profile.js";
import { getEnv } from "../config/env.js";
import { getAIProvider } from "../ai/provider.js";
import { buildSophiaSystemPrompt } from "../ai/prompt-builder.js";
import { loadSophiaPromptContext } from "../ai/sophia-context.js";
import { generateSophiaEvaluation, generateSophiaReply } from "../ai/sophia-service.js";
import type { AIConversationMessage } from "../ai/types.js";
import { getVoiceProviders } from "../ai/voice-provider.js";
import { transcriptionFailureMessage, validateVoiceRecording, VoiceRecordingError } from "../services/voice-recording.js";

const sessionIdSchema = z.string().uuid();
const includeReport = {
  simulation: {
    select: {
      id: true,
      title: true,
      description: true,
      scenarioSetup: true,
      estimatedMinutes: true,
      status: true,
      persona: { select: { id: true, name: true, role: true, tone: true } },
    },
  },
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

simulationSessionsRouter.get(
  "/simulations/:simulationId",
  async (request, response) => {
    const { organizationId, role } = getWorkspaceRequest(request).workspace;
    const simulationId = z.string().uuid().parse(request.params.simulationId);
    const simulation = await prisma.simulation.findFirst({
      where: { id: simulationId, organizationId },
      select: includeReport.simulation.select,
    });
    if (!simulation || !canStartSimulation(role, simulation.status))
      throw new HttpError(
        "Simulation is not available to run",
        404,
        "SIMULATION_NOT_AVAILABLE",
      );
    response.json(simulation);
  },
);

simulationSessionsRouter.post("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const { simulationId } = z
    .object({ simulationId: z.string().uuid() })
    .parse(request.body);
  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, organizationId },
    select: { id: true, title: true, status: true, persona: { select: { role: true } } },
  });
  if (!simulation || !canStartSimulation(role, simulation.status))
    throw new HttpError(
      "Simulation is not available to run",
      404,
      "SIMULATION_NOT_AVAILABLE",
    );
  const openingMessage = await generateSophiaReply({
    provider: getAIProvider(),
    systemPrompt: async () => buildSophiaSystemPrompt(await loadSophiaPromptContext({ organizationId, learnerId: user.id, simulationId: simulation.id })),
    messages: [{ role: "learner", content: "Begin the scenario now in the configured counterpart role. Open with one concise, realistic statement or question for the learner." }],
    fallback: () => createPlaceholderOpeningMessage(simulation.title, simulation.persona?.role),
    personaRole: simulation.persona?.role,
  });
  const session = await prisma.simulationSession.create({
    data: {
      organizationId,
      simulationId: simulation.id,
      learnerId: user.id,
      messages: {
        create: [
          {
            role: "system",
            content: `Simulation session started for ${simulation.title}.`,
          },
          {
            role: "ai",
            content: openingMessage,
          },
        ],
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
  if (session.messages.length >= getEnv().AI_SESSION_MESSAGE_LIMIT)
    throw new HttpError("This simulation has reached its conversation limit. End the simulation to generate your report.", 409, "SESSION_MESSAGE_LIMIT");
  const learnerMessage = await prisma.simulationMessage.create({ data: { sessionId: session.id, role: "learner", content } });
  const history: AIConversationMessage[] = [...session.messages, learnerMessage]
    .filter((message): message is typeof message & { role: "learner" | "ai" } => message.role === "learner" || message.role === "ai")
    .slice(-getEnv().AI_HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
  const aiContent = await generateSophiaReply({
    provider: getAIProvider(),
    systemPrompt: async () => buildSophiaSystemPrompt(await loadSophiaPromptContext({ organizationId, learnerId: session.learnerId, simulationId: session.simulationId })),
    messages: history,
    fallback: () => createPlaceholderAiResponse(session.simulation.title),
    personaRole: session.simulation.persona?.role,
  });
  const aiMessage = await prisma.simulationMessage.create({ data: { sessionId: session.id, role: "ai", content: aiContent } });
  response.status(201).json({ learnerMessage, aiMessage });
});

simulationSessionsRouter.post(
  "/:id/voice/transcribe",
  raw({ type: (request) => request.headers["content-type"]?.toLowerCase().startsWith("audio/") ?? false, limit: getEnv().VOICE_MAX_AUDIO_BYTES }),
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const user = getWorkspaceRequest(request).authUser;
    const session = await getSession(sessionIdSchema.parse(request.params.id), organizationId);
    if (session.learnerId !== user.id) throw new HttpError("Only the session learner can transcribe audio", 403, "SESSION_VOICE_DENIED");
    if (session.status !== "IN_PROGRESS") throw new HttpError("This simulation session is no longer in progress", 409, "SESSION_NOT_ACTIVE");
    const rawMimeType = request.headers["content-type"] ?? "";
    const byteSize = Buffer.isBuffer(request.body) ? request.body.length : 0;
    const durationHeader = request.get("x-audio-duration-ms");
    const durationValue = durationHeader ? Number(durationHeader) : undefined;
    const durationMs = durationValue !== undefined && Number.isFinite(durationValue) && durationValue >= 0 ? Math.round(durationValue) : undefined;
    let recording: { mimeType: string; extension: string };
    try {
      recording = validateVoiceRecording({ mimeType: rawMimeType, byteSize, durationMs, minimumBytes: getEnv().VOICE_MIN_AUDIO_BYTES, minimumDurationMs: getEnv().VOICE_MIN_DURATION_MS });
    } catch (error) {
      if (error instanceof VoiceRecordingError) throw new HttpError(error.message, 400, error.code);
      throw error;
    }
    const provider = getVoiceProviders()?.speechToText;
    if (!provider) throw new HttpError("Voice transcription is not configured. Continue in text mode.", 503, "VOICE_TRANSCRIPTION_UNAVAILABLE");
    const safeMetadata = { provider: provider.name, operation: "transcription", mimeType: recording.mimeType, byteSize, durationMs };
    console.info("Sophia voice provider called", safeMetadata);
    try {
      const transcript = await provider.transcribe({ audio: request.body, mimeType: recording.mimeType, fileName: `recording.${recording.extension}` });
      console.info("Sophia voice provider succeeded", safeMetadata);
      response.json({ transcript });
    } catch (error) {
      console.error("Sophia voice provider failed", { ...safeMetadata, errorCategory: error instanceof Error && error.name === "AbortError" ? "timeout" : "provider_failure", errorType: error instanceof Error ? error.name : "UnknownError" });
      throw new HttpError(transcriptionFailureMessage, 502, "VOICE_TRANSCRIPTION_FAILED");
    }
  },
);

simulationSessionsRouter.post("/:id/voice/speech", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const session = await getSession(sessionIdSchema.parse(request.params.id), organizationId);
  if (session.learnerId !== user.id) throw new HttpError("Only the session learner can generate simulation audio", 403, "SESSION_VOICE_DENIED");
  const { messageId } = z.object({ messageId: z.string().uuid() }).parse(request.body);
  const message = session.messages.find((item) => item.id === messageId && item.role === "ai");
  if (!message) throw new HttpError("Sophia message not found", 404, "SOPHIA_MESSAGE_NOT_FOUND");
  const provider = getVoiceProviders()?.textToSpeech;
  if (!provider) throw new HttpError("Voice playback is not configured. The text response remains available.", 503, "VOICE_SPEECH_UNAVAILABLE");
  console.info("Sophia voice provider called", { provider: provider.name, operation: "speech" });
  try {
    const result = await provider.synthesize({ text: message.content });
    console.info("Sophia voice provider succeeded", { provider: provider.name, operation: "speech" });
    response.setHeader("Content-Type", result.contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(Buffer.from(result.audio));
  } catch (error) {
    console.error("Sophia voice provider failed", { provider: provider.name, operation: "speech", errorType: error instanceof Error ? error.name : "UnknownError" });
    throw new HttpError("Sophia audio is unavailable. Continue with the text response.", 502, "VOICE_SPEECH_FAILED");
  }
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
  const transcript: AIConversationMessage[] = session.messages
    .filter((message): message is typeof message & { role: "learner" | "ai" } => message.role === "learner" || message.role === "ai")
    .slice(-getEnv().AI_HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content }));
  const result = await generateSophiaEvaluation({
    provider: getAIProvider(),
    systemPrompt: async () => buildSophiaSystemPrompt(await loadSophiaPromptContext({ organizationId, learnerId: session.learnerId, simulationId: session.simulationId })),
    transcript,
    fallback: () => buildDeterministicEvaluation(learnerMessages),
  });
  const assessedAt = new Date();
  const [existingHistory, capabilityProfile] = await Promise.all([
    prisma.capabilityAssessmentHistory.findFirst({
      where: { sessionId: session.id },
      select: { id: true },
    }),
    prisma.learnerCapabilityProfile.findUnique({
      where: { organizationId_learnerId: { organizationId, learnerId: session.learnerId } },
      include: { capabilities: true },
    }),
  ]);
  const capabilityUpdate = prepareCapabilityProfileUpdate(
    capabilityProfile,
    Boolean(existingHistory),
    result.capabilityScores,
  );
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
    await updateLearnerCapabilityProfile(transaction, {
      organizationId,
      learnerId: session.learnerId,
      sessionId: session.id,
      assessedAt,
      scores: result.capabilityScores,
    }, capabilityUpdate);
    await transaction.simulationSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: assessedAt,
        overallScore: result.overallScore,
      },
    });
  }, { timeout: 15_000 });
  response.json(await getSession(session.id, organizationId));
});
