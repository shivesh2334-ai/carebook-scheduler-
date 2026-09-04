import type Anthropic from "@anthropic-ai/sdk";

export const clinicalTools: Anthropic.Tool[] = [
  {
    name: "check_appointment_slots",
    description:
      "Get available appointment slots for a given date and consultation type, based on working hours minus already-booked slots.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check, in YYYY-MM-DD format."
        },
        consultation_type: {
          type: "string",
          enum: ["opd", "follow_up", "urgent"]
        }
      },
      required: ["date", "consultation_type"]
    }
  },
  {
    name: "book_appointment",
    description:
      "Create a new appointment for a patient after they explicitly confirm the date, time, and consultation type. Call `send_sms` separately if you need to send a confirmation message.",
    input_schema: {
      type: "object",
      properties: {
        patient_name: { type: "string" },
        patient_phone: { type: "string" },
        consultation_type: {
          type: "string",
          enum: ["opd", "follow_up", "urgent"]
        },
        date: { type: "string", description: "YYYY-MM-DD" },
        start_time: { type: "string", description: "HH:mm, 24-hour" },
        notes: { type: "string", description: "Optional free-text notes." }
      },
      required: [
        "patient_name",
        "patient_phone",
        "consultation_type",
        "date",
        "start_time"
      ]
    }
  },
  {
    name: "cancel_appointment",
    description:
      "Cancel an existing appointment by its ID. Call `send_sms` separately if you need to send a cancellation message.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        reason: { type: "string" }
      },
      required: ["appointment_id"]
    }
  },
  {
    name: "lookup_patient",
    description: "Search for a patient by phone number or name.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        name: { type: "string" }
      }
    }
  },
  {
    name: "list_appointments",
    description:
      "Get the schedule for a given date, optionally filtered by patient.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        patient_id: { type: "string" }
      },
      required: ["date"]
    }
  },
  {
    name: "send_sms",
    description:
      "Send an SMS to a patient's phone number confirming a booking, cancellation, or reschedule.",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        message: { type: "string" }
      },
      required: ["phone", "message"]
    }
  }
];
