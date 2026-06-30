import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <AuthCard title="Choose a new password" description="Use a strong password you haven’t used before."><ResetPasswordForm /></AuthCard>;
}
