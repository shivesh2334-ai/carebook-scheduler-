"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "@/lib/types";

type AppointmentWithPatient = Appointment & {
  patients?: { name: string; phone: string } | null;
};

export default function AppointmentsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/appointments?date=${date}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load appointments.");
      setAppointments([]);
      setLoading(false);
      return;
    }
    setError(null);
    setAppointments(data.appointments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to update appointment.");
      return;
    }

    setError(null);
    load();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No appointments for this date.
                </td>
              </tr>
            )}
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2">{a.slot_start.slice(0, 5)}</td>
                <td className="px-4 py-2">{a.patients?.name ?? "—"}</td>
                <td className="px-4 py-2 capitalize">
                  {a.consultation_type.replace("_", " ")}
                </td>
                <td className="px-4 py-2 capitalize">{a.status}</td>
                <td className="px-4 py-2 space-x-2">
                  {a.status === "booked" && (
                    <>
                      <button
                        onClick={() => updateStatus(a.id, "completed")}
                        className="text-clinic-700 hover:underline"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateStatus(a.id, "cancelled")}
                        className="text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
