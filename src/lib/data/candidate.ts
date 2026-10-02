import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INTERVIEW_TYPES, type InterviewType } from "@/lib/constants";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const avg = (values: (number | null | undefined)[]) => {
  const nums = values.filter((v): v is number => typeof v === "number");
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
};

// Everything the candidate dashboard shows, computed from the user's own rows
// (row level security already limits the queries to this user).
export async function getCandidateDashboard(supabase: Client) {
  const [{ data: interviews }, { data: reports }] = await Promise.all([
    supabase
      .from("interviews")
      .select("id, job_role, interview_type, difficulty, status, overall_score, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("interview_reports")
      .select(
        "interview_id, overall_score, technical_knowledge, communication, problem_solving, relevance, completeness, clarity, answer_quality, strengths, improvements, skill_scores, created_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  const all = interviews ?? [];
  const done = reports ?? [];
  const finished = all.filter((i) => i.status === "completed" || i.status === "abandoned");
  const completedCount = all.filter((i) => i.status === "completed").length;
  const scores = done.map((r) => r.overall_score);

  const latest = done.at(-1) ?? null;
  const previous = done.at(-2) ?? null;

  // Average score per skill across all reports.
  const skillTotals = new Map<string, number[]>();
  for (const r of done) {
    for (const [skill, score] of Object.entries((r.skill_scores ?? {}) as Record<string, number>)) {
      if (typeof score === "number")
        skillTotals.set(skill, [...(skillTotals.get(skill) ?? []), score]);
    }
  }
  const skills = [...skillTotals.entries()]
    .map(([skill, list]) => ({ skill, score: avg(list)! }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  // Average overall score per interview type.
  const typeOf = new Map(all.map((i) => [i.id, i.interview_type as InterviewType]));
  const types = INTERVIEW_TYPES.map((t) => ({
    type: t.label,
    score: avg(
      done.filter((r) => typeOf.get(r.interview_id) === t.value).map((r) => r.overall_score),
    ),
  }));

  const criteria = [
    { label: "Technical accuracy", score: avg(done.map((r) => r.technical_knowledge)) },
    { label: "Relevance", score: avg(done.map((r) => r.relevance)) },
    { label: "Communication", score: avg(done.map((r) => r.communication)) },
    { label: "Problem solving", score: avg(done.map((r) => r.problem_solving)) },
    { label: "Completeness", score: avg(done.map((r) => r.completeness)) },
  ].filter((c): c is { label: string; score: number } => c.score !== null);

  return {
    stats: {
      total: all.length,
      completed: completedCount,
      scored: done.length,
      average: avg(scores),
      best: scores.length ? Math.max(...scores) : null,
      technical: avg(done.map((r) => r.technical_knowledge)),
      communication: avg(done.map((r) => r.communication)),
      // Share of finished interviews that were completed rather than ended early.
      completionRate: finished.length ? Math.round((completedCount / finished.length) * 100) : null,
      change: latest && previous ? latest.overall_score - previous.overall_score : null,
    },
    trend: done.slice(-6).map((r) => ({ date: r.created_at, score: r.overall_score })),
    criteria: criteria.sort((a, b) => b.score - a.score),
    skills,
    types,
    strengths: latest?.strengths.slice(0, 3) ?? [],
    improvements: latest?.improvements.slice(0, 3) ?? [],
    recent: all.slice(0, 5),
    reportIds: new Set(done.map((r) => r.interview_id)),
  };
}
