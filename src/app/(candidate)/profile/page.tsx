import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { initials, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ProfileForm } from "./profile-form";
import { SkillsEditor } from "./skills-editor";

export const metadata: Metadata = { title: "Profile" };

const memberSince = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

export default async function ProfilePage() {
  const { user, profile, supabase } = await requireUser("/profile");

  const [{ data: skillRows }, { data: resume }] = await Promise.all([
    supabase.from("candidate_skills").select("skill_id, skills(name)").eq("user_id", user.id),
    supabase
      .from("resumes")
      .select("file_name, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const skills = (skillRows ?? [])
    .map((r) => ({ id: r.skill_id, name: r.skills?.name ?? "" }))
    .filter((s) => s.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5 lg:flex-row">
      <section className="card flex min-w-0 grow flex-col gap-6 !p-7">
        <div className="flex items-center gap-[18px]">
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[21px] font-bold text-white"
            aria-hidden="true"
          >
            {initials(profile.full_name)}
          </span>
          <div>
            <h2 className="text-xl">{profile.full_name || "Your profile"}</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Member since {memberSince.format(new Date(profile.created_at))}
            </p>
          </div>
        </div>

        <ProfileForm
          values={{
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone ?? "",
            education: profile.education ?? "",
            experienceLevel: profile.experience_level ?? "",
            experienceSummary: profile.experience_summary ?? "",
            preferredRole: profile.preferred_role ?? "",
          }}
        />
        <hr className="border-border" />
        <SkillsEditor skills={skills} />
      </section>

      <aside className="flex shrink-0 flex-col gap-4 lg:w-80">
        <section className="card flex flex-col gap-3.5">
          <h3 className="text-base">Resume</h3>
          {resume ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-danger-bg text-danger">
                <Icon name="file" size={20} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{resume.file_name}</div>
                <div className="text-xs text-muted">Uploaded {formatDate(resume.created_at)}</div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              No resume yet. You&apos;ll upload one when you start an interview.
            </p>
          )}
          <Link href="/interview/new" className="btn btn-sec w-full">
            <Icon name="upload" size={16} />
            {resume ? "Replace resume" : "Upload resume"}
          </Link>
        </section>

        <section className="card flex gap-3 !border-primary-200 !bg-primary-50 text-primary-900">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          </svg>
          <p className="text-[13px] leading-normal">
            Your profile, resume and interviews are visible only to you and platform admins.
          </p>
        </section>

        <section className="card flex flex-col gap-3">
          <h3 className="text-base">Account</h3>
          <Link href="/reset-password" className="btn btn-sec w-full">
            Change password
          </Link>
        </section>
      </aside>
    </div>
  );
}
