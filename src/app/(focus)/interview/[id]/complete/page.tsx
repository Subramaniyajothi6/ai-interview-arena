import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { firstName, requireUser } from "@/lib/auth";
import { formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Interview complete" };

export default async function CompletePage({ params }: PageProps<"/interview/[id]/complete">) {
  const { id } = await params;
  const { user, profile, supabase } = await requireUser(`/interview/${id}/complete`);

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, status, started_at, ended_at, interview_reports(id)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();
  if (iv.status !== "completed" && iv.status !== "abandoned") redirect(`/interview/${id}`);

  const [{ count: total }, { data: answers }] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", id),
    supabase.from("candidate_answers").select("skipped").eq("interview_id", id),
  ]);
  const answered = (answers ?? []).filter((a) => !a.skipped).length;
  const skipped = (answers ?? []).length - answered;
  const hasReport = Boolean(iv.interview_reports);
  const ended = iv.status === "abandoned";

  return (
    <>
      <header className="flex h-[72px] items-center border-b border-border bg-surface px-4 sm:px-8">
        <Logo href="/dashboard" />
      </header>
      <main className="flex grow items-center justify-center px-4 py-10">
        <section className="card flex w-full max-w-[580px] flex-col items-center gap-5 !p-8 text-center shadow-[0_12px_32px_rgba(23,21,42,0.10)] sm:!p-11">
          <div
            className={`flex size-20 items-center justify-center rounded-full ${
              ended
                ? "bg-warning-bg text-warning shadow-[0_0_0_10px_#FFFBF2]"
                : "bg-success-bg text-success shadow-[0_0_0_10px_#F4FDF7]"
            }`}
          >
            <Icon name={ended ? "alert" : "check"} size={38} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[32px]">{ended ? "Interview ended" : "Interview complete"}</h1>
            <p className="mt-2 text-[15px] text-muted">
              {ended
                ? `You ended the interview early, ${firstName(profile.full_name)}. Your answers so far are saved.`
                : `Nice work, ${firstName(profile.full_name)}. Your answers are saved.`}
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-3">
            {[
              [`${answered}/${total ?? 0}`, "Questions answered"],
              [String(skipped), "Skipped"],
              [formatDuration(iv.started_at, iv.ended_at), "Duration"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-border-soft bg-[#FCFBFA] p-4">
                <div className="font-display text-[26px] font-bold">{value}</div>
                <div className="mt-0.5 text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>

          {!hasReport && (
            <div className="flex w-full gap-3 rounded-xl bg-primary-50 p-4 text-left text-[13px] leading-normal text-primary-900">
              <Icon name="sparkle" size={16} className="mt-0.5" />
              <p>
                <b>AI evaluation is not enabled yet.</b> Your answers are stored and will be scored,
                with a full report and improvement plan, once AI evaluation is switched on.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="btn btn-sec">
              Back to dashboard
            </Link>
            <Link href={`/reports/${id}`} className="btn">
              {hasReport ? "View report" : "Review your answers"}
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
