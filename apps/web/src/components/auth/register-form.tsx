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

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(undefined);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: { full_name: String(form.get("fullName")) },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSuccess("Check your email to confirm your account, then return here to sign in.");
    setPending(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormMessage message={error} />
      <FormMessage message={success} variant="success" />
      <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" autoComplete="name" placeholder="Alex Morgan" required /></div>
      <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><p className="text-xs text-muted-foreground">Use at least 8 characters.</p></div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </form>
  );
}
