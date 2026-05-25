-- ============================================================
-- LearnFurqan — Supabase schema
-- Run this in Supabase SQL Editor (Project ➜ SQL ➜ New query)
-- ============================================================

-- Required extensions ----------------------------------------------------------
create extension if not exists "pgcrypto";

-- Drop in dev only -- comment these out before running in prod ----------------
-- drop table if exists subscriptions cascade;
-- drop table if exists teacher_applications cascade;
-- drop table if exists bookings cascade;
-- drop table if exists teachers cascade;

-- ============================================================
-- TEACHERS
-- ============================================================
create table if not exists teachers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  gender            text check (gender in ('male','female')),
  subject           text not null,
  language          text not null,
  country           text not null,
  country_flag      text not null,
  experience_years  integer not null,
  price_per_class   decimal(10,2) not null,
  rating            decimal(3,2) default 5.0,
  review_count      integer default 0,
  bio               text,
  teaching_style    text,
  certifications    text,
  intro_video_url   text default '',
  available_slots   text[] default '{}', -- DEPRECATED: kept for fallback display. New flow uses teacher_availability_rules.
  is_featured       boolean default false,
  slug              text unique not null,
  is_active         boolean default true,
  email             text, -- Clerk login email; matched case-insensitively in lib/teacher-auth.ts
  -- Stripe Connect Express (Phase 5b). Mirrored from `account.updated` webhook.
  stripe_account_id        text,
  stripe_charges_enabled   boolean not null default false,
  stripe_payouts_enabled   boolean not null default false,
  stripe_details_submitted boolean not null default false,
  class_duration_minutes int not null default 30
                      check (class_duration_minutes in (15, 30, 45, 60, 90)),
  created_at        timestamptz default now()
);

create index if not exists teachers_is_active_idx on teachers (is_active);
create unique index if not exists teachers_email_lower_unique
  on teachers (lower(email))
  where email is not null;
create unique index if not exists teachers_stripe_account_id_unique
  on teachers (stripe_account_id)
  where stripe_account_id is not null;
create index if not exists teachers_is_featured_idx on teachers (is_featured);
create index if not exists teachers_gender_idx on teachers (gender);

-- ============================================================
-- TEACHER AVAILABILITY — recurring weekly rules + exceptions
-- ============================================================
create table if not exists teacher_availability_rules (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references teachers(id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6), -- 0=Sun..6=Sat
  start_time  time not null,
  end_time    time not null,
  timezone    text not null, -- IANA tz id, e.g. 'Africa/Cairo'
  is_active   boolean default true,
  created_at  timestamptz default now(),
  check (end_time > start_time)
);
create index if not exists teacher_availability_rules_teacher_idx
  on teacher_availability_rules (teacher_id);
create index if not exists teacher_availability_rules_active_idx
  on teacher_availability_rules (teacher_id, weekday) where is_active;

-- 'block' removes a slot for one date (vacation); 'extra' adds an extra one-off window.
create table if not exists teacher_availability_exceptions (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references teachers(id) on delete cascade,
  exception_date  date not null,
  kind            text not null check (kind in ('block','extra')),
  start_time      time,
  end_time        time,
  timezone        text,
  notes           text default '',
  created_at      timestamptz default now(),
  check (kind = 'block' or (start_time is not null and end_time is not null and timezone is not null)),
  check (start_time is null or end_time is null or end_time > start_time)
);
create index if not exists teacher_availability_exceptions_teacher_date_idx
  on teacher_availability_exceptions (teacher_id, exception_date);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  teacher_id          uuid references teachers(id) on delete set null,
  teacher_name        text not null,
  teacher_slug        text not null,
  student_name        text not null,
  student_email       text not null,
  student_phone       text not null,
  student_country     text not null,
  age_group           text not null,
  current_level       text not null,
  selected_slot       text not null,
  message             text default '',
  status              text default 'pending'
                        check (status in ('pending','confirmed','completed','cancelled')),
  stripe_session_id   text default '',
  payment_status      text default 'free_trial'
                        check (payment_status in ('free_trial','pending','paid','refunded')),
  booking_type        text not null default 'paid'
                        check (booking_type in ('trial','paid')),
  zoom_link           text default '',
  lesson_notes        text not null default '',
  created_at          timestamptz default now()
);

create index if not exists bookings_teacher_id_idx on bookings (teacher_id);
create index if not exists bookings_student_email_idx on bookings (student_email);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_created_at_idx on bookings (created_at desc);
create index if not exists bookings_student_email_trial_idx
  on bookings (lower(student_email))
  where booking_type = 'trial' and status <> 'cancelled';

-- ============================================================
-- REVIEWS — students rate a teacher after a completed booking
-- ============================================================
create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null unique references bookings(id) on delete cascade,
  teacher_id     uuid not null references teachers(id) on delete cascade,
  student_email  text not null,
  student_name   text not null,
  rating         int  not null check (rating between 1 and 5),
  comment        text default '',
  created_at     timestamptz default now()
);

create index if not exists reviews_teacher_id_created_idx
  on reviews (teacher_id, created_at desc);
create index if not exists reviews_booking_id_idx on reviews (booking_id);

-- Recompute teachers.rating + teachers.review_count from current reviews.
create or replace function recompute_teacher_rating(t uuid) returns void as $$
begin
  update teachers
     set review_count = (select count(*) from reviews where teacher_id = t),
         rating       = coalesce(
           (select round(avg(rating)::numeric, 2) from reviews where teacher_id = t),
           5.0
         )
   where id = t;
end;
$$ language plpgsql;

create or replace function reviews_after_change() returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    perform recompute_teacher_rating(OLD.teacher_id);
    return OLD;
  end if;
  perform recompute_teacher_rating(NEW.teacher_id);
  if (TG_OP = 'UPDATE' and OLD.teacher_id <> NEW.teacher_id) then
    perform recompute_teacher_rating(OLD.teacher_id);
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists reviews_after_change_trg on reviews;
create trigger reviews_after_change_trg
  after insert or update or delete on reviews
  for each row execute function reviews_after_change();

-- ============================================================
-- MESSAGES — teacher ↔ student threads
-- A "thread" is implicit: every (teacher_id, lower(student_email))
-- pair forms one. No separate threads table.
-- ============================================================
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references teachers(id) on delete cascade,
  student_email text not null,
  student_name  text not null default '',
  sender_role   text not null check (sender_role in ('teacher','student')),
  body          text not null check (length(body) between 1 and 5000),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on messages (teacher_id, lower(student_email), created_at desc);

create index if not exists messages_student_lookup_idx
  on messages (lower(student_email), created_at desc);

create index if not exists messages_unread_for_teacher_idx
  on messages (teacher_id)
  where sender_role = 'student' and read_at is null;

create index if not exists messages_unread_for_student_idx
  on messages (lower(student_email))
  where sender_role = 'teacher' and read_at is null;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  student_email            text not null,
  student_name             text not null,
  plan                     text not null check (plan in ('basic','premium')),
  stripe_customer_id       text,
  stripe_subscription_id   text unique,
  status                   text default 'active'
                             check (status in ('active','cancelled','past_due')),
  current_period_end       timestamptz,
  created_at               timestamptz default now()
);

create index if not exists subscriptions_student_email_idx on subscriptions (student_email);
create index if not exists subscriptions_stripe_customer_idx on subscriptions (stripe_customer_id);

-- ============================================================
-- TEACHER APPLICATIONS
-- ============================================================
create table if not exists teacher_applications (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  phone             text not null,
  country           text not null,
  subject           text not null,
  experience_years  integer not null,
  certifications    text not null,
  demo_video_url    text default '',
  languages         text not null,
  availability      text not null,
  message           text default '',
  status            text default 'pending'
                      check (status in ('pending','approved','rejected')),
  created_at        timestamptz default now()
);

create index if not exists teacher_applications_email_idx on teacher_applications (email);
create index if not exists teacher_applications_status_idx on teacher_applications (status);

-- ============================================================
-- STUDENT PROFILES — editable fields for logged-in students
-- Keyed on the lowercase Clerk-verified email so we don't need
-- to migrate when Clerk user IDs change.
-- ============================================================
create table if not exists student_profiles (
  email               text primary key,
  name                text default '',
  phone               text default '',
  country             text default '',
  age_group           text default '',
  stripe_customer_id  text,
  updated_at          timestamptz default now()
);

create index if not exists student_profiles_updated_at_idx
  on student_profiles (updated_at desc);
create index if not exists student_profiles_stripe_customer_idx
  on student_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ============================================================
-- PARENT — CHILDREN (parents adding their kids to the platform)
-- One parent (Clerk email) may register multiple children.
-- linked_booking_email lets a parent attach existing bookings made
-- under a different email (e.g. the child's email).
-- ============================================================
create table if not exists parent_children (
  id                    uuid primary key default gen_random_uuid(),
  parent_email          text not null,
  child_name            text not null,
  child_age             integer not null,
  learning_goal         text not null,
  current_level         text not null,
  linked_booking_email  text default '',
  created_at            timestamptz default now()
);

create index if not exists parent_children_parent_email_idx
  on parent_children (parent_email);
create index if not exists parent_children_linked_email_idx
  on parent_children (linked_booking_email);

-- ============================================================
-- PARENT — NOTIFICATION PREFERENCES
-- Keyed on parent's Clerk email.
-- ============================================================
create table if not exists parent_preferences (
  email             text primary key,
  notify_confirmed  boolean default true,
  notify_zoom       boolean default true,
  notify_reminder   boolean default true,
  notify_notes      boolean default true,
  updated_at        timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Public site reads active teachers; everything else is locked
-- behind the service role (used by server-side API routes).
-- ============================================================
alter table teachers enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table subscriptions enable row level security;
alter table teacher_applications enable row level security;
alter table student_profiles enable row level security;
alter table parent_children enable row level security;
alter table parent_preferences enable row level security;
alter table messages enable row level security;

-- Teachers: anyone (anon + authenticated) may read active rows
drop policy if exists "Public reads active teachers" on teachers;
create policy "Public reads active teachers"
  on teachers for select
  to anon, authenticated
  using (is_active = true);

-- Reviews: anyone may read; writes flow through API routes (service role).
drop policy if exists "Public reads reviews" on reviews;
create policy "Public reads reviews"
  on reviews for select
  to anon, authenticated
  using (true);

-- Bookings / subscriptions / applications: no public policies.
-- All writes flow through API routes using the service role key,
-- which bypasses RLS by design.

-- ============================================================
-- SEED — 8 launch teachers (mirrors lib/teachers-data.ts)
-- ============================================================
insert into teachers
  (name, gender, subject, language, country, country_flag, experience_years,
   price_per_class, rating, review_count, bio, teaching_style, certifications,
   intro_video_url, available_slots, is_featured, slug)
values
  ('Ustadh Ahmad Ali', 'male', 'Tajweed & Hifz', 'English, Arabic',
   'Egypt', 'eg', 10, 15.00, 5.0, 0,
   'I have been teaching Quran for over 10 years with a focus on Tajweed and Hifz programs. I hold an Ijazah in Quran recitation and have helped over 200 students worldwide complete their memorization goals.',
   'Patient, structured, and encouraging. I create a personalized plan for each student.',
   'Ijazah in Tajweed, Al-Azhar University Certified',
   '',
   array['Mon 9am UTC','Wed 11am UTC','Fri 4pm UTC','Sat 10am UTC'],
   true, 'ustadh-ahmad-ali'),

  ('Sister Fatima Malik', 'female', 'Quran for Kids & Noorani Qaida', 'English, Urdu',
   'Pakistan', 'pk', 6, 12.00, 5.0, 0,
   'Specializing in teaching young children, I make Quran learning fun and engaging. My students love the interactive storytelling approach I use to teach Islamic values alongside recitation.',
   'Fun, engaging, and child-friendly. I use games and rewards to keep kids motivated.',
   'Diploma in Islamic Education, Certified Kids Quran Teacher',
   '',
   array['Tue 2pm UTC','Thu 3pm UTC','Sat 8am UTC','Sun 10am UTC'],
   true, 'sister-fatima-malik'),

  ('Sheikh Omar Hassan', 'male', 'Arabic Language & Tafseer', 'English, Arabic, French',
   'Jordan', 'jo', 14, 20.00, 5.0, 0,
   'With 14 years of experience teaching classical Arabic and Tafseer, I help students go beyond recitation to truly understand the meaning of the Quran. I have students from over 15 countries.',
   'Academic yet accessible. I connect Quranic meanings to real life situations.',
   'Masters in Islamic Studies, Jordan University. Ijazah in Tafseer.',
   '',
   array['Mon 6pm UTC','Wed 6pm UTC','Thu 7pm UTC'],
   true, 'sheikh-omar-hassan'),

  ('Ustadha Maryam Yusuf', 'female', 'Female Students Only — Quran & Tajweed', 'English, Malay',
   'Malaysia', 'my', 7, 14.00, 5.0, 0,
   'I provide a safe and comfortable learning environment exclusively for female students and young girls. My approach is gentle, supportive, and rooted in traditional Islamic values.',
   'Warm, supportive, and confidence-building. Perfect for sisters new to Quran learning.',
   'Diploma in Quran Recitation, International Islamic University Malaysia',
   '',
   array['Tue 10am UTC','Thu 11am UTC','Sun 2pm UTC'],
   false, 'ustadha-maryam-yusuf'),

  ('Ustadh Bilal Qureshi', 'male', 'Hifz Program (Full Memorization)', 'English, Urdu',
   'United Kingdom', 'gb', 9, 18.00, 5.0, 0,
   'I run a structured 3-year Hifz program online. My students follow a proven daily revision system that ensures long-term retention. I have helped 40+ students complete their Hifz online.',
   'Disciplined and systematic. I track every student''s daily progress closely.',
   'Hafiz ul Quran, Deobandi Ijazah',
   '',
   array['Mon 7am UTC','Wed 7am UTC','Fri 7am UTC','Sat 6am UTC'],
   false, 'ustadh-bilal-qureshi'),

  ('Sister Aisha Rahman', 'female', 'Islamic Studies & Duas for Kids', 'English',
   'United States', 'us', 5, 13.00, 5.0, 0,
   'Born and raised in the US, I understand the challenges of raising Muslim kids in the West. My classes combine Quran recitation, daily duas, and fun Islamic stories tailored for children aged 4 to 12.',
   'Creative, storytelling-based, and highly interactive. Parents love seeing their kids excited about Islam.',
   'Bachelor of Islamic Studies, Islamic Online University',
   '',
   array['Mon 4pm UTC','Wed 4pm UTC','Sat 3pm UTC'],
   false, 'sister-aisha-rahman'),

  ('Ustadh Yusuf Al-Turki', 'male', 'Tajweed Mastery — Advanced Level', 'English, Arabic, Turkish',
   'Turkey', 'tr', 12, 22.00, 5.0, 0,
   'I specialize in advanced Tajweed for students who already read Quran and want to perfect their recitation. My students have gone on to lead prayers at their local mosques worldwide.',
   'Precise, detail-oriented, and highly motivating. I push students to excellence.',
   'Ijazah with Sanad, Diyanet Certified Turkey',
   '',
   array['Tue 8am UTC','Thu 9am UTC','Sat 11am UTC'],
   true, 'ustadh-yusuf-al-turki'),

  ('Ustadha Khadijah Osei', 'female', 'Quran for Reverts & Beginners', 'English',
   'Ghana', 'gh', 4, 10.00, 5.0, 0,
   'Being a revert myself, I have a deep understanding of where new Muslims start from. I teach absolute beginners with zero prior knowledge — starting from Arabic letters all the way to fluent Quran recitation.',
   'Compassionate, zero-judgment, and beginner-friendly. Perfect for reverts and adult beginners.',
   'Certified Quran Teacher, Al-Maghrib Institute',
   '',
   array['Mon 2pm UTC','Fri 3pm UTC','Sun 4pm UTC'],
   false, 'ustadha-khadijah-osei')
on conflict (slug) do nothing;
