import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { authCookieOptions, SESSION_ONLY_COOKIE, sessionOnlyExpired } from "./remember";

// Pages that need a signed-in user. Admin pages also need the admin role,
// which the admin layout checks against the database.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/interview",
  "/history",
  "/plan",
  "/profile",
  "/reports",
];
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin/login";
// Signed-in users skip these and go straight to their dashboard.
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Refreshes the Supabase session cookie on every request and does fast,
// optimistic redirects. Real authorization happens again in each page and
// server action, and in the database's row level security.
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        const sessionOnly = request.cookies.has(SESSION_ONLY_COOKIE);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, authCookieOptions(options, sessionOnly)),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it verifies
  // the token and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  let signedIn = Boolean(data?.claims?.sub);

  // "Remember me" was off and the session is past its deadline: end it here
  // (signOut clears the auth cookies), even if the browser kept the cookies.
  if (signedIn && sessionOnlyExpired(request.cookies.get(SESSION_ONLY_COOKIE)?.value)) {
    await supabase.auth.signOut({ scope: "local" });
    response.cookies.delete(SESSION_ONLY_COOKIE);
    signedIn = false;
  }
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    const [p, q] = path.split("?");
    target.pathname = p;
    target.search = q ? `?${q}` : "";
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!signedIn) {
    // A leftover auth cookie without a valid session means it expired
    // (logging out removes the cookie), so tell the user why they're here.
    const expired = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    const notice = expired ? "error=session_expired&" : "";
    if (PROTECTED_PREFIXES.some((p) => matches(pathname, p))) {
      return redirectTo(`/login?${notice}next=${encodeURIComponent(pathname + search)}`);
    }
    if (matches(pathname, ADMIN_PREFIX) && !matches(pathname, ADMIN_LOGIN)) {
      return redirectTo(`${ADMIN_LOGIN}${expired ? "?error=session_expired" : ""}`);
    }
  } else if (GUEST_ONLY.some((p) => matches(pathname, p))) {
    return redirectTo("/dashboard");
  }

  return response;
}
