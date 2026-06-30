"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "./form-message";

export function LoginForm({ next = "/dashboard", initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.push(next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormMessage message={error} />
      <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link></div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted-foreground">New to SimForge? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link></p>
    </form>
  );
}
