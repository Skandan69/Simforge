import { createClient } from "@/lib/supabase/client";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError("Authentication required", 401);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => ({})) as { error?: string; code?: string };

  if (!response.ok) {
    throw new ApiError(body.error ?? "Request failed", response.status, body.code);
  }

  return body as T;
}
