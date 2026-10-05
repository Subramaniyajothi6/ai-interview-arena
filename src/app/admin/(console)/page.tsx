import type { Metadata } from "next";
import Link from "next/link";
import { PersonCell } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { JOB_ROLES } from "@/lib/constants";
import { daysAgoIso, formatDate, nowMs, STATUS_LABELS, typeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Admin dashboard" };

const WEEK_MS = 7 * 864e5;
const fmt = (n: number) => n.toLocaleString("en-IN");

// ISO-8601 week number, for "W38"-style labels.
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const weekAgo = daysAgoIso(7);
  const dayAgo = daysAgoIso(1);

  // Row level security lets admins read every candidate's rows.
  const [
    candidates,
    active,
    { data: interviews },
    { data: scores },
    { data: resumeUsers },
    { data: bank },
    { data: recent },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidate"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "candidate")
      .gte("last_active_at", weekAgo),
    supabase
      .from("interviews")
      .select("user_id, job_role, status, created_at, started_at")
      .limit(20000),
    supabase.from("interview_reports").select("overall_score").limit(20000),
    supabase.from("resumes").select("user_id").limit(20000),
    supabase.from("question_bank").select("job_role").eq("is_active", true),
    supabase
      .from("interviews")
      .select(
        "id, job_role, interview_type, status, overall_score, created_at, profiles(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const all = interviews ?? [];
  const now = nowMs();
  const inWindow = (iso: string, from: number, to: number) => {
    const t = new Date(iso).getTime();
    return t >= now - from && t < now - to;
  };
  const thisWeek = all.filter((i) => inWindow(i.created_at, WEEK_MS, 0)).length;
  const lastWeek = all.filter((i) => inWindow(i.created_at, 2 * WEEK_MS, WEEK_MS)).length;
  const completed = all.filter((i) => i.status === "completed").length;
  const list = scores ?? [];
  const average = list.length
    ? Math.round(list.reduce((s, r) => s + r.overall_score, 0) / list.length)
    : null;

  // Last 8 weeks, oldest first.
  const weeks = Array.from({ length: 8 }, (_, k) => {
    const i = 7 - k;
    const count = all.filter((iv) =>
      inWindow(iv.created_at, (i + 1) * WEEK_MS, i * WEEK_MS),
    ).length;
    return { label: `W${isoWeek(new Date(now - i * WEEK_MS))}`, count };
  });
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  const distinct = (xs: string[]) => new Set(xs).size;
  const funnel = [
    { label: "Registered", value: candidates.count ?? 0 },
    { label: "Resume uploaded", value: distinct((resumeUsers ?? []).map((r) => r.user_id)) },
    {
      label: "Interviewed",
      value: distinct(all.filter((i) => i.started_at).map((i) => i.user_id)),
    },
    {
      label: "Completed an interview",
      value: distinct(all.filter((i) => i.status === "completed").map((i) => i.user_id)),
    },
  ];
  const maxFunnel = Math.max(1, funnel[0].value);

  const bankByRole = new Map<string | null, number>();
  for (const q of bank ?? []) bankByRole.set(q.job_role, (bankByRole.get(q.job_role) ?? 0) + 1);
  const general = bankByRole.get(null) ?? 0;
  const thinRoles = JOB_ROLES.filter((r) => (bankByRole.get(r) ?? 0) + general < 20).length;
  const attention = [
    {
      count: all.filter((i) => i.status === "abandoned").length,
      text: "interviews abandoned mid-way",
      tone: "bg-danger-bg text-danger",
    },
    {
      count: thinRoles,
      text: "roles with under 20 bank questions",
      tone: "bg-warning-bg text-warning",
    },
    {
      count: all.filter((i) => i.status === "in_progress" && i.created_at < dayAgo).length,
      text: "interviews in progress for over 24 h",
      tone: "bg-primary-100 text-primary-900",
    },
  ];

  const roleCounts = JOB_ROLES.map((r) => ({
    role: r,
    count: all.filter((i) => i.job_role === r).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxRole = Math.max(1, ...roleCounts.map((r) => r.count));

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      {/* Summary */}
      <section
        aria-label="Platform summary"
        className="flex flex-col overflow-hidden rounded-card border border-border bg-surface md:flex-row"
      >
        <div className="flex flex-col gap-2 bg-ink px-6 py-5 text-white md:w-[340px]">
          <span className="text-[11px] font-bold tracking-[0.12em] text-primary-300 uppercase">
            Total interviews
          </span>
          <div className="flex items-end justify-between">
            <span className="font-display text-[56px] leading-none font-bold tracking-[-0.03em]">
              {fmt(all.length)}
            </span>
            <div className="flex h-11 items-end gap-1" aria-hidden="true">
              {weeks.map((w, i) => (
                <span
                  key={w.label}
                  className={`w-[9px] rounded-sm ${i === weeks.length - 1 ? "bg-primary-300" : "bg-[#3B3858]"}`}
                  style={{ height: `${Math.max(6, (w.count / maxWeek) * 44)}px` }}
                />
              ))}
            </div>
          </div>
          <span className="text-[13px] text-[#C9C6D6]">
            {fmt(thisWeek)} this week · {thisWeek - lastWeek >= 0 ? "+" : ""}
            {fmt(thisWeek - lastWeek)} vs last week
          </span>
        </div>
        <dl className="grid grow content-center gap-x-9 px-7 py-4 sm:grid-cols-2">
          {[
            ["Total candidates", fmt(candidates.count ?? 0)],
            ["Completed interviews", fmt(completed)],
            ["Average score", average ?? "—"],
            ["Active users (7 days)", fmt(active.count ?? 0)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2 py-[7px] text-sm">
              {/* The leader line is drawn by the term itself: a <dl> row may hold only <dt>/<dd>. */}
              <dt className="flex grow items-baseline gap-2 text-text-2 after:grow after:-translate-y-1 after:border-b after:border-border after:content-['']">
                {k}
              </dt>
              <dd className="font-display text-base font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Funnel + needs attention */}
      <section className="card flex flex-col gap-6 !px-7 !py-6 md:flex-row">
        <div className="flex grow flex-col justify-center gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.12em] text-text-2 uppercase">
            Candidate funnel · all time
          </h2>
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-4 text-[13px]">
              <span className="w-40 shrink-0 text-text-2">{f.label}</span>
              <span className="relative h-2 grow overflow-hidden rounded bg-border-soft">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: `${(f.value / maxFunnel) * 100}%`,
                    background: ["#4C1D95", "#6D28D9", "#8B5CF6", "#C4B5FD"][i],
                  }}
                />
              </span>
              <span className="w-12 text-right font-bold">{fmt(f.value)}</span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-border md:w-[320px] md:border-l md:pl-7">
          <h2 className="text-[11px] font-bold tracking-[0.12em] text-text-2 uppercase">
            Needs attention
          </h2>
          {attention.map((a) => (
            <p key={a.text} className="flex items-center gap-3 text-[13px]">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a.tone}`}
              >
                {a.count}
              </span>
              {a.text}
            </p>
          ))}
          <Link href="/admin/interviews?status=abandoned" className="text-[13px] font-semibold">
            Review now
          </Link>
        </div>
      </section>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base">Interviews per week</h2>
            <span className="text-xs text-muted">Last 8 weeks</span>
          </div>
          <div
            className="flex h-48 items-end gap-3 border-b border-border pb-0"
            role="img"
            aria-label={weeks.map((w) => `${w.label}: ${w.count}`).join(", ")}
          >
            {weeks.map((w) => (
              <div
                key={w.label}
                className="flex h-full grow flex-col items-center justify-end gap-1"
              >
                <span className="text-xs font-bold">{w.count}</span>
                <span
                  className="w-full max-w-10 rounded-t bg-primary-600"
                  style={{ height: `${Math.max(2, (w.count / maxWeek) * 150)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {weeks.map((w) => (
              <span key={w.label} className="grow text-center text-xs text-muted">
                {w.label}
              </span>
            ))}
          </div>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="text-base">Top job roles</h2>
          {roleCounts.length === 0 ? (
            <p className="text-sm text-muted">No interviews yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {roleCounts.map((r) => (
                <li key={r.role} className="flex items-center gap-3 text-[13px]">
                  <span className="w-44 shrink-0 truncate">{r.role}</span>
                  <span className="relative h-2 grow overflow-hidden rounded bg-border-soft">
                    <span
                      className="absolute inset-y-0 left-0 rounded bg-primary-600"
                      style={{ width: `${(r.count / maxRole) * 100}%` }}
                    />
                  </span>
                  <span className="w-10 text-right font-bold">{fmt(r.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent interviews */}
      <section className="card !px-2 !py-2">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <h2 className="text-base">Recent interviews</h2>
          <Link href="/admin/interviews" className="text-[13px] font-semibold">
            View all
          </Link>
        </div>
        {!recent?.length ? (
          <p className="px-3 pb-4 text-sm text-muted">No interviews on the platform yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job role</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((iv) => {
                  const st = STATUS_LABELS[iv.status];
                  return (
                    <tr key={iv.id}>
                      <td>
                        <Link
                          href={`/admin/interviews/${iv.id}`}
                          className="text-text no-underline"
                        >
                          <PersonCell name={iv.profiles?.full_name ?? ""} />
                        </Link>
                      </td>
                      <td>{iv.job_role}</td>
                      <td>{typeLabel(iv.interview_type)}</td>
                      <td>
                        <span className={`chip ${st.chip}`}>{st.label}</span>
                      </td>
                      <td className="font-bold">{iv.overall_score ?? "—"}</td>
                      <td className="whitespace-nowrap">{formatDate(iv.created_at)}</td>
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
