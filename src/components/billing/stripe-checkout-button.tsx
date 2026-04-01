import { startStripeCheckoutForPlan } from "@/app/actions/billing-checkout";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export function StripeCheckoutButton({
  planSlug,
  courseSlug,
  label = "Pay with card",
  className,
}: {
  planSlug: string;
  courseSlug?: string;
  label?: string;
  className?: string;
}) {
  return (
    <form action={startStripeCheckoutForPlan} className={className}>
      <input type="hidden" name="planSlug" value={planSlug} />
      {courseSlug ? <input type="hidden" name="courseSlug" value={courseSlug} /> : null}
      <Button type="submit" className="w-full gap-2" variant="default">
        <CreditCard className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    </form>
  );
}
