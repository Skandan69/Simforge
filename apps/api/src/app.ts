import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { API_SERVICE_NAME } from "@simforge/shared";
import { getEnv } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { documentsRouter } from "./routes/documents.js";
import { knowledgeBasesRouter } from "./routes/knowledge-bases.js";
import { knowledgeSearchRouter } from "./routes/knowledge-search.js";
import { meRouter } from "./routes/me.js";
import { organizationsRouter } from "./routes/organizations.js";
import { organizationBlueprintRouter } from "./routes/organization-blueprint.js";
import { processingRouter } from "./routes/processing.js";
import {
  simulationCriteriaRouter,
  simulationPersonasRouter,
  simulationsRouter,
} from "./routes/simulations.js";
import { simulationSessionsRouter } from "./routes/simulation-sessions.js";
import { capabilityProfileRouter } from "./routes/capability-profile.js";
import { learningFactoryRouter } from "./routes/learning-factory.js";
import { simulationCoachingRouter } from "./routes/simulation-coaching.js";
import { sophiaAskRouter } from "./routes/sophia-ask.js";
import { managerIntelligenceRouter } from "./routes/manager-intelligence.js";
import { myPracticeRouter } from "./routes/my-practice.js";
import { assessmentsRouter } from "./routes/assessments.js";
import { myAssessmentsRouter } from "./routes/my-assessments.js";
import { developmentPathsRouter, myDevelopmentRouter } from "./routes/development-paths.js";
import { getAIProviderStatus } from "./ai/provider.js";
import { getVoiceProviderStatus } from "./ai/voice-provider.js";
import { getEmbeddingProviderStatus } from "./ai/embedding-provider.js";
import { startRequestTiming } from "./lib/request-timing.js";
import { createAiRateLimit, createApiRateLimit } from "./middleware/rate-limits.js";

export const app = express();
const env = getEnv();
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  new URL(env.WEB_URL).origin,
  ...(env.FRONTEND_URL ? [new URL(env.FRONTEND_URL).origin] : []),
]);

app.disable("x-powered-by");
// Render (and most PaaS) put one load balancer in front of the app. Without this,
// req.ip is the proxy's address and every user shares one rate-limit bucket.
app.set("trust proxy", env.TRUST_PROXY_HOPS ?? (env.NODE_ENV === "production" ? 1 : 0));
app.use(startRequestTiming);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", createApiRateLimit(env.API_RATE_LIMIT_PER_MINUTE));
app.use(
  ["/api/simulation-sessions", "/api/sophia", "/api/learning-factory"],
  createAiRateLimit(env.AI_RATE_LIMIT_PER_MINUTE),
);

// Public liveness probe: deliberately minimal so it does not reveal providers,
// model names or the deployed commit to anonymous callers.
app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok", service: API_SERVICE_NAME });
});

// Operational diagnostics, only when HEALTH_DETAILS_TOKEN is set and supplied.
app.get("/health/details", (request, response) => {
  const token = env.HEALTH_DETAILS_TOKEN;
  if (!token || request.get("x-health-token") !== token) {
    response.status(404).json({ error: "Route not found" });
    return;
  }
  response.status(200).json({
    status: "ok",
    service: API_SERVICE_NAME,
    ai: getAIProviderStatus(),
    voice: getVoiceProviderStatus(),
    embeddings: getEmbeddingProviderStatus(),
    deployment: {
      render: process.env.RENDER === "true",
      branch: process.env.RENDER_GIT_BRANCH ?? null,
      commit: process.env.RENDER_GIT_COMMIT ?? null,
      service: process.env.RENDER_SERVICE_NAME ?? null,
      region: process.env.RENDER_REGION ?? null,
    },
  });
});

app.use("/api/me", meRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/organization-blueprint", organizationBlueprintRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/knowledge-bases", knowledgeBasesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/knowledge-search", knowledgeSearchRouter);
app.use("/api/processing", processingRouter);
app.use("/api/simulations", simulationsRouter);
app.use("/api/simulation-personas", simulationPersonasRouter);
app.use("/api/simulation-criteria", simulationCriteriaRouter);
app.use("/api/simulation-sessions", simulationSessionsRouter);
app.use("/api/simulation-sessions", simulationCoachingRouter);
app.use("/api/capability-profile", capabilityProfileRouter);
app.use("/api/learning-factory", learningFactoryRouter);
app.use("/api/sophia", sophiaAskRouter);
app.use("/api/manager-intelligence", managerIntelligenceRouter);
app.use("/api/my-practice", myPracticeRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api/my-assessments", myAssessmentsRouter);
app.use("/api/development-paths", developmentPathsRouter);
app.use("/api/my-development", myDevelopmentRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.use(
  (
    error: unknown,
    request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Invalid request",
        details: error.flatten().fieldErrors,
      });
      return;
    }

    if (error instanceof HttpError) {
      response
        .status(error.status)
        .json({ error: error.message, code: error.code });
      return;
    }

    const failure =
      error instanceof Error
        ? { errorType: error.name, message: error.message }
        : { errorType: "UnknownError", message: String(error) };
    console.error("Unhandled API request failure", {
      method: request.method,
      path: request.originalUrl,
      ...failure,
    });
    response.status(500).json({
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    });
  },
);
