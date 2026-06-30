"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, ImagePlus, Loader2, UploadCloud } from "lucide-react";
import type { CreateOrganizationInput, CurrentUserResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/auth/form-message";

const industries = ["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail", "Education", "Professional Services", "Government", "Other"];
const companySizes = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,001+"];
const countries = ["Australia", "Canada", "France", "Germany", "India", "Singapore", "United Arab Emirates", "United Kingdom", "United States", "Other"];

export function OnboardingForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [logo, setLogo] = useState<File>();
  const preview = useMemo(() => logo ? URL.createObjectURL(logo) : undefined, [logo]);
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function uploadLogo(file: File) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("organization-logos").upload(path, file, { upsert: false });
    if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);
    return supabase.storage.from("organization-logos").getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const form = new FormData(event.currentTarget);
      const logoUrl = logo ? await uploadLogo(logo) : undefined;
      const input: CreateOrganizationInput = {
        name: String(form.get("name")),
        industry: String(form.get("industry")),
        companySize: String(form.get("companySize")),
        country: String(form.get("country")),
        timezone: String(form.get("timezone")),
        logoUrl,
      };
      await apiFetch<CurrentUserResponse>("/api/organizations", { method: "POST", body: JSON.stringify(input) });
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create your organization.");
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl shadow-xl shadow-slate-950/5">
      <CardHeader className="border-b p-7 sm:p-8">
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-6" /></div>
        <CardTitle className="text-2xl">Create your organization</CardTitle>
        <CardDescription className="text-base">This becomes your team’s secure SimForge workspace. You’ll start as the Owner.</CardDescription>
      </CardHeader>
      <CardContent className="p-7 sm:p-8">
        <form className="space-y-7" onSubmit={handleSubmit}>
          <FormMessage message={error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Organization name</Label><Input id="name" name="name" placeholder="Acme Learning Group" minLength={2} required /></div>
            <div className="space-y-2"><Label htmlFor="industry">Industry</Label><select id="industry" name="industry" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" defaultValue="" required><option value="" disabled>Select industry</option>{industries.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="companySize">Company size</Label><select id="companySize" name="companySize" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" defaultValue="" required><option value="" disabled>Select size</option>{companySizes.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="country">Country</Label><select id="country" name="country" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" defaultValue="India" required>{countries.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue={defaultTimezone} placeholder="Asia/Kolkata" required /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Organization logo <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <label htmlFor="logo" className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-accent/50">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">{preview ? <Image src={preview} alt="Logo preview" width={56} height={56} unoptimized className="size-full object-cover" /> : <ImagePlus className="size-6" />}</span>
              <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium"><UploadCloud className="size-4" />Choose a logo</span><span className="mt-1 block truncate text-xs text-muted-foreground">{logo ? logo.name : "PNG, JPG or WebP · max 2 MB"}</span></span>
              <input id="logo" type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 2_000_000) setError("Logo must be smaller than 2 MB."); else { setError(undefined); setLogo(file); } }} />
            </label>
          </div>
          <div className="flex justify-end"><Button size="lg" type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Creating workspace…" : "Create workspace"}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
