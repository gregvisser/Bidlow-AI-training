"use client";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

export function BillingPayPalProvider({ children }: { children: React.ReactNode }) {
  const cid = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!cid) {
    return children;
  }
  return (
    <PayPalScriptProvider
      options={{
        clientId: cid,
        currency: "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
