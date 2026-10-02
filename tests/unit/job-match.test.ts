import { describe, expect, it } from "vitest";
import { compareJobToResume, readJobMatch } from "@/lib/interview/job-match";

const skills = [
  { name: "JavaScript", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "Docker", category: "DevOps" },
  { name: "REST APIs", category: "Backend" },
  { name: "SQL", category: "Data" },
];

const JD =
  "We are hiring a Frontend Developer. You will build UIs with React and TypeScript, " +
  "call REST APIs and ship with Docker. Nice to have: SQL.";

describe("compareJobToResume", () => {
  it("splits the job's skills into matched and gaps, in the order the job mentions them", () => {
    const m = compareJobToResume(JD, skills, { skills: [], technologies: ["React", "SQL"] });
    expect(m.required).toEqual(["React", "TypeScript", "REST APIs", "Docker", "SQL"]);
    expect(m.matched).toEqual(["React", "SQL"]);
    expect(m.gaps).toEqual(["TypeScript", "REST APIs", "Docker"]);
    expect(m.match_percent).toBe(40);
    expect(m.method).toBe("keyword");
  });

  it("recognises common aliases and ignores case on the resume side", () => {
    const m = compareJobToResume("Strong JS and RESTful services", skills, {
      skills: ["javascript"],
      technologies: [],
    });
    expect(m.required).toEqual(["JavaScript", "REST APIs"]);
    expect(m.matched).toEqual(["JavaScript"]);
    expect(m.gaps).toEqual(["REST APIs"]);
  });

  it("treats every required skill as a gap when there is no resume", () => {
    const m = compareJobToResume(JD, skills, null);
    expect(m.matched).toEqual([]);
    expect(m.gaps).toHaveLength(5);
    expect(m.match_percent).toBe(0);
  });

  it("has no percentage when the job names none of the known skills", () => {
    const m = compareJobToResume("Friendly team, flexible hours.", skills, null);
    expect(m.required).toEqual([]);
    expect(m.match_percent).toBeNull();
  });
});

describe("readJobMatch", () => {
  it("reads stored JSON safely", () => {
    expect(readJobMatch(null)).toBeNull();
    expect(readJobMatch({ gaps: ["Docker", 3], match_percent: "x" })).toEqual({
      method: "keyword",
      required: [],
      matched: [],
      gaps: ["Docker"],
      match_percent: null,
    });
  });
});
