import { NextResponse } from "next/server";
import { getAuthedStudent } from "@/lib/student-auth";
import {
  createServerSupabaseClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase";
import type { AgeGroup, StudentProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_AGE: AgeGroup[] = ["child", "teen", "adult"];

function baseProfile(student: {
  email: string;
  fullName: string;
}): StudentProfile {
  return {
    email: student.email,
    name: student.fullName,
    phone: "",
    country: "",
    age_group: "",
    stripe_customer_id: null,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  const student = await getAuthedStudent();
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ profile: baseProfile(student) });
  }

  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("student_profiles")
    .select("*")
    .eq("email", student.email)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const profile = data ?? baseProfile(student);
  // Always show the Clerk-verified name + email even if the row exists.
  return NextResponse.json({
    profile: { ...profile, email: student.email, name: student.fullName },
  });
}

export async function PATCH(req: Request) {
  const student = await getAuthedStudent();
  if (!student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { phone?: string; country?: string; age_group?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.age_group !== undefined &&
    body.age_group !== "" &&
    !VALID_AGE.includes(body.age_group as AgeGroup)
  ) {
    return NextResponse.json(
      { error: `age_group must be one of ${VALID_AGE.join(", ")}` },
      { status: 400 }
    );
  }

  const upsert = {
    email: student.email,
    name: student.fullName,
    phone: (body.phone ?? "").trim(),
    country: (body.country ?? "").trim(),
    age_group: (body.age_group ?? "") as "" | AgeGroup,
    updated_at: new Date().toISOString(),
  };

  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from("student_profiles")
    .upsert(upsert, { onConflict: "email" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
