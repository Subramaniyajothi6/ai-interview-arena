import { splitEntry } from "@/lib/resume/entry";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeResumeText } from "@/lib/resume/analyze";
import { extractResumeText, ResumeError, validateResume } from "@/lib/resume/extract";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../fixtures/${name}`, import.meta.url)));
// Copy into a plain ArrayBuffer-backed array so it is a valid BlobPart.
const asFile = (bytes: Uint8Array, name: string) => new File([new Uint8Array(bytes)], name);

const SKILLS = [
  { name: "JavaScript", category: "Programming" },
  { name: "TypeScript", category: "Programming" },
  { name: "SQL", category: "Data" },
  { name: "React", category: "Frontend" },
  { name: "Next.js", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "REST APIs", category: "Backend" },
  { name: "PostgreSQL", category: "Data" },
  { name: "Docker", category: "DevOps" },
  { name: "Java", category: "Programming" },
  { name: "Machine Learning", category: "AI" },
];

describe("resume file validation", () => {
  it("accepts real PDF and DOCX files", () => {
    expect(
      validateResume(asFile(fixture("sample-resume.pdf"), "cv.pdf"), fixture("sample-resume.pdf"))
        .fileType,
    ).toBe("pdf");
    expect(
      validateResume(
        asFile(fixture("sample-resume.docx"), "cv.docx"),
        fixture("sample-resume.docx"),
      ).fileType,
    ).toBe("docx");
  });

  it("rejects unsupported extensions", () => {
    const bytes = new TextEncoder().encode("hello");
    expect(() => validateResume(asFile(bytes, "cv.txt"), bytes)).toThrow(/PDF, DOC or DOCX/);
  });

  it("rejects a renamed file whose content is not a PDF", () => {
    const bytes = new TextEncoder().encode("MZ this is really an executable");
    expect(() => validateResume(asFile(bytes, "cv.pdf"), bytes)).toThrow(ResumeError);
  });

  it("rejects a DOCX renamed to .pdf (extension and content disagree)", () => {
    const bytes = fixture("sample-resume.docx");
    expect(() => validateResume(asFile(bytes, "cv.pdf"), bytes)).toThrow(/doesn't look like/);
  });

  it("rejects empty files and files over 5 MB", () => {
    const empty = new Uint8Array();
    expect(() => validateResume(asFile(empty, "cv.pdf"), empty)).toThrow(/empty/);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set([0x25, 0x50, 0x44, 0x46]);
    expect(() => validateResume(asFile(big, "cv.pdf"), big)).toThrow(/5 MB/);
  });
});

describe("resume text extraction", () => {
  it("extracts the same text from PDF and DOCX", async () => {
    const pdf = await extractResumeText(fixture("sample-resume.pdf"), "pdf");
    const docx = await extractResumeText(fixture("sample-resume.docx"), "docx");
    for (const text of [pdf, docx]) {
      expect(text).toContain("Priya Raman");
      expect(text).toContain("Task manager app");
    }
    // The first run loads pdf.js, which can take a few seconds on a cold start.
  }, 20_000);

  it("leaves the caller's buffer intact (pdf.js must get a copy)", async () => {
    const bytes = fixture("sample-resume.pdf");
    const size = bytes.byteLength;
    await extractResumeText(bytes, "pdf");
    expect(bytes.byteLength).toBe(size);
  });

  it("gives a clear error for unreadable documents", async () => {
    const junk = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    await expect(extractResumeText(junk, "pdf")).rejects.toThrow(ResumeError);
  });
});

describe("keyword resume analysis", () => {
  const text = [
    "Priya Raman",
    "Summary",
    "Developer with 2 years of experience. I rest well and use JS daily.",
    "Education",
    "B.E. Computer Science, Anna University (2025)",
    "Experience",
    "Full-stack intern, Acme Corp (6 months)",
    "Projects",
    "Task manager app - Next.js, Postgres, REST API",
    "Skills",
    "TypeScript, ReactJS, Node.js, SQL, Docker",
    "Certifications",
    "Responsive Web Design - freeCodeCamp",
  ].join("\n");
  const parsed = analyzeResumeText(text, SKILLS);

  it("finds the name and every section", () => {
    expect(parsed.name).toBe("Priya Raman");
    expect(parsed.education[0]).toMatch(/Anna University/);
    expect(parsed.experience[0]).toMatch(/Acme/);
    expect(parsed.projects[0]).toMatch(/Task manager app/);
    expect(parsed.certifications[0]).toMatch(/freeCodeCamp/);
    expect(parsed.experience_years).toBe(2);
    expect(parsed.method).toBe("keyword");
  });

  it("matches skills including aliases (JS, ReactJS, Postgres, REST API)", () => {
    expect(parsed.skills).toEqual(expect.arrayContaining(["JavaScript", "TypeScript", "SQL"]));
    expect(parsed.technologies).toEqual(
      expect.arrayContaining(["React", "Next.js", "Node.js", "PostgreSQL", "REST APIs", "Docker"]),
    );
  });

  it("does not match partial words or ordinary words", () => {
    // "JavaScript" must not count as "Java"; "rest" must not count as "REST APIs".
    const other = analyzeResumeText("I wrote JavaScript and took a rest.", SKILLS);
    expect(other.skills).toEqual(["JavaScript"]);
    expect(other.technologies).toEqual([]);
  });
});

describe("resume entry display", () => {
  it("splits the main part from the details", () => {
    expect(splitEntry("B.E. Computer Science, Anna University, 2025")).toEqual([
      "B.E. Computer Science",
      "Anna University, 2025",
    ]);
    expect(splitEntry("Task manager app - Next.js, PostgreSQL")).toEqual([
      "Task manager app",
      "Next.js, PostgreSQL",
    ]);
    expect(splitEntry("Full-stack intern (6 months)")).toEqual(["Full-stack intern", "6 months"]);
  });

  it("keeps short or unseparated entries whole", () => {
    expect(splitEntry("Responsive Web Design")).toEqual(["Responsive Web Design", ""]);
    expect(splitEntry("Full-stack intern")).toEqual(["Full-stack intern", ""]);
  });
});
