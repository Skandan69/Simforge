"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "./form-message";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password.length < 8 || password !== confirmation) {
      setError(password.length < 8 ? "Password must be at least 8 characters." : "Passwords do not match.");
      return;
    }
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormMessage message={error} />
      <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <div className="space-y-2"><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Updating password…" : "Update password"}</Button>
    </form>
  );
}
