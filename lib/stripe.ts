import Stripe from "stripe";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import type { SubscriptionPlan } from "./types";

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isPlaceholder = (v: string | undefined) =>
  !v || v.includes("sk_xxxxx") || v.includes("pk_xxxxx") || v.includes("whsec_xxxxx");

export const isStripeConfigured = !isPlaceholder(secretKey);
export const isStripeWebhookConfigured = !isPlaceholder(webhookSecret);
export const hasStripePublishableKey = !isPlaceholder(publishableKey);

// ---------------------------------------------------------------------------
// Server-side Stripe (only call from API routes / server code)
// ---------------------------------------------------------------------------
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!isStripeConfigured) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local."
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(secretKey!, { typescript: true });
  }
  return _stripe;
}

export function getStripeWebhookSecret(): string {
  if (!isStripeWebhookConfigured) {
    throw new Error(
      "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET in .env.local."
    );
  }
  return webhookSecret!;
}

// ---------------------------------------------------------------------------
// Browser Stripe — singleton promise loader
// ---------------------------------------------------------------------------
let _stripePromise: Promise<StripeJs | null> | null = null;
export function getBrowserStripe(): Promise<StripeJs | null> {
  if (!publishableKey || publishableKey.includes("pk_xxxxx")) {
    return Promise.resolve(null);
  }
  if (!_stripePromise) {
    _stripePromise = loadStripe(publishableKey);
  }
  return _stripePromise;
}

// ---------------------------------------------------------------------------
// Subscription plan price IDs — fill once Stripe products are created
// ---------------------------------------------------------------------------
export const STRIPE_PRICES: Record<SubscriptionPlan, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

export function getPriceIdForPlan(plan: SubscriptionPlan): string {
  const id = STRIPE_PRICES[plan];
  if (!id || id.includes("price_xxxxx")) {
    throw new Error(
      `Stripe price for plan "${plan}" is not configured. Set STRIPE_PRICE_${plan.toUpperCase()} in .env.local.`
    );
  }
  return id;
}
