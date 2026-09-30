import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// /interview/<id> sends the candidate to whichever step the interview is on.
export default async function InterviewRouterPage({ params }: PageProps<"/interview/[id]">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/interview/${id}`);
  const { data: iv } = await supabase
    .from("interviews")
    .select("status, resume_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();

  switch (iv.status) {
    case "setup":
      redirect(iv.resume_id ? `/interview/${id}/instructions` : `/interview/${id}/resume`);
    case "ready":
    case "in_progress":
      redirect(`/interview/${id}/room`);
    default:
      redirect(`/interview/${id}/complete`);
  }
}
