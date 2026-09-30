import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { TrendChart } from "@/components/ui/trend-chart";
import { firstName, requireUser } from "@/lib/auth";
import { AI_ESTIMATE_NOTE } from "@/lib/constants";
import { getCandidateDashboard } from "@/lib/data/candidate";
import {
  difficultyLabel,
  formatDate,
  formatShortDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile, supabase } = await requireUser("/dashboard");
  const d = await getCandidateDashboard(supabase);
  const hasResults = d.stats.completed > 0;

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Welcome back, {firstName(profile.full_name)}</h2>
          <p className="mt-1 text-sm text-muted">
            {d.stats.change !== null
              ? `Your latest score is ${Math.abs(d.stats.change)} points ${d.stats.change >= 0 ? "higher" : "lower"} than the one before.`
              : hasResults
                ? "Keep practising to see your progress over time."
                : "Your practice stats will appear here after your first interview."}
          </p>
        </div>
        <Link href="/interview/new" className="btn">
          <Icon name="plusCircle" size={16} />
          Start new interview
        </Link>
      </div>

      {!hasResults && <FirstInterview />}

      {/* Summary: big average score + stat list */}
      <section
        aria-label="Summary"
        className="flex flex-col overflow-hidden rounded-card border border-border bg-surface md:flex-row"
      >
        <div className="flex flex-col gap-2 bg-ink px-[26px] py-[22px] text-white md:w-[360px]">
          <span className="text-[11px] font-bold tracking-[0.12em] text-primary-300 uppercase">
            Average score
          </span>
          <div className="flex items-end justify-between">
            <span className="font-display text-[72px] leading-[0.9] font-bold tracking-[-0.05em]">
              {d.stats.average ?? "—"}
              {d.stats.average !== null && (
                <span className="text-[28px] text-primary-300"> /100</span>
              )}
            </span>
            {d.trend.length > 1 && (
              <div className="flex h-[52px] items-end gap-[5px]" aria-hidden="true">
                {d.trend.map((t, i) => (
                  <span
                    key={i}
                    className={`w-2.5 rounded-sm ${i === d.trend.length - 1 ? "bg-primary-600" : "bg-primary-200"}`}
                    style={{ height: `${Math.max(8, (t.score / 100) * 52)}px` }}
                  />
                ))}
              </div>
            )}
          </div>
          <span className="text-[13px] text-[#C9C6D6]">
            {hasResults
              ? `Best score ${d.stats.best} · ${AI_ESTIMATE_NOTE.split(" —")[0]}`
              : "No completed interviews yet"}
          </span>
        </div>
        <dl className="grid grow content-center gap-x-9 px-7 py-4 sm:grid-cols-2">
          {[
            ["Total interviews", d.stats.total],
            ["Technical score", d.stats.technical],
            ["Completed interviews", d.stats.completed],
            ["Communication score", d.stats.communication],
            ["Best score", d.stats.best],
            [
              "Completion rate",
              d.stats.completionRate === null ? null : `${d.stats.completionRate}%`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2 py-[7px] text-sm">
              <dt className="text-text-2">{label}</dt>
              <span className="-translate-y-1 grow border-b border-dotted border-[#C9C5BC]" />
              <dd className="font-display text-base font-bold">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {hasResults && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="card flex min-w-0 flex-col gap-1.5 !px-5 !py-[18px]">
              <div className="flex items-center justify-between">
                <h3 className="text-base">Score trend</h3>
                <span className="text-xs text-muted">
                  Last {d.trend.length} interviews · AI estimates
                </span>
              </div>
              <TrendChart
                points={d.trend.map((t) => ({ label: formatShortDate(t.date), score: t.score }))}
              />
            </section>

            <div className="flex flex-col gap-4">
              {d.improvements.length > 0 && (
                <section className="card flex flex-col gap-3 !border-primary-200 !bg-primary-50">
                  <h3 className="flex items-center gap-2 text-base text-primary-900">
                    <Icon name="target" />
                    Improvement focus
                  </h3>
                  <ol className="flex flex-col gap-2.5">
                    {d.improvements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-primary-600">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <Link href="/plan" className="btn btn-sec mt-1 w-full">
                    Open improvement plan
                  </Link>
                </section>
              )}
              {d.strengths.length > 0 && (
                <section className="card flex flex-col gap-3 !border-[#CDEBD9] !bg-[#F4FDF7]">
                  <h3 className="flex items-center gap-2 text-base">
                    <span className="text-success">
                      <Icon name="check" />
                    </span>
                    Strengths
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {d.strengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <span className="mt-0.5 text-success">
                          <Icon name="check" size={14} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BarCard
              title="Skill-wise performance"
              caption="Average score · AI estimates"
              rows={d.skills.map((s) => ({ label: s.skill, score: s.score }))}
              empty="Skill scores appear once your answers are evaluated."
            />
            <BarCard
              title="Interview-type performance"
              caption="Average score"
              rows={d.types.map((t) => ({ label: t.type, score: t.score }))}
            />
          </div>
        </>
      )}

      <section className="card !p-0">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-base">Recent interviews</h3>
          {d.recent.length > 0 && (
            <Link href="/history" className="text-[13px] font-semibold">
              View all
            </Link>
          )}
        </div>
        {d.recent.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">No interviews yet.</p>
        ) : (
          <div className="overflow-x-auto px-2 pb-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job role</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((iv) => {
                  const status = STATUS_LABELS[iv.status];
                  return (
                    <tr key={iv.id}>
                      <td className="font-semibold">{iv.job_role}</td>
                      <td>{typeLabel(iv.interview_type)}</td>
                      <td>{difficultyLabel(iv.difficulty)}</td>
                      <td className="whitespace-nowrap">{formatDate(iv.created_at)}</td>
                      <td>
                        <span className={`chip ${status.chip}`}>{status.label}</span>
                      </td>
                      <td className="text-right font-display text-base font-bold">
                        {iv.overall_score ?? "—"}
                      </td>
                      <td className="text-right">
                        {d.reportIds.has(iv.id) ? (
                          <Link href={`/reports/${iv.id}`} className="font-semibold">
                            Report
                          </Link>
                        ) : iv.status === "completed" || iv.status === "abandoned" ? (
                          <Link href={`/reports/${iv.id}`} className="font-semibold">
                            Answers
                          </Link>
                        ) : (
                          <Link href={`/interview/${iv.id}`} className="font-semibold">
                            Continue
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FirstInterview() {
  const steps: {
    icon: "plusCircle" | "upload" | "message" | "chart";
    title: string;
    text: string;
  }[] = [
    {
      icon: "plusCircle",
      title: "Choose your interview",
      text: "Job role, experience, type and difficulty.",
    },
    {
      icon: "upload",
      title: "Upload your resume",
      text: "Questions are built from your skills and projects.",
    },
    {
      icon: "message",
      title: "Answer by text or voice",
      text: "The AI asks follow-ups when an answer needs depth.",
    },
    { icon: "chart", title: "Get your report", text: "Scores, strengths and a personalised plan." },
  ];
  return (
    <section className="card flex flex-col gap-5 !p-6">
      <div>
        <span className="eyebrow">Get started</span>
        <h3 className="mt-1 text-xl">Take your first mock interview</h3>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
              <Icon name={s.icon} size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {i + 1}. {s.title}
              </span>
              <span className="block text-[13px] leading-snug text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <Link href="/interview/new" className="btn self-start">
        Start your first interview
        <Icon name="arrowRight" size={16} />
      </Link>
    </section>
  );
}

function BarCard({
  title,
  caption,
  rows,
  empty,
}: {
  title: string;
  caption: string;
  rows: { label: string; score: number | null }[];
  empty?: string;
}) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base">{title}</h3>
        <span className="text-xs text-muted">{caption}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 text-[13px]">
              <span className="w-28 shrink-0 truncate">{r.label}</span>
              <span className="relative h-2 grow overflow-hidden rounded bg-border-soft">
                <span
                  className="absolute inset-y-0 left-0 rounded bg-primary-600"
                  style={{ width: `${r.score ?? 0}%` }}
                />
              </span>
              <span className="w-7 text-right font-display font-bold">{r.score ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
