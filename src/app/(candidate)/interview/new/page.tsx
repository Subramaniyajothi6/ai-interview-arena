import type { Metadata } from "next";
import { Stepper } from "@/components/ui/stepper";
import { requireUser } from "@/lib/auth";
import { DIFFICULTIES, INTERVIEW_TYPES } from "@/lib/constants";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage({ searchParams }: PageProps<"/interview/new">) {
  const { profile, supabase } = await requireUser("/interview/new");
  // "Practice now" links pre-select a type and difficulty.
  const sp = await searchParams;
  const type = INTERVIEW_TYPES.find((t) => t.value === sp.type)?.value ?? "technical";
  const difficulty = DIFFICULTIES.find((x) => x.value === sp.difficulty)?.value ?? "medium";
  const { data: settings } = await supabase
    .from("app_settings")
    .select("questions_per_interview")
    .single();

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="card !px-6 !py-4">
        <Stepper current={0} />
      </div>
      <SetupForm
        questionCount={settings?.questions_per_interview ?? 8}
        defaults={{
          jobRole: profile.preferred_role ?? "Full Stack Developer",
          experienceLevel: profile.experience_level ?? "fresher",
          interviewType: type,
          difficulty,
        }}
      />
    </div>
  );
}
