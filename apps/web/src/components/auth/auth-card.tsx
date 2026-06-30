import Link from "next/link";
import { Boxes } from "lucide-react";
import { APP_NAME } from "@simforge/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Boxes className="size-4" /></span>{APP_NAME}</Link>
      <Card className="border-border/70 shadow-xl shadow-slate-950/5 dark:shadow-black/20">
        <CardHeader className="space-y-2 pb-5">
          <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
