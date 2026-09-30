import type { Metadata } from "next";
import Link from "next/link";
import { AutoFilterForm } from "@/components/admin/auto-filter-form";
import { CriteriaBars } from "@/components/ui/criteria-bars";
import { Icon } from "@/components/ui/icon";
import { TrendChart } from "@/components/ui/trend-chart";
import { param, ROLE_VALUES, TYPE_VALUES } from "@/lib/admin-query";
import { requireAdmin } from "@/lib/auth";
import {
  EXPERIENCE_LEVELS,
  INTERVIEW_TYPES,
  JOB_ROLES,
  type ExperienceLevel,
  type InterviewType,
  type JobRole,
} from "@/lib/constants";
import { daysAgoIso, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };

const PERIODS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const avg = (xs: (number | null)[]) => {
  const n = xs.filter((x): x is number => typeof x === "number");
  return n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : null;
};

// Monday of the week containing `iso`, as YYYY-MM-DD.
function weekStart(iso: string) {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const period =
    param(
      sp,
      "period",
      PERIODS.map((p) => p.value),
    ) || "30";
  const role = param(sp, "role", ROLE_VALUES);
  const type = param(sp, "type", TYPE_VALUES);
  const level = param(
    sp,
    "level",
    EXPERIENCE_LEVELS.map((l) => l.value),
  );
  const since = period === "all" ? null : daysAgoIso(Number(period));

  const nested = "interviews!inner(job_role, interview_type, experience_level, created_at)";
  let ivQuery = supabase
    .from("interviews")
    .select("id, interview_type, status, started_at, ended_at, created_at")
    .limit(20000);
  let repQuery = supabase
    .from("interview_reports")
    .select(
      `overall_score, technical_knowledge, relevance, communication, clarity, completeness, problem_solving, answer_quality, created_at, ${nested}`,
    )
    .order("created_at")
    .limit(20000);
  let fuQuery = supabase
    .from("interview_questions")
    .select(`id, ${nested}`, { count: "exact", head: true })
    .gt("follow_up_index", 0);
  if (since) {
    ivQuery = ivQuery.gte("created_at", since);
    repQuery = repQuery.gte("interviews.created_at", since);
    fuQuery = fuQuery.gte("interviews.created_at", since);
  }
  if (role) {
    ivQuery = ivQuery.eq("job_role", role as JobRole);
    repQuery = repQuery.eq("interviews.job_role", role as JobRole);
    fuQuery = fuQuery.eq("interviews.job_role", role as JobRole);
  }
  if (type) {
    ivQuery = ivQuery.eq("interview_type", type as InterviewType);
    repQuery = repQuery.eq("interviews.interview_type", type as InterviewType);
    fuQuery = fuQuery.eq("interviews.interview_type", type as InterviewType);
  }
  if (level) {
    ivQuery = ivQuery.eq("experience_level", level as ExperienceLevel);
    repQuery = repQuery.eq("interviews.experience_level", level as ExperienceLevel);
    fuQuery = fuQuery.eq("interviews.experience_level", level as ExperienceLevel);
  }
  const [{ data: ivData }, { data: repData }, { count: followUps }, { count: candidates }] =
    await Promise.all([
      ivQuery,
      repQuery,
      fuQuery,
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "candidate"),
    ]);
  const interviews = ivData ?? [];
  const reports = repData ?? [];

  const started = interviews.filter((i) => i.started_at);
  const finished = interviews.filter((i) => i.status === "completed" || i.status === "abandoned");
  const completed = interviews.filter((i) => i.status === "completed");
  const completionRate = finished.length
    ? Math.round((completed.length / finished.length) * 100)
    : null;
  const durations = completed
    .filter((i) => i.started_at && i.ended_at)
    .map((i) => (new Date(i.ended_at!).getTime() - new Date(i.started_at!).getTime()) / 60000);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const weeks = new Map<string, number[]>();
  for (const r of reports) {
    const w = weekStart(r.created_at);
    weeks.set(w, [...(weeks.get(w) ?? []), r.overall_score]);
  }
  const trend = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([w, s]) => ({ label: formatShortDate(w), score: avg(s)! }));

  const buckets = [
    { label: "<40", min: 0, max: 39 },
    { label: "40s", min: 40, max: 49 },
    { label: "50s", min: 50, max: 59 },
    { label: "60s", min: 60, max: 69 },
    { label: "70s", min: 70, max: 79 },
    { label: "80s", min: 80, max: 89 },
    { label: "90s", min: 90, max: 100 },
  ].map((b) => ({
    ...b,
    count: reports.filter((r) => r.overall_score >= b.min && r.overall_score <= b.max).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const byType = INTERVIEW_TYPES.map((t) => ({
    label: t.label,
    count: interviews.filter((i) => i.interview_type === t.value).length,
  }));
  const maxType = Math.max(1, ...byType.map((t) => t.count));
  const filtered = Boolean(role || type || level || period !== "30");

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="chip !h-9 !px-3.5 !text-[13px]">
          <Icon name="users" size={14} />
          Platform-wide ·{" "}
          {candidates === 1
            ? "1 candidate"
            : `all ${(candidates ?? 0).toLocaleString("en-IN")} candidates`}
        </span>
        <AutoFilterForm label="Filter analytics" className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Candidates"
            name="level"
            defaultValue={level}
            className="input !w-auto"
          >
            <option value="">All candidates</option>
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <select aria-label="Period" name="period" defaultValue={period} className="input !w-auto">
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select aria-label="Role" name="role" defaultValue={role} className="input !w-auto">
            <option value="">All roles</option>
            {JOB_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            aria-label="Interview type"
            name="type"
            defaultValue={type}
            className="input !w-auto"
          >
            <option value="">All interview types</option>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {filtered && (
            <Link href="/admin/analytics" className="btn btn-ghost">
              Reset
            </Link>
          )}
        </AutoFilterForm>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-2 !p-6">
          <h2 className="text-base">Average score over time</h2>
          {trend.length > 1 ? (
            <TrendChart points={trend} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              Not enough evaluated interviews yet. Scores appear once AI evaluation is on.
            </p>
          )}
        </section>

        <section className="card flex flex-col gap-3 !p-6">
          <h2 className="text-base">Score distribution</h2>
          <div
            className="flex h-48 items-end gap-3 border-b border-border"
            role="img"
            aria-label={buckets.map((b) => `${b.label}: ${b.count}`).join(", ")}
          >
            {buckets.map((b) => (
              <div
                key={b.label}
                className="flex h-full grow flex-col items-center justify-end gap-1"
              >
                <span className="text-xs font-bold">{b.count}</span>
                <span
                  className="w-full max-w-9 rounded-t bg-primary-500"
                  style={{ height: `${Math.max(2, (b.count / maxBucket) * 150)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {buckets.map((b) => (
              <span key={b.label} className="grow text-center text-xs text-muted">
                {b.label}
              </span>
            ))}
          </div>
        </section>

        <section className="card flex flex-col gap-3 !p-6">
          <h2 className="text-base">Average by criterion</h2>
          {reports.length ? (
            <CriteriaBars
              labelWidth={140}
              items={[
                {
                  label: "Technical accuracy",
                  score: avg(reports.map((r) => r.technical_knowledge)),
                },
                { label: "Relevance", score: avg(reports.map((r) => r.relevance)) },
                { label: "Communication", score: avg(reports.map((r) => r.communication)) },
                { label: "Clarity", score: avg(reports.map((r) => r.clarity)) },
                { label: "Completeness", score: avg(reports.map((r) => r.completeness)) },
                { label: "Problem solving", score: avg(reports.map((r) => r.problem_solving)) },
                { label: "Answer quality", score: avg(reports.map((r) => r.answer_quality)) },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted">No evaluated interviews yet.</p>
          )}
        </section>

        <section className="card flex flex-col gap-4 !p-6">
          <h2 className="text-base">Interviews by type</h2>
          <ul className="flex flex-col gap-2.5">
            {byType.map((t) => (
              <li key={t.label} className="flex items-center gap-3 text-[13px]">
                <span className="w-24 shrink-0">{t.label}</span>
                <span className="relative h-2 grow overflow-hidden rounded bg-border-soft">
                  <span
                    className="absolute inset-y-0 left-0 rounded bg-primary-600"
                    style={{ width: `${(t.count / maxType) * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right font-display font-bold">
                  {t.count.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid grid-cols-3 gap-3">
            {[
              [completionRate === null ? "—" : `${completionRate}%`, "Completion rate"],
              [
                started.length ? ((followUps ?? 0) / started.length).toFixed(1) : "—",
                "Avg. follow-ups",
              ],
              [avgDuration === null ? "—" : `${avgDuration}m`, "Avg. duration"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-xl bg-bg px-4 py-3">
                <div className="font-display text-xl font-bold">{v}</div>
                <div className="text-xs text-muted">{k}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
