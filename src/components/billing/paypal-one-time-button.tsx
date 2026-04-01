"use client";

import { PayPalButtons } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PayPalOneTimeButton({
  planSlug,
  courseSlug,
  disabled,
}: {
  planSlug: string;
  courseSlug?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  if (disabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "paypal" }}
        disabled={false}
        createOrder={async () => {
          setMessage(null);
          const res = await fetch("/api/billing/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planSlug, courseSlug }),
          });
          const data = (await res.json()) as { paypalOrderId?: string; error?: string };
          if (!res.ok) {
            throw new Error(data.error ?? "Could not create PayPal order");
          }
          if (!data.paypalOrderId) {
            throw new Error("Missing PayPal order id");
          }
          return data.paypalOrderId;
        }}
        onApprove={async (data) => {
          const res = await fetch("/api/billing/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          });
          if (!res.ok) {
            const err = (await res.json()) as { error?: string };
            setMessage(err.error ?? "Capture failed");
            return;
          }
          router.push("/portal/billing?checkout=paypal");
          router.refresh();
        }}
        onError={() => {
          setMessage("PayPal could not complete this payment.");
        }}
      />
      {message ? <p className="text-xs text-amber-200/90">{message}</p> : null}
    </div>
  );
}
