"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAi } from "@/lib/ai/client";
import { buildReport, evaluateAndStore } from "@/lib/ai/report";
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

// Saves the answer to the current question. With AI enabled, the answer is
// scored and may get a follow-up question. When every question has an answer,
// the interview is marked completed and the report is built.
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
  const { data: saved, error } = await admin
    .from("candidate_answers")
    .insert({
      question_id: v.questionId,
      interview_id: v.interviewId,
      user_id: user.id,
      answer_text: v.skipped ? "" : text,
      mode: v.mode,
      skipped: v.skipped,
      duration_seconds: v.durationSeconds,
    })
    .select("id")
    .single();
  // 23505 = already answered (e.g. double submit); treat as success.
  if (error && error.code !== "23505") {
    return { ok: false, error: "We couldn't save your answer. Please try again." };
  }

  // Score the answer and maybe ask a follow-up. Any AI failure is ignored here:
  // the answer is saved and gets scored when the report is built.
  const ai = !v.skipped && saved ? await getAi() : null;
  if (ai && saved) {
    try {
      const [{ data: iv }, { data: q }, { data: settings }] = await Promise.all([
        admin
          .from("interviews")
          .select("id, user_id, job_role, experience_level, difficulty")
          .eq("id", v.interviewId)
          .single(),
        admin
          .from("interview_questions")
          .select("id, position, follow_up_index, parent_id, question, skill, expected_points")
          .eq("id", v.questionId)
          .single(),
        admin
          .from("app_settings")
          .select("allow_follow_ups, max_follow_ups_per_question")
          .eq("id", 1)
          .single(),
      ]);
      // For a follow-up, the questions already asked in this thread.
      const { data: thread } =
        q && q.follow_up_index > 0
          ? await admin
              .from("interview_questions")
              .select("question")
              .eq("interview_id", v.interviewId)
              .eq("position", q.position)
              .lt("follow_up_index", q.follow_up_index)
              .order("follow_up_index")
          : { data: null };
      if (iv && q) {
        const maxFollowUps = settings?.allow_follow_ups
          ? (settings.max_follow_ups_per_question ?? 0)
          : 0;
        const e = await evaluateAndStore(ai, admin, {
          interview: iv,
          question: q,
          answer: { id: saved.id, answer_text: text, mode: v.mode },
          allowFollowUp: q.follow_up_index < maxFollowUps,
          thread: thread?.map((t) => t.question),
        });
        if (e.followUp) {
          await admin.from("interview_questions").insert({
            interview_id: v.interviewId,
            user_id: user.id,
            position: q.position,
            follow_up_index: q.follow_up_index + 1,
            parent_id: q.parent_id ?? q.id,
            question: e.followUp,
            skill: q.skill,
            source: "follow_up",
            expected_points: q.expected_points,
          });
        }
      }
    } catch {
      // Scored later when the report is built.
    }
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
    await finishReport(v.interviewId);
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
    await finishReport(interviewId);
  }
  return { ok: true, done: true };
}

// Builds the report when AI is enabled. A failure leaves a "Try again" button
// on the report page instead of blocking the end of the interview.
async function finishReport(interviewId: string) {
  const ai = await getAi();
  if (ai) await buildReport(ai, interviewId).catch(() => false);
}
