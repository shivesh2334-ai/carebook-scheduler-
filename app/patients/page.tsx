"use client";

import { useEffect, useState } from "react";
import type { Patient } from "@/lib/types";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPatients(data.patients ?? []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Patients</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or phone..."
        className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {patients.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No patients found.</p>
        )}
        {patients.map((p) => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-slate-500">{p.phone}</p>
            </div>
            {p.email && <p className="text-slate-400 text-xs">{p.email}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
