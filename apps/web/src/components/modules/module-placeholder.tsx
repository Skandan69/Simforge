import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return <div className="mx-auto max-w-6xl space-y-8"><PageHeading title={title} description={description} /><Card className="border-dashed"><CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-6" /></span><h2 className="mt-5 text-lg font-semibold">Module intentionally reserved</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">The navigation foundation is ready. Functionality will begin in a dedicated product sprint after workflows and permissions are approved.</p><Button asChild variant="outline" className="mt-6"><Link href="/dashboard"><ArrowLeft />Return to dashboard</Link></Button></CardContent></Card></div>;
}
