import { createClient } from "@supabase/supabase-js";

// Service-role client for use ONLY in server-side API routes (never expose
// SUPABASE_SERVICE_ROLE_KEY to the browser bundle).
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
