"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050514] px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Error</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
        The app hit an unexpected error. You can try again or return home. If this keeps happening, check
        server logs and health endpoints.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
