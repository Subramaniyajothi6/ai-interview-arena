import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Stepper } from "@/components/ui/stepper";
import { requireUser } from "@/lib/auth";
import { readJobMatch } from "@/lib/interview/job-match";
import { JobStep } from "./job-step";

export const metadata: Metadata = { title: "Job description" };

export default async function JobDescriptionPage({ params }: PageProps<"/interview/[id]/job">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/interview/${id}/job`);

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, status, job_role, resume_id, job_description, job_match")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();
  if (iv.status !== "setup") redirect(`/interview/${id}`);
  if (!iv.resume_id) redirect(`/interview/${id}/resume`);

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="card !px-6 !py-4">
        <Stepper current={2} />
      </div>
      <JobStep
        interviewId={id}
        jobRole={iv.job_role}
        saved={
          iv.job_description
            ? { text: iv.job_description, match: readJobMatch(iv.job_match) }
            : null
        }
      />
    </div>
  );
}
