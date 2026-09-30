import { z } from "zod";
import { EXPERIENCE_LEVELS, JOB_ROLES } from "@/lib/constants";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => v || null);

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100, "At most 100 characters."),
  phone: optionalText(30, "At most 30 characters.").refine(
    (v) => v === null || /^[+\d][\d\s()-]{6,}$/.test(v),
    "Enter a valid phone number.",
  ),
  education: optionalText(300, "At most 300 characters."),
  experienceLevel: z
    .enum(EXPERIENCE_LEVELS.map((e) => e.value) as [string, ...string[]])
    .or(z.literal("").transform(() => null)),
  experienceSummary: optionalText(1000, "At most 1000 characters."),
  preferredRole: z.enum(JOB_ROLES).or(z.literal("").transform(() => null)),
});

export const skillSchema = z
  .string()
  .trim()
  .min(1, "Enter a skill.")
  .max(60, "At most 60 characters.")
  .regex(/^[\p{L}\p{N} .+#/&()-]+$/u, "Use letters, numbers and simple symbols only.");
