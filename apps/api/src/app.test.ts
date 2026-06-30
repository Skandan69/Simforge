import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import type { UserRole } from "@simforge/shared";

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/simforge";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_test";
process.env.WEB_URL = "http://localhost:3000";

const { app } = await import("./app.js");
const { requireKnowledgeWrite } = await import("./middleware/workspace.js");
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("health endpoint reports the API service", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "simforge-api" });
});

test("Knowledge Studio endpoints require authentication", async () => {
  for (const path of ["/api/knowledge-bases", "/api/documents", "/api/knowledge-search?q=policy"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, path);
  }
});

function authorize(role: UserRole) {
  let status = 200;
  let body: unknown;
  let nextCalled = false;
  const request = { workspace: { organizationId: "00000000-0000-0000-0000-000000000000", role } } as unknown as Request;
  const response = {
    status(value: number) { status = value; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  requireKnowledgeWrite(request, response, () => { nextCalled = true; });
  return { status, body, nextCalled };
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
    assert.deepEqual(result.body, { error: "Your role has read-only access to Knowledge Studio", code: "READ_ONLY_ROLE" });
  }
});
