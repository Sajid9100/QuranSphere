import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  isSupabaseAdminConfigured,
  setBookingZoomLink,
  upsertStudentStripeCustomer,
} from "@/lib/supabase";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createScheduledMeeting, isZoomConfigured } from "@/lib/zoom";
import { sendBookingConfirmationEmails } from "@/lib/email";
import type { AgeGroup, Booking, StudentLevel, Teacher } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = { setup_intent_id?: string };

// POST /api/bookings/[id]/confirm-trial
// Called by the client after the Stripe Elements PaymentElement successfully
// confirms a SetupIntent. We:
//   1. Re-verify the SetupIntent succeeded server-side (don't trust the client)
//   2. Cache the Stripe customer ID on student_profiles for future paid charges
//   3. Flip the booking to confirmed / free_trial
//   4. Best-effort: generate the Zoom link + send confirmation emails
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Supabase not configured on the server." },
      { status: 503 }
    );
  }
  if (!isStripeConfigured) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server." },
      { status: 503 }
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const setupIntentId = body.setup_intent_id?.trim();
  if (!setupIntentId) {
    return NextResponse.json(
      { error: "setup_intent_id is required" },
      { status: 400 }
    );
  }

  const admin = createServerSupabaseClient();
  const { data: bookingRow, error: lookupErr } = await admin
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const booking = bookingRow as Booking;

  if (booking.booking_type !== "trial") {
    return NextResponse.json(
      { error: "This booking is not a trial." },
      { status: 409 }
    );
  }
  if (booking.status === "confirmed") {
    return NextResponse.json({ ok: true, already_confirmed: true });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "This booking has been cancelled." },
      { status: 409 }
    );
  }

  const stripe = getStripe();
  const intent = await stripe.setupIntents.retrieve(setupIntentId);

  if (intent.metadata?.booking_id !== booking.id) {
    return NextResponse.json(
      { error: "SetupIntent does not belong to this booking." },
      { status: 400 }
    );
  }
  if (intent.status !== "succeeded") {
    return NextResponse.json(
      {
        error: `Card setup is not complete (status: ${intent.status}).`,
      },
      { status: 409 }
    );
  }

  const customerId =
    typeof intent.customer === "string"
      ? intent.customer
      : intent.customer?.id ?? null;
  if (!customerId) {
    return NextResponse.json(
      { error: "SetupIntent is missing a customer." },
      { status: 409 }
    );
  }

  await upsertStudentStripeCustomer({
    email: booking.student_email,
    stripe_customer_id: customerId,
  });

  const { error: updateErr } = await admin
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "free_trial",
    })
    .eq("id", booking.id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const teacher = await loadTeacher(booking.teacher_id);
  const zoomLink = teacher
    ? await maybeGenerateZoomLink({
        bookingId: booking.id,
        teacher,
        studentName: booking.student_name,
        slot: new Date(booking.selected_slot),
      })
    : undefined;

  if (teacher) {
    sendBookingConfirmationEmails({
      studentName: booking.student_name,
      studentEmail: booking.student_email,
      studentPhone: booking.student_phone,
      studentCountry: booking.student_country,
      ageGroup: booking.age_group as AgeGroup,
      currentLevel: booking.current_level as StudentLevel,
      selectedSlot: booking.selected_slot,
      message: booking.message,
      teacher,
      zoomLink,
    }).catch((err) =>
      console.error("[bookings:confirm-trial] email send failed", err)
    );
  }

  return NextResponse.json({ ok: true });
}

async function loadTeacher(teacherId: string | null): Promise<Teacher | null> {
  if (!teacherId) return null;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .maybeSingle();
  if (error) {
    console.warn("[bookings:confirm-trial] loadTeacher failed:", error.message);
    return null;
  }
  return (data as Teacher) ?? null;
}

async function maybeGenerateZoomLink(args: {
  bookingId: string;
  teacher: Teacher;
  studentName: string;
  slot: Date;
}): Promise<string | undefined> {
  if (!isZoomConfigured) return undefined;
  try {
    const meeting = await createScheduledMeeting({
      topic: `${args.teacher.name} × ${args.studentName} — LearnFurqan`,
      startTime: args.slot.toISOString(),
      durationMinutes: args.teacher.class_duration_minutes ?? 30,
    });
    await setBookingZoomLink(args.bookingId, meeting.joinUrl);
    return meeting.joinUrl;
  } catch (err) {
    console.error("[bookings:confirm-trial] zoom auto-gen failed", err);
    return undefined;
  }
}
