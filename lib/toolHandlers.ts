import { getSupabaseServiceClient } from "./supabase";
import {
  CLINIC_WORKING_HOURS,
  CONSULTATION_DURATIONS_MIN,
  type ConsultationType
} from "./types";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isWithinLunch(start: string, end: string): boolean {
  const lunchStart = timeToMinutes(CLINIC_WORKING_HOURS.lunchStart);
  const lunchEnd = timeToMinutes(CLINIC_WORKING_HOURS.lunchEnd);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return s < lunchEnd && e > lunchStart;
}

async function checkAppointmentSlots(input: {
  date: string;
  consultation_type: ConsultationType;
}) {
  const supabase = getSupabaseServiceClient();
  const duration = CONSULTATION_DURATIONS_MIN[input.consultation_type];

  const dayOfWeek = new Date(`${input.date}T00:00:00`).getDay();
  if (!CLINIC_WORKING_HOURS.daysOpen.includes(dayOfWeek)) {
    return { available_slots: [], note: "Clinic is closed on this date (Sunday)." };
  }

  const { data: booked, error } = await supabase
    .from("appointments")
    .select("slot_start, slot_end")
    .eq("slot_date", input.date)
    .neq("status", "cancelled");

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

  const bookedRanges = (booked || []).map((b) => ({
    start: timeToMinutes(b.slot_start),
    end: timeToMinutes(b.slot_end)
  }));

  const slots: string[] = [];
  let cursor = CLINIC_WORKING_HOURS.start;
  const closeTime = CLINIC_WORKING_HOURS.end;

  while (timeToMinutes(cursor) + duration <= timeToMinutes(closeTime)) {
    const slotEnd = addMinutes(cursor, duration);

    const overlapsLunch = isWithinLunch(cursor, slotEnd);
    const overlapsBooking = bookedRanges.some(
      (b) => timeToMinutes(cursor) < b.end && timeToMinutes(slotEnd) > b.start
    );

    if (!overlapsLunch && !overlapsBooking) {
      slots.push(cursor);
    }
    cursor = addMinutes(cursor, duration);
  }

  return { available_slots: slots.slice(0, 12), duration_minutes: duration };
}

async function lookupPatient(input: { phone?: string; name?: string }) {
  const supabase = getSupabaseServiceClient();
  let query = supabase.from("patients").select("*").limit(5);

  if (input.phone) query = query.eq("phone", input.phone);
  else if (input.name) query = query.ilike("name", `%${input.name}%`);
  else return { patients: [] };

  const { data, error } = await query;
  if (error) throw new Error(`Patient lookup failed: ${error.message}`);
  return { patients: data || [] };
}

async function findOrCreatePatient(name: string, phone: string) {
  const supabase = getSupabaseServiceClient();
  const { data: existing } = await supabase
    .from("patients")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("patients")
    .insert({ name, phone })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create patient: ${error.message}`);
  return created;
}

async function bookAppointment(input: {
  patient_name: string;
  patient_phone: string;
  consultation_type: ConsultationType;
  date: string;
  start_time: string;
  notes?: string;
}) {
  const supabase = getSupabaseServiceClient();
  const patient = await findOrCreatePatient(
    input.patient_name,
    input.patient_phone
  );
  const duration = CONSULTATION_DURATIONS_MIN[input.consultation_type];
  const endTime = addMinutes(input.start_time, duration);

  const { data: conflictingAppointments, error: conflictError } = await supabase
    .from("appointments")
    .select("id")
    .eq("slot_date", input.date)
    .neq("status", "cancelled")
    .lt("slot_start", endTime)
    .gt("slot_end", input.start_time)
    .limit(1);

  if (conflictError) {
    throw new Error(
      `Failed to validate appointment availability: ${conflictError.message}`
    );
  }

  if (conflictingAppointments?.length) {
    throw new Error("The requested appointment slot is no longer available.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patient.id,
      consultation_type: input.consultation_type,
      slot_date: input.date,
      slot_start: input.start_time,
      slot_end: endTime,
      notes: input.notes || null,
      status: "booked"
    })
    .select("*")
    .single();

  if (error) throw new Error(`Booking failed: ${error.message}`);
  return { appointment: data, patient };
}

async function cancelAppointment(input: {
  appointment_id: string;
  reason?: string;
}) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", notes: input.reason || null })
    .eq("id", input.appointment_id)
    .select("*, patients(*)")
    .single();

  if (error) throw new Error(`Cancellation failed: ${error.message}`);
  return { appointment: data };
}

async function listAppointments(input: { date: string; patient_id?: string }) {
  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from("appointments")
    .select("*, patients(name, phone)")
    .eq("slot_date", input.date)
    .order("slot_start", { ascending: true });

  if (input.patient_id) query = query.eq("patient_id", input.patient_id);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list appointments: ${error.message}`);
  return { appointments: data || [] };
}

async function sendSms(input: { phone: string; message: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !authToken || !from) {
    console.log(`[send_sms stub] to=${input.phone} message="${input.message}"`);
    return { status: "stubbed", note: "Twilio credentials not configured." };
  }

  const twilio = (await import("twilio")).default(sid, authToken);
  const result = await twilio.messages.create({
    to: input.phone,
    from,
    body: input.message
  });

  return { status: "sent", sid: result.sid };
}

export async function executeClinicalTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "check_appointment_slots":
      return checkAppointmentSlots(
        input as { date: string; consultation_type: ConsultationType }
      );
    case "book_appointment":
      return bookAppointment(
        input as {
          patient_name: string;
          patient_phone: string;
          consultation_type: ConsultationType;
          date: string;
          start_time: string;
          notes?: string;
        }
      );
    case "cancel_appointment":
      return cancelAppointment(
        input as { appointment_id: string; reason?: string }
      );
    case "lookup_patient":
      return lookupPatient(input as { phone?: string; name?: string });
    case "list_appointments":
      return listAppointments(
        input as { date: string; patient_id?: string }
      );
    case "send_sms":
      return sendSms(input as { phone: string; message: string });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
