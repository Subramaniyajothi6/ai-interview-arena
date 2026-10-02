import type { Metadata } from "next";
import Link from "next/link";
import { Greeting } from "@/components/layout/greeting";
import { Icon } from "@/components/ui/icon";
import { TrendChart } from "@/components/ui/trend-chart";
import { firstName, requireUser } from "@/lib/auth";
import { getCandidateDashboard } from "@/lib/data/candidate";
import { difficultyLabel, formatDate, formatShortDate, typeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

// Suggested next practice based on the weakest evaluation criterion.
function nextPractice(weakest: string | undefined) {
  if (!weakest) return null;
  if (/communication|clarity/i.test(weakest)) {
    return { title: "Communication drill", type: "behavioral", label: "Behavioral" };
  }
  if (/relevance/i.test(weakest))
    return { title: "Mixed interview practice", type: "mixed", label: "Mixed" };
  return { title: `${weakest} practice`, type: "technical", label: "Technical" };
}

export default async function DashboardPage() {
  const { user, profile, supabase } = await requireUser("/dashboard");
  const [d, { data: resume }] = await Promise.all([
    getCandidateDashboard(supabase),
    supabase
      .from("resumes")
      .select("file_name, parsed, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const hasResults = d.stats.scored > 0;
  const hasInterviews = d.stats.total > 0;
  // Where you stand: up to 5 criteria, strongest first and the weakest ("focus") last.
  const standing =
    d.criteria.length > 5 ? [...d.criteria.slice(0, 4), d.criteria.at(-1)!] : d.criteria;
  const focus = standing.length > 1 ? standing.at(-1) : undefined;
  const practice = nextPractice(focus?.label);
  // Change across the trend window, e.g. "up 6 points over your last 6 interviews".
  const trendPoints = d.trend.map((t) => ({ label: formatShortDate(t.date), score: t.score }));
  const trendChange = d.trend.length > 1 ? d.trend.at(-1)!.score - d.trend[0].score : null;
  const trendText =
    trendChange === null
      ? null
      : `${trendChange >= 0 ? "up" : "down"} ${Math.abs(trendChange)} points over your last ${d.trend.length} interviews`;
  const resumeSkills = resume?.parsed
    ? ((resume.parsed as { skills?: string[]; technologies?: string[] }).skills?.length ?? 0) +
      ((resume.parsed as { technologies?: string[] }).technologies?.length ?? 0)
    : 0;
  const maxType = Math.max(1, ...d.types.map((t) => t.score ?? 0));

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      {/* On phones the sections follow the "Mobile dashboard" board order. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Greeting name={firstName(profile.full_name)} />
          <p className="mt-1 text-sm text-muted">
            {trendText
              ? `Your average is ${trendText}.`
              : hasResults
                ? "Keep practising to see your progress over time."
                : hasInterviews
                  ? "Scores and charts appear here once your interviews are evaluated."
                  : "Your practice stats will appear here after your first interview."}
          </p>
        </div>
        <Link
          href="/interview/new"
          className="btn max-md:!h-[52px] max-md:w-full max-md:text-[15px]"
        >
          <Icon name="plusCircle" size={16} />
          Start new interview
        </Link>
      </div>

      {!hasInterviews && <FirstInterview />}

      {/* Summary: average score + stat list */}
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
              {d.stats.average !== null && <span className="text-[28px] text-primary-300">%</span>}
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
              ? `${trendText ? `${trendText[0].toUpperCase()}${trendText.slice(1)} · ` : ""}best ${pct(d.stats.best)}`
              : hasInterviews
                ? "Not evaluated yet · AI scoring is off"
                : "No completed interviews yet"}
          </span>
        </div>
        <dl className="grid grow content-center gap-x-9 px-7 py-4 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3">
          {[
            ["Total interviews", d.stats.total],
            ["Completed interviews", d.stats.completed],
            ["Best score", pct(d.stats.best)],
            ["Technical score", pct(d.stats.technical)],
            ["Communication score", pct(d.stats.communication)],
            ["Completion rate", pct(d.stats.completionRate)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-2 py-[7px] text-sm">
              <dt className="text-text-2">{label}</dt>
              <span className="-translate-y-1 grow border-b border-dotted border-[#C9C5BC]" />
              <dd className="font-display text-base font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card flex flex-col gap-2 !border-primary-200 !bg-primary-50 md:hidden">
        <span className="eyebrow">Next best practice</span>
        <h3 className="text-base">{practice?.title ?? "Technical warm-up"}</h3>
        <p className="text-xs text-muted">{practice?.label ?? "Technical"} · Medium · ~20 min</p>
        <Link
          href={`/interview/new?type=${practice?.type ?? "technical"}&difficulty=medium`}
          className="btn btn-sm mt-1 self-start"
        >
          Practice now
        </Link>
      </section>

      {/* Where you stand + next best practice */}
      <section className="card flex flex-col gap-6 !rounded-2xl !px-[26px] !py-[22px] max-md:order-1 max-md:!p-5 md:flex-row md:items-center">
        <div className="flex min-w-0 grow flex-col gap-2.5">
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase max-md:hidden">
            Where you stand
          </span>
          <h3 className="text-base md:hidden">Where you stand</h3>
          {standing.length === 0 ? (
            <p className="text-sm text-muted">
              Your strongest and weakest areas appear here once an interview is evaluated.
            </p>
          ) : (
            <div className="grid items-start gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {[standing.slice(0, 3), standing.slice(3)].map((column, ci) => (
                <div key={ci} className="flex flex-col gap-2.5">
                  {column.map((c) => {
                    const tag = c === standing[0] ? "Strongest" : c === focus ? "Focus" : "";
                    return (
                      <div key={c.label} className="flex flex-col gap-[5px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-2">
                            {c.label}
                            {tag && (
                              <span
                                className={`ml-1.5 text-[10px] font-bold tracking-[0.08em] uppercase ${tag === "Focus" ? "text-warning" : "text-primary-600"}`}
                              >
                                {tag}
                              </span>
                            )}
                          </span>
                          <b>{c.score}</b>
                        </div>
                        <span className="relative h-1.5 overflow-hidden rounded bg-border-soft">
                          <span
                            className={`absolute inset-y-0 left-0 rounded ${tag === "Focus" ? "bg-accent" : "bg-primary-600"}`}
                            style={{ width: `${c.score}%` }}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="hidden w-px self-stretch bg-border md:block" />
        <div className="hidden shrink-0 flex-col gap-2.5 md:flex md:w-[260px]">
          <span className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Next best practice
          </span>
          <span className="text-sm leading-snug font-semibold">
            {practice?.title ?? "Technical warm-up"}
          </span>
          <span className="text-xs text-muted">
            {practice?.label ?? "Technical"} · Medium · ~20 min
          </span>
          <Link
            href={`/interview/new?type=${practice?.type ?? "technical"}&difficulty=medium`}
            className="btn !h-10"
          >
            Practice now
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card flex min-w-0 flex-col gap-1.5 !px-5 !py-[18px]">
          <div className="flex items-center justify-between">
            <h3 className="text-base">Score trend</h3>
            <span className="text-xs text-muted">
              {d.trend.length > 0 &&
                `Last ${d.trend.length} ${d.trend.length === 1 ? "interview" : "interviews"} · `}
              AI estimates
            </span>
          </div>
          {d.trend.length > 0 ? (
            <>
              <span className="max-md:hidden">
                <TrendChart height={300} points={trendPoints} />
              </span>
              <span className="md:hidden">
                <TrendChart width={340} height={200} points={trendPoints} />
              </span>
            </>
          ) : (
            <EmptyChart text="Your score trend appears after your first evaluated interview." />
          )}
        </section>

        <div className="flex flex-col gap-4 max-md:hidden">
          <section className="card flex flex-col gap-3 !border-primary-200 !bg-primary-50">
            <h3 className="flex items-center gap-2 text-base text-primary-900">
              <Icon name="target" />
              Improvement focus
            </h3>
            {d.improvements.length === 0 && (
              <p className="text-[13px] text-text-2">
                Areas to work on appear here after your interviews are evaluated.
              </p>
            )}
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
          <section className="card flex flex-col gap-3 !border-[#CDEBD9] !bg-[#F4FDF7]">
            <h3 className="flex items-center gap-2 text-base">
              <span className="text-success">
                <Icon name="check" />
              </span>
              Strengths
            </h3>
            {d.strengths.length === 0 && (
              <p className="text-[13px] text-text-2">What you do well will be listed here.</p>
            )}
            <ul className="flex flex-col gap-2.5">
              {d.strengths.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] leading-snug">
                  <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-surface text-success">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="grid gap-4 max-md:hidden lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="card flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base">Skill-wise performance</h3>
            <span className="text-xs text-muted">Average score · AI estimates</span>
          </div>
          {d.skills.length === 0 ? (
            <p className="text-sm text-muted">
              Skill scores appear once your answers are evaluated.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {d.skills.map((s) => (
                <li key={s.skill} className="flex items-center gap-3 text-[13px]">
                  <span className="w-28 shrink-0 truncate">{s.skill}</span>
                  <span className="relative h-2 grow overflow-hidden rounded bg-border-soft">
                    <span
                      className="absolute inset-y-0 left-0 rounded bg-primary-600"
                      style={{ width: `${s.score}%` }}
                    />
                  </span>
                  <span className="w-7 text-right font-display font-bold">{s.score}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base">Interview-type performance</h3>
            <span className="text-xs text-muted">Average score</span>
          </div>
          <div
            className="flex h-40 items-end gap-4 border-b border-border"
            role="img"
            aria-label={d.types.map((t) => `${t.type}: ${t.score ?? "no data"}`).join(", ")}
          >
            {d.types.map((t) => (
              <div
                key={t.type}
                className="flex h-full grow flex-col items-center justify-end gap-1"
              >
                <span className="text-xs font-bold">{t.score ?? "—"}</span>
                <span
                  className="w-full max-w-8 rounded-t bg-primary-600"
                  style={{ height: `${t.score ? (t.score / maxType) * 110 : 2}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            {d.types.map((t) => (
              <span key={t.type} className="grow text-center text-[11px] text-muted">
                {t.type}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 max-md:order-2 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card min-w-0 !p-0">
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
            <>
              {/* Phone: compact list, as in the mobile dashboard board. */}
              <ul className="px-2 pb-2 md:hidden">
                {d.recent.map((iv) => {
                  const href =
                    d.reportIds.has(iv.id) || iv.status === "completed" || iv.status === "abandoned"
                      ? `/reports/${iv.id}`
                      : `/interview/${iv.id}`;
                  return (
                    <li key={iv.id} className="border-b border-border-soft last:border-0">
                      <Link
                        href={href}
                        className="flex items-center justify-between gap-3 px-3 py-3 text-text no-underline hover:text-text"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {iv.job_role}
                          </span>
                          <span className="block text-xs text-muted">
                            {typeLabel(iv.interview_type)} · {difficultyLabel(iv.difficulty)} ·{" "}
                            {formatShortDate(iv.created_at)}
                          </span>
                        </span>
                        <span className="font-display text-base font-bold">
                          {iv.overall_score ?? "—"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="overflow-x-auto px-2 pb-2 max-md:hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Job role</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recent.map((iv) => (
                      <tr key={iv.id}>
                        <td className="font-semibold">{iv.job_role}</td>
                        <td>{typeLabel(iv.interview_type)}</td>
                        <td>{difficultyLabel(iv.difficulty)}</td>
                        <td className="whitespace-nowrap">{formatDate(iv.created_at)}</td>
                        <td className="font-display text-base font-bold">
                          {iv.overall_score ?? "—"}
                        </td>
                        <td className="text-right">
                          {d.reportIds.has(iv.id) ||
                          iv.status === "completed" ||
                          iv.status === "abandoned" ? (
                            <Link href={`/reports/${iv.id}`} className="font-semibold">
                              Report
                            </Link>
                          ) : (
                            <Link href={`/interview/${iv.id}`} className="font-semibold">
                              Continue
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="card flex flex-col gap-3 max-md:hidden">
          <h3 className="text-base">Resume</h3>
          {resume ? (
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-danger-bg text-danger">
                <Icon name="file" size={20} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{resume.file_name}</div>
                <div className="text-xs text-muted">
                  {resume.status === "analyzed"
                    ? `Analysed · ${resumeSkills} skills found`
                    : "Uploaded"}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              No resume yet. You&apos;ll upload one when you start an interview.
            </p>
          )}
          <Link href="/interview/new" className="text-[13px] font-semibold">
            {resume ? "Update resume" : "Upload resume"}
          </Link>
        </section>
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex min-h-40 grow items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted">
      <p className="max-w-xs px-4">{text}</p>
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
      text: "Follow-up questions probe deeper when needed.",
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
