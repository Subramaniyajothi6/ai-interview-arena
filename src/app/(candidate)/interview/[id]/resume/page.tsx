import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Stepper } from "@/components/ui/stepper";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { ParsedResume } from "@/lib/resume/analyze";
import { ResumeStep } from "./resume-step";

export const metadata: Metadata = { title: "Upload resume" };

export default async function ResumePage({ params }: PageProps<"/interview/[id]/resume">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/interview/${id}/resume`);

  const { data: interview } = await supabase
    .from("interviews")
    .select("id, status, resume_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!interview) notFound();
  if (interview.status !== "setup") redirect(`/interview/${id}`);

  const { data: resumes } = await supabase
    .from("resumes")
    .select("id, file_name, created_at, parsed, status")
    .eq("user_id", user.id)
    .eq("status", "analyzed")
    .order("created_at", { ascending: false })
    .limit(5);

  const current = resumes?.find((r) => r.id === interview.resume_id);
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="card !px-6 !py-4">
        <Stepper current={1} />
      </div>
      <ResumeStep
        interviewId={id}
        userId={user.id}
        attached={
          current
            ? {
                resumeId: current.id,
                fileName: current.file_name,
                parsed: current.parsed as ParsedResume,
              }
            : null
        }
        previous={(resumes ?? []).slice(0, 3).map((r) => ({
          id: r.id,
          fileName: r.file_name,
          uploaded: formatDate(r.created_at),
        }))}
      />
    </div>
  );
}
