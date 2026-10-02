import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonCell } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icon";
import { ScoreRing } from "@/components/ui/score-ring";
import { requireAdmin } from "@/lib/auth";
import { EVALUATION_CRITERIA } from "@/lib/constants";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";
import { readJobMatch } from "@/lib/interview/job-match";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Interview details" };

type Evaluation = Database["public"]["Tables"]["ai_evaluations"]["Row"];
const letter = (n: number) => String.fromCharCode(96 + n);

function minutes(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function MiniCriteria({ e }: { e: Evaluation }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {EVALUATION_CRITERIA.map((c) => (
        <div key={c.key} className="flex flex-col gap-1.5 text-xs">
          <span className="flex justify-between gap-2">
            <span className="text-text-2">{c.label}</span>
            <b>{e[c.key]}</b>
          </span>
          <span className="relative h-1.5 overflow-hidden rounded bg-border-soft">
            <span
              className={`absolute inset-y-0 left-0 rounded ${e[c.key] >= 75 ? "bg-primary-600" : "bg-primary-500"}`}
              style={{ width: `${e[c.key]}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminInterviewDetailPage({
  params,
}: PageProps<"/admin/interviews/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: iv } = await supabase
    .from("interviews")
    .select("*, profiles(full_name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!iv) notFound();

  const [{ data: questions }, { data: answers }, { data: evaluations }, { data: report }] =
    await Promise.all([
      // Expected-answer notes are hidden from candidates; the admin view reads
      // them with the trusted client after the admin check above.
      createAdminClient()
        .from("interview_questions")
        .select("id, position, follow_up_index, question, skill, source, expected_points")
        .eq("interview_id", id)
        .order("position")
        .order("follow_up_index"),
      supabase.from("candidate_answers").select("*").eq("interview_id", id),
      supabase.from("ai_evaluations").select("*").eq("interview_id", id),
      supabase.from("interview_reports").select("id").eq("interview_id", id).maybeSingle(),
    ]);
  const answerOf = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const evalOf = new Map((evaluations ?? []).map((e) => [e.answer_id, e]));
  const qs = questions ?? [];
  const followUps = qs.filter((q) => q.follow_up_index > 0).length;
  const st = STATUS_LABELS[iv.status];
  const mins = minutes(iv.started_at, iv.ended_at);

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/interviews"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline"
        >
          <Icon name="arrowLeft" size={14} />
          All interviews
        </Link>
        <span className="text-[13px] text-muted">
          {formatDate(iv.created_at)}
          {mins && ` · ${mins} min`} · {qs.length - followUps} questions
          {followUps > 0 && ` + ${followUps} follow-up${followUps > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Summary card */}
      <section className="card flex flex-col gap-5 !px-6 !py-5 xl:flex-row xl:items-center">
        <Link
          href={`/admin/candidates/${iv.user_id}`}
          className="min-w-0 shrink-0 text-text no-underline xl:w-[190px] xl:border-r xl:border-border-soft xl:pr-5"
        >
          <PersonCell name={iv.profiles?.full_name ?? ""} email={iv.profiles?.email} />
        </Link>
        <dl className="grid min-w-0 grow grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[
            ["Job role", iv.job_role],
            ["Experience level", experienceLabel(iv.experience_level)],
            ["Interview type", typeLabel(iv.interview_type)],
            ["Difficulty", difficultyLabel(iv.difficulty)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                {k}
              </dt>
              <dd className="mt-0.5 text-sm">{v}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              Status
            </dt>
            <dd className="mt-1">
              <span className={`chip ${st.chip}`}>{st.label}</span>
            </dd>
          </div>
        </dl>
        <div className="flex shrink-0 items-center gap-3 xl:border-l xl:border-border-soft xl:pl-5">
          <ScoreRing score={iv.overall_score} size={82} stroke={8} />
          <div>
            <div className="text-sm font-semibold">Overall score</div>
            <div className="text-xs text-muted">
              {iv.overall_score === null ? "Not evaluated" : "AI estimate"}
            </div>
          </div>
        </div>
      </section>

      {iv.job_description && <JobDescriptionCard text={iv.job_description} match={iv.job_match} />}

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg">Interview evaluation</h2>
        <span className="text-xs text-muted">Scores are AI-generated estimates</span>
      </div>

      {qs.length === 0 && <p className="card text-sm text-muted">No questions yet.</p>}

      {qs.map((q) => {
        const a = answerOf.get(q.id);
        const e = a ? evalOf.get(a.id) : undefined;
        const followUp = q.follow_up_index > 0;
        const label = `Q${q.position}${followUp ? letter(q.follow_up_index) : ""}`;
        return (
          <article key={q.id} className={`flex flex-col gap-3 ${followUp ? "sm:ml-14" : ""}`}>
            <header
              className={`card flex items-start gap-4 !px-5 !py-4 ${followUp ? "!border-2 !border-primary-300" : ""}`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold ${
                  followUp ? "bg-primary-50 text-primary-900" : "bg-primary-600 text-white"
                }`}
              >
                {label}
              </span>
              <div className="flex min-w-0 grow flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow">
                    {followUp ? "Follow-up" : `Question ${q.position}`}
                  </span>
                  <span className={`chip ${followUp ? "" : "chip-n"} !h-6`}>
                    {followUp
                      ? `Follow-up to Q${q.position}`
                      : q.source === "resume"
                        ? "From resume"
                        : q.source === "gap"
                          ? "Skill gap (job description)"
                          : "Main question"}
                  </span>
                  {q.skill && <span className="chip chip-n !h-6">{q.skill}</span>}
                </span>
                <h3 className="text-[17px] leading-snug">{q.question}</h3>
              </div>
              {e && (
                <div className="shrink-0 text-right">
                  <div className="font-display text-2xl font-bold">{e.question_score}</div>
                  <div className="text-xs text-muted">Question score</div>
                </div>
              )}
            </header>

            <div className="grid gap-3 sm:ml-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
              <section className="card flex flex-col gap-2.5 !bg-[#FCFBFA]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold tracking-[0.12em] text-text-2 uppercase">
                    Candidate answer
                  </h4>
                  {a && !a.skipped && (
                    <span className="chip chip-n !h-6">
                      <Icon name={a.mode === "voice" ? "mic" : "file"} size={12} />
                      {a.mode === "voice" ? "Voice" : "Text"}
                    </span>
                  )}
                </div>
                {!a ? (
                  <p className="text-[13px] text-muted italic">Not answered</p>
                ) : a.skipped ? (
                  <p className="text-[13px] text-muted italic">Skipped</p>
                ) : (
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-text-2">
                    {a.answer_text}
                  </p>
                )}
              </section>

              <section className="card flex flex-col gap-3">
                <h4 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-primary-600 uppercase">
                  <Icon name="sparkle" size={14} />
                  AI evaluation
                </h4>
                {e ? (
                  <>
                    <MiniCriteria e={e} />
                    <p className="rounded-control bg-primary-50 px-3.5 py-3 text-[13px] text-primary-900">
                      <b>AI feedback:</b> {e.feedback}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-muted">
                    {a && !a.skipped
                      ? "Pending — AI evaluation is not enabled yet."
                      : "No answer to evaluate."}
                  </p>
                )}
                {q.expected_points && (
                  <details className="text-[13px]">
                    <summary className="cursor-pointer font-semibold text-primary-600">
                      Expected answer (admin only)
                    </summary>
                    <p className="mt-1.5 text-text-2">{q.expected_points}</p>
                  </details>
                )}
              </section>
            </div>
          </article>
        );
      })}

      <section className="card flex flex-wrap items-center justify-between gap-4 !border-primary-200 !bg-primary-50">
        <div className="flex items-start gap-3">
          <span className="text-primary-600">
            <Icon name="file" />
          </span>
          <div>
            <h2 className="text-[15px]">Final interview report</h2>
            <p className="text-[13px] text-primary-900">
              {report
                ? "Overall score, strengths, improvement areas and the candidate's improvement plan."
                : iv.status === "completed" || iv.status === "abandoned"
                  ? "Not generated yet — it is created once AI evaluation is enabled. The answers above are the full record for now."
                  : "Not generated yet — it is created when the candidate finishes the interview and AI evaluation is enabled."}
            </p>
          </div>
        </div>
        {/* Only link when there is a report; otherwise the Reports page has nothing more to show. */}
        {report && (
          <Link href={`/admin/reports?id=${iv.id}`} className="btn">
            View final report
            <Icon name="arrowRight" size={16} />
          </Link>
        )}
      </section>
    </div>
  );
}

// The job description the candidate practised for and how it compares with
// their resume.
function JobDescriptionCard({ text, match: raw }: { text: string; match: unknown }) {
  const match = readJobMatch(raw);
  return (
    <section className="card flex flex-col gap-3 !px-6 !py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base">
          <span className="text-primary-600">
            <Icon name="target" size={18} />
          </span>
          Job description
        </h2>
        {match?.match_percent !== null && match?.match_percent !== undefined && (
          <span className="text-sm text-muted">
            Resume match <b className="text-text">{match.match_percent}%</b> · {match.gaps.length}{" "}
            skill gap{match.gaps.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {match && match.required.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {match.gaps.map((g) => (
            <span key={g} className="chip chip-warn">
              Gap: {g}
            </span>
          ))}
          {match.matched.map((m) => (
            <span key={m} className="chip chip-ok">
              <Icon name="check" size={12} strokeWidth={2.5} />
              {m}
            </span>
          ))}
        </div>
      )}
      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold text-primary-600">
          Show the full job description
        </summary>
        <p className="mt-2 max-h-80 overflow-y-auto rounded-control bg-bg p-3 leading-relaxed whitespace-pre-wrap text-text-2">
          {text}
        </p>
      </details>
    </section>
  );
}
