import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEACHERS as SEED_TEACHERS } from "./teachers-data";
import type {
  Booking,
  BookingInsert,
  Review,
  ReviewableBooking,
  Teacher,
  TeacherApplicationInsert,
  TeacherAvailabilityException,
  TeacherAvailabilityRule,
  TeacherFilters,
} from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (v: string | undefined) =>
  !v || v.includes("your_supabase") || v.includes("your-project");

export const isSupabaseConfigured =
  !isPlaceholder(url) && !isPlaceholder(anonKey);

export const isSupabaseAdminConfigured =
  isSupabaseConfigured && !isPlaceholder(serviceKey);

// ---------------------------------------------------------------------------
// Browser client — safe to import anywhere. Uses anon key.
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: false } })
  : null;

// ---------------------------------------------------------------------------
// Server client — service role. Only call from server-side code (API routes,
// route handlers, Server Components). Bypasses RLS.
// ---------------------------------------------------------------------------
export function createServerSupabaseClient(): SupabaseClient {
  if (!isSupabaseAdminConfigured) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in .env.local."
    );
  }
  return createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Helpers — fall back to seed data when Supabase isn't configured so the
// dev/demo experience keeps working.
// ---------------------------------------------------------------------------

export async function getTeachers(filters?: TeacherFilters): Promise<Teacher[]> {
  if (!supabase) {
    return applyFiltersToSeed(SEED_TEACHERS, filters);
  }

  let q = supabase.from("teachers").select("*").eq("is_active", true);
  if (filters?.gender) q = q.eq("gender", filters.gender);
  if (typeof filters?.is_featured === "boolean")
    q = q.eq("is_featured", filters.is_featured);
  if (filters?.language) q = q.ilike("language", `%${filters.language}%`);

  const { data, error } = await q.order("rating", { ascending: false });
  if (error) {
    console.warn("[supabase] getTeachers fallback to seed:", error.message);
    return applyFiltersToSeed(SEED_TEACHERS, filters);
  }
  return (data ?? []) as Teacher[];
}

export async function getTeacherBySlug(slug: string): Promise<Teacher | null> {
  if (!supabase) {
    return SEED_TEACHERS.find((t) => t.slug === slug) ?? null;
  }
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] getTeacherBySlug fallback to seed:", error.message);
    return SEED_TEACHERS.find((t) => t.slug === slug) ?? null;
  }
  return (data as Teacher) ?? null;
}

export async function createBooking(
  data: BookingInsert
): Promise<{ id: string }> {
  if (!isSupabaseAdminConfigured) {
    return { id: `mock_${Date.now()}` };
  }
  const admin = createServerSupabaseClient();
  const { data: row, error } = await admin
    .from("bookings")
    .insert(data)
    .select("id")
    .single();
  if (error) throw error;
  return { id: row.id as string };
}

export async function setBookingZoomLink(
  bookingId: string,
  zoomLink: string
): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  const admin = createServerSupabaseClient();
  const { error } = await admin
    .from("bookings")
    .update({ zoom_link: zoomLink })
    .eq("id", bookingId);
  if (error) {
    console.warn("[supabase] setBookingZoomLink failed:", error.message);
  }
}

// Returns true if the student already has a non-cancelled trial booking
// anywhere on the platform — the platform-wide one-trial-per-student rule.
// Any subsequent class for the same email must be a paid booking.
export async function hasExistingTrialBooking(
  studentEmail: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured) return false;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("bookings")
    .select("id")
    .eq("student_email", studentEmail.toLowerCase())
    .eq("booking_type", "trial")
    .neq("status", "cancelled")
    .limit(1);
  if (error) {
    console.warn("[supabase] hasExistingTrialBooking failed:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

// Looks up the cached Stripe customer ID for a student. Returns null when no
// profile exists yet or when the column is empty (first-time trial booker).
export async function getStudentStripeCustomerId(
  studentEmail: string
): Promise<string | null> {
  if (!isSupabaseAdminConfigured) return null;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("student_profiles")
    .select("stripe_customer_id")
    .eq("email", studentEmail.toLowerCase())
    .maybeSingle();
  if (error) {
    console.warn("[supabase] getStudentStripeCustomerId failed:", error.message);
    return null;
  }
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}

// Upserts the Stripe customer ID onto the student's profile row so it can be
// reused for future paid bookings without creating a new Customer each time.
// student_profiles has no `name` column — the in-memory StudentProfile.name
// always comes from Clerk, not Supabase.
export async function upsertStudentStripeCustomer(args: {
  email: string;
  stripe_customer_id: string;
}): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  const admin = createServerSupabaseClient();
  const { error } = await admin.from("student_profiles").upsert(
    {
      email: args.email.toLowerCase(),
      stripe_customer_id: args.stripe_customer_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) {
    console.warn("[supabase] upsertStudentStripeCustomer failed:", error.message);
  }
}

export async function getAvailabilityRules(
  teacherId: string
): Promise<TeacherAvailabilityRule[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("teacher_availability_rules")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("is_active", true);
  if (error) {
    console.warn("[supabase] getAvailabilityRules failed:", error.message);
    return [];
  }
  return (data ?? []) as TeacherAvailabilityRule[];
}

export async function getAvailabilityExceptions(
  teacherId: string,
  fromDate: string,
  toDate: string
): Promise<TeacherAvailabilityException[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("teacher_availability_exceptions")
    .select("*")
    .eq("teacher_id", teacherId)
    .gte("exception_date", fromDate)
    .lte("exception_date", toDate);
  if (error) {
    console.warn("[supabase] getAvailabilityExceptions failed:", error.message);
    return [];
  }
  return (data ?? []) as TeacherAvailabilityException[];
}

export async function getBookingsForTeacher(
  teacherId: string
): Promise<Booking[]> {
  if (!isSupabaseAdminConfigured) return [];
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("selected_slot", { ascending: false });
  if (error) {
    console.warn("[supabase] getBookingsForTeacher failed:", error.message);
    return [];
  }
  return (data ?? []) as Booking[];
}

// Returns occupied slot ranges (ISO start/end) for a teacher within [from, to].
// Used to filter out already-booked times when computing availability.
export async function getBookedRangesForTeacher(
  teacherId: string,
  fromIso: string,
  toIso: string,
  classDurationMinutes: number
): Promise<Array<{ start: Date; end: Date }>> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("selected_slot")
    .eq("teacher_id", teacherId)
    .neq("status", "cancelled")
    .gte("selected_slot", fromIso)
    .lte("selected_slot", toIso);
  if (error) {
    console.warn("[supabase] getBookedRangesForTeacher failed:", error.message);
    return [];
  }
  const out: Array<{ start: Date; end: Date }> = [];
  for (const row of data ?? []) {
    const raw = (row as { selected_slot: string }).selected_slot;
    const start = parseSlotStart(raw);
    if (!start) continue;
    const end = new Date(start.getTime() + classDurationMinutes * 60_000);
    out.push({ start, end });
  }
  return out;
}

function parseSlotStart(raw: string): Date | null {
  const d = new Date(raw);
  if (Number.isFinite(d.getTime())) return d;
  return null;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function getReviewsByTeacherId(
  teacherId: string,
  limit = 50
): Promise<Review[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[supabase] getReviewsByTeacherId failed:", error.message);
    return [];
  }
  return (data ?? []) as Review[];
}

export async function getReviewsByTeacherSlug(
  slug: string,
  limit = 50
): Promise<Review[]> {
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) return [];
  return getReviewsByTeacherId(teacher.id, limit);
}

export async function getBookingForReview(
  bookingId: string
): Promise<Booking | null> {
  if (!isSupabaseAdminConfigured) return null;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] getBookingForReview failed:", error.message);
    return null;
  }
  return (data as Booking) ?? null;
}

export async function getReviewByBookingId(
  bookingId: string
): Promise<Review | null> {
  if (!isSupabaseAdminConfigured) return null;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] getReviewByBookingId failed:", error.message);
    return null;
  }
  return (data as Review) ?? null;
}

export async function createReview(input: {
  booking_id: string;
  teacher_id: string;
  student_email: string;
  student_name: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase service role is not configured.");
  }
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("reviews")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Review;
}

// Returns completed bookings for the given emails that don't yet have a review.
// Used by the parent dashboard to surface "leave a review" prompts.
export async function getReviewableBookings(
  emails: string[]
): Promise<ReviewableBooking[]> {
  const unique = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (unique.length === 0 || !isSupabaseAdminConfigured) return [];

  const admin = createServerSupabaseClient();
  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, teacher_id, teacher_name, teacher_slug, student_email, student_name, selected_slot"
    )
    .in("student_email", unique)
    .eq("status", "completed")
    .order("selected_slot", { ascending: false });
  if (error) {
    console.warn("[supabase] getReviewableBookings failed:", error.message);
    return [];
  }
  const rows = (bookings ?? []) as ReviewableBooking[];
  if (rows.length === 0) return [];

  const ids = rows.map((b) => b.id);
  const { data: existing, error: revErr } = await admin
    .from("reviews")
    .select("booking_id")
    .in("booking_id", ids);
  if (revErr) {
    console.warn("[supabase] reviewable existing-reviews lookup failed:", revErr.message);
    return rows;
  }
  const reviewed = new Set((existing ?? []).map((r) => (r as { booking_id: string }).booking_id));
  return rows.filter((b) => !reviewed.has(b.id));
}

export async function createTeacherApplication(
  data: TeacherApplicationInsert
): Promise<{ id: string }> {
  if (!isSupabaseAdminConfigured) {
    return { id: `mock_${Date.now()}` };
  }
  const admin = createServerSupabaseClient();
  const { data: row, error } = await admin
    .from("teacher_applications")
    .insert(data)
    .select("id")
    .single();
  if (error) throw error;
  return { id: row.id as string };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------
function applyFiltersToSeed(
  list: Teacher[],
  filters?: TeacherFilters
): Teacher[] {
  let out = list.slice();
  if (filters?.gender) out = out.filter((t) => t.gender === filters.gender);
  if (typeof filters?.is_featured === "boolean")
    out = out.filter((t) => t.is_featured === filters.is_featured);
  if (filters?.language) {
    const re = new RegExp(filters.language, "i");
    out = out.filter((t) => re.test(t.language));
  }
  return out.sort((a, b) => b.rating - a.rating);
}
