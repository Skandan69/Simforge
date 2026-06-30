import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/simforge";

export default defineConfig({
  schema: "database/prisma/schema.prisma",
  migrations: {
    path: "database/prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
