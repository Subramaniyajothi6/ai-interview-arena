import { z } from "zod";
import { DIFFICULTIES, INTERVIEW_TYPES, JOB_ROLES } from "@/lib/constants";

const values = <T extends { value: string }>(list: readonly T[]) =>
  list.map((x) => x.value) as [T["value"], ...T["value"][]];

export const questionSchema = z.object({
  question: z.string().trim().min(5, "Enter the question.").max(1000, "At most 1000 characters."),
  jobRole: z.enum(JOB_ROLES).or(z.literal("").transform(() => null)),
  skill: z.string().trim().min(1, "Enter a skill.").max(60, "At most 60 characters."),
  difficulty: z.enum(values(DIFFICULTIES), { error: "Choose a difficulty." }),
  interviewType: z.enum(values(INTERVIEW_TYPES), { error: "Choose a type." }),
  expectedAnswer: z
    .string()
    .trim()
    .min(10, "Describe what a good answer covers.")
    .max(3000, "At most 3000 characters."),
  isActive: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
});

// A required whole number between min and max, with plain-English errors
// (blank, letters and decimals are all rejected).
const wholeNumber = (min: number, max: number, unit = "") =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number({ error: "Enter a number." })
      .int("Use a whole number.")
      .min(min, `At least ${min}${unit}.`)
      .max(max, `At most ${max}${unit}.`),
  );

export const settingsSchema = z.object({
  questionsPerInterview: wholeNumber(3, 15),
  maxFollowUps: wholeNumber(0, 3),
  maxResumeMb: wholeNumber(1, 5, " MB"),
  allowFollowUps: z.literal("on").optional(),
  allowVoice: z.literal("on").optional(),
  showQuestionScores: z.literal("on").optional(),
  aiProvider: z.enum(["openai", "open_source"], { error: "Choose a provider." }),
});
