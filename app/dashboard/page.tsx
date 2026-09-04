import { getSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getTodayStats() {
  const supabase = getSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select("*, patients(name)")
    .eq("slot_date", today)
    .neq("status", "cancelled")
    .order("slot_start", { ascending: true });

  const byType = {
    opd: todayAppointments?.filter((a) => a.consultation_type === "opd").length ?? 0,
    follow_up:
      todayAppointments?.filter((a) => a.consultation_type === "follow_up")
        .length ?? 0,
    urgent:
      todayAppointments?.filter((a) => a.consultation_type === "urgent")
        .length ?? 0
  };

  return { today, appointments: todayAppointments ?? [], byType };
}

export default async function DashboardPage() {
  const { today, appointments, byType } = await getTodayStats();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Staff Dashboard</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Today's appointments" value={appointments.length} />
        <StatCard label="OPD" value={byType.opd} />
        <StatCard label="Follow-up" value={byType.follow_up} />
        <StatCard label="Urgent" value={byType.urgent} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm">
          Upcoming schedule
        </div>
        <div className="divide-y divide-slate-100">
          {appointments.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">
              No appointments scheduled today.
            </p>
          )}
          {appointments.map((a) => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">
                  {(a as { patients?: { name: string } }).patients?.name ?? "Unknown"}
                </p>
                <p className="text-slate-500 capitalize">
                  {a.consultation_type.replace("_", " ")}
                </p>
              </div>
              <div className="text-right">
                <p>{a.slot_start.slice(0, 5)}</p>
                <p className="text-xs text-slate-400 capitalize">{a.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-2xl font-semibold text-clinic-700">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
