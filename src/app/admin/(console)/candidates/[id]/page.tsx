import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, DifficultyChip } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icon";
import { requireAdmin } from "@/lib/auth";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";
import { setCandidateStatus } from "../../actions";

export const metadata: Metadata = { title: "Candidate details" };

export default async function CandidateDetailPage({ params }: PageProps<"/admin/candidates/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: c } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "candidate")
    .maybeSingle();
  if (!c) notFound();

  const [{ data: skills }, { data: resumes }, { data: interviews }] = await Promise.all([
    supabase.from("candidate_skills").select("skills(name)").eq("user_id", id),
    supabase
      .from("resumes")
      .select("id, file_name, created_at, status")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("interviews")
      .select(
        "id, job_role, experience_level, interview_type, difficulty, status, overall_score, created_at, interview_reports(id)",
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const resume = resumes?.[0];
  const list = interviews ?? [];
  const completed = list.filter((i) => i.status === "completed").length;
  const disabled = c.status === "disabled";

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      <Link
        href="/admin/candidates"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline"
      >
        <Icon name="arrowLeft" size={14} />
        All candidates
      </Link>

      <section className="card flex flex-col gap-7 !p-6 md:flex-row">
        <div className="flex shrink-0 flex-col gap-3.5 border-border-soft md:w-[260px] md:border-r md:pr-6">
          <div className="flex items-center gap-3.5">
            <Avatar name={c.full_name || c.email} size={56} />
            <div>
              <h2 className="text-xl">{c.full_name || "—"}</h2>
              <span className={`chip mt-1.5 ${disabled ? "chip-bad" : "chip-ok"}`}>
                {disabled ? "Disabled" : "Active"}
              </span>
            </div>
          </div>
          <p className="flex items-center gap-2.5 text-[13px] break-all text-text-2">
            <Icon name="message" size={16} />
            {c.email}
          </p>
          {c.phone && (
            <p className="flex items-center gap-2.5 text-[13px] text-text-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
              {c.phone}
            </p>
          )}
          <p className="text-xs text-muted">
            Registered {formatDate(c.created_at)}
            {c.last_active_at && ` · Last active ${formatDate(c.last_active_at)}`}
          </p>
          <form action={setCandidateStatus} className="mt-auto">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="status" value={disabled ? "active" : "disabled"} />
            <button type="submit" className={`btn btn-sm ${disabled ? "btn-sec" : "btn-danger"}`}>
              {disabled ? "Enable account" : "Disable account"}
            </button>
          </form>
        </div>

        <div className="flex min-w-0 grow flex-col gap-[18px]">
          <h3 className="text-base">Candidate profile</h3>
          <dl className="grid gap-[18px] sm:grid-cols-3">
            {[
              ["Education", c.education],
              ["Experience", c.experience_level ? experienceLabel(c.experience_level) : null],
              ["Preferred job role", c.preferred_role],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt className="text-xs font-semibold tracking-[0.04em] text-muted uppercase">
                  {k}
                </dt>
                <dd className="text-sm font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {c.experience_summary && <p className="text-sm text-text-2">{c.experience_summary}</p>}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[0.04em] text-muted uppercase">
              Skills
            </span>
            <div className="flex flex-wrap gap-2">
              {(skills ?? []).length === 0 && (
                <span className="text-sm text-muted">None added</span>
              )}
              {(skills ?? []).map((s) => (
                <span key={s.skills?.name} className="chip">
                  {s.skills?.name}
                </span>
              ))}
            </div>
          </div>
          {resume ? (
            <div className="flex max-w-[460px] items-center gap-3 rounded-xl border border-border px-3.5 py-3">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-danger-bg text-danger">
                <Icon name="file" size={18} />
              </span>
              <div className="min-w-0 grow">
                <div className="truncate text-[13px] font-semibold">{resume.file_name}</div>
                <div className="text-xs text-muted">
                  Uploaded {formatDate(resume.created_at)} · {resume.status}
                </div>
              </div>
              <a
                href={`/api/admin/resumes/${resume.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sec btn-sm"
              >
                <Icon name="download" size={16} />
                View resume
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted">No resume uploaded.</p>
          )}
        </div>
      </section>

      <section className="card !px-2 !py-2">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <h3 className="text-base">Interview history</h3>
          <span className="text-xs text-muted">
            {list.length} interviews · {completed} completed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job role</th>
                <th>Experience level</th>
                <th>Interview type</th>
                <th>Difficulty</th>
                <th>Date</th>
                <th>Score</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="!py-8 text-center text-sm text-muted">
                    No interviews yet.
                  </td>
                </tr>
              )}
              {list.map((iv) => {
                const st = STATUS_LABELS[iv.status];
                return (
                  <tr key={iv.id}>
                    <td className="font-semibold">{iv.job_role}</td>
                    <td>{experienceLabel(iv.experience_level)}</td>
                    <td>{typeLabel(iv.interview_type)}</td>
                    <td>
                      <DifficultyChip
                        value={iv.difficulty}
                        label={difficultyLabel(iv.difficulty)}
                      />
                    </td>
                    <td className="whitespace-nowrap">{formatDate(iv.created_at)}</td>
                    <td className="font-display font-bold">{iv.overall_score ?? "—"}</td>
                    <td>
                      <span className={`chip ${st.chip}`}>{st.label}</span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {/* Reports exist only once AI evaluation has run; until then show the answers. */}
                      {iv.interview_reports ? (
                        <Link href={`/admin/reports?id=${iv.id}`} className="font-semibold">
                          View report
                        </Link>
                      ) : (
                        <Link href={`/admin/interviews/${iv.id}`} className="font-semibold">
                          Open
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
