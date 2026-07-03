import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
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
import { getAIProviderStatus } from "./ai/provider.js";
import { getVoiceProviderStatus } from "./ai/voice-provider.js";

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
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: API_SERVICE_NAME,
    ai: getAIProviderStatus(),
    voice: getVoiceProviderStatus(),
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

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
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

    console.error(error);
    response.status(500).json({ error: "An unexpected error occurred" });
  },
);
