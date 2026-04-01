import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050514] px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">404</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
        That URL does not exist or you may not have access. Sign in and try again, or return to the
        homepage.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
