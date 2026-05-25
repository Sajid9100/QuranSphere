-- 2026-05-25 — Trial Setup Intent + one-trial-per-student
--
-- Adds:
--   * bookings.booking_type — 'trial' (free first class) | 'paid'
--   * student_profiles.stripe_customer_id — reused for future paid charges
--   * partial index for fast "has this student already used their trial?"
--
-- The platform-wide one-trial rule replaces the previous per-teacher rule
-- enforced in code (hasPriorBookingWithTeacher). A non-cancelled booking
-- with booking_type='trial' for a given lower(student_email) is the bar.

alter table bookings
  add column if not exists booking_type text not null default 'paid'
    check (booking_type in ('trial', 'paid'));

-- Backfill: any existing row that was created under the old free-first-class
-- rule (payment_status='free_trial') should be classified as a trial so the
-- new one-trial-per-student check sees historical free classes.
update bookings
   set booking_type = 'trial'
 where payment_status = 'free_trial'
   and booking_type   = 'paid';

create index if not exists bookings_student_email_trial_idx
  on bookings (lower(student_email))
  where booking_type = 'trial' and status <> 'cancelled';

alter table student_profiles
  add column if not exists stripe_customer_id text;

create index if not exists student_profiles_stripe_customer_idx
  on student_profiles (stripe_customer_id)
  where stripe_customer_id is not null;
