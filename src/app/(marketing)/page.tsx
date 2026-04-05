import { HeroSection } from "@/components/marketing/hero-section";
import { isSelfServeBillingAvailable } from "@/lib/launch/controlled-core-launch";

export default async function HomePage() {
  const selfServeBilling = isSelfServeBillingAvailable();
  return <HeroSection showSelfServeBilling={selfServeBilling} />;
}
