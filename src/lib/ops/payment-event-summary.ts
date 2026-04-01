/**
 * Human-readable hint for operators (no payload inspection — avoids leaking PII).
 */
export function summarizePaymentEventType(provider: string, eventType: string): string {
  const t = eventType.toLowerCase();
  if (provider === "STRIPE") {
    if (t.includes("checkout.session.completed")) {
      return "Typically: finalize checkout session → order/subscription rows.";
    }
    if (t.includes("payment_intent.succeeded")) {
      return "Payment succeeded — may update order state.";
    }
    if (t.includes("customer.subscription")) {
      return "Subscription lifecycle — status synced from Stripe.";
    }
    if (t.includes("invoice.")) {
      return "Invoice event — may sync invoice rows.";
    }
  }
  if (provider === "PAYPAL") {
    if (t.includes("payment.capture")) {
      return "Capture completed — may mark order paid / entitlements.";
    }
    if (t.includes("billing.subscription")) {
      return "PayPal subscription event — sync subscription state.";
    }
  }
  return "Processed and stored — see DB order/subscription/entitlement rows for outcome.";
}

export function maskExternalEventId(id: string): string {
  if (id.length <= 14) return `${id.slice(0, 4)}…`;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}
