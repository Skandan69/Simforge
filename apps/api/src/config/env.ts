import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "SUPABASE_PUBLISHABLE_KEY is required"),
  WEB_URL: z.url().default("http://localhost:3000"),
});

let parsedEnv: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  parsedEnv ??= envSchema.parse(process.env);
  return parsedEnv;
}
