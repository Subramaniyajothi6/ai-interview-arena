import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Wrong passwords allowed in the window before sign-in is refused. The per-
// address limit is higher so a shared college or office network isn't locked
// out by a few people mistyping, but guessing across many accounts still is.
export const LOGIN_LIMITS = { perEmail: 5, perIp: 50, windowMinutes: 15 };

// Minutes until sign-in is allowed again (0 = not locked). `failures` are the
// times of recent failed attempts, newest or oldest first.
export function lockoutMinutes(
  failures: Date[],
  limit: number,
  now = Date.now(),
  windowMinutes = LOGIN_LIMITS.windowMinutes,
) {
  const windowMs = windowMinutes * 60_000;
  const recent = failures
    .map((d) => d.getTime())
    .filter((t) => now - t < windowMs)
    .sort((a, b) => b - a);
  if (recent.length < limit) return 0;
  // Locked until the limit-th most recent failure leaves the window.
  return Math.max(1, Math.ceil((recent[limit - 1] + windowMs - now) / 60_000));
}

export function tooManyAttemptsMessage(minutes: number) {
  return `Too many sign-in attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

// The caller's address as Vercel reports it ("local" in development).
async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || h.get("x-real-ip") || "local").slice(0, 64);
}

const since = () => new Date(Date.now() - LOGIN_LIMITS.windowMinutes * 60_000).toISOString();

// Minutes the email or this address is locked for (0 = may try).
export async function checkLoginLock(email: string) {
  const admin = createAdminClient();
  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([
    admin
      .from("login_attempts")
      .select("created_at")
      .eq("email", email)
      .gte("created_at", since())
      .order("created_at", { ascending: false })
      .limit(LOGIN_LIMITS.perEmail),
    admin
      .from("login_attempts")
      .select("created_at")
      .eq("ip", ip)
      .gte("created_at", since())
      .order("created_at", { ascending: false })
      .limit(LOGIN_LIMITS.perIp),
  ]);
  const times = (rows: { created_at: string }[] | null) =>
    (rows ?? []).map((r) => new Date(r.created_at));
  return Math.max(
    lockoutMinutes(times(byEmail.data), LOGIN_LIMITS.perEmail),
    lockoutMinutes(times(byIp.data), LOGIN_LIMITS.perIp),
  );
}

export async function recordLoginFailure(email: string) {
  const admin = createAdminClient();
  await admin.from("login_attempts").insert({ email, ip: await clientIp() });
  // Keep the table small: attempts older than a day are no longer needed.
  await admin
    .from("login_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
}

export async function clearLoginFailures(email: string) {
  await createAdminClient().from("login_attempts").delete().eq("email", email);
}
