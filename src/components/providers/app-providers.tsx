"use client";

import { SessionProvider } from "next-auth/react";
import { BillingPayPalProvider } from "@/components/billing/billing-paypal-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BillingPayPalProvider>{children}</BillingPayPalProvider>
    </SessionProvider>
  );
}
