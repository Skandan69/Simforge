import { Boxes } from "lucide-react";
import { APP_NAME } from "@simforge/shared";
import { OnboardingForm } from "@/components/organization/onboarding-form";

export default function OnboardingPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_35%)] px-5 py-8 sm:py-12"><div className="mx-auto mb-8 flex max-w-3xl items-center gap-3 font-semibold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Boxes className="size-5" /></span>{APP_NAME}</div><div className="mx-auto flex max-w-3xl justify-center"><OnboardingForm /></div></main>;
}
