import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function requireStripe(): Stripe {
  const s = getStripe();
  if (!s) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return s;
}
