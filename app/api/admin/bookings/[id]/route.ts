import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  createServerSupabaseClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase";
import { sendZoomLinkEmail } from "@/lib/email";
import { createScheduledMeeting, isZoomConfigured } from "@/lib/zoom";
import type { Booking } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS: Booking["status"][] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { status?: Booking["status"]; zoom_link?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Partial<Booking> = {};
  if (typeof body.status === "string") {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of ${VALID_STATUS.join(", ")}` },
        { status: 400 }
      );
    }
    update.status = body.status;
  }
  if (typeof body.zoom_link === "string") {
    update.zoom_link = body.zoom_link.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 }
    );
  }

  const admin = createServerSupabaseClient();
  const { data: updated, error } = await admin
    .from("bookings")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // If a Zoom link was added (or replaced) by hand, notify the student.
  if (typeof body.zoom_link === "string" && update.zoom_link) {
    sendZoomLinkEmail({
      studentName: updated.student_name,
      studentEmail: updated.student_email,
      teacherName: updated.teacher_name,
      selectedSlot: updated.selected_slot,
      zoomLink: update.zoom_link,
    }).catch((err) => {
      console.error("[admin/bookings] zoom email failed", err);
    });
  }

  // When a booking is confirmed and has no link yet, auto-create a Zoom
  // meeting, save it to the booking, and email the student. Best-effort:
  // a Zoom/email failure is logged but does not fail the confirmation.
  if (body.status === "confirmed" && !updated.zoom_link && isZoomConfigured) {
    try {
      const meeting = await createScheduledMeeting({
        topic: `LearnFurqan Class - ${updated.teacher_name} & ${updated.student_name}`,
        startTime: updated.selected_slot,
        durationMinutes: 60,
      });
      const { error: linkError } = await admin
        .from("bookings")
        .update({ zoom_link: meeting.joinUrl })
        .eq("id", params.id);
      if (linkError) throw new Error(linkError.message);
      updated.zoom_link = meeting.joinUrl;

      await sendZoomLinkEmail({
        studentName: updated.student_name,
        studentEmail: updated.student_email,
        teacherName: updated.teacher_name,
        selectedSlot: updated.selected_slot,
        zoomLink: meeting.joinUrl,
      });
    } catch (err) {
      console.error("[admin/bookings] zoom auto-gen failed", err);
    }
  }

  return NextResponse.json({ booking: updated });
}
