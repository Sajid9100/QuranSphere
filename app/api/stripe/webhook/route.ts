import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  getStripeWebhookSecret,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from "@/lib/stripe";
import {
  createServerSupabaseClient,
  isSupabaseAdminConfigured,
  setBookingZoomLink,
} from "@/lib/supabase";
import { createScheduledMeeting, isZoomConfigured } from "@/lib/zoom";
import { sendZoomLinkEmail } from "@/lib/email";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeConfigured || !isStripeWebhookConfigured) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured on the server." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${(err as Error).message}`,
      },
      { status: 400 }
    );
  }

  console.log(`[stripe webhook] received event=${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      // Subscription events (customer.subscription.*, invoice.payment_*) are
      // ignored during the Preply pivot — bookings are charged per-class via
      // Stripe Checkout in `mode: "payment"`. Email templates and the
      // subscriptions table are retained for now.
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe webhook] handler for ${event.type} failed`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!isSupabaseAdminConfigured) return;

  if (session.mode !== "payment") {
    console.log("[stripe webhook] ignoring non-payment checkout", {
      session_id: session.id,
      mode: session.mode,
    });
    return;
  }

  const bookingId = session.metadata?.booking_id;
  if (!bookingId) {
    console.warn(
      "[stripe webhook] payment session missing booking_id metadata",
      { session_id: session.id }
    );
    return;
  }

  if (session.payment_status !== "paid") {
    console.log("[stripe webhook] payment session not yet paid, skipping", {
      session_id: session.id,
      payment_status: session.payment_status,
    });
    return;
  }

  const admin = createServerSupabaseClient();
  const { data: updated, error } = await admin
    .from("bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      stripe_session_id: session.id,
    })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[stripe webhook] failed to mark booking paid", {
      booking_id: bookingId,
      error,
    });
    throw error;
  }

  console.log("[stripe webhook] booking marked paid", {
    booking_id: bookingId,
    session_id: session.id,
  });

  if (updated) {
    await deliverZoomForPaidBooking(updated as Booking);
  }
}

// Auto-generate a Zoom meeting and email the link to the student. Best-effort:
// any failure here is logged but doesn't reject the webhook (Stripe would
// otherwise retry the whole event).
async function deliverZoomForPaidBooking(booking: Booking) {
  let zoomLink = booking.zoom_link;
  if (!zoomLink && isZoomConfigured) {
    try {
      const duration = await lookupClassDuration(booking.teacher_id);
      const meeting = await createScheduledMeeting({
        topic: `${booking.teacher_name} × ${booking.student_name} — LearnFurqan`,
        startTime: booking.selected_slot,
        durationMinutes: duration,
      });
      zoomLink = meeting.joinUrl;
      await setBookingZoomLink(booking.id, zoomLink);
    } catch (err) {
      console.error("[stripe webhook] zoom auto-gen failed", {
        booking_id: booking.id,
        err,
      });
    }
  }

  if (!zoomLink) return;
  try {
    await sendZoomLinkEmail({
      studentName: booking.student_name,
      studentEmail: booking.student_email,
      teacherName: booking.teacher_name,
      selectedSlot: booking.selected_slot,
      zoomLink,
    });
  } catch (err) {
    console.error("[stripe webhook] zoom email send failed", {
      booking_id: booking.id,
      err,
    });
  }
}

// Sync Connect Express status onto the matching teacher row. Fired when
// the teacher completes onboarding, links a bank account, or Stripe finishes
// reviewing them. We match on stripe_account_id; if no row matches the event
// is for someone else (or a stale account) — log and ignore.
async function handleAccountUpdated(account: Stripe.Account) {
  if (!isSupabaseAdminConfigured) return;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("teachers")
    .update({
      stripe_charges_enabled: Boolean(account.charges_enabled),
      stripe_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_details_submitted: Boolean(account.details_submitted),
    })
    .eq("stripe_account_id", account.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[stripe webhook] account.updated sync failed", {
      account: account.id,
      error,
    });
    return;
  }
  if (!data) {
    console.log("[stripe webhook] account.updated for unknown teacher", {
      account: account.id,
    });
    return;
  }
  console.log("[stripe webhook] teacher Connect status synced", {
    teacher_id: data.id,
    account: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
  });
}

async function lookupClassDuration(
  teacherId: string | null
): Promise<number> {
  if (!teacherId) return 30;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("teachers")
    .select("class_duration_minutes")
    .eq("id", teacherId)
    .maybeSingle();
  if (error || !data) return 30;
  return (data as { class_duration_minutes: number }).class_duration_minutes ?? 30;
}
