import type { Request, RequestHandler } from "express";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";
import { timeRequestStage } from "../lib/request-timing.js";

export interface AuthenticatedRequest extends Request {
  authUser: User;
}

export const requireAuth: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  const { data, error } = await timeRequestStage(request, "auth.validation", () => supabase.auth.getUser(token));

  if (error || !data.user) {
    response.status(401).json({ error: "Your session is invalid or has expired" });
    return;
  }

  (request as AuthenticatedRequest).authUser = data.user;
  next();
};
