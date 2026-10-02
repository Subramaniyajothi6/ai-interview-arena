import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import { PracticeQuestions } from "./practice-questions";
import { Icon, type IconName } from "@/components/ui/icon";
import { requireUser } from "@/lib/auth";
import { experienceLabel, formatDate, nowMs, typeLabel } from "@/lib/format";
import {
  planList,
  type PlanProject,
  type PlanQuestion,
  type PlanTopic,
  type PlanWeek,
} from "@/lib/plan";

export const metadata: Metadata = { title: "Improvement plan" };

const PRIORITY_CHIP = { high: "chip-bad", medium: "chip-warn", low: "chip-n" } as const;

// Shows the plan built from the candidate's latest evaluated interview.
export default async function PlanPage() {
  const { user, supabase } = await requireUser("/plan");
  const { data: plan } = await supabase
    .from("improvement_plans")
    .select(
      "*, interviews(job_role, experience_level, interview_type), interview_reports(overall_score)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return <NoPlan />;

  const weeks = planList<PlanWeek>(plan.weeks);
  const topics = planList<PlanTopic>(plan.recommended_topics);
  const questions = planList<PlanQuestion>(plan.practice_questions);
  const projects = planList<PlanProject>(plan.suggested_projects);
  const iv = plan.interviews;
  const score = plan.interview_reports?.overall_score ?? null;
  const target = score === null ? null : Math.min(100, Math.ceil((score + 7) / 5) * 5);
  // One plan week per calendar week since the plan was generated.
  const elapsedWeeks = Math.floor((nowMs() - new Date(plan.created_at).getTime()) / 604_800_000);
  const currentWeek = Math.min(Math.max(weeks.length, 1), elapsedWeeks + 1);
  const avgHours = weeks.length
    ? Math.round(weeks.reduce((sum, w) => sum + (w.hours ?? 0), 0) / weeks.length)
    : 0;
  const focus = (
    topics.some((t) => t.priority === "high") ? topics.filter((t) => t.priority !== "low") : topics
  ).slice(0, 4);

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">AI career feedback</span>
          <h2 className="text-[28px]">Your personalized improvement plan</h2>
          <p className="text-sm text-muted">
            Built from your interview on {formatDate(plan.created_at)} and your resume.
          </p>
        </div>
        <div className="flex gap-2.5 print:hidden">
          {/* A new plan needs the AI step, so this stays off until AI evaluation is enabled. */}
          <button
            type="button"
            className="btn btn-sec"
            disabled
            title="Available once AI evaluation is enabled"
          >
            <Icon name="refresh" size={16} />
            Regenerate
          </button>
          <PrintButton label="Download plan" className="btn btn-sec" />
        </div>
      </div>

      <section className="card grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr] lg:divide-x lg:divide-border-soft">
        <div className="flex flex-col gap-1">
          <span className="eyebrow !text-muted">Goal</span>
          <span className="font-display text-lg font-semibold">{iv?.job_role ?? "—"}</span>
          {iv && (
            <span className="text-xs text-muted">
              {experienceLabel(iv.experience_level)} · {typeLabel(iv.interview_type)} interviews
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 lg:pl-5">
          <span className="eyebrow !text-muted">Readiness</span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold">{score ?? "—"}</span>
            {target !== null && <span className="text-xs text-muted">→ target {target}</span>}
          </span>
          <Bar value={score ?? 0} color="bg-primary-600" />
        </div>
        <div className="flex flex-col gap-2 lg:pl-5">
          <span className="eyebrow !text-muted">Plan progress</span>
          <span className="text-sm font-semibold">
            Week {currentWeek} of {weeks.length || 1}
            {avgHours > 0 && ` · ~${avgHours} h/week`}
          </span>
          <Bar
            value={weeks.length ? ((currentWeek - 1) / weeks.length) * 100 + 4 : 0}
            color="bg-success"
          />
        </div>
        <div className="flex flex-col gap-2 lg:pl-5">
          <span className="eyebrow !text-muted">Focus areas</span>
          <div className="flex flex-wrap gap-1.5">
            {focus.length ? (
              focus.map((t) => (
                <span key={t.topic} className="chip">
                  {t.topic}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">—</span>
            )}
          </div>
        </div>
      </section>

      {weeks.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg">
              <span className="text-primary-600">
                <Icon name="map" />
              </span>
              Recommended learning plan
            </h3>
            <span className="text-xs text-muted">
              {weeks.length} weeks · generated {formatDate(plan.created_at)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {weeks.map((w, i) => {
              const n = w.week ?? i + 1;
              const state = n < currentWeek ? "done" : n === currentWeek ? "now" : "next";
              return (
                <article
                  key={n}
                  className={`card flex flex-col gap-2.5 !p-4 ${state === "now" ? "!border-2 !border-primary-600 !bg-primary-50/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-primary-600">Week {n}</span>
                    <span
                      className={`chip !h-6 !text-[11px] ${state === "done" ? "chip-ok" : state === "now" ? "" : "chip-n"}`}
                    >
                      {state === "done" ? "Done" : state === "now" ? "In progress" : "Up next"}
                    </span>
                  </div>
                  <h4 className="text-[15px]">{w.title}</h4>
                  <ul className="flex grow flex-col gap-1.5 text-[13px] text-text-2">
                    {(w.topics ?? []).map((t) => (
                      <li key={t} className="flex gap-2">
                        <span
                          className={`mt-[7px] size-1.5 shrink-0 rounded-full ${state === "done" ? "bg-success" : "bg-primary-500"}`}
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-1 border-t border-border-soft pt-2.5 text-xs">
                    {w.hours ? (
                      <span className="flex items-center gap-1.5 text-muted">
                        <Icon name="clock" size={12} />
                        {w.hours} h this week
                      </span>
                    ) : null}
                    {w.reason && <span className="text-primary-600">Why: {w.reason}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard title="Recommended topics" icon="book" aside="By priority">
          {topics.length ? (
            <ul>
              {topics.map((t) => (
                <li
                  key={t.topic}
                  className="flex items-center justify-between gap-3 border-b border-border-soft py-2.5 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{t.topic}</span>
                    {t.improves && (
                      <span className="text-xs text-muted">Improves: {t.improves}</span>
                    )}
                  </div>
                  {t.priority && (
                    <span className={`chip capitalize ${PRIORITY_CHIP[t.priority]}`}>
                      {t.priority}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </PlanCard>

        <PlanCard title="Practice questions" icon="message">
          {questions.length ? (
            <PracticeQuestions planId={plan.id} questions={questions} />
          ) : (
            <Empty />
          )}
        </PlanCard>

        <PlanCard title="Suggested projects" icon="file">
          {projects.length ? (
            <div className="flex flex-col gap-3">
              {projects.map((p) => (
                <div
                  key={p.title}
                  className="flex flex-col gap-2 rounded-xl border border-border-soft bg-[#FCFBFA] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold">{p.title}</span>
                    {p.duration && (
                      <span className="chip chip-n shrink-0">
                        <Icon name="clock" size={12} />
                        {p.duration}
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-[13px] text-muted">{p.description}</p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(p.skills ?? []).map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                    {p.builds && (
                      <span className="ml-auto text-xs text-primary-600">Builds: {p.builds}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </PlanCard>

        <PlanCard title="Interview preparation tips" icon="target">
          {plan.preparation_tips.length ? (
            <ol className="flex flex-col gap-3">
              {plan.preparation_tips.map((tip, i) => (
                <li key={tip} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-900">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ol>
          ) : (
            <Empty />
          )}
        </PlanCard>
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="max-w-xl text-[13px] text-muted">
          Generated by AI from your interview evaluations. Take another interview or update your
          resume to refresh this plan.
        </p>
        <Link href={`/interview/new${iv ? `?type=${iv.interview_type}` : ""}`} className="btn">
          Start Week {currentWeek} practice interview
        </Link>
      </section>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="relative h-2 overflow-hidden rounded bg-border-soft">
      <span
        className={`absolute inset-y-0 left-0 rounded ${color}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

function PlanCard({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon: IconName;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card flex flex-col gap-3 print:break-inside-avoid">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 text-base">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Icon name={icon} size={16} />
          </span>
          {title}
        </h3>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-muted">Nothing suggested in this plan.</p>;
}

function NoPlan() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <section className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon name="map" size={22} />
        </span>
        <span className="eyebrow">AI career feedback</span>
        <h2 className="text-lg">Your personalised plan starts with an interview</h2>
        <p className="max-w-md text-sm text-muted">
          After each evaluated interview, the AI turns your results into a week-by-week learning
          plan with recommended topics, practice questions, suggested projects and interview tips.
        </p>
        <Link href="/interview/new" className="btn mt-1">
          Take an interview
          <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    </div>
  );
}
