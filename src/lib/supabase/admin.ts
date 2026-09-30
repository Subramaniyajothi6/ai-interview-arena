import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { serverEnv } from "@/lib/server-env";

// Privileged client that bypasses row level security. Only for trusted
// server code that has already checked who the caller is, e.g. saving
// AI evaluations so candidates cannot write their own scores.
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
