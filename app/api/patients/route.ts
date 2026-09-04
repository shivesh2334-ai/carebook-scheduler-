import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const supabase = getSupabaseServiceClient();
  if (q) {
    const pattern = `%${q}%`;
    const [nameResult, phoneResult] = await Promise.all([
      supabase
        .from("patients")
        .select("*")
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("patients")
        .select("*")
        .ilike("phone", pattern)
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

    if (nameResult.error || phoneResult.error) {
      return NextResponse.json(
        { error: nameResult.error?.message || phoneResult.error?.message },
        { status: 500 }
      );
    }

    const patients = [...(nameResult.data || []), ...(phoneResult.data || [])]
      .filter(
        (patient, index, list) =>
          list.findIndex(({ id }) => id === patient.id) === index
      )
      .slice(0, 50);

    return NextResponse.json({ patients });
  }

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ patients: data });
}
