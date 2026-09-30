import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase();
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
