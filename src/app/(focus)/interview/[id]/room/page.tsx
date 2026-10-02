import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { difficultyLabel, typeLabel } from "@/lib/format";
import { InterviewRoom, type RoomQuestion } from "./interview-room";

export const metadata: Metadata = { title: "Interview room" };

const letter = (n: number) => String.fromCharCode(96 + n); // 1 → "a"

export default async function RoomPage({ params }: PageProps<"/interview/[id]/room">) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/interview/${id}/room`);

  const { data: iv } = await supabase
    .from("interviews")
    .select("id, status, job_role, interview_type, difficulty, started_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) notFound();
  if (iv.status === "setup") redirect(`/interview/${id}`);
  if (iv.status === "completed" || iv.status === "abandoned") redirect(`/interview/${id}/complete`);

  const [{ data: questions }, { data: answers }, { data: settings }] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id, position, follow_up_index, question, skill, source")
      .eq("interview_id", id)
      .order("position")
      .order("follow_up_index"),
    supabase
      .from("candidate_answers")
      .select("question_id, skipped, answer_text")
      .eq("interview_id", id),
    supabase.from("app_settings").select("allow_voice_answers").eq("id", 1).maybeSingle(),
  ]);

  const answerOf = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const answered = new Map((answers ?? []).map((a) => [a.question_id, a.skipped]));
  // The current question is the first one without an answer.
  const currentIndex = (questions ?? []).findIndex((q) => !answered.has(q.id));
  const list: RoomQuestion[] = (questions ?? []).map((q, i) => {
    const status: RoomQuestion["status"] = answered.has(q.id)
      ? answered.get(q.id)
        ? "skipped"
        : "answered"
      : i === currentIndex
        ? "current"
        : "upcoming";
    return {
      id: q.id,
      label: q.follow_up_index ? `${q.position}${letter(q.follow_up_index)}` : String(q.position),
      question: q.question,
      skill: q.skill,
      source: q.source,
      status,
    };
  });
  if (list.length > 0 && currentIndex === -1) redirect(`/interview/${id}/complete`);

  // The answer just given, shown as a strip above the next question.
  const prev = currentIndex > 0 ? list[currentIndex - 1] : null;
  const prevAnswer = prev ? answerOf.get(prev.id) : undefined;
  const previous =
    prev && prevAnswer && !prevAnswer.skipped && prevAnswer.answer_text
      ? { label: prev.label, text: prevAnswer.answer_text.slice(0, 160) }
      : null;

  return (
    <InterviewRoom
      interviewId={id}
      startedAt={iv.started_at}
      meta={{
        role: iv.job_role,
        type: typeLabel(iv.interview_type),
        difficulty: difficultyLabel(iv.difficulty),
      }}
      questions={list}
      previous={previous}
      allowVoice={settings?.allow_voice_answers ?? true}
    />
  );
}
