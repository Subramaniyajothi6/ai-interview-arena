import "server-only";

// Structured resume profile stored in resumes.parsed. The same shape is used by
// the rule-based analyzer below and by the AI analyzer (added later).
export type ParsedResume = {
  method: "keyword" | "ai";
  name: string | null;
  skills: string[];
  technologies: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  experience_years: number | null;
};

type SkillRow = { name: string; category: string | null };

// Alternative spellings that should count as a known skill.
const ALIASES: Record<string, string[]> = {
  JavaScript: ["JS", "ES6"],
  TypeScript: ["TS"],
  React: ["ReactJS", "React.js"],
  "Next.js": ["NextJS", "Next js"],
  "Node.js": ["NodeJS", "Node js"],
  Express: ["Express.js", "ExpressJS"],
  PostgreSQL: ["Postgres"],
  MongoDB: ["Mongo"],
  "REST APIs": ["REST API", "RESTful", "REST"],
  "Machine Learning": ["ML"],
  "Deep Learning": ["DL"],
  NLP: ["Natural Language Processing"],
  LLMs: ["LLM", "Large Language Models", "GPT"],
  "Tailwind CSS": ["Tailwind", "TailwindCSS"],
  "Power BI": ["PowerBI"],
  "Google Analytics": ["GA4"],
  "Social Media Marketing": ["SMM"],
  AWS: ["Amazon Web Services"],
};

// Categories treated as tools/frameworks rather than core skills.
const TECHNOLOGY_CATEGORIES = new Set(["Frontend", "Backend", "Cloud", "DevOps", "Tools"]);
const TECHNOLOGY_NAMES = new Set([
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Excel",
  "Power BI",
  "Tableau",
  "Pandas",
  "TensorFlow",
  "PyTorch",
  "Google Ads",
  "Google Analytics",
  "CRM",
]);

const SECTIONS: {
  key: keyof Pick<ParsedResume, "education" | "experience" | "projects" | "certifications">;
  pattern: RegExp;
}[] = [
  { key: "education", pattern: /^(education|academic|qualifications?)\b/i },
  {
    key: "experience",
    pattern: /^(work experience|professional experience|experience|employment|internships?)\b/i,
  },
  { key: "projects", pattern: /^(projects?|academic projects|personal projects)\b/i },
  { key: "certifications", pattern: /^(certifications?|certificates?|licen[cs]es?)\b/i },
];
const ANY_HEADING =
  /^(education|academic|qualifications?|work experience|professional experience|experience|employment|internships?|projects?|certifications?|certificates?|skills|technical skills|summary|profile|objective|achievements|awards|languages|interests|hobbies|contact|references)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mentions(text: string, term: string) {
  // Word-ish boundaries that also work for terms like "C++", "Node.js" or ".NET".
  // Short acronyms (REST, ML, JS…) must match case-sensitively so ordinary
  // words like "rest" are not counted.
  const flags = /^[A-Z0-9]{2,4}$/.test(term) ? "" : "i";
  return new RegExp(`(^|[^A-Za-z0-9+#.])${escape(term)}(?![A-Za-z0-9+#])`, flags).test(text);
}

function sectionItems(lines: string[], start: number) {
  const items: string[] = [];
  for (let i = start + 1; i < lines.length && items.length < 4; i++) {
    const line = lines[i];
    if (ANY_HEADING.test(line) && line.length < 40) break;
    const clean = line.replace(/^[•\-*·▪●◦–]\s*/, "").trim();
    if (clean.length >= 4) items.push(clean.slice(0, 160));
  }
  return items;
}

// Rule-based analysis used when no AI provider is configured: finds known
// skills and the main resume sections. Deterministic and free.
export function analyzeResumeText(text: string, knownSkills: SkillRow[]): ParsedResume {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const found = knownSkills.filter((s) =>
    [s.name, ...(ALIASES[s.name] ?? [])].some((term) => mentions(text, term)),
  );
  const isTech = (s: SkillRow) =>
    TECHNOLOGY_CATEGORIES.has(s.category ?? "") || TECHNOLOGY_NAMES.has(s.name);

  const parsed: ParsedResume = {
    method: "keyword",
    name: null,
    skills: found.filter((s) => !isTech(s)).map((s) => s.name),
    technologies: found.filter(isTech).map((s) => s.name),
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    experience_years: null,
  };

  const first = lines[0] ?? "";
  if (/^[\p{L}][\p{L} .'-]{2,50}$/u.test(first) && first.split(/\s+/).length <= 4) {
    parsed.name = first;
  }

  for (const { key, pattern } of SECTIONS) {
    const index = lines.findIndex((l) => l.length < 40 && pattern.test(l));
    if (index >= 0) parsed[key] = sectionItems(lines, index);
  }

  const years = [...text.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n <= 40);
  parsed.experience_years = years.length ? Math.max(...years) : null;

  return parsed;
}
