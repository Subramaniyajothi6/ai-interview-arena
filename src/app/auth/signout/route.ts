import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/remember";
import { createClient } from "@/lib/supabase/server";

const NOTICES = new Set(["session_expired", "account_disabled"]);

// Clears this browser's login cookies, then shows the login page. Pages send
// users here when their session was ended elsewhere (another device logged
// out, account disabled): the cookies would otherwise still look signed in
// to the proxy and bounce between /login and /dashboard.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) store.delete(c.name);
  }
  store.delete(SESSION_ONLY_COOKIE);

  const target = new URL(params.get("admin") === "1" ? "/admin/login" : "/login", request.url);
  const error = params.get("error");
  if (error && NOTICES.has(error)) target.searchParams.set("error", error);
  const next = params.get("next");
  // Only paths inside this app, never another site.
  if (next && next.startsWith("/") && !next.startsWith("//")) target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
