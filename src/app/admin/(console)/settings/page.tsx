import type { Metadata } from "next";
import { aiStatus } from "@/lib/ai/client";
import { PersonCell } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { removeAdmin } from "../actions";
import { InviteAdmin, SettingsCards } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, supabase } = await requireAdmin();
  const [{ data: s }, { data: admins }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "admin")
      .order("created_at"),
  ]);
  const ownerId = admins?.[0]?.id; // the first admin account is shown as the owner

  const adminCard = (
    <section className="card flex min-w-0 flex-col gap-3 !p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base">Admin accounts</h2>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Role</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {(admins ?? []).map((a) => (
            <tr key={a.id}>
              {/* Takes the spare width; long emails are shortened with "…". */}
              <td className="w-full max-w-0">
                <PersonCell name={a.full_name} email={a.email} />
              </td>
              <td>{a.id === ownerId ? "Owner" : "Admin"}</td>
              <td className="text-right">
                {a.id === user.id ? (
                  <span className="text-xs text-muted">You</span>
                ) : a.id === ownerId ? (
                  <span className="text-muted">—</span>
                ) : (
                  <form action={removeAdmin}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-danger underline"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <InviteAdmin />
    </section>
  );

  return (
    <div className="mx-auto max-w-[1216px]">
      <SettingsCards
        adminCard={adminCard}
        aiStatus={aiStatus()}
        settings={{
          questionsPerInterview: s?.questions_per_interview ?? 8,
          maxFollowUps: s?.max_follow_ups_per_question ?? 2,
          maxResumeMb: s?.max_resume_mb ?? 5,
          allowFollowUps: s?.allow_follow_ups ?? true,
          allowVoice: s?.allow_voice_answers ?? true,
          showQuestionScores: s?.show_question_scores ?? true,
          aiProvider: s?.ai_provider ?? "openai",
        }}
      />
    </div>
  );
}
