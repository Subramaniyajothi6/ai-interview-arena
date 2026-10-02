import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  signInErrorMessage,
  signUpErrorMessage,
} from "@/lib/validation/auth";
import { interviewSetupSchema } from "@/lib/validation/interview";
import { profileSchema, skillSchema } from "@/lib/validation/profile";

const validRegistration = {
  fullName: "Priya Raman",
  email: "Priya@Example.com ",
  password: "password123",
  confirmPassword: "password123",
  terms: "on",
};

describe("registration", () => {
  it("accepts a valid form and normalises the email", () => {
    const r = registerSchema.safeParse(validRegistration);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("priya@example.com");
  });

  it("reports every problem at once, including mismatched passwords", () => {
    const r = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "different1",
      terms: undefined,
    });
    expect(r.success).toBe(false);
    const errors = fieldErrors(r.error!);
    expect(errors.confirmPassword).toBe("Passwords do not match.");
    expect(errors.terms).toMatch(/agree/);
  });

  it("rejects short passwords, bad emails and missing names", () => {
    const r = registerSchema.safeParse({
      fullName: "",
      email: "not-an-email",
      password: "short",
      confirmPassword: "short",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBe("Enter a valid email address.");
    expect(errors.password).toMatch(/at least 8/);
  });
});

describe("login, forgot and reset password", () => {
  it("requires an email and a password", () => {
    const errors = fieldErrors(loginSchema.safeParse({ email: "", password: "" }).error!);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBe("Enter your password.");
  });

  it("validates the forgot-password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "a@" }).success).toBe(false);
  });

  it("requires matching new passwords", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "newpassword1", confirmPassword: "newpassword1" })
        .success,
    ).toBe(true);
    const errors = fieldErrors(
      resetPasswordSchema.safeParse({ password: "newpassword1", confirmPassword: "x" }).error!,
    );
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });
});

describe("sign-in error messages", () => {
  it("explains rate limits, unconfirmed emails and disabled accounts", () => {
    expect(signInErrorMessage({ status: 429 })).toMatch(/Too many sign-in attempts/);
    expect(signInErrorMessage({ code: "over_request_rate_limit" })).toMatch(/Too many/);
    expect(signInErrorMessage({ code: "email_not_confirmed" })).toMatch(/confirm your email/);
    expect(signInErrorMessage({ code: "user_banned" })).toMatch(/has been disabled/);
  });

  it("stays vague for wrong details, so emails can't be probed", () => {
    expect(signInErrorMessage({ code: "invalid_credentials", status: 400 })).toBe(
      "Incorrect email or password.",
    );
  });
});

describe("sign-up error messages", () => {
  it("explains the email rate limit instead of a generic failure", () => {
    expect(signUpErrorMessage({ code: "over_email_send_rate_limit", status: 429 })).toMatch(
      /too many emails/,
    );
  });

  it("explains known causes and falls back to a generic message", () => {
    expect(signUpErrorMessage({ code: "user_already_exists" })).toMatch(/already exists/);
    expect(signUpErrorMessage({ code: "weak_password" })).toMatch(/too weak/);
    expect(signUpErrorMessage({ code: "email_address_invalid" })).toMatch(/can.t be used/);
    expect(signUpErrorMessage({ code: "unexpected_failure", status: 500 })).toMatch(
      /couldn.t create your account/,
    );
  });
});

describe("profile", () => {
  it("turns empty optional fields into null", () => {
    const r = profileSchema.safeParse({
      fullName: "Priya Raman",
      phone: "",
      education: " ",
      experienceLevel: "",
      experienceSummary: "",
      preferredRole: "",
    });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      phone: null,
      education: null,
      experienceLevel: null,
      preferredRole: null,
    });
  });

  it("rejects an invalid phone number and an unknown role", () => {
    const r = profileSchema.safeParse({
      fullName: "Priya",
      phone: "abc",
      education: "",
      experienceLevel: "3-5",
      experienceSummary: "",
      preferredRole: "Astronaut",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.phone).toBe("Enter a valid phone number.");
    expect(errors.preferredRole).toBeDefined();
  });

  it("leaves the experience level alone when the form does not send it", () => {
    const r = profileSchema.safeParse({
      fullName: "Priya Raman",
      phone: "",
      education: "",
      experienceSummary: "Full-stack intern, 6 months",
      preferredRole: "",
    });
    expect(r.success).toBe(true);
    expect(r.data!.experienceLevel).toBeUndefined();
    expect(r.data!.experienceSummary).toBe("Full-stack intern, 6 months");
  });

  it("allows skill names like C++, Node.js and UI/UX but not markup", () => {
    for (const ok of ["C++", "Node.js", "UI/UX", "C#", "Power BI"])
      expect(skillSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["<script>", "", "x".repeat(61)])
      expect(skillSchema.safeParse(bad).success).toBe(false);
  });
});

describe("interview setup", () => {
  it("accepts every option from the task", () => {
    const r = interviewSetupSchema.safeParse({
      jobRole: "AI/ML Engineer",
      experienceLevel: "5+",
      interviewType: "mixed",
      difficulty: "expert",
    });
    expect(r.success).toBe(true);
  });

  it("rejects values outside the allowed lists", () => {
    const r = interviewSetupSchema.safeParse({
      jobRole: "Pilot",
      experienceLevel: "10+",
      interviewType: "casual",
      difficulty: "impossible",
    });
    expect(Object.keys(fieldErrors(r.error!)).sort()).toEqual(
      ["difficulty", "experienceLevel", "interviewType", "jobRole"].sort(),
    );
  });
});
