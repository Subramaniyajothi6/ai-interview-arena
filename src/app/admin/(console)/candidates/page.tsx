import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, Pagination, PersonCell, SearchInput } from "@/components/admin/admin-ui";
import { AutoFilterForm } from "@/components/admin/auto-filter-form";
import { Icon } from "@/components/ui/icon";
import { PAGE_SIZE, pageParam, param, ROLE_VALUES, searchTerm } from "@/lib/admin-query";
import { requireAdmin } from "@/lib/auth";
import { JOB_ROLES, type JobRole } from "@/lib/constants";
import { daysAgoIso, experienceLabel, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Candidates" };

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive (30+ days)" },
  { value: "disabled", label: "Disabled" },
];

export default async function CandidatesPage({ searchParams }: PageProps<"/admin/candidates">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = searchTerm(sp);
  const role = param(sp, "role", ROLE_VALUES);
  const status = param(
    sp,
    "status",
    STATUSES.map((s) => s.value),
  );
  const page = pageParam(sp);
  const monthAgo = daysAgoIso(30);

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, preferred_role, experience_level, status, last_active_at, interviews(count)",
      {
        count: "exact",
      },
    )
    .eq("role", "candidate")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (role) query = query.eq("preferred_role", role as JobRole);
  if (status === "disabled") query = query.eq("status", "disabled");
  if (status === "active") query = query.eq("status", "active").gte("last_active_at", monthAgo);
  if (status === "inactive") {
    query = query.eq("status", "active").or(`last_active_at.lt.${monthAgo},last_active_at.is.null`);
  }
  const { data, count } = await query;
  const rows = data ?? [];
  const filters = { q, role, status };
  const exportQuery = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      <AutoFilterForm label="Filter candidates">
        <SearchInput defaultValue={q} placeholder="Search candidates…" className="w-full sm:w-80" />
        <select
          aria-label="Preferred role"
          id="role"
          name="role"
          defaultValue={role}
          className="input !w-auto"
        >
          <option value="">All preferred roles</option>
          {JOB_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          aria-label="Status"
          id="status"
          name="status"
          defaultValue={status}
          className="input !w-auto"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {(q || role || status) && (
          <Link href="/admin/candidates" className="btn btn-ghost">
            Clear
          </Link>
        )}
        <div className="grow" />
        <a
          href={`/api/admin/candidates/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="btn btn-sec"
        >
          <Icon name="download" size={16} />
          Export CSV
        </a>
      </AutoFilterForm>

      <section className="card !px-2 !py-2">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Preferred role</th>
                <th>Experience</th>
                <th>Interviews</th>
                <th>Last active</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <EmptyRow colSpan={7}>
                  {q || role || status
                    ? "No candidates match these filters."
                    : "No candidates yet."}
                </EmptyRow>
              )}
              {rows.map((c) => {
                const inactive =
                  c.status === "active" && (!c.last_active_at || c.last_active_at < monthAgo);
                return (
                  <tr key={c.id}>
                    <td>
                      <PersonCell name={c.full_name} email={c.email} />
                    </td>
                    <td>{c.preferred_role ?? "—"}</td>
                    <td>{c.experience_level ? experienceLabel(c.experience_level) : "—"}</td>
                    <td className="font-bold">{c.interviews?.[0]?.count ?? 0}</td>
                    <td className="whitespace-nowrap">
                      {c.last_active_at ? formatDate(c.last_active_at) : "—"}
                    </td>
                    <td>
                      {c.status === "disabled" ? (
                        <span className="chip chip-bad">Disabled</span>
                      ) : inactive ? (
                        <span className="chip chip-n">Inactive</span>
                      ) : (
                        <span className="chip chip-ok">Active</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link href={`/admin/candidates/${c.id}`} className="font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          basePath="/admin/candidates"
          params={Object.fromEntries(Object.entries(filters).filter(([, v]) => v))}
          page={page}
          pageSize={PAGE_SIZE}
          total={count ?? 0}
        />
      </section>
    </div>
  );
}
