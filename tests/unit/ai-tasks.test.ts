import { describe, expect, it, vi } from "vitest";
import { AiError, type AiConfig } from "@/lib/ai/client";
import { aiCompareJob, aiEvaluateAnswer, aiPlanQuestions } from "@/lib/ai/tasks";

// A fake OpenAI-compatible client that returns `reply` as the model's JSON.
function fakeAi(reply: unknown) {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: typeof reply === "string" ? reply : JSON.stringify(reply) } }],
  });
  const ai = {
    provider: "open_source",
    label: "Test",
    model: "openai/gpt-oss-120b",
    fastModel: "openai/gpt-oss-20b",
    client: { chat: { completions: { create } } },
  } as unknown as AiConfig;
  return { ai, create };
}

const evaluation = {
  technical_accuracy: 120,
  relevance: 80.6,
  communication: -5,
  clarity: 70,
  completeness: 60,
  problem_solving: 65,
  answer_quality: 72,
  question_score: 74,
  feedback: "You explained the idea clearly. Add a concrete example.",
  follow_up_question: "Can you give an example?",
};
const answerInput = {
  jobRole: "Frontend Developer",
  experience: "0–1 Years",
  difficulty: "medium",
  question: "What is a closure?",
  expectedPoints: "Function plus its lexical scope.",
  answer: "A function that remembers variables.",
  mode: "text" as const,
};

describe("aiEvaluateAnswer", () => {
  it("clamps scores to 0–100 and uses the fast model with strict JSON output", async () => {
    const { ai, create } = fakeAi(evaluation);
    const e = await aiEvaluateAnswer(ai, { ...answerInput, allowFollowUp: true });
    expect(e.technical_accuracy).toBe(100);
    expect(e.communication).toBe(0);
    expect(e.relevance).toBe(81);
    expect(e.followUp).toBe("Can you give an example?");
    const req = create.mock.calls[0][0];
    expect(req.model).toBe("openai/gpt-oss-20b");
    expect(req.response_format.type).toBe("json_schema");
    expect(req.response_format.json_schema.strict).toBe(true);
    expect(req.messages[1].content).toContain("<answer>");
  });

  it("drops the follow-up when follow-ups are not allowed", async () => {
    const { ai } = fakeAi(evaluation);
    const e = await aiEvaluateAnswer(ai, { ...answerInput, allowFollowUp: false });
    expect(e.followUp).toBeNull();
  });

  it("rejects a malformed reply instead of saving it", async () => {
    const { ai } = fakeAi({ question_score: "high" });
    await expect(
      aiEvaluateAnswer(ai, { ...answerInput, allowFollowUp: true }),
    ).rejects.toBeInstanceOf(AiError);
    const bad = fakeAi("not json");
    await expect(
      aiEvaluateAnswer(bad.ai, { ...answerInput, allowFollowUp: true }),
    ).rejects.toBeInstanceOf(AiError);
  });
});

describe("aiCompareJob", () => {
  it("keeps matched and gaps consistent with the required list", async () => {
    const { ai } = fakeAi({
      required: ["React", "TypeScript", "Docker", "React"],
      matched: ["react", "Kubernetes"],
      gaps: ["TypeScript"],
    });
    const m = await aiCompareJob(ai, "Job text", null);
    expect(m.required).toEqual(["React", "TypeScript", "Docker"]);
    expect(m.matched).toEqual(["React"]);
    expect(m.gaps).toEqual(["TypeScript", "Docker"]);
    expect(m.match_percent).toBe(33);
    expect(m.method).toBe("ai");
  });
});

describe("aiPlanQuestions", () => {
  it("maps kinds to question sources and trims to the requested count", async () => {
    const q = (kind: string, i: number) => ({
      question: `Q${i}?`,
      skill: "React",
      kind,
      expected_points: "Points.",
    });
    const { ai } = fakeAi({
      questions: [q("gap", 1), q("resume", 2), q("general", 3), q("gap", 4)],
    });
    const planned = await aiPlanQuestions(ai, {
      jobRole: "Frontend Developer",
      experience: "0–1 Years",
      interviewType: "technical",
      difficulty: "medium",
      count: 3,
      resume: null,
      gaps: ["Docker"],
      jobDescription: null,
    });
    expect(planned.map((p) => p.source)).toEqual(["gap", "resume", "ai"]);
    expect(planned.every((p) => p.bank_question_id === null)).toBe(true);
  });
});

describe("aiPlanQuestions gap names", () => {
  it("gives gap questions the gap's exact name so the report can match them", async () => {
    const { ai } = fakeAi({
      questions: [
        { question: "Q1?", skill: "redux", kind: "gap", expected_points: "P." },
        { question: "Q2?", skill: "Jest", kind: "gap", expected_points: "P." },
        { question: "Q3?", skill: "Hooks", kind: "general", expected_points: "P." },
      ],
    });
    const planned = await aiPlanQuestions(ai, {
      jobRole: "Frontend Developer",
      experience: "0–1 Years",
      interviewType: "technical",
      difficulty: "medium",
      count: 3,
      resume: null,
      gaps: ["Redux or Zustand", "Jest"],
      jobDescription: null,
    });
    expect(planned.map((p) => p.skill)).toEqual(["Redux or Zustand", "Jest", "Hooks"]);
  });
});
