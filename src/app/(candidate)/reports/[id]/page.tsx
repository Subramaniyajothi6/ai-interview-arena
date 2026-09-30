import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CriteriaBars } from "@/components/ui/criteria-bars";
import { Icon } from "@/components/ui/icon";
import { ScoreRing } from "@/components/ui/score-ring";
import { requireUser } from "@/lib/auth";
import { AI_ESTIMATE_NOTE, EVALUATION_CRITERIA } from "@/lib/constants";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";

export const metadata: Metadata = { title: "Evaluation report" };

const letter = (n: number) => String.fromCharCode(96 + n);

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/reports/${id}`);

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, status, job_role, experience_level, interview_type, difficulty, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();

  const [
    { data: questions },
    { data: answers },
    { data: evaluations },
    { data: report },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id, position, follow_up_index, question, skill, source")
      .eq("interview_id", id)
      .order("position")
      .order("follow_up_index"),
    supabase
      .from("candidate_answers")
      .select("id, question_id, answer_text, mode, skipped")
      .eq("interview_id", id),
    supabase.from("ai_evaluations").select("*").eq("interview_id", id),
    supabase.from("interview_reports").select("*").eq("interview_id", id).maybeSingle(),
    supabase.from("app_settings").select("show_question_scores").eq("id", 1).maybeSingle(),
  ]);
  const showScores = settings?.show_question_scores ?? true;

  const answerOf = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const evalOf = new Map((evaluations ?? []).map((e) => [e.answer_id, e]));
  const status = STATUS_LABELS[iv.status];

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/history" className="text-[13px] font-semibold">
            ← Interview history
          </Link>
          <h2 className="mt-1 text-2xl">{iv.job_role}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip chip-n">{experienceLabel(iv.experience_level)}</span>
            <span className="chip">{typeLabel(iv.interview_type)}</span>
            <span className="chip chip-n">{difficultyLabel(iv.difficulty)}</span>
            <span className="chip chip-n">{formatDate(iv.created_at)}</span>
            <span className={`chip ${status.chip}`}>{status.label}</span>
          </div>
        </div>
        <Link href="/interview/new" className="btn btn-sec">
          <Icon name="refresh" size={16} />
          Practice again
        </Link>
      </div>

      {report ? (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="card flex flex-col items-center gap-3 text-center">
            <ScoreRing score={report.overall_score} size={140} stroke={12} />
            <span className="text-sm font-semibold">Overall score</span>
            <span className="text-xs text-muted">{AI_ESTIMATE_NOTE}</span>
          </section>
          <section className="card flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base">Evaluation criteria</h3>
              <span className="text-xs text-muted">Out of 100</span>
            </div>
            <CriteriaBars
              items={[
                { label: "Technical Accuracy", score: report.technical_knowledge },
                { label: "Relevance", score: report.relevance },
                { label: "Communication", score: report.communication },
                { label: "Clarity", score: report.clarity },
                { label: "Completeness", score: report.completeness },
                { label: "Problem Solving", score: report.problem_solving },
                { label: "Answer Quality", score: report.answer_quality },
              ]}
            />
          </section>
          {report.strengths.length > 0 && (
            <section className="card flex flex-col gap-2.5 !border-l-[3px] !border-l-success">
              <h3 className="text-base">Strengths</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {report.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          {report.improvements.length > 0 && (
            <section className="card flex flex-col gap-2.5 !border-l-[3px] !border-l-accent">
              <h3 className="text-base">Areas for improvement</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
                {report.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <section className="card flex gap-3 !border-primary-200 !bg-primary-50 text-primary-900">
          <Icon name="sparkle" />
          <div className="text-[13px] leading-normal">
            <p className="font-semibold">Evaluation pending</p>
            <p>
              AI evaluation is not enabled yet. Your answers are listed below; scores, feedback,
              strengths and an improvement plan will appear here once it is switched on.
            </p>
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-1 !p-0">
        <h3 className="px-5 pt-4 pb-2 text-base">Question breakdown</h3>
        {(questions ?? []).length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">
            No questions were generated for this interview.
          </p>
        ) : (
          <ol>
            {(questions ?? []).map((q) => {
              const a = answerOf.get(q.id);
              const e = a && showScores ? evalOf.get(a.id) : undefined;
              return (
                <li key={q.id} className="flex gap-4 border-t border-border-soft px-5 py-4">
                  <span className="w-8 shrink-0 pt-0.5 text-xs font-bold text-muted">
                    Q{q.position}
                    {q.follow_up_index ? letter(q.follow_up_index) : ""}
                  </span>
                  <div className="flex min-w-0 grow flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{q.question}</p>
                      {e && (
                        <span
                          className="font-display text-lg font-bold"
                          aria-label={`Score ${e.question_score}`}
                        >
                          {e.question_score}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {q.source === "follow_up" && <span className="chip">Follow-up</span>}
                      {q.skill && <span className="chip chip-n">{q.skill}</span>}
                      {a && !a.skipped && (
                        <span className="chip chip-n">
                          {a.mode === "voice" ? "Voice answer" : "Text answer"}
                        </span>
                      )}
                    </div>
                    {!a ? (
                      <p className="text-[13px] text-muted italic">Not answered</p>
                    ) : a.skipped ? (
                      <p className="text-[13px] text-muted italic">Skipped</p>
                    ) : (
                      <p className="rounded-control bg-bg p-3 text-[13px] leading-relaxed whitespace-pre-wrap">
                        {a.answer_text}
                      </p>
                    )}
                    {e ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-[13px] text-muted">
                          <b className="text-text">AI feedback:</b> {e.feedback}
                        </p>
                        <details className="text-[13px]">
                          <summary className="cursor-pointer font-semibold text-primary-600">
                            Criteria scores
                          </summary>
                          <div className="mt-2 max-w-md">
                            <CriteriaBars
                              items={EVALUATION_CRITERIA.map((c) => ({
                                label: c.label,
                                score: e[c.key],
                              }))}
                            />
                          </div>
                        </details>
                      </div>
                    ) : (
                      a &&
                      !a.skipped && (
                        <span className="chip chip-n self-start">Evaluation pending</span>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
