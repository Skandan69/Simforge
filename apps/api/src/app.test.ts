import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import type { UserRole } from "@simforge/shared";

process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/simforge";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
process.env.WEB_URL = "http://localhost:3000";
process.env.FRONTEND_URL = "https://simforge-web-pi.vercel.app";

const { app } = await import("./app.js");
const { requireKnowledgeWrite, requireSimulationRead, requireSimulationWrite } =
  await import("./middleware/workspace.js");
const { requireBlueprintWrite } = await import("./routes/organization-blueprint.js");
const { requireLearningFactorySimulationPublish, requireLearningFactoryWrite } = await import("./routes/learning-factory.js");
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

test("health endpoint reports the API service", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = await response.json() as { status: string; service: string; ai: { provider: string; configured: boolean; reason: string }; voice: { sttConfigured: boolean; ttsConfigured: boolean; ttsVoice: string }; embeddings: { provider: string; configured: boolean; model: string; dimensions: number; indexDimensions: number; dimensionMatches: boolean }; deployment: { render: boolean; branch: string | null; commit: string | null; service: string | null; region: string | null } };
  assert.equal(body.status, "ok");
  assert.equal(body.service, "simforge-api");
  assert.equal(body.ai.configured, body.ai.provider === "openai");
  assert.equal(["configured", "credentials_missing", "provider_disabled"].includes(body.ai.reason), true);
  assert.equal(body.voice.sttConfigured, body.ai.configured);
  assert.equal(body.voice.ttsConfigured, body.ai.configured);
  assert.ok(body.voice.ttsVoice.length > 0);
  assert.equal(body.embeddings.dimensions, 1536);
  assert.equal(body.embeddings.indexDimensions, 1536);
  assert.equal(body.embeddings.dimensionMatches, true);
  assert.equal(typeof body.deployment.render, "boolean");
  assert.equal(JSON.stringify(body).includes("OPENAI_API_KEY"), false);
});

test("CORS allows production and local frontends while rejecting unknown origins", async () => {
  for (const origin of [
    "https://simforge-web-pi.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
  ]) {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: origin },
    });
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(
      response.headers.get("access-control-allow-credentials"),
      "true",
    );
  }
  const rejected = await fetch(`${baseUrl}/health`, {
    headers: { Origin: "https://untrusted.example.com" },
  });
  assert.equal(rejected.headers.get("access-control-allow-origin"), null);
});

test("Knowledge Studio endpoints require authentication", async () => {
  for (const path of [
    "/api/knowledge-bases",
    "/api/documents",
    "/api/knowledge-search?q=policy",
    "/api/processing/dashboard",
    "/api/processing/documents/00000000-0000-0000-0000-000000000000/status",
    "/api/documents/00000000-0000-0000-0000-000000000000/intelligence",
    "/api/organization-blueprint",
    "/api/sophia/ask",
    "/api/manager-intelligence/overview",
    "/api/my-practice",
    "/api/assessments",
    "/api/my-assessments",
    "/api/manager-intelligence/learners",
    "/api/manager-intelligence/assignments",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
  }
});

test("Simulation Studio endpoints require authentication", async () => {
  for (const path of [
    "/api/simulations",
    "/api/simulations/dashboard",
    "/api/simulation-personas",
    "/api/simulation-personas/templates",
    "/api/simulation-criteria",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
  }
});

test("Sophia simulation session endpoints require authentication", async () => {
  for (const path of [
    "/api/simulation-sessions",
    "/api/simulation-sessions/00000000-0000-0000-0000-000000000000",
    "/api/simulation-sessions/simulations/00000000-0000-0000-0000-000000000000",
    "/api/capability-profile",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
  }
});

test("Sophia conversation and evaluation mutations require authentication", async () => {
  for (const path of [
    "/api/simulation-sessions/00000000-0000-0000-0000-000000000000/messages",
    "/api/simulation-sessions/00000000-0000-0000-0000-000000000000/evaluate",
    "/api/simulation-sessions/00000000-0000-0000-0000-000000000000/voice/transcribe",
    "/api/simulation-sessions/00000000-0000-0000-0000-000000000000/voice/speech",
    "/api/simulation-personas/templates/angry-customer/install",
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401, path);
  }
});

test("AI Coach endpoints require authentication", async () => {
  const path = "/api/simulation-sessions/00000000-0000-0000-0000-000000000000/coach";
  for (const method of ["GET", "POST"] as const) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    assert.equal(response.status, 401, method);
  }
});

test("Learning Factory endpoints require authentication", async () => {
  for (const [path, method] of [["/api/learning-factory/drafts", "GET"], ["/api/learning-factory/generate", "POST"], ["/api/learning-factory/drafts/00000000-0000-0000-0000-000000000000/publish-simulation", "POST"]] as const) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    assert.equal(response.status, 401, path);
  }
});

test("Assessment Studio endpoints require authentication", async () => {
  for (const [path, method] of [
    ["/api/assessments", "GET"],
    ["/api/assessments", "POST"],
    ["/api/assessments/00000000-0000-0000-0000-000000000000/activate", "POST"],
    ["/api/assessments/00000000-0000-0000-0000-000000000000/assignments", "POST"],
    ["/api/my-assessments", "GET"],
    ["/api/my-assessments/00000000-0000-0000-0000-000000000000/start", "POST"],
  ] as const) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    assert.equal(response.status, 401, path);
  }
});

function authorize(role: UserRole) {
  let status = 200;
  let body: unknown;
  let nextCalled = false;
  const request = {
    workspace: { organizationId: "00000000-0000-0000-0000-000000000000", role },
  } as unknown as Request;
  const response = {
    status(value: number) {
      status = value;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;
  requireKnowledgeWrite(request, response, () => {
    nextCalled = true;
  });
  return { status, body, nextCalled };
}

function invokePermission(
  role: UserRole,
  middleware: typeof requireSimulationRead,
) {
  let status = 200;
  let nextCalled = false;
  const request = {
    workspace: { organizationId: "00000000-0000-0000-0000-000000000000", role },
  } as unknown as Request;
  const response = {
    status(value: number) {
      status = value;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  middleware(request, response, () => {
    nextCalled = true;
  });
  return { status, nextCalled };
}

test("Owner, Admin, and Trainer have Knowledge Studio write access", () => {
  for (const role of ["Owner", "Admin", "Trainer"] as UserRole[]) {
    assert.equal(authorize(role).nextCalled, true, role);
  }
});

test("Manager and Learner are enforced as read-only", () => {
  for (const role of ["Manager", "Learner"] as UserRole[]) {
    const result = authorize(role);
    assert.equal(result.nextCalled, false, role);
    assert.equal(result.status, 403, role);
    assert.deepEqual(result.body, {
      error: "Your role has read-only access to Knowledge Studio",
      code: "READ_ONLY_ROLE",
    });
  }
});

test("Simulation Studio permissions allow trainers, keep managers read-only, and exclude learners", () => {
  for (const role of ["Owner", "Admin", "Trainer"] as UserRole[]) {
    assert.equal(
      invokePermission(role, requireSimulationRead).nextCalled,
      true,
    );
    assert.equal(
      invokePermission(role, requireSimulationWrite).nextCalled,
      true,
    );
  }
  assert.equal(
    invokePermission("Manager", requireSimulationRead).nextCalled,
    true,
  );
  assert.equal(invokePermission("Manager", requireSimulationWrite).status, 403);
  assert.equal(invokePermission("Learner", requireSimulationRead).status, 403);
  assert.equal(invokePermission("Learner", requireSimulationWrite).status, 403);
});

test("only Owners and Admins can change the organization blueprint", () => {
  for (const role of ["Owner", "Admin"] as UserRole[]) {
    assert.equal(invokePermission(role, requireBlueprintWrite).nextCalled, true, role);
  }
  for (const role of ["Trainer", "Manager", "Learner"] as UserRole[]) {
    const result = invokePermission(role, requireBlueprintWrite);
    assert.equal(result.nextCalled, false, role);
    assert.equal(result.status, 403, role);
  }
});

test("only Owners and Admins can manage Learning Factory drafts", () => {
  for (const role of ["Owner", "Admin"] as UserRole[]) assert.equal(invokePermission(role, requireLearningFactoryWrite).nextCalled, true, role);
  for (const role of ["Trainer", "Manager", "Learner"] as UserRole[]) assert.equal(invokePermission(role, requireLearningFactoryWrite).status, 403, role);
});

test("Owners, Admins, Trainers, and Managers can create simulations from approved Learning Factory drafts", () => {
  for (const role of ["Owner", "Admin", "Trainer", "Manager"] as UserRole[]) assert.equal(invokePermission(role, requireLearningFactorySimulationPublish).nextCalled, true, role);
  assert.equal(invokePermission("Learner", requireLearningFactorySimulationPublish).status, 403);
});
