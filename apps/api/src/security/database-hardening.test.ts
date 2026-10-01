import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  API_OWNED_SECURITY_TABLES,
  DIRECT_AUTHENTICATED_TABLES,
  RLS_REQUIRED_TABLES,
  securityHardeningStatements,
} from "./database-hardening.js";

function prismaModelNames() {
  const schema = readFileSync(
    new URL("../../../../database/prisma/schema.prisma", import.meta.url),
    "utf8",
  );
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
}

test("production hardening covers every Prisma business table", () => {
  assert.deepEqual(
    [...RLS_REQUIRED_TABLES].sort(),
    prismaModelNames().sort(),
  );
  assert.deepEqual(DIRECT_AUTHENTICATED_TABLES, ["Membership"]);
  assert.equal(
    (API_OWNED_SECURITY_TABLES as readonly string[]).includes("Membership"),
    false,
  );
});

test("security hardening enables RLS everywhere and revokes direct access from API-owned tables", () => {
  const statements = securityHardeningStatements();

  assert.equal(
    statements.length,
    RLS_REQUIRED_TABLES.length + API_OWNED_SECURITY_TABLES.length * 2,
  );

  for (const table of RLS_REQUIRED_TABLES) {
    assert.ok(
      statements.includes(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
      ),
    );
  }

  for (const table of API_OWNED_SECURITY_TABLES) {
    assert.ok(
      statements.includes(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon`,
      ),
    );
    assert.ok(
      statements.includes(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM authenticated`,
      ),
    );
  }

  assert.equal(
    statements.includes(
      'REVOKE ALL PRIVILEGES ON TABLE public."Membership" FROM authenticated',
    ),
    false,
  );
});
