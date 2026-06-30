import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <AuthCard title="Create your account" description="Start with your profile, then set up your organization."><RegisterForm /></AuthCard>;
}
