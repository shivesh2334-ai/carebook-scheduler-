import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const supabase = getSupabaseServiceClient();
  if (q) {
    const pattern = `%${escapeLikePattern(q)}%`;
    const looksLikePhone = /^[+\d\s()-]+$/.test(q);
    const phonePattern = `${escapeLikePattern(q.replace(/\s+/g, ""))}%`;
    const queries = [
      supabase
        .from("patients")
        .select("*")
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(50),
      looksLikePhone
        ? supabase
            .from("patients")
            .select("*")
            .like("phone", phonePattern)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null })
    ] as const;
    const [nameResult, phoneResult] = await Promise.all(queries);

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
