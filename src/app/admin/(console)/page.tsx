import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/ui/stat-tile";
import { requireAdmin } from "@/lib/auth";
import { daysAgoIso, formatDate, STATUS_LABELS, typeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const weekAgo = daysAgoIso(7);

  // Row level security lets admins read every candidate's rows.
  const [candidates, interviews, completed, active, { data: scores }, { data: recent }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "candidate"),
      supabase.from("interviews").select("id", { count: "exact", head: true }),
      supabase
        .from("interviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "candidate")
        .gte("last_active_at", weekAgo),
      supabase.from("interview_reports").select("overall_score"),
      supabase
        .from("interviews")
        .select(
          "id, job_role, interview_type, status, overall_score, created_at, profiles(full_name, email)",
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const list = scores ?? [];
  const average = list.length
    ? Math.round(list.reduce((sum, r) => sum + r.overall_score, 0) / list.length)
    : null;

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <section aria-label="Platform summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Total candidates" value={candidates.count ?? 0} icon="users" />
        <StatTile label="Total interviews" value={interviews.count ?? 0} icon="message" />
        <StatTile label="Completed interviews" value={completed.count ?? 0} icon="check" />
        <StatTile label="Average score" value={average ?? "—"} icon="target" hint="AI estimates" />
        <StatTile
          label="Active users"
          value={active.count ?? 0}
          icon="trendUp"
          hint="Last 7 days"
        />
      </section>

      <section className="card !p-0">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base">Recent interviews</h2>
          <Link href="/admin/interviews" className="text-[13px] font-semibold">
            View all
          </Link>
        </div>
        {!recent?.length ? (
          <p className="px-5 pb-5 text-sm text-muted">No interviews on the platform yet.</p>
        ) : (
          <div className="overflow-x-auto px-2 pb-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job role</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((iv) => {
                  const status = STATUS_LABELS[iv.status];
                  return (
                    <tr key={iv.id}>
                      <td>
                        <span className="block font-semibold">{iv.profiles?.full_name || "—"}</span>
                        <span className="block text-xs text-muted">{iv.profiles?.email}</span>
                      </td>
                      <td>{iv.job_role}</td>
                      <td>{typeLabel(iv.interview_type)}</td>
                      <td>
                        <span className={`chip ${status.chip}`}>{status.label}</span>
                      </td>
                      <td className="text-right font-display text-base font-bold">
                        {iv.overall_score ?? "—"}
                      </td>
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
