import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL"),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "SUPABASE_PUBLISHABLE_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  WEB_URL: z.url().default("http://localhost:3000"),
  FRONTEND_URL: z.url().optional(),
  AI_PROVIDER: z.enum(["disabled", "openai"]).default("disabled"),
  OPENAI_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(100).max(8_000).default(1_200),
  AI_HISTORY_LIMIT: z.coerce.number().int().min(2).max(40).default(16),
  AI_SESSION_MESSAGE_LIMIT: z.coerce.number().int().min(4).max(200).default(80),
  AI_KNOWLEDGE_SECTION_LIMIT: z.coerce.number().int().min(1).max(30).default(8),
});

let parsedEnv: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  parsedEnv ??= envSchema.parse(process.env);
  return parsedEnv;
}
