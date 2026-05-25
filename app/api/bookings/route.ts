import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createBooking,
  createServerSupabaseClient,
  getAvailabilityExceptions,
  getAvailabilityRules,
  getBookedRangesForTeacher,
  getStudentStripeCustomerId,
  getTeacherBySlug,
  hasExistingTrialBooking,
  isSupabaseAdminConfigured,
  setBookingZoomLink,
} from "@/lib/supabase";
import { expandAvailability } from "@/lib/availability";
import {
  getStripe,
  hasStripePublishableKey,
  isStripeConfigured,
} from "@/lib/stripe";
import {
  computeApplicationFeeCents,
  teacherCanReceivePayouts,
} from "@/lib/stripe-connect";
import { createScheduledMeeting, isZoomConfigured } from "@/lib/zoom";
import { sendBookingConfirmationEmails } from "@/lib/email";
import type { AgeGroup, StudentLevel, Teacher } from "@/lib/types";

export const runtime = "nodejs";

type BookingPayload = {
  teacher_slug: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_country: string;
  age_group: AgeGroup;
  current_level: StudentLevel;
  selected_slot: string;
  message?: string;
};

const VALID_AGE: AgeGroup[] = ["child", "teen", "adult"];
const VALID_LEVEL: StudentLevel[] = ["beginner", "can-read", "intermediate"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Partial<BookingPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validate(body);
  if (errors.length) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const teacher = await getTeacherBySlug(body.teacher_slug!);
  if (!teacher) {
    return NextResponse.json(
      { error: `Teacher not found: ${body.teacher_slug}` },
      { status: 404 }
    );
  }

  const slotDate = parseIso(body.selected_slot!);
  if (!slotDate) {
    return NextResponse.json(
      { error: "selected_slot must be an ISO 8601 timestamp" },
      { status: 400 }
    );
  }
  if (slotDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "selected_slot must be in the future" },
      { status: 400 }
    );
  }

  // Race-safe availability check: re-expand availability at insert time and
  // confirm the chosen slot is still bookable.
  const duration = teacher.class_duration_minutes ?? 30;
  const windowStart = new Date(slotDate.getTime() - 60_000);
  const windowEnd = new Date(slotDate.getTime() + duration * 60_000 + 60_000);
  const [rules, exceptions, booked] = await Promise.all([
    getAvailabilityRules(teacher.id),
    getAvailabilityExceptions(
      teacher.id,
      windowStart.toISOString().slice(0, 10),
      windowEnd.toISOString().slice(0, 10)
    ),
    getBookedRangesForTeacher(
      teacher.id,
      windowStart.toISOString(),
      windowEnd.toISOString(),
      duration
    ),
  ]);
  const available = expandAvailability({
    rules,
    exceptions,
    classDurationMinutes: duration,
    from: windowStart,
    to: windowEnd,
    bookedRanges: booked,
  });
  const matched = available.find((s) => s.start === slotDate.toISOString());
  if (!matched) {
    return NextResponse.json(
      { error: "Selected slot is no longer available" },
      { status: 409 }
    );
  }

  const studentEmail = body.student_email!.trim().toLowerCase();
  const studentName = body.student_name!.trim();

  // Platform-wide rule: every student gets exactly one free trial. If they've
  // already had one, this booking is paid and routes through Stripe Checkout.
  const alreadyUsedTrial =
    isSupabaseAdminConfigured && (await hasExistingTrialBooking(studentEmail));

  console.log("[bookings] decision", {
    email: studentEmail,
    teacher_slug: teacher.slug,
    already_used_trial: alreadyUsedTrial,
    stripe_configured: isStripeConfigured,
    has_publishable_key: hasStripePublishableKey,
  });

  try {
    if (alreadyUsedTrial) {
      // Paid booking — confirm immediately on the database side, generate a
      // Checkout session for the actual charge. Webhook flips payment_status.
      const { id } = await createBooking({
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        teacher_slug: teacher.slug,
        student_name: studentName,
        student_email: studentEmail,
        student_phone: body.student_phone!.trim(),
        student_country: body.student_country!.trim(),
        age_group: body.age_group!,
        current_level: body.current_level!,
        selected_slot: slotDate.toISOString(),
        message: (body.message ?? "").trim(),
        payment_status: "pending",
        booking_type: "paid",
      });

      const checkout = await createBookingCheckoutSession({
        bookingId: id,
        teacher,
        studentEmail,
        studentName,
      });
      console.log("[bookings] -> paid checkout", { id, session_url: checkout.url });
      return NextResponse.json(
        {
          ok: true,
          id,
          requires_payment: true,
          checkout_url: checkout.url,
        },
        { status: 201 }
      );
    }

    // Trial flow: reserve the slot with a pending booking, save card via
    // SetupIntent, then finish in /api/bookings/[id]/confirm-trial.
    const { id } = await createBooking({
      teacher_id: teacher.id,
      teacher_name: teacher.name,
      teacher_slug: teacher.slug,
      student_name: studentName,
      student_email: studentEmail,
      student_phone: body.student_phone!.trim(),
      student_country: body.student_country!.trim(),
      age_group: body.age_group!,
      current_level: body.current_level!,
      selected_slot: slotDate.toISOString(),
      message: (body.message ?? "").trim(),
      payment_status: "pending",
      booking_type: "trial",
    });

    if (!isStripeConfigured) {
      // No Stripe in this env — confirm the trial inline so the DB row doesn't
      // get stuck in 'pending' forever. Only meant for unconfigured dev
      // environments; real prod always has Stripe set.
      console.warn(
        "[bookings] -> trial confirmed without card (Stripe not configured)",
        { id }
      );
      await confirmTrialInline({
        bookingId: id,
        teacher,
        studentName,
        studentEmail,
        studentPhone: body.student_phone!.trim(),
        studentCountry: body.student_country!.trim(),
        ageGroup: body.age_group!,
        currentLevel: body.current_level!,
        selectedSlot: slotDate,
        message: (body.message ?? "").trim(),
      });
      return NextResponse.json(
        { ok: true, id, requires_setup: false, requires_payment: false },
        { status: 201 }
      );
    }

    const setup = await createTrialSetupIntent({
      bookingId: id,
      studentEmail,
      studentName,
    });
    console.log("[bookings] -> trial setup intent created", {
      id,
      customer_id: setup.customerId,
      client_secret_present: Boolean(setup.clientSecret),
    });

    return NextResponse.json(
      {
        ok: true,
        id,
        requires_setup: true,
        client_secret: setup.clientSecret,
        customer_id: setup.customerId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[bookings] insert failed", err);
    return NextResponse.json(
      { error: "Could not save booking. Please try again." },
      { status: 500 }
    );
  }
}

// Used only when STRIPE_SECRET_KEY isn't configured in this env. Flips the
// pending trial row to confirmed and runs the side effects (zoom + email).
async function confirmTrialInline(args: {
  bookingId: string;
  teacher: Teacher;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentCountry: string;
  ageGroup: AgeGroup;
  currentLevel: StudentLevel;
  selectedSlot: Date;
  message: string;
}): Promise<void> {
  if (isSupabaseAdminConfigured) {
    const admin = createServerSupabaseClient();
    await admin
      .from("bookings")
      .update({ status: "confirmed", payment_status: "free_trial" })
      .eq("id", args.bookingId);
  }

  let zoomLink: string | undefined;
  if (isZoomConfigured) {
    try {
      const meeting = await createScheduledMeeting({
        topic: `${args.teacher.name} × ${args.studentName} — LearnFurqan`,
        startTime: args.selectedSlot.toISOString(),
        durationMinutes: args.teacher.class_duration_minutes ?? 30,
      });
      zoomLink = meeting.joinUrl;
      await setBookingZoomLink(args.bookingId, zoomLink);
    } catch (err) {
      console.error("[bookings] inline zoom auto-gen failed", err);
    }
  }

  sendBookingConfirmationEmails({
    studentName: args.studentName,
    studentEmail: args.studentEmail,
    studentPhone: args.studentPhone,
    studentCountry: args.studentCountry,
    ageGroup: args.ageGroup,
    currentLevel: args.currentLevel,
    selectedSlot: args.selectedSlot.toISOString(),
    message: args.message,
    teacher: args.teacher,
    zoomLink,
  }).catch((err) => console.error("[bookings] inline email send failed", err));
}

// Creates (or reuses) a Stripe Customer for this student, then issues a
// SetupIntent so the client can save a card without taking a payment.
// Caller must verify isStripeConfigured before invoking.
async function createTrialSetupIntent(args: {
  bookingId: string;
  studentEmail: string;
  studentName: string;
}): Promise<{ clientSecret: string; customerId: string }> {
  const stripe = getStripe();

  const existingId = await getStudentStripeCustomerId(args.studentEmail);
  let customerId = existingId ?? null;

  if (!customerId) {
    const created = await stripe.customers.create({
      email: args.studentEmail,
      name: args.studentName,
      metadata: { source: "learnfurqan_trial" },
    });
    customerId = created.id;
  }

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      booking_id: args.bookingId,
      student_email: args.studentEmail,
      purpose: "trial_card_save",
    },
  });

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a SetupIntent client_secret");
  }
  return { clientSecret: intent.client_secret, customerId };
}

async function createBookingCheckoutSession(args: {
  bookingId: string;
  teacher: Teacher;
  studentEmail: string;
  studentName: string;
}): Promise<{ url: string }> {
  if (!isStripeConfigured) {
    throw new Error("Stripe is not configured on the server.");
  }

  const unitAmount = Math.round(args.teacher.price_per_class * 100);
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw new Error("Teacher price is not configured");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = getStripe();

  type PaymentIntentData = NonNullable<
    Stripe.Checkout.SessionCreateParams["payment_intent_data"]
  >;
  const paymentIntentData: PaymentIntentData = {
    metadata: {
      booking_id: args.bookingId,
      teacher_slug: args.teacher.slug,
    },
  };

  // Route money to the teacher's Connect account when they're onboarded;
  // platform keeps PLATFORM_FEE_PERCENT via application_fee_amount. If not
  // onboarded, the charge stays on the platform balance and admin reconciles
  // payouts manually (per Phase 5b decision).
  if (teacherCanReceivePayouts(args.teacher)) {
    paymentIntentData.transfer_data = {
      destination: args.teacher.stripe_account_id!,
    };
    const fee = computeApplicationFeeCents(args.teacher.price_per_class);
    if (fee > 0) paymentIntentData.application_fee_amount = fee;
  }

  // Reuse the cached Stripe customer when we already have one — keeps every
  // future paid charge against the same Customer the trial card was attached to.
  const existingCustomerId = await getStudentStripeCustomerId(args.studentEmail);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: `${args.teacher.name} — class`,
            description: args.teacher.subject,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/book/${args.teacher.slug}`,
    metadata: {
      booking_id: args.bookingId,
      teacher_slug: args.teacher.slug,
      student_email: args.studentEmail,
      student_name: args.studentName,
    },
    payment_intent_data: paymentIntentData,
  };
  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId;
  } else {
    sessionParams.customer_email = args.studentEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Stripe.errors.StripeError({
      type: "api_error",
      message: "Stripe did not return a checkout URL",
    } as Stripe.StripeRawError);
  }

  return { url: session.url };
}

function parseIso(s: string): Date | null {
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function validate(p: Partial<BookingPayload>): string[] {
  const e: string[] = [];
  if (!p.teacher_slug) e.push("teacher_slug is required");
  if (!p.student_name?.trim()) e.push("student_name is required");
  if (!p.student_email?.trim()) e.push("student_email is required");
  else if (!EMAIL_RE.test(p.student_email)) e.push("student_email is invalid");
  if (!p.student_phone?.trim()) e.push("student_phone is required");
  if (!p.student_country?.trim()) e.push("student_country is required");
  if (!p.age_group || !VALID_AGE.includes(p.age_group))
    e.push(`age_group must be one of ${VALID_AGE.join(", ")}`);
  if (!p.current_level || !VALID_LEVEL.includes(p.current_level))
    e.push(`current_level must be one of ${VALID_LEVEL.join(", ")}`);
  if (!p.selected_slot?.trim()) e.push("selected_slot is required");
  return e;
}
