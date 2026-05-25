import { redirect } from "next/navigation";
import { getAuthedStudent } from "@/lib/student-auth";
import {
  createServerSupabaseClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase";
import type { StudentProfile } from "@/lib/types";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

async function loadProfile(
  email: string,
  fullName: string
): Promise<StudentProfile> {
  const fallback: StudentProfile = {
    email,
    name: fullName,
    phone: "",
    country: "",
    age_group: "",
    stripe_customer_id: null,
    updated_at: new Date().toISOString(),
  };
  if (!isSupabaseAdminConfigured) return fallback;
  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("student_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error || !data) return fallback;
  return { ...(data as StudentProfile), email, name: fullName };
}

export default async function ProfilePage() {
  const student = await getAuthedStudent();
  if (!student) redirect("/sign-in");
  const profile = await loadProfile(student.email, student.fullName);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your contact details and learning preferences.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Account
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Name" value={profile.name} />
          <Row label="Email" value={profile.email} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          To change your name or email, use the account menu (top-right).
        </p>
      </section>

      <ProfileForm initial={profile} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}
