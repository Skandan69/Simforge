import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

const env = getEnv();

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
