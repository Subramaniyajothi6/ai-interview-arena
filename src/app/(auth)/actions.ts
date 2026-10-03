"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import {
  checkLoginLock,
  clearLoginFailures,
  recordLoginFailure,
  tooManyAttemptsMessage,
} from "@/lib/login-throttle";
import { SESSION_ONLY_COOKIE, sessionOnlyDeadline } from "@/lib/supabase/remember";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_RATE_LIMIT_MESSAGE,
  fieldErrors,
  forgotPasswordSchema,
  isEmailRateLimited,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  signInErrorMessage,
  signUpErrorMessage,
  type FieldErrors,
} from "@/lib/validation/auth";

export type AuthFormState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  // Echoed back so the form keeps what the user typed after an error.
  values?: Record<string, string>;
};

const NOT_CONFIGURED =
  "Sign-in isn't available yet: the app is not connected to Supabase. Add the keys to .env.local and restart the server.";

function formValues(formData: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

// Only allow redirects to paths inside this app, never to another site.
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["email", "remember"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  // Too many wrong passwords recently: refuse without asking Supabase.
  const email = parsed.data.email;
  const locked = await checkLoginLock(email);
  if (locked) return { error: tooManyAttemptsMessage(locked), values };

  // Without "Remember me" the session ends when the browser closes.
  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  if (remember) cookieStore.delete(SESSION_ONLY_COOKIE);
  else
    cookieStore.set(SESSION_ONLY_COOKIE, sessionOnlyDeadline(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

  const supabase = await createClient({ sessionOnly: !remember });
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "invalid_credentials") await recordLoginFailure(email);
    return { error: signInErrorMessage(error), values };
  }
  await clearLoginFailures(email);

  // Admins who use the normal login page go straight to the admin console.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profile?.role === "admin") redirect("/admin");

  redirect(safeNext(formData.get("next")));
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["fullName", "email"]);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { error: signUpErrorMessage(error), values };

  // With email confirmation on, there is no session until the link is clicked.
  if (!data.session) {
    return {
      success: `We sent a confirmation link to ${parsed.data.email}. Open it to activate your account.`,
    };
  }
  redirect("/dashboard");
}

export async function forgotPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  // The rate limit applies to every address, so reporting it reveals nothing.
  if (error && isEmailRateLimited(error)) return { error: EMAIL_RATE_LIMIT_MESSAGE, values };

  // Same message whether or not the account exists, so emails can't be probed.
  return {
    success: `If an account exists for ${parsed.data.email}, a reset link is on its way.`,
  };
}

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password different from your current one."
          : "We couldn't update your password. Please try again.",
    };
  }
  redirect("/dashboard");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/login");
}

export async function adminLogout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect("/admin/login");
}

// Admin sign-in: a normal password login, then the account must have the
// admin role. Candidates who try it are signed straight back out.
export async function adminLogin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const email = parsed.data.email;
  const locked = await checkLoginLock(email);
  if (locked) return { error: tooManyAttemptsMessage(locked), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code === "invalid_credentials") await recordLoginFailure(email);
    return { error: error ? signInErrorMessage(error) : "Incorrect email or password.", values };
  }
  await clearLoginFailures(email);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  if (profile?.role !== "admin" || profile.status !== "active") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This account does not have administrator access.", values };
  }

  redirect("/admin");
}
