import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { authCookieOptions, SESSION_ONLY_COOKIE } from "./remember";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Acts as the signed-in user, so row level security still applies.
// Create a new one per request.
// `sessionOnly` overrides the "Remember me" cookie (used by the login action,
// which decides it from the form before that cookie reaches the browser).
export async function createClient({ sessionOnly }: { sessionOnly?: boolean } = {}) {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const short = sessionOnly ?? cookieStore.has(SESSION_ONLY_COOKIE);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, authCookieOptions(options, short)),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this can be ignored.
        }
      },
    },
  });
}
