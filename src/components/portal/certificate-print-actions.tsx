"use client";

import Link from "next/link";

export function CertificatePrintActions() {
  return (
    <p className="mt-8 text-center text-xs text-[var(--muted-foreground)] print:hidden">
      <Link href="/portal/certificates" className="text-[var(--accent)] hover:underline">
        Back to certificates
      </Link>
      {" · "}
      <button
        type="button"
        className="text-[var(--accent)] hover:underline"
        onClick={() => window.print()}
      >
        Print
      </button>
    </p>
  );
}
