"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ExperienceLevel, JobRole } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { profileSchema, skillSchema } from "@/lib/validation/profile";

export type ProfileFormState = { error?: string; success?: string; fieldErrors?: FieldErrors };

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user, supabase } = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const v = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.fullName,
      phone: v.phone,
      education: v.education,
      experience_level: v.experienceLevel as ExperienceLevel | null,
      experience_summary: v.experienceSummary,
      preferred_role: v.preferredRole as JobRole | null,
    })
    .eq("id", user.id);
  if (error) return { error: "We couldn't save your profile. Please try again." };

  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

export type SkillFormState = { error?: string };

// Links a skill to the user, creating it in the shared list if it is new.
export async function addSkill(_prev: SkillFormState, formData: FormData): Promise<SkillFormState> {
  const { user, supabase } = await requireUser();
  const parsed = skillSchema.safeParse(formData.get("skill"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data;

  const { data: existing } = await supabase
    .from("skills")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  let skillId = existing?.id;
  if (!skillId) {
    // Only trusted server code may add to the shared skills list.
    const { data: created, error } = await createAdminClient()
      .from("skills")
      .insert({ name })
      .select("id")
      .single();
    if (error || !created) return { error: "We couldn't add that skill. Please try again." };
    skillId = created.id;
  }

  const { error } = await supabase
    .from("candidate_skills")
    .upsert({ user_id: user.id, skill_id: skillId, source: "manual" }, { ignoreDuplicates: true });
  if (error) return { error: "We couldn't add that skill. Please try again." };

  revalidatePath("/profile");
  return {};
}

export async function removeSkill(formData: FormData) {
  const { user, supabase } = await requireUser();
  const skillId = Number(formData.get("skillId"));
  if (!Number.isInteger(skillId)) return;
  await supabase.from("candidate_skills").delete().eq("user_id", user.id).eq("skill_id", skillId);
  revalidatePath("/profile");
}
