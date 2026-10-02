"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAi } from "@/lib/ai/client";
import { buildReport } from "@/lib/ai/report";
import { aiCompareJob, aiParseResume, aiPlanQuestions } from "@/lib/ai/tasks";
import { requireUser } from "@/lib/auth";
import {
  JOB_DESCRIPTION_FILE_MAX_BYTES,
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DESCRIPTION_MIN_CHARS,
} from "@/lib/constants";
import { compareJobToResume, readJobMatch, type JobMatch } from "@/lib/interview/job-match";
import { planQuestionsFromBank } from "@/lib/interview/questions";
import { analyzeResumeText, findSkills, type ParsedResume } from "@/lib/resume/analyze";
import { extractResumeText, ResumeError, validateResume } from "@/lib/resume/extract";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { interviewSetupSchema } from "@/lib/validation/interview";
import { experienceLabel } from "@/lib/format";

export type SetupFormState = { error?: string; fieldErrors?: FieldErrors };

// Step 1: save the interview configuration, then continue to the resume step.
export async function createInterview(
  _prev: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  const { user, supabase } = await requireUser();
  const parsed = interviewSetupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { data: settings } = await supabase
    .from("app_settings")
    .select("questions_per_interview")
    .single();

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: user.id,
      job_role: parsed.data.jobRole,
      experience_level: parsed.data.experienceLevel,
      interview_type: parsed.data.interviewType,
      difficulty: parsed.data.difficulty,
      question_count: settings?.questions_per_interview ?? 8,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "We couldn't create the interview. Please try again." };

  redirect(`/interview/${data.id}/resume`);
}

// The interview must belong to the caller and still be in setup.
async function ownSetupInterview(interviewId: string) {
  const current = await requireUser();
  const { data: interview } = await current.supabase
    .from("interviews")
    .select("id, status")
    .eq("id", interviewId)
    .eq("user_id", current.user.id)
    .maybeSingle();
  if (!interview) throw new ResumeError("Interview not found.");
  if (interview.status !== "setup") {
    throw new ResumeError("This interview has already started, so its setup can't be changed.");
  }
  return current;
}

export type ProcessResumeResult =
  | { ok: true; resumeId: string; fileName: string; parsed: ParsedResume }
  | { ok: false; error: string };

// Step 2: the browser has uploaded the file to the user's private storage
// folder. Download it, check it, extract the text, analyse it and attach it
// to the interview.
export async function processResume(input: {
  interviewId: string;
  path: string;
  fileName: string;
}): Promise<ProcessResumeResult> {
  const admin = createAdminClient();
  let uploadedPath: string | null = null;
  try {
    const { user, supabase } = await ownSetupInterview(input.interviewId);

    // Only accept files inside the caller's own folder.
    const segments = input.path.split("/");
    if (segments.length !== 2 || segments[0] !== user.id || segments[1].includes("..")) {
      return { ok: false, error: "Invalid upload." };
    }
    uploadedPath = input.path;

    const { data: blob, error: dlError } = await supabase.storage
      .from("resumes")
      .download(input.path);
    if (dlError || !blob)
      return { ok: false, error: "We couldn't find the uploaded file. Please try again." };

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const fileSize = bytes.byteLength; // read before extraction touches the buffer
    const { data: settings } = await supabase
      .from("app_settings")
      .select("max_resume_mb")
      .eq("id", 1)
      .maybeSingle();
    const maxMb = settings?.max_resume_mb ?? 5;
    if (fileSize > maxMb * 1024 * 1024)
      throw new ResumeError(`The file is larger than ${maxMb} MB.`);
    const file = new File([bytes], input.fileName.slice(0, 200));
    const { fileType } = validateResume(file, bytes);
    const text = await extractResumeText(bytes, fileType);

    const { data: skills } = await supabase.from("skills").select("name, category");
    // AI reads the resume when a provider is configured; keyword analysis otherwise.
    const ai = await getAi();
    let parsed: ParsedResume | null = null;
    if (ai) parsed = await aiParseResume(ai, text).catch(() => null);
    parsed ??= analyzeResumeText(text, skills ?? []);

    const { data: resume, error: insertError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        storage_path: input.path,
        file_name: file.name,
        file_type: fileType,
        file_size: fileSize,
      })
      .select("id")
      .single();
    if (insertError || !resume)
      return { ok: false, error: "We couldn't save your resume. Please try again." };
    uploadedPath = null; // now owned by the resumes row

    // Trusted writes: analysis result and linking to the interview.
    await admin
      .from("resumes")
      .update({ raw_text: text, parsed, status: "analyzed" })
      .eq("id", resume.id);
    await admin.from("interviews").update({ resume_id: resume.id }).eq("id", input.interviewId);
    // Profile skills use the shared skills list's spelling.
    const known = findSkills([...parsed.skills, ...parsed.technologies].join(", "), skills ?? []);
    await addResumeSkills(
      user.id,
      known.map((s) => s.name),
    );

    return { ok: true, resumeId: resume.id, fileName: file.name, parsed };
  } catch (e) {
    if (uploadedPath) await admin.storage.from("resumes").remove([uploadedPath]);
    if (e instanceof ResumeError) return { ok: false, error: e.message };
    return {
      ok: false,
      error: "Something went wrong while reading your resume. Please try again.",
    };
  }
}

// Reuse a resume the user uploaded before.
export async function attachExistingResume(input: {
  interviewId: string;
  resumeId: string;
}): Promise<ProcessResumeResult> {
  try {
    const { user, supabase } = await ownSetupInterview(input.interviewId);
    const { data: resume } = await supabase
      .from("resumes")
      .select("id, file_name, parsed, status")
      .eq("id", input.resumeId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!resume || resume.status !== "analyzed" || !resume.parsed) {
      return { ok: false, error: "That resume isn't available. Please upload it again." };
    }
    await createAdminClient()
      .from("interviews")
      .update({ resume_id: resume.id })
      .eq("id", input.interviewId);
    return {
      ok: true,
      resumeId: resume.id,
      fileName: resume.file_name,
      parsed: resume.parsed as ParsedResume,
    };
  } catch (e) {
    return { ok: false, error: e instanceof ResumeError ? e.message : "Please try again." };
  }
}

// Link skills found in the resume to the candidate's profile (existing skills only).
async function addResumeSkills(userId: string, names: string[]) {
  if (names.length === 0) return;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("skills").select("id, name").in("name", names);
  if (!rows?.length) return;
  await admin.from("candidate_skills").upsert(
    rows.map((r) => ({ user_id: userId, skill_id: r.id, source: "resume" as const })),
    { onConflict: "user_id,skill_id", ignoreDuplicates: true },
  );
}

// ---------------------------------------------------------------------------
// Step 3 (optional): the job description the candidate is practising for.
// ---------------------------------------------------------------------------

export type JobDescriptionResult =
  { ok: true; text: string; match: JobMatch } | { ok: false; error: string };

// Saves the job description and compares it with the interview's resume.
export async function saveJobDescription(input: {
  interviewId: string;
  text: string;
}): Promise<JobDescriptionResult> {
  try {
    const { user, supabase } = await ownSetupInterview(input.interviewId);
    const text = String(input.text ?? "")
      .replaceAll("\r", "")
      .trim();
    if (text.length < JOB_DESCRIPTION_MIN_CHARS)
      return { ok: false, error: "Paste the job description first (at least a few sentences)." };
    if (text.length > JOB_DESCRIPTION_MAX_CHARS)
      return {
        ok: false,
        error: `The job description is too long. Keep it under ${JOB_DESCRIPTION_MAX_CHARS.toLocaleString("en-IN")} characters.`,
      };

    const { data: iv } = await supabase
      .from("interviews")
      .select("resume_id, resumes(parsed)")
      .eq("id", input.interviewId)
      .eq("user_id", user.id)
      .single();
    if (!iv?.resume_id) return { ok: false, error: "Upload your resume first." };
    const resume = (iv.resumes?.parsed ?? null) as ParsedResume | null;
    const ai = await getAi();
    let match: JobMatch | null = null;
    if (ai) match = await aiCompareJob(ai, text, resume).catch(() => null);
    if (!match) {
      const { data: skills } = await supabase.from("skills").select("name, category");
      match = compareJobToResume(text, skills ?? [], resume);
    }

    const { error } = await createAdminClient()
      .from("interviews")
      .update({ job_description: text, job_match: match })
      .eq("id", input.interviewId)
      .eq("status", "setup");
    if (error)
      return { ok: false, error: "We couldn't save the job description. Please try again." };
    return { ok: true, text, match };
  } catch (e) {
    return { ok: false, error: e instanceof ResumeError ? e.message : "Please try again." };
  }
}

export type JobFileResult = { ok: true; text: string } | { ok: false; error: string };

// Reads the text of an uploaded job-description document (PDF, DOC or DOCX).
// The file itself is not stored; only the text the candidate then saves.
export async function readJobDescriptionFile(formData: FormData): Promise<JobFileResult> {
  try {
    await ownSetupInterview(String(formData.get("interviewId") ?? ""));
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Choose a file to upload." };
    if (file.size > JOB_DESCRIPTION_FILE_MAX_BYTES)
      return { ok: false, error: "The file is larger than 2 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { fileType } = validateResume(file, bytes);
    const text = await extractResumeText(bytes, fileType);
    return { ok: true, text: text.slice(0, JOB_DESCRIPTION_MAX_CHARS) };
  } catch (e) {
    if (e instanceof ResumeError) return { ok: false, error: e.message };
    return { ok: false, error: "We couldn't read this file. Please paste the text instead." };
  }
}

// Practise without a job description (or remove one added earlier).
export async function clearJobDescription(interviewId: string): Promise<{ error?: string }> {
  try {
    await ownSetupInterview(interviewId);
    await createAdminClient()
      .from("interviews")
      .update({ job_description: null, job_match: null })
      .eq("id", interviewId)
      .eq("status", "setup");
    return {};
  } catch (e) {
    return { error: e instanceof ResumeError ? e.message : "Please try again." };
  }
}

// Builds the report again (after an AI hiccup, or to refresh the plan).
export async function generateReport(interviewId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();
  const { data: iv } = await supabase
    .from("interviews")
    .select("id, status")
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!iv) return { error: "Interview not found." };
  if (iv.status !== "completed" && iv.status !== "abandoned")
    return { error: "Finish the interview first." };
  const ai = await getAi();
  if (!ai) return { error: "AI evaluation is not enabled yet." };
  const ok = await buildReport(ai, interviewId).catch(() => false);
  revalidatePath(`/reports/${interviewId}`);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return ok
    ? {}
    : { error: "We couldn't prepare the report right now. Please try again in a minute." };
}

export type StartState = { error?: string };

// Step 3 → 4: choose the questions and open the interview room.
export async function startInterview(interviewId: string): Promise<StartState> {
  const { user, supabase } = await requireUser();
  const { data: interview } = await supabase
    .from("interviews")
    .select(
      "id, status, job_role, experience_level, interview_type, difficulty, question_count, resume_id, job_description, job_match, resumes(parsed)",
    )
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!interview) return { error: "Interview not found." };
  if (interview.status !== "setup") redirect(`/interview/${interviewId}`);
  if (!interview.resume_id) return { error: "Upload your resume before starting." };

  const admin = createAdminClient();
  // Claim the interview first so a double click can't generate questions twice.
  const { data: claimed } = await admin
    .from("interviews")
    .update({ status: "ready" })
    .eq("id", interviewId)
    .eq("status", "setup")
    .select("id");
  if (!claimed?.length) redirect(`/interview/${interviewId}`);

  const resume = (interview.resumes?.parsed ?? null) as ParsedResume | null;
  const gaps = readJobMatch(interview.job_match)?.gaps ?? [];
  // AI writes the questions when configured; the question bank is the fallback.
  const ai = await getAi();
  let planned = ai
    ? await aiPlanQuestions(ai, {
        jobRole: interview.job_role,
        experience: experienceLabel(interview.experience_level),
        interviewType: interview.interview_type,
        difficulty: interview.difficulty,
        count: interview.question_count,
        resume,
        gaps,
        jobDescription: interview.job_description,
      }).catch(() => [])
    : [];
  if (planned.length < Math.min(3, interview.question_count)) {
    planned = await planQuestionsFromBank({
      jobRole: interview.job_role,
      interviewType: interview.interview_type,
      difficulty: interview.difficulty,
      count: interview.question_count,
      resume,
      gaps,
    });
  }
  if (planned.length === 0) {
    await admin.from("interviews").update({ status: "setup" }).eq("id", interviewId);
    return {
      error: "No questions are available for this combination yet. Try another type or difficulty.",
    };
  }

  const { error } = await admin.from("interview_questions").insert(
    planned.map((q, i) => ({
      interview_id: interviewId,
      user_id: user.id,
      position: i + 1,
      question: q.question,
      skill: q.skill,
      source: q.source,
      bank_question_id: q.bank_question_id,
      expected_points: q.expected_points,
    })),
  );
  if (error) {
    await admin.from("interviews").update({ status: "setup" }).eq("id", interviewId);
    return { error: "We couldn't prepare your questions. Please try again." };
  }

  await admin
    .from("interviews")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      question_count: planned.length,
    })
    .eq("id", interviewId);
  redirect(`/interview/${interviewId}/room`);
}
