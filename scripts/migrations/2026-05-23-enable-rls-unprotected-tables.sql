-- ============================================================
-- Security — enable RLS on the 5 unprotected public tables
-- Apply: node --env-file=.env.local scripts/run-sql.mjs scripts/migrations/2026-05-23-enable-rls-unprotected-tables.sql
-- ============================================================
--
-- A 2026-05-23 audit found Row Level Security disabled on 5 tables,
-- leaving them readable/writable by anyone holding the public anon key
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY, shipped in the browser bundle).
--
-- Access review — which Supabase client touches each table:
--   admin_login_attempts            — service role only (lib/admin-rate-limit.ts)
--   messages                        — service role only (lib/messages.ts)
--   student_profiles                — service role only (api/student/profile + dashboard page)
--   teacher_availability_rules      — service role writes + anon-key reads (getAvailabilityRules)
--   teacher_availability_exceptions — service role writes + anon-key reads (getAvailabilityExceptions)
--
-- The service role key bypasses RLS, so every API route keeps working.
-- The two availability tables additionally need a public SELECT policy
-- because the booking calendar reads them with the anon key.

-- --- Service-role-only tables: RLS on, no policy (anon fully denied) ---
alter table admin_login_attempts enable row level security;
alter table messages             enable row level security;
alter table student_profiles     enable row level security;

-- --- Availability tables: RLS on + public read; writes stay service-role ---
alter table teacher_availability_rules      enable row level security;
alter table teacher_availability_exceptions enable row level security;

drop policy if exists "Public reads availability rules" on teacher_availability_rules;
create policy "Public reads availability rules"
  on teacher_availability_rules for select
  to anon, authenticated
  using (true);

drop policy if exists "Public reads availability exceptions" on teacher_availability_exceptions;
create policy "Public reads availability exceptions"
  on teacher_availability_exceptions for select
  to anon, authenticated
  using (true);
