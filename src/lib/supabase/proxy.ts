import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

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
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it verifies
  // the token and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
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
    if (PROTECTED_PREFIXES.some((p) => matches(pathname, p))) {
      return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
    }
    if (matches(pathname, ADMIN_PREFIX) && !matches(pathname, ADMIN_LOGIN)) {
      return redirectTo(ADMIN_LOGIN);
    }
  } else if (GUEST_ONLY.some((p) => matches(pathname, p))) {
    return redirectTo("/dashboard");
  }

  return response;
}
