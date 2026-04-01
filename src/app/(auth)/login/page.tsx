import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — AI Training Portal",
};

function LoginFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded-xl bg-white/5" />
      <div className="h-10 rounded-xl bg-white/5" />
      <div className="h-11 rounded-xl bg-white/10" />
    </div>
  );
}

export default async function LoginPage() {
  const googleEnabled = Boolean(
    (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
      (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET),
  );

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Sign in to continue your learning path.
      </p>
      <div className="mt-8">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm googleEnabled={googleEnabled} />
        </Suspense>
      </div>
    </>
  );
}
