"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(String(form.get("email")), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setSuccess("If an account exists for that email, a reset link is on its way.");
    setPending(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormMessage message={error} /><FormMessage message={success} variant="success" />
      <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Sending link…" : "Send reset link"}</Button>
      <Button asChild variant="ghost" className="w-full"><Link href="/login"><ArrowLeft />Back to sign in</Link></Button>
    </form>
  );
}
