import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/admin/admin-ui";
import { PrintButton } from "@/components/admin/print-button";
import { CriteriaBars } from "@/components/ui/criteria-bars";
import { Icon } from "@/components/ui/icon";
import { ScoreRing } from "@/components/ui/score-ring";
import { param, searchTerm } from "@/lib/admin-query";
import { requireAdmin } from "@/lib/auth";
import { AI_ESTIMATE_NOTE } from "@/lib/constants";
import {
  difficultyLabel,
  experienceLabel,
  formatDate,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = searchTerm(sp);

  let query = supabase
    .from("interviews")
    .select("id, job_role, status, overall_score, created_at, profiles!inner(full_name, email)")
    .in("status", ["completed", "abandoned"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (q)
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`, { referencedTable: "profiles" });
  const { data } = await query;
  const list = data ?? [];
  const selectedId = param(sp, "id") || list[0]?.id;

  const selected = selectedId
    ? (
        await supabase
          .from("interviews")
          .select("*, profiles(full_name, email), interview_reports(*)")
          .eq("id", selectedId)
          .maybeSingle()
      ).data
    : null;
  const report = selected?.interview_reports ?? null;
  const { count: answered } = selectedId
    ? await supabase
        .from("candidate_answers")
        .select("id", { count: "exact", head: true })
        .eq("interview_id", selectedId)
        .eq("skipped", false)
    : { count: 0 };

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5 lg:flex-row lg:items-start">
      <aside className="card flex shrink-0 flex-col gap-3 !p-5 lg:w-[380px] print:hidden">
        <form className="relative">
          <label htmlFor="q" className="sr-only">
            Search reports
          </label>
          <span className="pointer-events-none absolute top-3.5 left-3.5 text-muted">
            <Icon name="search" size={16} />
          </span>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="input !pl-10"
            placeholder="Search reports…"
          />
        </form>
        {list.length === 0 && <p className="p-3 text-sm text-muted">No finished interviews yet.</p>}
        <ul className="flex flex-col gap-2.5">
          {list.map((iv) => (
            <li key={iv.id}>
              <Link
                href={`/admin/reports?${new URLSearchParams({ ...(q ? { q } : {}), id: iv.id })}`}
                aria-current={iv.id === selectedId ? "page" : undefined}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-text no-underline hover:border-primary-300 aria-[current=page]:border-primary-300 aria-[current=page]:bg-primary-50"
              >
                <Avatar name={iv.profiles.full_name || iv.profiles.email} />
                <span className="min-w-0 grow">
                  <span className="block truncate text-[13px] font-semibold">
                    {iv.profiles.full_name || iv.profiles.email}
                  </span>
                  <span className="block truncate text-xs text-muted">{iv.job_role}</span>
                </span>
                <span className="font-display text-lg font-bold">{iv.overall_score ?? "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {selected ? (
        <section className="card flex min-w-0 grow flex-col gap-5 !p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={selected.profiles?.full_name || "?"} size={44} />
              <div>
                <h2 className="text-lg">{selected.profiles?.full_name}</h2>
                <p className="text-[13px] text-muted">
                  {selected.job_role} · {experienceLabel(selected.experience_level)} ·{" "}
                  {typeLabel(selected.interview_type)} · {difficultyLabel(selected.difficulty)} ·{" "}
                  {formatDate(selected.created_at)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`chip ${STATUS_LABELS[selected.status].chip}`}>
                {STATUS_LABELS[selected.status].label}
              </span>
              <PrintButton label="Download" />
            </div>
          </div>

          {report ? (
            <>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <ScoreRing score={report.overall_score} size={120} />
                <div className="grow">
                  <CriteriaBars
                    items={[
                      { label: "Technical Accuracy", score: report.technical_knowledge },
                      { label: "Relevance", score: report.relevance },
                      { label: "Communication", score: report.communication },
                      { label: "Clarity", score: report.clarity },
                      { label: "Completeness", score: report.completeness },
                      { label: "Problem Solving", score: report.problem_solving },
                      { label: "Answer Quality", score: report.answer_quality },
                    ]}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-success-soft p-4">
                  <h3 className="text-sm text-success">Strengths</h3>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                    {report.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-warning-soft p-4">
                  <h3 className="text-sm text-warning">Improvement areas</h3>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                    {report.improvements.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted">{AI_ESTIMATE_NOTE}</p>
            </>
          ) : (
            <div className="flex gap-3 rounded-xl bg-primary-50 p-4 text-[13px] text-primary-900">
              <Icon name="sparkle" size={16} className="mt-0.5" />
              <p>
                <b>Evaluation pending.</b> {answered ?? 0} answer{answered === 1 ? "" : "s"}{" "}
                recorded. Scores and the written report appear here once AI evaluation is switched
                on.
              </p>
            </div>
          )}

          <Link
            href={`/admin/interviews/${selected.id}`}
            className="btn btn-sec self-start print:hidden"
          >
            Open full interview (questions and answers)
          </Link>
        </section>
      ) : (
        <section className="card grow text-center text-sm text-muted">Select a report.</section>
      )}
    </div>
  );
}
