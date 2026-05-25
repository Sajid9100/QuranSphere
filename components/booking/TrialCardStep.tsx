"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  bookingId: string;
  clientSecret: string;
  publishableKey: string;
  onCardSaved: () => void;
};

// Cache the Stripe.js promise per publishable key so we don't reload it
// when this component remounts mid-flow.
const stripePromises = new Map<string, Promise<StripeJs | null>>();
function loadStripeOnce(key: string): Promise<StripeJs | null> {
  const existing = stripePromises.get(key);
  if (existing) return existing;
  const created = loadStripe(key);
  stripePromises.set(key, created);
  return created;
}

export function TrialCardStep(props: Props) {
  const stripePromise = useMemo(
    () => loadStripeOnce(props.publishableKey),
    [props.publishableKey]
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <InnerCardForm bookingId={props.bookingId} onCardSaved={props.onCardSaved} />
    </Elements>
  );
}

function InnerCardForm({
  bookingId,
  onCardSaved,
}: {
  bookingId: string;
  onCardSaved: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient submission state if the parent ever re-mounts us with a
  // fresh client_secret (e.g. retry after an error).
  useEffect(() => {
    setSubmitting(false);
    setError(null);
  }, [bookingId]);

  async function handleConfirm(ev: React.FormEvent) {
    ev.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: setupErr, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {},
      redirect: "if_required",
    });

    if (setupErr) {
      setError(setupErr.message ?? "Could not save your card. Please try again.");
      setSubmitting(false);
      return;
    }
    if (!setupIntent || setupIntent.status !== "succeeded") {
      setError(
        `Card setup is not complete (status: ${setupIntent?.status ?? "unknown"}).`
      );
      setSubmitting(false);
      return;
    }

    // Card saved on Stripe — hand off to the server to confirm the trial.
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup_intent_id: setupIntent.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      onCardSaved();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleConfirm} className="grid gap-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-primary" />
        <div>
          <p className="font-medium">Save a card to confirm your free trial.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You won&apos;t be charged. Your trial class is free — we keep your
            card on file so future classes are one-tap easy.
          </p>
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-500" />
          <p>{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="xl"
        disabled={!stripe || !elements || submitting}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving card…
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Save card &amp; confirm trial
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Payments processed by Stripe. No charge today.
      </p>
    </form>
  );
}
