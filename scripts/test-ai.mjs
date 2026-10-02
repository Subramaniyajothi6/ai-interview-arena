// Live test of the AI features against the configured provider (uses real AI
// requests, about 12 per run): resume reading, job comparison, question writing,
// answer scoring with follow-ups, and the final report and improvement plan.
// Uses a temporary account deleted at the end. The provider chosen in admin
// Settings must have its API key in .env.local.
//
// Run with the app running:  npm run test:ai
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SP = process.env.SP || fs.mkdtempSync(path.join(os.tmpdir(), "aia-ai-"));
const PW = crypto.randomUUID() + "Aa1!",
  t = Date.now();
const email = `ai-live-${t}@example.com`;
const { data: cu } = await a.auth.admin.createUser({
  email,
  password: PW,
  email_confirm: true,
  user_metadata: { full_name: "Priya Sharma" },
});
const uid = cu.user.id;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0,
  bad = 0;
const check = (n, c, d = "") => {
  if (c) ok++;
  else bad++;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
};
const clickBtn = (page, text) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll("button,a")].find(
      (b) => b.textContent.trim() === text && b.getClientRects().length && !b.disabled,
    );
    if (!b) throw new Error("no button " + text);
    b.click();
  }, text);
const body = (page) => page.evaluate(() => document.body.innerText);
const timed = async (label, fn) => {
  const s = Date.now();
  const r = await fn();
  console.log(`   ⏱ ${label}: ${((Date.now() - s) / 1000).toFixed(1)} s`);
  return r;
};

function makePdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = lines
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 10} Tf 50 ${800 - i * 15} Td (${esc(l)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((b, i) => {
    const at = Buffer.byteLength(pdf);
    pdf += `${i + 1} 0 obj\n${b}\nendobj\n`;
    return at;
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
const RESUME = [
  "Priya Sharma",
  "Chennai, India | priya.sharma@example.com",
  "SUMMARY",
  "Frontend developer with an 8-month internship building React dashboards.",
  "SKILLS",
  "JavaScript, React, HTML5, CSS3, Tailwind CSS, Git, Figma, basic SQL",
  "EXPERIENCE",
  "Frontend Intern - Zoho, Chennai (Jan 2025 - Aug 2025)",
  "Built 6 reusable React components for the analytics dashboard used by 40k users.",
  "Cut page load time by 30 percent by lazy-loading charts.",
  "PROJECTS",
  "Expense Tracker - React + Firebase app with charts and monthly budgets.",
  "Portfolio Website - responsive site with Tailwind CSS, Lighthouse score 98.",
  "EDUCATION",
  "B.E. Computer Science - Anna University, 2021 - 2025, CGPA 8.4",
  "CERTIFICATIONS",
  "Meta Front-End Developer Professional Certificate",
];
const JD = `Frontend Developer (React) - Fintech startup, Bengaluru.
You will build customer-facing web apps for our payments platform.
Requirements: 1+ year with React and TypeScript; state management (Redux or Zustand); consuming REST APIs;
writing unit tests with Jest and React Testing Library; performance optimisation; accessibility (WCAG).
Nice to have: Next.js, CI/CD with GitHub Actions, Docker.`;

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
    ].find((p) => fs.existsSync(p)),
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.goto(BASE + "/login", { waitUntil: "networkidle0", timeout: 120000 });
  await page.type("#email", email);
  await page.type("#password", PW);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  const { data: iv } = await a
    .from("interviews")
    .insert({
      user_id: uid,
      job_role: "Frontend Developer",
      experience_level: "0-1",
      interview_type: "technical",
      difficulty: "medium",
      status: "setup",
      question_count: 6,
    })
    .select("id")
    .single();
  const id = iv.id;

  // 1. Resume → AI parse
  await page.goto(`${BASE}/interview/${id}/resume`, { waitUntil: "networkidle0", timeout: 120000 });
  const resumePath = path.join(SP, "Priya_Sharma_Resume.pdf");
  fs.writeFileSync(resumePath, makePdf(RESUME));
  await timed("resume read by AI", async () => {
    await (await page.$("#resume-file")).uploadFile(resumePath);
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Read by AI") ||
        document.body.innerText.includes("matched against our skills list") ||
        !!document.querySelector('[role="alert"]'),
      { timeout: 120000 },
    );
  });
  const { data: res } = await a.from("resumes").select("parsed").eq("user_id", uid).single();
  check("resume analysed by AI (method = ai)", res.parsed?.method === "ai", res.parsed?.method);
  console.log(
    "   parsed:",
    JSON.stringify({
      skills: res.parsed.skills,
      technologies: res.parsed.technologies,
      experience: res.parsed.experience,
      projects: res.parsed.projects,
      education: res.parsed.education,
      experience_years: res.parsed.experience_years,
    }),
  );
  check("resume panel says 'Read by AI'", (await body(page)).includes("Read by AI"));
  await page.screenshot({ path: path.join(SP, "ai-1-resume.png"), fullPage: true });

  // 2. Job description → AI compare
  await page.goto(`${BASE}/interview/${id}/job`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.type("#jobDescription", JD);
  await timed("job compared by AI", async () => {
    await clickBtn(page, "Compare with resume");
    await page.waitForFunction(
      () =>
        /skills to work on/i.test(document.body.innerText) ||
        !!document.querySelector('[role="alert"]') ||
        document.body.innerText.includes("couldn"),
      { timeout: 120000 },
    );
  });
  const { data: jm } = await a.from("interviews").select("job_match").eq("id", id).single();
  check("job match by AI (method = ai)", jm.job_match?.method === "ai", jm.job_match?.method);
  console.log("   job_match:", JSON.stringify(jm.job_match));
  await page.screenshot({ path: path.join(SP, "ai-2-job.png"), fullPage: true });

  // 3. Start → AI questions
  await page.goto(`${BASE}/interview/${id}/instructions`, {
    waitUntil: "networkidle0",
    timeout: 120000,
  });
  await page.click('input[type="checkbox"]');
  await timed("questions written by AI", async () => {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 180000 }).catch(() => {}),
      clickBtn(page, "Start interview"),
    ]);
  });
  await page.waitForSelector("textarea", { timeout: 90000 });
  const { data: qs } = await a
    .from("interview_questions")
    .select("position, source, skill, question, expected_points")
    .eq("interview_id", id)
    .order("position");
  console.log(
    "   questions:\n" +
      qs.map((q) => `     ${q.position}. [${q.source}/${q.skill}] ${q.question}`).join("\n"),
  );
  check(
    "questions written by AI (no bank ids, sources ai/gap/resume)",
    qs.length > 0 && qs.every((q) => ["ai", "gap", "resume"].includes(q.source)),
    qs.map((q) => q.source).join(","),
  );
  check("gap questions first", qs[0]?.source === "gap" || qs[0]?.source === "resume");
  const gapNames = new Set((jm.job_match?.gaps ?? []).map((g) => g.toLowerCase()));
  check(
    "gap questions use the exact gap names",
    qs.filter((q) => q.source === "gap").every((q) => gapNames.has((q.skill ?? "").toLowerCase())),
    qs
      .filter((q) => q.source === "gap")
      .map((q) => q.skill)
      .join(", "),
  );
  check(
    "every question has expected points",
    qs.every((q) => (q.expected_points ?? "").length > 20),
  );

  // 4. Answer 3 questions (one strong, one weak, one skipped) → AI evaluation (+ follow-up?)
  const answers = [
    "I used React state and some context for shared things. It worked fine for the project.",
    "I picked context because the app was small and I did not want extra libraries. Redux felt like too much setup for a few screens.",
  ];
  for (let i = 0; i < 3; i++) {
    const before = await page.$eval("h1", (h) => h.textContent).catch(() => "");
    if (i < 2) {
      await page.type("textarea", answers[i]);
      await timed(`answer ${i + 1} submitted + scored`, async () => {
        await clickBtn(page, "Submit answer");
        await page.waitForFunction(
          (b) => document.querySelector("h1")?.textContent !== b,
          { timeout: 120000 },
          before,
        );
      });
    } else {
      await clickBtn(page, "Skip question");
      await page.waitForFunction(
        (b) => document.querySelector("h1")?.textContent !== b,
        { timeout: 60000 },
        before,
      );
    }
    await wait(800);
  }
  const { data: evals } = await a
    .from("ai_evaluations")
    .select(
      "question_score, technical_accuracy, completeness, feedback, needs_follow_up, model, answer_id",
    )
    .eq("interview_id", id);
  console.log(
    "   evaluations:\n" +
      evals
        .map(
          (e) =>
            `     score ${e.question_score} (tech ${e.technical_accuracy}, completeness ${e.completeness}) follow-up=${e.needs_follow_up} [${e.model}]\n       "${e.feedback}"`,
        )
        .join("\n"),
  );
  check("answers scored during the interview", evals.length === 2, `${evals.length} evaluations`);
  const scores = evals.map((e) => e.question_score).sort((x, y) => y - x);
  check(
    "scores are within 0–100 with feedback",
    evals.every((e) => e.question_score >= 0 && e.question_score <= 100 && e.feedback.length > 20),
    scores.join(", "),
  );
  const { data: fu } = await a
    .from("interview_questions")
    .select("position, follow_up_index, question")
    .eq("interview_id", id)
    .eq("source", "follow_up");
  console.log(
    "   follow-ups:",
    fu.length
      ? fu
          .map((f) => `Q${f.position}${String.fromCharCode(96 + f.follow_up_index)}: ${f.question}`)
          .join(" | ")
      : "none",
  );
  check("weak answer got a follow-up question", fu.length >= 1);
  const words = (x) => new Set(x.toLowerCase().match(/[a-z]+/g));
  const overlap = (x, y) => {
    const A = words(x),
      B = words(y);
    return [...A].filter((w) => B.has(w)).length / Math.min(A.size, B.size);
  };
  if (fu.length >= 2)
    check(
      "second follow-up asks something new (not a repeat)",
      overlap(fu[0].question, fu[1].question) < 0.7,
      `overlap ${overlap(fu[0].question, fu[1].question).toFixed(2)}`,
    );
  else console.log("   (only one follow-up was asked — the AI was satisfied after the first)");
  await page.screenshot({ path: path.join(SP, "ai-3-room.png") });

  // 5. End → AI report + plan
  await clickBtn(page, "End interview");
  await wait(400);
  await timed("report + plan built by AI", async () => {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 240000 }).catch(() => {}),
      clickBtn(page, "Yes, end interview"),
    ]);
  });
  const { data: rep } = await a
    .from("interview_reports")
    .select("*")
    .eq("interview_id", id)
    .maybeSingle();
  const { data: plan } = await a
    .from("improvement_plans")
    .select("*")
    .eq("interview_id", id)
    .maybeSingle();
  check("report created", !!rep, rep ? `overall ${rep.overall_score}` : "none");
  if (rep)
    console.log(
      "   report:",
      JSON.stringify({
        overall: rep.overall_score,
        technical: rep.technical_knowledge,
        communication: rep.communication,
        summary: rep.summary,
        strengths: rep.strengths,
        improvements: rep.improvements,
        skill_scores: rep.skill_scores,
      }),
    );
  check(
    "report has an AI summary, strengths and improvements",
    !!rep?.summary && rep.strengths.length >= 2 && rep.improvements.length >= 2,
  );
  check(
    "5-week plan created",
    Array.isArray(plan?.weeks) && plan.weeks.length === 5,
    plan ? `${plan.weeks.length} weeks` : "none",
  );
  if (plan)
    console.log(
      "   plan weeks:",
      plan.weeks.map((w) => `W${w.week} ${w.title} (${w.hours}h)`).join(" | "),
      "\n   topics:",
      plan.recommended_topics.map((x) => `${x.topic} [${x.priority}]`).join(", "),
    );
  const { data: ivEnd } = await a
    .from("interviews")
    .select("status, overall_score")
    .eq("id", id)
    .single();
  check(
    "interview ended with overall score",
    ivEnd.status === "abandoned" && ivEnd.overall_score === rep?.overall_score,
    JSON.stringify(ivEnd),
  );

  // 6. Screens show it
  await page.goto(`${BASE}/reports/${id}`, { waitUntil: "networkidle0", timeout: 120000 });
  let txt = await body(page);
  check(
    "report page shows score, feedback and plan",
    txt.includes("Overall score") &&
      txt.includes("Strengths") &&
      /personali[sz]ed improvement plan/i.test(txt) &&
      !txt.includes("Evaluation pending\n"),
  );
  await page.screenshot({ path: path.join(SP, "ai-4-report.png"), fullPage: true });
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle0", timeout: 120000 });
  txt = await body(page);
  check("plan page shows the 5-week plan", txt.includes("Week 1") || /week 1/i.test(txt));
  check(
    "Regenerate button is enabled",
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        x.textContent.includes("Regenerate"),
      );
      return !!b && !b.disabled;
    }),
  );
  await page.screenshot({ path: path.join(SP, "ai-5-plan.png"), fullPage: true });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0", timeout: 120000 });
  await page.screenshot({ path: path.join(SP, "ai-6-dashboard.png"), fullPage: true });
} finally {
  await browser.close();
  const files = (await a.storage.from("resumes").list(uid)).data ?? [];
  if (files.length) await a.storage.from("resumes").remove(files.map((f) => `${uid}/${f.name}`));
  await a.auth.admin.deleteUser(uid);
  console.log(
    `\nResult: ${ok} passed, ${bad} failed (temporary user deleted; screenshots in ${SP})`,
  );
}
