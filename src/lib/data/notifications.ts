import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Notification = { id: string; text: string; href: string; at: string };

// Recent activity for the header bell, built from the candidate's interviews,
// reports and plans (no separate notifications table needed).
export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Notification[]> {
  const [{ data: interviews }, { data: plans }] = await Promise.all([
    supabase
      .from("interviews")
      .select(
        "id, job_role, status, created_at, started_at, ended_at, interview_reports(created_at)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("improvement_plans")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const items: Notification[] = [];
  for (const iv of interviews ?? []) {
    const report = iv.interview_reports;
    if (report) {
      items.push({
        id: `report-${iv.id}`,
        text: `Your ${iv.job_role} report is ready.`,
        href: `/reports/${iv.id}`,
        at: report.created_at,
      });
    } else if (iv.status === "completed" || iv.status === "abandoned") {
      items.push({
        id: `done-${iv.id}`,
        text: `${iv.job_role} interview ${iv.status === "completed" ? "completed" : "ended early"}. Your answers are saved.`,
        href: `/reports/${iv.id}`,
        at: iv.ended_at ?? iv.created_at,
      });
    } else if (iv.status === "in_progress") {
      items.push({
        id: `progress-${iv.id}`,
        text: `Continue your ${iv.job_role} interview.`,
        href: `/interview/${iv.id}`,
        at: iv.started_at ?? iv.created_at,
      });
    }
  }
  for (const plan of plans ?? []) {
    items.push({
      id: `plan-${plan.id}`,
      text: "A new improvement plan is ready.",
      href: "/plan",
      at: plan.created_at,
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
}
