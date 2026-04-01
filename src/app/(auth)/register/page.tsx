import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create account — AI Training Portal",
};

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Start the AI Agent Mastery program with structured progress tracking.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  );
}
