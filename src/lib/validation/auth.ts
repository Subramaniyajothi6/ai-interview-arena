import { z } from "zod";

// Trim and lowercase before checking the format (mobile keyboards often add a trailing space).
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

// Checks the two password fields match. `when` lets it run even if other
// fields (name, terms…) are invalid, so every error shows at once.
const passwordsMatch = {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
  when: (payload: z.core.ParsePayload) => {
    const v = payload.value as { password?: unknown; confirmPassword?: unknown };
    return typeof v?.password === "string" && typeof v?.confirmPassword === "string";
  },
};

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Name must be at most 100 characters."),
    email,
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "You must agree to the Terms and Privacy Policy." }),
  })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export type FieldErrors = Partial<Record<string, string>>;

// First error message per field, for showing under each input.
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

// What to tell the user when Supabase refuses a login. Only "wrong details" is
// vague on purpose (it never says whether the email exists).
export function signInErrorMessage(error: { code?: string; status?: number }) {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many sign-in attempts. Please wait a few minutes and try again.";
  }
  if (error.code === "email_not_confirmed") {
    return "Please confirm your email first. Check your inbox for the link.";
  }
  if (error.code === "user_banned") {
    return "This account has been disabled. Contact the platform administrator.";
  }
  return "Incorrect email or password.";
}

// Supabase's built-in mailer only sends a few emails an hour, so sign-up and
// password reset can be refused before any account is checked.
export function isEmailRateLimited(error: { code?: string; status?: number }) {
  return error.code === "over_email_send_rate_limit" || error.status === 429;
}

export const EMAIL_RATE_LIMIT_MESSAGE =
  "We've sent too many emails in the last hour. Please wait a while and try again.";

export function signUpErrorMessage(error: { code?: string; status?: number }) {
  if (isEmailRateLimited(error)) return EMAIL_RATE_LIMIT_MESSAGE;
  if (error.code === "user_already_exists") {
    return "An account with this email already exists. Try logging in.";
  }
  if (error.code === "weak_password") {
    return "That password is too weak. Use a longer password with a mix of characters.";
  }
  if (error.code === "email_address_invalid") {
    return "That email address can't be used. Please use a different one.";
  }
  return "We couldn't create your account. Please try again.";
}
