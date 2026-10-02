// Single source of truth for interview configuration options.
// Values match the Postgres enums in supabase/migrations.

export const JOB_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Data Scientist",
  "AI/ML Engineer",
  "Digital Marketing Executive",
  "HR Executive",
  "Business Development Executive",
] as const;
export type JobRole = (typeof JOB_ROLES)[number];

export const EXPERIENCE_LEVELS = [
  { value: "fresher", label: "Fresher" },
  { value: "0-1", label: "0–1 Years" },
  { value: "1-3", label: "1–3 Years" },
  { value: "3-5", label: "3–5 Years" },
  { value: "5+", label: "5+ Years" },
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["value"];

export const INTERVIEW_TYPES = [
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "behavioral", label: "Behavioral" },
  { value: "managerial", label: "Managerial" },
  { value: "mixed", label: "Mixed" },
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number]["value"];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number]["value"];

export const EVALUATION_CRITERIA = [
  { key: "technical_accuracy", label: "Technical Accuracy" },
  { key: "relevance", label: "Relevance" },
  { key: "communication", label: "Communication" },
  { key: "clarity", label: "Clarity" },
  { key: "completeness", label: "Completeness" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "answer_quality", label: "Answer Quality" },
] as const;
export type CriterionKey = (typeof EVALUATION_CRITERIA)[number]["key"];

export const QUESTIONS_PER_INTERVIEW = 8;
export const MAX_FOLLOW_UPS_PER_QUESTION = 2;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

// Job description the candidate practises for (pasted text or a PDF/DOC/DOCX).
export const JOB_DESCRIPTION_MIN_CHARS = 30;
export const JOB_DESCRIPTION_MAX_CHARS = 20_000;
export const JOB_DESCRIPTION_FILE_MAX_BYTES = 2 * 1024 * 1024;

export const AI_ESTIMATE_NOTE = "AI-generated estimate — not an objective measurement of ability.";

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}
