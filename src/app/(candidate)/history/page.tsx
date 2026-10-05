import type { Metadata } from "next";
import Link from "next/link";
import { AutoFilterForm } from "@/components/admin/auto-filter-form";
import { CriteriaBars } from "@/components/ui/criteria-bars";
import { Icon } from "@/components/ui/icon";
import { TrendChart } from "@/components/ui/trend-chart";
import { requireUser } from "@/lib/auth";
import { INTERVIEW_TYPES, JOB_ROLES, type InterviewType, type JobRole } from "@/lib/constants";
import {
  daysAgoIso,
  difficultyLabel,
  formatDate,
  formatShortDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";

export const metadata: Metadata = { title: "Interview history" };

// The four criteria the history board summarises.
const CRITERIA = [
  { key: "technical_knowledge", label: "Technical accuracy" },
  { key: "relevance", label: "Relevance" },
  { key: "communication", label: "Communication" },
  { key: "completeness", label: "Completeness" },
] as const;

const RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const { supabase } = await requireUser("/history");
  const sp = await searchParams;
  const role =
    typeof sp.role === "string" && (JOB_ROLES as readonly string[]).includes(sp.role)
      ? sp.role
      : "";
  const type =
    typeof sp.type === "string" && INTERVIEW_TYPES.some((t) => t.value === sp.type) ? sp.type : "";
  const range =
    typeof sp.range === "string" && RANGES.some((r) => r.value === sp.range) ? sp.range : "all";

  let query = supabase
    .from("interviews")
    .select(
      "id, job_role, interview_type, difficulty, status, overall_score, created_at, interview_reports(technical_knowledge, relevance, communication, completeness)",
    )
    .order("created_at", { ascending: false });
  if (role) query = query.eq("job_role", role as JobRole);
  if (type) query = query.eq("interview_type", type as InterviewType);
  if (range !== "all") {
    query = query.gte("created_at", daysAgoIso(Number(range)));
  }
  const { data } = await query;
  const interviews = data ?? [];
  const scored = interviews.filter((i) => i.overall_score !== null).reverse();
  const filtered = Boolean(role || type || range !== "all");
  const reports = interviews.flatMap((i) => (i.interview_reports ? [i.interview_reports] : []));
  const avg = (key: (typeof CRITERIA)[number]["key"]) => {
    const values = reports.map((r) => r[key]).filter((v): v is number => v !== null);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  };
  const averages = reports.length
    ? CRITERIA.map((c) => ({ label: c.label, score: avg(c.key) }))
    : null;

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <AutoFilterForm label="Filter interviews" className="flex flex-wrap items-center gap-3">
        <select
          name="role"
          aria-label="Job role"
          className="input !w-auto min-w-48 grow sm:grow-0"
          defaultValue={role}
        >
          <option value="">All job roles</option>
          {JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          name="type"
          aria-label="Interview type"
          className="input !w-auto min-w-40 grow sm:grow-0"
          defaultValue={type}
        >
          <option value="">All types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          name="range"
          aria-label="Date range"
          className="input !w-auto min-w-40 grow sm:grow-0"
          defaultValue={range}
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="btn btn-sec">
            Apply
          </button>
        </noscript>
        {filtered && (
          <Link href="/history" className="btn btn-ghost btn-sm">
            Clear
          </Link>
        )}
        <Link href="/interview/new" className="btn ml-auto">
          <Icon name="plusCircle" size={16} />
          New interview
        </Link>
      </AutoFilterForm>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">Overall score by attempt</h2>
            <span className="text-xs text-muted">AI estimates</span>
          </div>
          {scored.length > 1 ? (
            <TrendChart
              points={scored.slice(-10).map((i) => ({
                label: formatShortDate(i.created_at),
                score: i.overall_score!,
              }))}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              {scored.length === 1
                ? "Your trend appears after your second scored interview."
                : "Scores appear here once your interviews are evaluated."}
            </p>
          )}
        </section>
        <section className="card flex flex-col gap-3">
          <h2 className="text-base">Average by criterion</h2>
          {averages ? (
            <CriteriaBars labelWidth={128} items={averages} />
          ) : (
            <p className="py-6 text-sm text-muted">
              No evaluated interviews{filtered ? " match these filters" : " yet"}.
            </p>
          )}
        </section>
      </div>

      <section className="card !p-0">
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-fg">
              <Icon name="history" size={22} />
            </span>
            <h2 className="text-lg">
              {filtered ? "No interviews match these filters" : "No interviews yet"}
            </h2>
            <p className="max-w-sm text-sm text-muted">
              {filtered
                ? "Try a different job role, type or date range."
                : "Every mock interview you take is saved here with its score and full report."}
            </p>
            {!filtered && (
              <Link href="/interview/new" className="btn mt-1">
                Start your first interview
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Job role</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((iv) => {
                  const status = STATUS_LABELS[iv.status];
                  const hasReport = Boolean(iv.interview_reports);
                  return (
                    <tr key={iv.id}>
                      <td className="whitespace-nowrap">{formatDate(iv.created_at)}</td>
                      <td className="font-semibold">{iv.job_role}</td>
                      <td>{typeLabel(iv.interview_type)}</td>
                      <td>{difficultyLabel(iv.difficulty)}</td>
                      <td>
                        <span className={`chip ${status.chip}`}>{status.label}</span>
                      </td>
                      <td className="text-right font-display text-base font-bold">
                        {iv.overall_score ?? "—"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {hasReport ? (
                          <Link href={`/reports/${iv.id}`} className="font-semibold">
                            View report
                          </Link>
                        ) : iv.status === "completed" || iv.status === "abandoned" ? (
                          <Link href={`/reports/${iv.id}`} className="font-semibold">
                            View answers
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
