import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// How often last_active_at is refreshed (used for "active users" in admin).
const ACTIVITY_INTERVAL_MS = 10 * 60 * 1000;

// The signed-in user and their profile, or null. Verified against Supabase Auth
// (not just the cookie) and cached for the duration of one request.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  const last = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
  if (Date.now() - last > ACTIVITY_INTERVAL_MS) {
    await createAdminClient()
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return { user, profile, supabase };
});

// True when the browser still has login cookies but the session is no longer
// valid (ended on another device, account disabled, expired).
async function hasStaleSession() {
  const store = await cookies();
  return store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

// Leftover cookies must be cleared before showing the login page, or the
// proxy (which only checks the token) would send the user straight back.
function signOutAndRedirect(params: Record<string, string>): never {
  redirect(`/auth/signout?${new URLSearchParams(params)}`);
}

// For candidate pages and actions: redirects to login when signed out and
// signs disabled accounts out.
export async function requireUser(next?: string) {
  const current = await getCurrentUser();
  if (!current) {
    if (await hasStaleSession()) {
      signOutAndRedirect({ error: "session_expired", ...(next ? { next } : {}) });
    }
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  if (current.profile.status === "disabled") {
    signOutAndRedirect({ error: "account_disabled" });
  }
  return current;
}

// For admin pages and actions.
export async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current) {
    if (await hasStaleSession()) signOutAndRedirect({ admin: "1", error: "session_expired" });
    redirect("/admin/login");
  }
  if (current.profile.role !== "admin" || current.profile.status !== "active") {
    redirect("/admin/login?error=not_admin");
  }
  return current;
}

export function initials(name: string, fallback = "?") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}
