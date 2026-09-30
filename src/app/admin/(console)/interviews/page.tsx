import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, Pagination, PersonCell, SearchInput } from "@/components/admin/admin-ui";
import { AutoFilterForm } from "@/components/admin/auto-filter-form";
import {
  PAGE_SIZE,
  pageParam,
  param,
  ROLE_VALUES,
  searchTerm,
  STATUS_VALUES,
  TYPE_VALUES,
} from "@/lib/admin-query";
import { requireAdmin } from "@/lib/auth";
import { INTERVIEW_TYPES, JOB_ROLES, type InterviewType, type JobRole } from "@/lib/constants";
import {
  daysAgoIso,
  difficultyLabel,
  experienceLabel,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";

export const metadata: Metadata = { title: "Interviews" };

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default async function AdminInterviewsPage({
  searchParams,
}: PageProps<"/admin/interviews">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = searchTerm(sp);
  const role = param(sp, "role", ROLE_VALUES);
  const type = param(sp, "type", TYPE_VALUES);
  const status = param(sp, "status", STATUS_VALUES);
  const range = param(
    sp,
    "range",
    RANGES.map((r) => r.value),
  );
  const page = pageParam(sp);

  // !inner lets us filter interviews by the candidate's name or email.
  let query = supabase
    .from("interviews")
    .select(
      "id, job_role, experience_level, interview_type, difficulty, status, overall_score, created_at, profiles!inner(full_name, email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q)
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`, { referencedTable: "profiles" });
  if (role) query = query.eq("job_role", role as JobRole);
  if (type) query = query.eq("interview_type", type as InterviewType);
  if (status) query = query.eq("status", status as (typeof STATUS_VALUES)[number]);
  if (range) query = query.gte("created_at", daysAgoIso(Number(range)));
  const { data, count } = await query;
  const rows = data ?? [];
  const filters = Object.fromEntries(
    Object.entries({ q, role, type, status, range }).filter(([, v]) => v),
  );
  const filtered = Object.keys(filters).length > 0;

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      <AutoFilterForm label="Filter interviews">
        <SearchInput defaultValue={q} placeholder="Search interviews…" className="w-full sm:w-72" />
        <select aria-label="Role" name="role" defaultValue={role} className="input !w-auto">
          <option value="">All roles</option>
          {JOB_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select aria-label="Type" name="type" defaultValue={type} className="input !w-auto">
          <option value="">All types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select aria-label="Status" name="status" defaultValue={status} className="input !w-auto">
          <option value="">All statuses</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s].label}
            </option>
          ))}
        </select>
        <select aria-label="Date" name="range" defaultValue={range} className="input !w-auto">
          <option value="">All time</option>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {filtered && (
          <Link href="/admin/interviews" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </AutoFilterForm>

      <section className="card !px-2 !py-2">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job role</th>
                <th>Experience</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Score</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <EmptyRow colSpan={8}>
                  {filtered ? "No interviews match these filters." : "No interviews yet."}
                </EmptyRow>
              )}
              {rows.map((iv) => {
                const st = STATUS_LABELS[iv.status];
                return (
                  <tr key={iv.id}>
                    <td>
                      <PersonCell name={iv.profiles.full_name} />
                    </td>
                    <td>{iv.job_role}</td>
                    <td>{experienceLabel(iv.experience_level)}</td>
                    <td>{typeLabel(iv.interview_type)}</td>
                    <td>{difficultyLabel(iv.difficulty)}</td>
                    <td>
                      <span className={`chip ${st.chip}`}>{st.label}</span>
                    </td>
                    <td className="font-display font-bold">{iv.overall_score ?? "—"}</td>
                    <td className="text-right">
                      <Link href={`/admin/interviews/${iv.id}`} className="font-semibold">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          basePath="/admin/interviews"
          params={filters}
          page={page}
          pageSize={PAGE_SIZE}
          total={count ?? 0}
        />
      </section>
    </div>
  );
}
