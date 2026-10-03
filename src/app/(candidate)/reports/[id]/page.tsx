import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { CriteriaBars } from "@/components/ui/criteria-bars";
import { Icon, type IconName } from "@/components/ui/icon";
import { ScoreRing } from "@/components/ui/score-ring";
import { getAi } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth";
import { AI_ESTIMATE_NOTE } from "@/lib/constants";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
  formatDuration,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";
import { readJobMatch, type JobMatch } from "@/lib/interview/job-match";
import type { Json } from "@/lib/supabase/database.types";
import { planList, type PlanProject, type PlanQuestion, type PlanTopic } from "@/lib/plan";
import { GenerateReportButton } from "./generate-report";

export const metadata: Metadata = { title: "Evaluation report" };

const letter = (n: number) => String.fromCharCode(96 + n);

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const { user, profile, supabase } = await requireUser(`/reports/${id}`);

  const { data: iv } = await supabase
    .from("interviews")
    .select(
      "id, status, job_role, experience_level, interview_type, difficulty, created_at, started_at, ended_at, job_match",
    )
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
    { data: previous },
    { data: plan },
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
    supabase
      .from("ai_evaluations")
      .select("answer_id, question_score, feedback")
      .eq("interview_id", id),
    supabase.from("interview_reports").select("*").eq("interview_id", id).maybeSingle(),
    supabase.from("app_settings").select("show_question_scores").eq("id", 1).maybeSingle(),
    // The candidate's previous scored interview, for "+N vs last interview".
    supabase
      .from("interview_reports")
      .select("overall_score")
      .eq("user_id", user.id)
      .lt("created_at", iv.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("improvement_plans").select("*").eq("interview_id", id).maybeSingle(),
  ]);
  const showScores = settings?.show_question_scores ?? true;

  const answerOf = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const evalOf = new Map((evaluations ?? []).map((e) => [e.answer_id, e]));
  const change = report && previous ? report.overall_score - previous.overall_score : null;
  const rows = (questions ?? []).map((q) => {
    const a = answerOf.get(q.id);
    const e = a && showScores ? evalOf.get(a.id) : undefined;
    return {
      q,
      a,
      e,
      label: `${q.position}${q.follow_up_index ? letter(q.follow_up_index) : ""}`,
      followUp: q.source === "follow_up",
      gap: q.source === "gap",
      feedback: !a ? "Not answered" : a.skipped ? "Skipped" : e ? e.feedback : "Evaluation pending",
    };
  });
  const answeredCount = rows.filter((r) => r.a && !r.a.skipped).length;
  const skippedCount = rows.filter((r) => r.a?.skipped).length;
  const duration = formatDuration(iv.started_at, iv.ended_at);
  const jobMatch = readJobMatch(iv.job_match);
  const aiOn = !report && Boolean(await getAi());
  const finished = iv.status === "completed" || iv.status === "abandoned";

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      {/* Phone bar from the mobile report board: back, title, download. */}
      <div className="flex items-center justify-between md:hidden print:hidden">
        <Link
          href="/history"
          className="btn btn-sec btn-sm !w-9 !px-0"
          aria-label="Back to history"
        >
          <Icon name="arrowLeft" size={16} />
        </Link>
        <span className="text-sm font-semibold">Evaluation report</span>
        <PrintButton
          label=""
          ariaLabel="Download report"
          className="btn btn-sec btn-sm !w-9 !px-0"
        />
      </div>
      <PrintHeader
        name={profile.full_name}
        details={[
          ["Role", iv.job_role],
          ["Experience", experienceLabel(iv.experience_level)],
          ["Interview", `${typeLabel(iv.interview_type)} · ${difficultyLabel(iv.difficulty)}`],
          ["Date", formatDate(iv.created_at)],
          ["Time taken", duration],
          [
            "Questions",
            `${answeredCount} of ${rows.length} answered${skippedCount ? `, ${skippedCount} skipped` : ""}`,
          ],
          ["Status", STATUS_LABELS[iv.status].label],
          ["Overall score", report ? `${report.overall_score} / 100` : "Evaluation pending"],
          ...(jobMatch && jobMatch.match_percent !== null
            ? ([
                [
                  "Job match",
                  `${jobMatch.match_percent}% · ${jobMatch.gaps.length} skill gap${jobMatch.gaps.length === 1 ? "" : "s"}`,
                ],
              ] as [string, string][])
            : []),
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-2">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline max-md:hidden print:hidden"
          >
            <Icon name="arrowLeft" size={14} />
            Interview history
          </Link>
          <h2 className="text-[28px] max-md:hidden">Evaluation report</h2>
          <h2 className="text-2xl md:hidden">{iv.job_role}</h2>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip chip-n max-md:hidden">{iv.job_role}</span>
            <span className="chip chip-n">{experienceLabel(iv.experience_level)}</span>
            <span className="chip md:!bg-border-soft md:!text-text-2">
              {typeLabel(iv.interview_type)}
            </span>
            <span className="chip chip-n">{difficultyLabel(iv.difficulty)}</span>
            <span className="chip chip-n">{formatDate(iv.created_at)}</span>
            {iv.ended_at && (
              <span className="chip chip-n" aria-label={`Time taken ${duration}`}>
                <Icon name="clock" size={12} />
                {duration}
              </span>
            )}
            {rows.length > 0 && (
              <span className="chip chip-n">
                {answeredCount}/{rows.length} answered
                {skippedCount > 0 && ` · ${skippedCount} skipped`}
              </span>
            )}
            {iv.status !== "completed" && (
              <span className={`chip ${STATUS_LABELS[iv.status].chip}`}>
                {STATUS_LABELS[iv.status].label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2.5 max-md:hidden print:hidden">
          <PrintButton label="Download" />
          <Link href="/interview/new" className="btn btn-sm">
            <Icon name="refresh" size={16} />
            Practice again
          </Link>
        </div>
      </div>

      {report ? (
        <>
          {/* The AI summary comes first: the one-line answer to "how did I do?" */}
          {report.summary && (
            <section className="card flex flex-col gap-2 !border-primary-200 !bg-primary-50 print:break-inside-avoid">
              <h3 className="flex items-center gap-2 text-base">
                <span className="text-primary-600">
                  <Icon name="sparkle" size={18} />
                </span>
                Summary
              </h3>
              <p className="text-sm leading-relaxed text-text-2">{report.summary}</p>
            </section>
          )}
          <div className="grid gap-4 md:grid-cols-[270px_minmax(0,1fr)]">
            <section className="card flex items-center gap-4 max-md:!p-4 md:flex-col md:justify-center md:gap-2.5 md:text-center">
              <span className="md:hidden">
                <ScoreRing score={report.overall_score} size={110} stroke={10} />
              </span>
              <span className="max-md:hidden">
                <ScoreRing score={report.overall_score} size={150} stroke={13} />
              </span>
              <span className="flex flex-col items-start gap-2 md:items-center md:gap-2.5">
                <span className="text-base font-semibold">Overall score</span>
                {change !== null && change !== 0 && (
                  <span className={`chip ${change > 0 ? "chip-ok" : "chip-bad"}`}>
                    {change > 0 && <Icon name="trendUp" size={12} />}
                    {change > 0 ? `+${change}` : change} vs last interview
                  </span>
                )}
                <span className="text-xs text-muted">{AI_ESTIMATE_NOTE}</span>
              </span>
            </section>
            <section className="card flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base">Evaluation criteria</h3>
                <span className="text-xs text-muted">Out of 100</span>
              </div>
              <CriteriaBars
                labelWidth={140}
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
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard
              title="Strengths"
              icon="check"
              items={report.strengths}
              tone="md:border-success-line md:bg-success-soft max-md:border-l-success max-md:[&_li]:marker:text-success [&_.ico]:text-success"
            />
            <ListCard
              title="Areas for improvement"
              icon="target"
              items={report.improvements}
              tone="md:border-warning-line md:bg-warning-soft max-md:border-l-accent max-md:[&_li]:marker:text-accent [&_.ico]:text-warning"
            />
          </div>
        </>
      ) : (
        <section className="card flex gap-3 !border-primary-200 !bg-primary-50 text-primary-900 print:hidden">
          <Icon name="sparkle" />
          <div className="text-[13px] leading-normal">
            <p className="font-semibold">Evaluation pending</p>
            {!aiOn ? (
              <p>
                AI evaluation is not enabled yet. Your answers are listed below; scores, feedback,
                strengths and an improvement plan will appear here once it is switched on.
              </p>
            ) : !finished ? (
              <p>Finish the interview to get your scores, feedback and improvement plan.</p>
            ) : answeredCount === 0 ? (
              <p>You didn&apos;t answer any questions, so there is nothing to score.</p>
            ) : (
              <>
                <p className="mb-2">
                  Your report wasn&apos;t ready when the interview ended (the AI service may have
                  been busy). Your answers are saved — prepare it now.
                </p>
                <GenerateReportButton interviewId={iv.id} label="Prepare my report" />
              </>
            )}
          </div>
        </section>
      )}

      {jobMatch && <JobMatchCard match={jobMatch} rows={rows} showScores={showScores} />}

      <PrintAnswers rows={rows} showScores={showScores} />

      <section className="card !p-0 print:hidden">
        <h3 className="px-5 pt-4 pb-2 text-base">Question breakdown</h3>
        {rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">
            No questions were generated for this interview.
          </p>
        ) : (
          <>
            {/* Desktop: table as in the design. Answers open inline. */}
            <div className="hidden px-2 pb-2 md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>AI feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.q.id}>
                      <td className="!align-top text-muted">{r.label}</td>
                      <td className="w-[42%] !align-top">
                        <span className="font-semibold">{r.q.question}</span>
                        {r.a && !r.a.skipped && <AnswerDetails answer={r.a} />}
                      </td>
                      <td className="!align-top">
                        <span
                          className={`chip ${r.followUp ? "" : r.gap ? "chip-warn" : "chip-n"}`}
                        >
                          {r.followUp
                            ? "Follow-up"
                            : r.gap
                              ? "Skill gap"
                              : r.q.source === "resume"
                                ? "From resume"
                                : "Main"}
                        </span>
                      </td>
                      <td className="!align-top font-display text-base font-bold">
                        {r.e?.question_score ?? "—"}
                      </td>
                      <td className="!align-top text-muted">{r.feedback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone: stacked list, like the mobile report board. */}
            <ol className="md:hidden">
              {rows.map((r) => (
                <li key={r.q.id} className="flex gap-3 border-t border-border-soft px-4 py-3.5">
                  <span className="w-7 shrink-0 pt-0.5 text-xs font-bold text-muted">
                    Q{r.label}
                  </span>
                  <div className="flex min-w-0 grow flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold">{r.q.question}</span>
                      {r.e && (
                        <span className="font-display text-base font-bold">
                          {r.e.question_score}
                        </span>
                      )}
                    </div>
                    {r.followUp && <span className="chip self-start">Follow-up</span>}
                    {r.gap && <span className="chip chip-warn self-start">Skill gap</span>}
                    <span className="text-[13px] text-muted">{r.feedback}</span>
                    {r.a && !r.a.skipped && <AnswerDetails answer={r.a} />}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {plan && <PlanPreview plan={plan} />}

      <div className="flex flex-col gap-2.5 md:hidden print:hidden">
        {plan && (
          <Link href="/plan" className="btn w-full">
            View improvement plan
          </Link>
        )}
        <Link href="/interview/new" className="btn btn-sec w-full">
          Practice again
        </Link>
      </div>
    </div>
  );
}

// Printed instead of the page header: who, what, when and the result.
function PrintHeader({ name, details }: { name: string; details: [string, string][] }) {
  return (
    <header className="hidden border-b-2 border-ink pb-4 print:block">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        AI Interview Arena · Evaluation report
      </p>
      <h1 className="mt-1 text-2xl">{name || "Candidate"}</h1>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
        {details.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

type Row = {
  q: { id: string; question: string; skill: string | null; source: string };
  a?: { answer_text: string | null; mode: string; skipped: boolean };
  e?: { question_score: number; feedback: string };
  label: string;
  followUp: boolean;
  gap: boolean;
};

// Printed instead of the interactive breakdown: every question with the full answer.
function PrintAnswers({ rows, showScores }: { rows: Row[]; showScores: boolean }) {
  return (
    <section className="hidden print:block">
      <h3 className="mb-2 text-base">Questions and answers</h3>
      <ol className="flex flex-col">
        {rows.map((r) => (
          <li key={r.q.id} className="break-inside-avoid border-t border-border py-3">
            <p className="text-xs text-muted">
              Q{r.label} ·{" "}
              {r.followUp
                ? "Follow-up"
                : r.gap
                  ? "Skill gap"
                  : r.q.source === "resume"
                    ? "From resume"
                    : "Main question"}
              {r.q.skill && ` · ${r.q.skill}`}
              {showScores && r.e && ` · Score ${r.e.question_score}/100`}
            </p>
            <p className="mt-1 text-sm font-semibold">{r.q.question}</p>
            {!r.a ? (
              <p className="mt-1.5 text-[13px] text-muted italic">Not answered</p>
            ) : r.a.skipped ? (
              <p className="mt-1.5 text-[13px] text-muted italic">Skipped</p>
            ) : (
              <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap">
                <span className="text-muted">
                  Answer ({r.a.mode === "voice" ? "voice" : "text"}):{" "}
                </span>
                {r.a.answer_text}
              </p>
            )}
            {r.e && <p className="mt-1.5 text-[13px] text-text-2">Feedback: {r.e.feedback}</p>}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] text-muted">{AI_ESTIMATE_NOTE}</p>
    </section>
  );
}

// Resume vs job description: the gaps and how the candidate did on them.
function JobMatchCard({
  match,
  rows,
  showScores,
}: {
  match: JobMatch;
  rows: Row[];
  showScores: boolean;
}) {
  const outcome = (skill: string) => {
    const asked = rows.filter(
      (r) => r.gap && (r.q.skill ?? "").toLowerCase() === skill.toLowerCase(),
    );
    if (asked.length === 0) return "Not asked (no slot left)";
    const answered = asked.filter((r) => r.a && !r.a.skipped);
    const scores = answered
      .map((r) => r.e?.question_score)
      .filter((n): n is number => typeof n === "number");
    if (answered.length === 0) return asked.some((r) => r.a?.skipped) ? "Skipped" : "Not reached";
    if (showScores && scores.length)
      return `Answered · score ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`;
    return `Answered${asked.length > 1 ? ` ${answered.length} of ${asked.length}` : ""} · evaluation pending`;
  };
  // Long gap lists may split across printed pages; each row stays whole.
  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base">
          <span className="text-primary-600">
            <Icon name="target" size={18} />
          </span>
          Job match
        </h3>
        {match.match_percent !== null && (
          <span className="text-sm text-muted">
            <b className="font-display text-xl text-text">{match.match_percent}%</b> of the
            job&apos;s skills are on your resume
          </span>
        )}
      </div>
      {match.required.length === 0 ? (
        <p className="text-sm text-muted">
          No skills from our list were found in the job description, so this interview followed your
          role and resume.
        </p>
      ) : (
        <>
          {match.gaps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Skill gaps practised
              </span>
              <ul className="flex flex-col divide-y divide-border-soft rounded-xl border border-border-soft">
                {match.gaps.map((g) => (
                  <li
                    key={g}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm break-inside-avoid"
                  >
                    <span className="chip chip-warn">{g}</span>
                    <span className="text-[13px] text-muted">{outcome(g)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-text-2">
                <b>What to learn next:</b> {match.gaps.slice(0, 5).join(", ")}
                {match.gaps.length > 5 ? ` and ${match.gaps.length - 5} more` : ""}. Study the
                basics of each, build one small project that uses them, then practise again with the
                same job description to see your answers improve.
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-2">
              Your resume already shows every skill we found in this job description.
            </p>
          )}
          {match.matched.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-[0.06em] text-muted uppercase">
                Already on your resume
              </span>
              <div className="flex flex-wrap gap-2">
                {match.matched.map((m) => (
                  <span key={m} className="chip chip-ok">
                    <Icon name="check" size={12} strokeWidth={2.5} />
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ListCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: IconName;
  items: string[];
  tone: string;
}) {
  return (
    <section
      className={`flex flex-col gap-2.5 rounded-card border p-5 max-md:border-border max-md:border-l-[3px] max-md:bg-surface ${tone}`}
    >
      <h3 className="flex items-center gap-2 text-base">
        <span className="ico max-md:hidden">
          <Icon name={icon} size={18} />
        </span>
        {title}
      </h3>
      {items.length ? (
        <ul className="flex flex-col gap-2 text-sm text-text-2 max-md:list-disc max-md:pl-5">
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing noted for this interview.</p>
      )}
    </section>
  );
}

function AnswerDetails({ answer }: { answer: { answer_text: string | null; mode: string } }) {
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-xs font-semibold text-primary-600">
        {`Your answer (${answer.mode === "voice" ? "voice" : "text"})`}
      </summary>
      <p className="mt-1.5 rounded-control bg-bg p-2.5 text-[13px] leading-relaxed font-normal whitespace-pre-wrap text-text">
        {answer.answer_text}
      </p>
    </details>
  );
}

function PlanPreview({
  plan,
}: {
  plan: {
    recommended_topics: Json;
    practice_questions: Json;
    suggested_projects: Json;
    preparation_tips: string[];
  };
}) {
  const columns: { title: string; icon: IconName; items: string[] }[] = [
    {
      title: "Recommended topics",
      icon: "book",
      items: planList<PlanTopic>(plan.recommended_topics).map((t) => t.topic),
    },
    {
      title: "Practice questions",
      icon: "message",
      items: planList<PlanQuestion>(plan.practice_questions).map((q) => q.question),
    },
    {
      title: "Suggested projects",
      icon: "file",
      items: planList<PlanProject>(plan.suggested_projects).map((p) => p.title),
    },
    { title: "Preparation tips", icon: "target", items: plan.preparation_tips },
  ];
  return (
    <section className="card flex flex-col gap-4 !border-primary-300 !p-6 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg">
          <span className="text-primary-600">
            <Icon name="sparkle" />
          </span>
          Personalized improvement plan
        </h3>
        <Link href="/plan" className="btn btn-sm print:hidden">
          View full plan
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <div
            key={col.title}
            className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-2 p-3.5"
          >
            <h4 className="flex items-center gap-2 text-sm">
              <span className="text-primary-600">
                <Icon name={col.icon} size={16} />
              </span>
              {col.title}
            </h4>
            <ul className="flex flex-col gap-1.5 text-[13px] text-text-2">
              {col.items
                .filter(Boolean)
                .slice(0, 3)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
