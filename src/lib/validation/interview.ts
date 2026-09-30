import { z } from "zod";
import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, JOB_ROLES } from "@/lib/constants";

const values = <T extends { value: string }>(list: readonly T[]) =>
  list.map((x) => x.value) as [T["value"], ...T["value"][]];

export const interviewSetupSchema = z.object({
  jobRole: z.enum(JOB_ROLES, { error: "Choose a job role." }),
  experienceLevel: z.enum(values(EXPERIENCE_LEVELS), { error: "Choose your experience level." }),
  interviewType: z.enum(values(INTERVIEW_TYPES), { error: "Choose an interview type." }),
  difficulty: z.enum(values(DIFFICULTIES), { error: "Choose a difficulty." }),
});
