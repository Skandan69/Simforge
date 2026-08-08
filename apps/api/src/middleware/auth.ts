import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";
import { timeRequestStage } from "../lib/request-timing.js";
import { TtlCache } from "../lib/ttl-cache.js";

export interface AuthenticatedRequest extends Request {
  authUser: User;
}

const authUserCache = new TtlCache<string, User>(15_000);

export const requireAuth: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  const cachedUser = authUserCache.get(token);
  const user = cachedUser ?? await timeRequestStage(request, "auth.validation", async () => {
    const { data, error } = await authUserCache.getOrSet(token, async () => {
      const result = await supabase.auth.getUser(token);
      if (result.error || !result.data.user) throw new Error("AUTH_TOKEN_INVALID");
      return result.data.user;
    }).then((cached) => ({ data: { user: cached }, error: null })).catch((error: unknown) => ({ data: { user: null }, error }));
    if (error || !data.user) return null;
    return data.user;
  });

  if (!user) {
    response.status(401).json({ error: "Your session is invalid or has expired" });
    return;
  }

  (request as AuthenticatedRequest).authUser = user;
  next();
};
