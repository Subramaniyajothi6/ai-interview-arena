"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { JOB_ROLES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { questionSchema, settingsSchema } from "@/lib/validation/admin";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";

export type AdminFormState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  // What was submitted, sent back on errors: React 19 clears a form after its
  // action finishes, so the fields refill from these instead of going blank.
  values?: Record<string, string>;
};

const submitted = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  );

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

// Disable or re-enable a candidate. Disabled users are banned in Supabase Auth
// (cannot sign in) and signed out by the app on their next request.
export async function setCandidateStatus(formData: FormData) {
  const { user } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const status = z.enum(["active", "disabled"]).parse(formData.get("status"));
  if (id === user.id) return;

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).single();
  if (!target || target.role === "admin") return; // admins are managed in Settings

  await admin.from("profiles").update({ status }).eq("id", id);
  await admin.auth.admin.updateUserById(id, {
    ban_duration: status === "disabled" ? "876000h" : "none",
  });
  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${id}`);
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export async function saveQuestion(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { user, supabase } = await requireAdmin();
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: submitted(formData) };
  const v = parsed.data;
  const row = {
    question: v.question,
    job_role: v.jobRole as (typeof JOB_ROLES)[number] | null,
    skill: v.skill,
    difficulty: v.difficulty,
    interview_type: v.interviewType,
    expected_answer: v.expectedAnswer,
    is_active: v.isActive,
  };

  const id = formData.get("id");
  // Row level security only lets admins write to the question bank.
  const { error } =
    typeof id === "string" && id
      ? await supabase.from("question_bank").update(row).eq("id", id)
      : await supabase.from("question_bank").insert({ ...row, created_by: user.id });
  if (error)
    return {
      error: "We couldn't save the question. Please try again.",
      values: submitted(formData),
    };

  revalidatePath("/admin/questions");
  redirect(`/admin/questions?saved=1`);
}

export async function deleteQuestion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await supabase.from("question_bank").delete().eq("id", id);
  revalidatePath("/admin/questions");
  redirect("/admin/questions?deleted=1");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveSettings(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: submitted(formData) };
  const v = parsed.data;
  const { error } = await supabase
    .from("app_settings")
    .update({
      questions_per_interview: v.questionsPerInterview,
      max_follow_ups_per_question: v.maxFollowUps,
      max_resume_mb: v.maxResumeMb,
      allow_follow_ups: v.allowFollowUps === "on",
      allow_voice_answers: v.allowVoice === "on",
      show_question_scores: v.showQuestionScores === "on",
      ai_provider: v.aiProvider,
    })
    .eq("id", 1);
  if (error)
    return {
      error: "We couldn't save the settings. Please try again.",
      values: submitted(formData),
    };
  revalidatePath("/", "layout");
  return { success: "Settings saved." };
}

// Give an existing account admin access.
export async function addAdmin(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const email = z.email().safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) return { fieldErrors: { email: "Enter a valid email address." } };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", email.data)
    .maybeSingle();
  if (!target) {
    return { fieldErrors: { email: "No account uses this email. Ask them to register first." } };
  }
  if (target.role === "admin") return { success: "That account is already an admin." };

  await admin.from("profiles").update({ role: "admin", status: "active" }).eq("id", target.id);
  revalidatePath("/admin/settings");
  return { success: `${email.data} is now an admin.` };
}

export async function removeAdmin(formData: FormData) {
  const { user } = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  if (id === user.id) return; // can't remove your own access
  const admin = createAdminClient();
  // The first admin account is the owner and can't be removed.
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at")
    .limit(1)
    .single();
  if (owner?.id === id) return;
  await admin.from("profiles").update({ role: "candidate" }).eq("id", id);
  revalidatePath("/admin/settings");
}
