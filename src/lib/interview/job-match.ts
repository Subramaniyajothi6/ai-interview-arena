import { findSkills, type ParsedResume, type SkillRow } from "@/lib/resume/analyze";

// Stored in interviews.job_match. The same shape will be filled by the AI
// comparison once it is enabled ("method" tells them apart).
export type JobMatch = {
  method: "keyword" | "ai";
  // Skills the job description asks for, in the order the job mentions them.
  required: string[];
  // Required skills the resume shows.
  matched: string[];
  // Required skills the resume doesn't show: the interview focuses on these.
  gaps: string[];
  // Share of required skills the resume shows (null when no skills were found).
  match_percent: number | null;
};

// Compares a job description with the analysed resume using the shared skills
// list. Deterministic and free; no AI involved.
export function compareJobToResume(
  jobText: string,
  knownSkills: SkillRow[],
  resume: Pick<ParsedResume, "skills" | "technologies"> | null,
): JobMatch {
  const lower = jobText.toLowerCase();
  const firstMention = (name: string) => {
    const at = lower.indexOf(name.toLowerCase());
    return at === -1 ? Number.MAX_SAFE_INTEGER : at;
  };
  const required = findSkills(jobText, knownSkills)
    .map((s) => s.name)
    .sort((a, b) => firstMention(a) - firstMention(b));

  const has = new Set([...(resume?.skills ?? []), ...(resume?.technologies ?? [])].map(norm));
  const matched = required.filter((s) => has.has(norm(s)));
  const gaps = required.filter((s) => !has.has(norm(s)));

  return {
    method: "keyword",
    required,
    matched,
    gaps,
    match_percent: required.length ? Math.round((matched.length / required.length) * 100) : null,
  };
}

const norm = (s: string) => s.trim().toLowerCase();

// Reads interviews.job_match safely (it is JSON in the database).
export function readJobMatch(value: unknown): JobMatch | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<JobMatch>;
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((i) => typeof i === "string") : []);
  return {
    method: v.method === "ai" ? "ai" : "keyword",
    required: list(v.required),
    matched: list(v.matched),
    gaps: list(v.gaps),
    match_percent: typeof v.match_percent === "number" ? v.match_percent : null,
  };
}
