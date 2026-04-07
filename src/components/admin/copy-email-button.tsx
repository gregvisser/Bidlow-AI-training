"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyEmailButton({ email }: { email: string }) {
  const [done, setDone] = useState(false);

  if (!email) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 text-xs"
      aria-label={done ? "Email copied" : `Copy email ${email}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : "Copy email"}
    </Button>
  );
}
