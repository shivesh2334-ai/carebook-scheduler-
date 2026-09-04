import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus
} from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");

  if (status && !APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
    return NextResponse.json(
      {
        error: `status must be one of: ${APPOINTMENT_STATUSES.join(", ")}`
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from("appointments")
    .select("*, patients(name, phone)")
    .order("slot_date", { ascending: true })
    .order("slot_start", { ascending: true });

  if (date) query = query.eq("slot_date", date);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ appointments: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body as { id: string; status: string };

  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status are required" },
      { status: 400 }
    );
  }

  if (!APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
    return NextResponse.json(
      {
        error: `status must be one of: ${APPOINTMENT_STATUSES.join(", ")}`
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: existingAppointment, error: existingError } = await supabase
    .from("appointments")
    .select("id, status, notes, doctor_name, slot_date, slot_start, slot_end")
    .eq("id", id)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (
    existingAppointment.status === "cancelled" &&
    (status === "booked" || status === "rescheduled")
  ) {
    const { data: conflictingAppointments, error: conflictError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_name", existingAppointment.doctor_name)
      .eq("slot_date", existingAppointment.slot_date)
      .in("status", ["booked", "rescheduled"])
      .neq("id", id)
      .lt("slot_start", existingAppointment.slot_end)
      .gt("slot_end", existingAppointment.slot_start)
      .limit(1);

    if (conflictError) {
      return NextResponse.json({ error: conflictError.message }, { status: 500 });
    }

    if (conflictingAppointments?.length) {
      return NextResponse.json(
        { error: "The appointment slot is no longer available." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: status as AppointmentStatus,
      notes: existingAppointment.notes
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error?.code === "23P01") {
    return NextResponse.json(
      { error: "The appointment slot is no longer available." },
      { status: 409 }
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ appointment: data });
}
