import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { getEnv } from "../config/env.js";

function createPrismaClient() {
  const env = getEnv();
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX });
  return new PrismaClient({ adapter });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientSingleton };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (getEnv().NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
