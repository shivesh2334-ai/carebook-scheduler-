export type ConsultationType = "opd" | "follow_up" | "urgent";
export type AppointmentStatus =
  | "booked"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_name: string;
  consultation_type: ConsultationType;
  slot_date: string; // YYYY-MM-DD
  slot_start: string; // HH:mm
  slot_end: string; // HH:mm
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const CONSULTATION_DURATIONS_MIN: Record<ConsultationType, number> = {
  opd: 15,
  follow_up: 15,
  urgent: 20
};

export const CLINIC_WORKING_HOURS = {
  start: "09:00",
  end: "19:00",
  lunchStart: "13:30",
  lunchEnd: "14:30",
  daysOpen: [1, 2, 3, 4, 5, 6] // Mon–Sat (0 = Sunday, closed)
};
