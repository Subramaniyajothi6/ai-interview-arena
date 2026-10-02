import { describe, expect, it } from "vitest";
import { questionSchema, settingsSchema } from "@/lib/validation/admin";
import { fieldErrors } from "@/lib/validation/auth";

const settings = {
  questionsPerInterview: "8",
  maxFollowUps: "2",
  maxResumeMb: "5",
  aiProvider: "openai",
};

describe("admin settings", () => {
  it("accepts valid settings and reads switches", () => {
    const r = settingsSchema.safeParse({ ...settings, allowVoice: "on" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ questionsPerInterview: 8, maxFollowUps: 2, allowVoice: "on" });
  });

  it("explains blank, non-numeric and decimal numbers in plain words", () => {
    const r = settingsSchema.safeParse({
      ...settings,
      questionsPerInterview: "",
      maxFollowUps: "abc",
      maxResumeMb: "2.5",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.questionsPerInterview).toBe("Enter a number.");
    expect(errors.maxFollowUps).toBe("Enter a number.");
    expect(errors.maxResumeMb).toBe("Use a whole number.");
  });

  it("enforces the allowed ranges", () => {
    const r = settingsSchema.safeParse({
      ...settings,
      questionsPerInterview: "2",
      maxFollowUps: "-1",
      maxResumeMb: "9",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.questionsPerInterview).toBe("At least 3.");
    expect(errors.maxFollowUps).toBe("At least 0.");
    expect(errors.maxResumeMb).toBe("At most 5 MB.");
  });

  it("rejects an unknown AI provider", () => {
    const r = settingsSchema.safeParse({ ...settings, aiProvider: "other" });
    expect(fieldErrors(r.error!).aiProvider).toBe("Choose a provider.");
  });
});

describe("question bank", () => {
  const question = {
    question: "What is a closure?",
    jobRole: "",
    skill: "JavaScript",
    difficulty: "easy",
    interviewType: "technical",
    expectedAnswer: "A function that remembers variables from where it was defined.",
  };

  it("accepts a valid question; empty role means all roles", () => {
    const r = questionSchema.safeParse(question);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ jobRole: null, isActive: false });
  });

  it("reports every missing field at once", () => {
    const r = questionSchema.safeParse({
      question: "Why",
      jobRole: "Astronaut",
      skill: " ",
      difficulty: "",
      interviewType: "",
      expectedAnswer: "short",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.question).toBe("Enter the question.");
    expect(errors.jobRole).toBeDefined();
    expect(errors.skill).toBe("Enter a skill.");
    expect(errors.difficulty).toBe("Choose a difficulty.");
    expect(errors.interviewType).toBe("Choose a type.");
    expect(errors.expectedAnswer).toBe("Describe what a good answer covers.");
  });
});
