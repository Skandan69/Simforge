import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthCard title="Welcome back" description="Sign in to your SimForge workspace."><LoginForm next={params.next} initialError={params.error} /></AuthCard>;
}
