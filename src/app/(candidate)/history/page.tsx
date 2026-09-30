import type { Metadata } from "next";
import Link from "next/link";
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
      "id, job_role, interview_type, difficulty, status, overall_score, created_at, interview_reports(id)",
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

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <form className="card flex flex-wrap items-end gap-3 !py-4" aria-label="Filter interviews">
        <div className="min-w-44 grow sm:grow-0">
          <label className="label" htmlFor="role">
            Job role
          </label>
          <select id="role" name="role" className="input" defaultValue={role}>
            <option value="">All job roles</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36 grow sm:grow-0">
          <label className="label" htmlFor="type">
            Interview type
          </label>
          <select id="type" name="type" className="input" defaultValue={type}>
            <option value="">All types</option>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36 grow sm:grow-0">
          <label className="label" htmlFor="range">
            Date range
          </label>
          <select id="range" name="range" className="input" defaultValue={range}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-sec">
          Apply
        </button>
        {filtered && (
          <Link href="/history" className="btn btn-ghost">
            Clear
          </Link>
        )}
        <div className="grow" />
        <Link href="/interview/new" className="btn">
          <Icon name="plusCircle" size={16} />
          New interview
        </Link>
      </form>

      {scored.length > 1 && (
        <section className="card flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base">Overall score by attempt</h3>
            <span className="text-xs text-muted">AI estimates</span>
          </div>
          <TrendChart
            points={scored.slice(-10).map((i) => ({
              label: formatShortDate(i.created_at),
              score: i.overall_score!,
            }))}
          />
        </section>
      )}

      <section className="card !p-0">
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
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
                  const report = iv.interview_reports as unknown;
                  const hasReport = Array.isArray(report) ? report.length > 0 : Boolean(report);
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
