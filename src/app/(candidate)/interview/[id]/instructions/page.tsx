import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MicCheck } from "@/components/interview/mic-check";
import { Icon, type IconName } from "@/components/ui/icon";
import { Stepper } from "@/components/ui/stepper";
import { requireUser } from "@/lib/auth";
import { difficultyLabel, experienceLabel, typeLabel } from "@/lib/format";
import { readJobMatch } from "@/lib/interview/job-match";
import { StartPanel } from "./start-panel";

export const metadata: Metadata = { title: "Instructions" };

export default async function InstructionsPage({
  params,
}: PageProps<"/interview/[id]/instructions">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/interview/${id}/instructions`);
  const { data: iv } = await supabase
    .from("interviews")
    .select(
      "id, status, job_role, experience_level, interview_type, difficulty, question_count, resume_id, job_match",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();
  if (iv.status !== "setup") redirect(`/interview/${id}`);
  if (!iv.resume_id) redirect(`/interview/${id}/resume`);

  const minutes = Math.round(iv.question_count * 3.25);
  const gaps = readJobMatch(iv.job_match)?.gaps ?? [];
  const items: { icon: IconName; title: string; text: string }[] = [
    {
      icon: "clock",
      title: `About ${iv.question_count} questions, ${minutes}–${minutes + 5} minutes`,
      text: "Chosen for your setup and resume.",
    },
    ...(gaps.length
      ? [
          {
            icon: "target" as const,
            title: "Starts with the skills this job needs",
            text: `Questions on ${gaps.slice(0, 4).join(", ")}${gaps.length > 4 ? ` and ${gaps.length - 4} more` : ""} — the gaps between your resume and the job description.`,
          },
        ]
      : []),
    {
      icon: "mic",
      title: "Answer by text or voice",
      text: "Voice answers are transcribed; you can edit before submitting.",
    },
    {
      icon: "message",
      title: "Expect follow-up questions",
      text: "The interviewer may probe deeper based on your answers.",
    },
    {
      icon: "alert",
      title: "Stay on this page",
      text: "Your answers are saved as you go, but leaving mid-question may lose unsent text.",
    },
    {
      icon: "target",
      title: "Scores are AI estimates",
      text: "Use them as guidance, not an objective measure of your ability.",
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="card !px-6 !py-4">
        <Stepper current={3} />
      </div>
      <div className="flex flex-col gap-5 lg:flex-row">
        <section className="card flex grow flex-col gap-5 !p-7">
          <div>
            <h2 className="text-xl">Before you begin</h2>
            <p className="mt-1 text-[13px] text-muted">
              {iv.job_role} · {experienceLabel(iv.experience_level)} ·{" "}
              {typeLabel(iv.interview_type)} · {difficultyLabel(iv.difficulty)}
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block text-[13px] text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <StartPanel interviewId={id} />
          </div>
        </section>
        <aside className="shrink-0 lg:w-[300px]">
          <MicCheck />
        </aside>
      </div>
    </div>
  );
}
