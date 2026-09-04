import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");

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

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ appointment: data });
}
