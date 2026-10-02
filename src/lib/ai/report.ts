import "server-only";
import { readJobMatch } from "@/lib/interview/job-match";
import { experienceLabel } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiConfig } from "./client";
import { aiEvaluateAnswer, aiWriteReport, type AnswerEvaluation } from "./tasks";

type Admin = ReturnType<typeof createAdminClient>;

const avg = (values: (number | null | undefined)[]) => {
  const nums = values.filter((v): v is number => typeof v === "number");
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
};

// Scores one answer and stores the evaluation. Trusted server code only:
// candidates can't write their own scores (row level security).
export async function evaluateAndStore(
  ai: AiConfig,
  admin: Admin,
  ctx: {
    interview: {
      id: string;
      user_id: string;
      job_role: string;
      experience_level: string;
      difficulty: string;
    };
    question: { question: string; expected_points: string | null };
    answer: { id: string; answer_text: string; mode: "text" | "voice" };
    allowFollowUp: boolean;
    thread?: string[];
  },
): Promise<AnswerEvaluation> {
  const e = await aiEvaluateAnswer(ai, {
    jobRole: ctx.interview.job_role,
    experience: experienceLabel(ctx.interview.experience_level),
    difficulty: ctx.interview.difficulty,
    question: ctx.question.question,
    expectedPoints: ctx.question.expected_points,
    answer: ctx.answer.answer_text,
    mode: ctx.answer.mode,
    allowFollowUp: ctx.allowFollowUp,
    thread: ctx.thread,
  });
  const { followUp, ...scores } = e;
  await admin.from("ai_evaluations").upsert(
    {
      answer_id: ctx.answer.id,
      interview_id: ctx.interview.id,
      user_id: ctx.interview.user_id,
      ...scores,
      needs_follow_up: followUp !== null,
      model: ai.fastModel,
    },
    { onConflict: "answer_id" },
  );
  return e;
}

// Builds (or rebuilds) the final report and improvement plan for a finished
// interview. Returns false when there is nothing to report (no answers).
export async function buildReport(ai: AiConfig, interviewId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: iv } = await admin
    .from("interviews")
    .select(
      "id, user_id, status, job_role, experience_level, interview_type, difficulty, job_match",
    )
    .eq("id", interviewId)
    .single();
  if (!iv || (iv.status !== "completed" && iv.status !== "abandoned")) return false;

  const [{ data: questions }, { data: answers }, { data: evals }] = await Promise.all([
    admin
      .from("interview_questions")
      .select("id, position, follow_up_index, question, skill, expected_points")
      .eq("interview_id", interviewId)
      .order("position")
      .order("follow_up_index"),
    admin
      .from("candidate_answers")
      .select("id, question_id, answer_text, mode, skipped")
      .eq("interview_id", interviewId),
    admin.from("ai_evaluations").select("*").eq("interview_id", interviewId),
  ]);
  const answerOf = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const evalOf = new Map((evals ?? []).map((e) => [e.answer_id, e]));

  // Score answers that weren't scored during the interview (e.g. AI was busy).
  for (const q of questions ?? []) {
    const a = answerOf.get(q.id);
    if (!a || a.skipped || !a.answer_text.trim() || evalOf.has(a.id)) continue;
    try {
      const e = await evaluateAndStore(ai, admin, {
        interview: iv,
        question: q,
        answer: a,
        allowFollowUp: false,
      });
      evalOf.set(a.id, { ...e, answer_id: a.id } as never);
    } catch {
      // Left unscored; the report still covers the rest.
    }
  }

  // Questions the candidate saw: answered ones count with their score, skipped
  // ones as 0. Questions never reached (ended early) are left out.
  const seen = (questions ?? []).filter((q) => answerOf.has(q.id));
  const rows = seen.map((q) => {
    const a = answerOf.get(q.id)!;
    const e = a.skipped ? undefined : evalOf.get(a.id);
    return { q, a, e };
  });
  const scored = rows.filter((r) => r.e);
  if (scored.length === 0) return false;

  const overall = avg(rows.map((r) => (r.a.skipped ? 0 : (r.e?.question_score ?? null)))) ?? 0;
  const pick = (
    key:
      | "technical_accuracy"
      | "relevance"
      | "communication"
      | "clarity"
      | "completeness"
      | "problem_solving"
      | "answer_quality",
  ) => avg(scored.map((r) => r.e![key]));
  const criteria = {
    technical_knowledge: pick("technical_accuracy"),
    communication: pick("communication"),
    problem_solving: pick("problem_solving"),
    relevance: pick("relevance"),
    completeness: pick("completeness"),
    clarity: pick("clarity"),
    answer_quality: pick("answer_quality"),
  };
  const bySkill = new Map<string, number[]>();
  for (const r of scored) {
    if (!r.q.skill) continue;
    bySkill.set(r.q.skill, [...(bySkill.get(r.q.skill) ?? []), r.e!.question_score]);
  }
  const skillScores = Object.fromEntries([...bySkill].map(([k, v]) => [k, avg(v)]));

  const gaps = readJobMatch(iv.job_match)?.gaps ?? [];
  let text: Awaited<ReturnType<typeof aiWriteReport>> | null = null;
  try {
    text = await aiWriteReport(ai, {
      jobRole: iv.job_role,
      experience: experienceLabel(iv.experience_level),
      interviewType: iv.interview_type,
      difficulty: iv.difficulty,
      overallScore: overall,
      criteria,
      ended: iv.status === "abandoned",
      items: rows.map((r) => ({
        question: r.q.question,
        skill: r.q.skill,
        answer: r.a.skipped ? null : r.a.answer_text,
        score: r.e?.question_score ?? null,
        feedback: r.e?.feedback ?? null,
      })),
      gaps,
    });
  } catch {
    // Scores are still saved below; strengths and improvements come from them.
  }

  const named = [
    ["Technical accuracy", criteria.technical_knowledge],
    ["Communication", criteria.communication],
    ["Problem solving", criteria.problem_solving],
    ["Relevance", criteria.relevance],
    ["Completeness", criteria.completeness],
    ["Clarity", criteria.clarity],
  ].filter((c): c is [string, number] => c[1] !== null);
  const ranked = [...named].sort((a, b) => b[1] - a[1]);

  const { data: report, error } = await admin
    .from("interview_reports")
    .upsert(
      {
        interview_id: iv.id,
        user_id: iv.user_id,
        overall_score: overall,
        ...criteria,
        summary: text?.summary ?? null,
        strengths: text?.strengths ?? ranked.slice(0, 2).map(([k, v]) => `${k} (${v})`),
        improvements:
          text?.improvements ??
          ranked
            .slice(-2)
            .reverse()
            .map(([k, v]) => `${k} (${v})`),
        skill_scores: skillScores,
      },
      { onConflict: "interview_id" },
    )
    .select("id")
    .single();
  if (error || !report) return false;

  await admin.from("interviews").update({ overall_score: overall }).eq("id", iv.id);
  if (text) {
    await admin.from("improvement_plans").upsert(
      {
        report_id: report.id,
        interview_id: iv.id,
        user_id: iv.user_id,
        ...text.plan,
        created_at: new Date().toISOString(),
      },
      { onConflict: "report_id" },
    );
  }
  return true;
}
