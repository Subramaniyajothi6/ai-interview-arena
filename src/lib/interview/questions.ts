import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { ParsedResume } from "@/lib/resume/analyze";

type Enums = Database["public"]["Enums"];
type BankRow = Pick<
  Database["public"]["Tables"]["question_bank"]["Row"],
  "id" | "question" | "job_role" | "skill" | "difficulty" | "interview_type" | "expected_answer"
>;

export type PlannedQuestion = {
  question: string;
  skill: string | null;
  source: Enums["question_source"];
  bank_question_id: string | null;
  expected_points: string | null;
};

const DIFFICULTY_ORDER: Enums["difficulty"][] = ["easy", "medium", "hard", "expert"];

function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chooses interview questions from the question bank (no AI needed).
// Preference order: same role + type + difficulty, then general questions
// (all roles), then neighbouring difficulties. "Mixed" draws from every type.
// If the resume lists a project, one question asks about it.
export async function planQuestionsFromBank(config: {
  jobRole: Enums["job_role"];
  interviewType: Enums["interview_type"];
  difficulty: Enums["difficulty"];
  count: number;
  resume: ParsedResume | null;
}): Promise<PlannedQuestion[]> {
  const admin = createAdminClient();
  let query = admin
    .from("question_bank")
    .select("id, question, job_role, skill, difficulty, interview_type, expected_answer")
    .eq("is_active", true)
    .or(`job_role.eq."${config.jobRole}",job_role.is.null`);
  if (config.interviewType !== "mixed") query = query.eq("interview_type", config.interviewType);
  const { data } = await query;
  const pool = data ?? [];

  const target = DIFFICULTY_ORDER.indexOf(config.difficulty);
  const rank = (q: BankRow) =>
    (q.job_role === config.jobRole ? 0 : 10) +
    Math.abs(DIFFICULTY_ORDER.indexOf(q.difficulty) - target) * 3;

  // Shuffle first so equally good questions vary between interviews.
  const ranked = shuffle(pool).sort((a, b) => rank(a) - rank(b));

  const project = config.resume?.projects?.[0];
  const bankSlots = project ? config.count - 1 : config.count;

  let chosen: BankRow[];
  if (config.interviewType === "mixed") {
    // Round-robin across types so a mixed interview really is mixed.
    const byType = new Map<string, BankRow[]>();
    for (const q of ranked)
      byType.set(q.interview_type, [...(byType.get(q.interview_type) ?? []), q]);
    chosen = [];
    while (chosen.length < bankSlots && [...byType.values()].some((l) => l.length)) {
      for (const list of byType.values()) {
        const next = list.shift();
        if (next && chosen.length < bankSlots) chosen.push(next);
      }
    }
  } else {
    chosen = ranked.slice(0, bankSlots);
  }

  // Easier questions first, like a real interview warming up.
  chosen.sort(
    (a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty),
  );

  const planned: PlannedQuestion[] = chosen.map((q) => ({
    question: q.question,
    skill: q.skill,
    source: "bank",
    bank_question_id: q.id,
    expected_points: q.expected_answer,
  }));

  if (project) {
    const name = project
      .split(/\s[-–—]\s|[:|(,]/)[0]
      .trim()
      .slice(0, 80);
    planned.splice(Math.min(1, planned.length), 0, {
      question: `Walk me through the "${name}" project on your resume. What was your role, what technologies did you use, and what was the hardest problem you solved?`,
      skill: "Projects",
      source: "resume",
      bank_question_id: null,
      expected_points:
        "Clear context and goal of the project, the candidate's own responsibilities, technologies and why they were chosen, a specific technical challenge and how it was solved, and the outcome or what they learned.",
    });
  }

  return planned;
}
