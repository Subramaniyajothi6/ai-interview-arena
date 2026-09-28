import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

// Supabase client for Client Components. Uses the publishable key only;
// row level security decides what the signed-in user can read or write.
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
