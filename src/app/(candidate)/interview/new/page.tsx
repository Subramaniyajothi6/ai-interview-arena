import type { Metadata } from "next";
import { Stepper } from "@/components/ui/stepper";
import { requireUser } from "@/lib/auth";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage() {
  const { profile, supabase } = await requireUser("/interview/new");
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
          interviewType: "technical",
          difficulty: "medium",
        }}
      />
    </div>
  );
}
