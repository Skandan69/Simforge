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

export const app = express();
const env = getEnv();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_URL, credentials: true }));
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
  });
});

app.use("/api/me", meRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/knowledge-bases", knowledgeBasesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/knowledge-search", knowledgeSearchRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.flatten().fieldErrors });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "An unexpected error occurred" });
});
