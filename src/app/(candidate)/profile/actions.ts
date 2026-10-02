"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ExperienceLevel, JobRole } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { profileSchema, skillSchema } from "@/lib/validation/profile";

export type ProfileFormState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  // Sent back on errors so the form keeps what was typed (React 19 resets it).
  values?: Record<string, string>;
};

const submitted = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  );

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user, supabase } = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: submitted(formData) };

  const v = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.fullName,
      phone: v.phone,
      education: v.education,
      ...(v.experienceLevel !== undefined && {
        experience_level: v.experienceLevel as ExperienceLevel | null,
      }),
      experience_summary: v.experienceSummary,
      preferred_role: v.preferredRole as JobRole | null,
    })
    .eq("id", user.id);
  if (error)
    return {
      error: "We couldn't save your profile. Please try again.",
      values: submitted(formData),
    };

  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

// Saves a photo the browser has just uploaded to the user's own avatars folder,
// and removes their older photos.
export async function setAvatar(path: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();
  if (
    !/^[0-9a-f-]{36}\/avatar-\d+\.(jpg|png|webp)$/.test(path) ||
    !path.startsWith(`${user.id}/`)
  ) {
    return { error: "That upload is not valid." };
  }
  const storage = supabase.storage.from("avatars");
  const { data: files } = await storage.list(user.id);
  const newName = path.slice(user.id.length + 1);
  if (!files?.some((f) => f.name === newName))
    return { error: "The photo didn't finish uploading." };

  const url = storage.getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "We couldn't save your photo. Please try again." };

  const old = files.filter((f) => f.name !== newName).map((f) => `${user.id}/${f.name}`);
  if (old.length) await storage.remove(old);
  revalidatePath("/", "layout");
  return {};
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
