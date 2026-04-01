import { startPayPalSubscriptionCheckout } from "@/app/actions/billing-checkout";
import { Button } from "@/components/ui/button";

export function PayPalSubscriptionButton({
  planSlug,
  disabled,
  label = "Subscribe with PayPal",
}: {
  planSlug: string;
  disabled?: boolean;
  label?: string;
}) {
  if (disabled) {
    return (
      <p className="text-xs text-[var(--muted-foreground)]">
        Add a PayPal billing plan id to this pricing plan in the database to enable PayPal subscriptions.
      </p>
    );
  }
  return (
    <form action={startPayPalSubscriptionCheckout}>
      <input type="hidden" name="planSlug" value={planSlug} />
      <Button type="submit" variant="secondary" className="w-full">
        {label}
      </Button>
    </form>
  );
}
