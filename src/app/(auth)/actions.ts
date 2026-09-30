"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
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
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Please confirm your email first. Check your inbox for the link."
        : "Incorrect email or password.";
    return { error: message, values };
  }

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
  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "An account with this email already exists. Try logging in."
        : error.code === "weak_password"
          ? "That password is too weak. Use a longer password with a mix of characters."
          : "We couldn't create your account. Please try again.";
    return { error: message, values };
  }

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
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });

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
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function adminLogout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

// Admin sign-in: a normal password login, then the account must have the
// admin role. Candidates who try it are signed straight back out.
export async function adminLogin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Incorrect email or password.", values };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  if (profile?.role !== "admin" || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "This account does not have administrator access.", values };
  }

  redirect("/admin");
}
