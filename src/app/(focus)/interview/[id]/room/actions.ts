"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const answerSchema = z.object({
  interviewId: z.uuid(),
  questionId: z.uuid(),
  answer: z.string().max(10000, "Answers can be at most 10,000 characters."),
  mode: z.enum(["text", "voice"]),
  skipped: z.boolean(),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(24 * 3600),
});

export type AnswerResult = { ok: true; done: boolean } | { ok: false; error: string };

async function loadInterview(interviewId: string) {
  const { user, supabase } = await requireUser();
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, status")
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { user, supabase, interview };
}

// Saves the answer to the current question. When every question has an
// answer, the interview is marked completed.
// (AI evaluation and follow-up questions will hook in here.)
export async function submitAnswer(input: z.input<typeof answerSchema>): Promise<AnswerResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const text = v.answer.trim();
  if (!v.skipped && text.length === 0)
    return { ok: false, error: "Write or record an answer first, or skip the question." };

  const { user, supabase, interview } = await loadInterview(v.interviewId);
  if (!interview) return { ok: false, error: "Interview not found." };
  if (interview.status !== "in_progress") return { ok: false, error: "This interview has ended." };

  const { data: question } = await supabase
    .from("interview_questions")
    .select("id")
    .eq("id", v.questionId)
    .eq("interview_id", v.interviewId)
    .maybeSingle();
  if (!question) return { ok: false, error: "Question not found." };

  const admin = createAdminClient();
  const { error } = await admin.from("candidate_answers").insert({
    question_id: v.questionId,
    interview_id: v.interviewId,
    user_id: user.id,
    answer_text: v.skipped ? "" : text,
    mode: v.mode,
    skipped: v.skipped,
    duration_seconds: v.durationSeconds,
  });
  // 23505 = already answered (e.g. double submit); treat as success.
  if (error && error.code !== "23505") {
    return { ok: false, error: "We couldn't save your answer. Please try again." };
  }

  const [{ count: total }, { count: answered }] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", v.interviewId),
    supabase
      .from("candidate_answers")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", v.interviewId),
  ]);

  const done = (answered ?? 0) >= (total ?? 0);
  if (done) {
    await admin
      .from("interviews")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", v.interviewId)
      .eq("status", "in_progress");
  }
  revalidatePath(`/interview/${v.interviewId}/room`);
  return { ok: true, done };
}

// Ends the interview early. Answers given so far are kept.
export async function endInterview(interviewId: string): Promise<AnswerResult> {
  if (!z.uuid().safeParse(interviewId).success) return { ok: false, error: "Invalid interview." };
  const { interview } = await loadInterview(interviewId);
  if (!interview) return { ok: false, error: "Interview not found." };
  if (interview.status === "in_progress") {
    const { error } = await createAdminClient()
      .from("interviews")
      .update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("id", interviewId)
      .eq("status", "in_progress");
    // Without this the complete page would bounce the user back to the room.
    if (error) return { ok: false, error: "We couldn't end the interview. Please try again." };
  }
  return { ok: true, done: true };
}
