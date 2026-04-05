import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";

/** Read `OPEN_REGISTRATION` at request time (Azure App Service), not only at build. */
export const dynamic = "force-dynamic";

/**
 * When unset/false, show invite-only messaging (controlled core launch).
 * Set OPEN_REGISTRATION=true in App Service (or .env locally) to expose the self-serve signup form.
 */
function registrationOpen() {
  return process.env.OPEN_REGISTRATION === "true";
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: registrationOpen()
      ? "Create account — AI Training Portal"
      : "Access — AI Training Portal",
  };
}

export default function RegisterPage() {
  if (registrationOpen()) {
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

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        Access by invitation
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Public self-serve signup is not available during this phase. Accounts are created by invitation or by
        an administrator—aligned with the current controlled launch.
      </p>
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        If you were invited, use the email and credentials you received and sign in below.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
      <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
        Need help? Contact your organisation administrator or the person who invited you.
      </p>
    </>
  );
}
