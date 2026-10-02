// Browser test of the job-description step: paste/upload, resume comparison,
// gap-first questions, the report's Job match section, the skip path, the
// phone layout and the admin view. Uses temporary accounts deleted at the end.
//
// Run with the app running:  npm run test:job
// Options: BASE_URL (default http://localhost:3000), CHROME_PATH.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SP = fs.mkdtempSync(path.join(os.tmpdir(), "aia-job-"));
const CHROME =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((p) => fs.existsSync(p));
if (!CHROME)
  throw new Error("Chrome not found. Set CHROME_PATH to your Chrome or Edge executable.");
const PW = crypto.randomUUID() + "Aa1!",
  t = Date.now();
const mk = async (email, name) =>
  (
    await a.auth.admin.createUser({
      email,
      password: PW,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
  ).data.user.id;
const candEmail = `jd-cand-${t}@example.com`,
  admEmail = `jd-adm-${t}@example.com`;
const cand = await mk(candEmail, "Jd Candidate"),
  adm = await mk(admEmail, "Jd Admin");
await a.from("profiles").update({ role: "admin" }).eq("id", adm);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0,
  bad = 0;
const check = (n, c, d = "") => {
  if (c) ok++;
  else bad++;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${!c && d ? "  — " + d : ""}`);
};
const clickBtn = (page, text) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll("button,a")].find(
      (b) => b.textContent.trim() === text && b.getClientRects().length,
    );
    if (!b) throw new Error("no button " + text);
    b.click();
  }, text);
const body = (page) => page.evaluate(() => document.body.innerText);

function makePdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = lines
    .map((l, i) => `BT /F1 11 Tf 56 ${780 - i * 18} Td (${esc(l)}) Tj ET`)
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

// A setup-stage interview with an analysed resume (React, JavaScript, HTML, CSS, Git).
async function makeInterview() {
  const { data: resume } = await a
    .from("resumes")
    .insert({
      user_id: cand,
      storage_path: `${cand}/${crypto.randomUUID()}.pdf`,
      file_name: "Resume.pdf",
      file_type: "pdf",
      file_size: 1000,
      status: "analyzed",
      raw_text: "x",
      parsed: {
        method: "keyword",
        name: "Jd Candidate",
        skills: ["React", "JavaScript"],
        technologies: ["HTML", "CSS", "Git"],
        education: [],
        experience: [],
        projects: ["Shop App - React storefront"],
        certifications: [],
        experience_years: 1,
      },
    })
    .select("id")
    .single();
  const { data: iv } = await a
    .from("interviews")
    .insert({
      user_id: cand,
      resume_id: resume.id,
      job_role: "Frontend Developer",
      experience_level: "0-1",
      interview_type: "technical",
      difficulty: "medium",
      status: "setup",
      question_count: 8,
    })
    .select("id")
    .single();
  return iv.id;
}
const JD =
  "We are hiring a Frontend Developer to build our dashboard. Requirements: strong React and TypeScript, experience calling REST APIs, writing tests, deploying with Docker and working with Node.js. Nice to have: AWS and SQL.";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.goto(BASE + "/login", { waitUntil: "networkidle0", timeout: 120000 });
  await page.type("#email", candEmail);
  await page.type("#password", PW);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  // ---------- 1. JD step: paste + compare
  const iv1 = await makeInterview();
  await page.goto(`${BASE}/interview/${iv1}/resume`, {
    waitUntil: "networkidle0",
    timeout: 120000,
  });
  const contHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .find((x) => x.textContent.trim() === "Continue")
      ?.getAttribute("href"),
  );
  check("resume step Continue goes to the job step", contHref?.endsWith("/job"), contHref);
  await page.goto(`${BASE}/interview/${iv1}/job`, { waitUntil: "networkidle0", timeout: 120000 });
  const steps = await page.$$eval(
    'ol[aria-label="Progress"] li[aria-current], ol[aria-label="Progress"] li span.rounded-full',
    (els) => els.length,
  );
  check(
    "stepper has 5 steps with 'Job description' current",
    (
      await page.$eval('ol[aria-label="Progress"] li[aria-current="step"]', (e) => e.textContent)
    ).includes("Job description") && steps >= 5,
  );
  check(
    "Compare disabled while empty",
    await page.evaluate(
      () =>
        [...document.querySelectorAll("button")].find((b) =>
          b.textContent.includes("Compare with resume"),
        )?.disabled,
    ),
  );
  await page.type("#jobDescription", "too short");
  await clickBtn(page, "Compare with resume");
  await wait(2500);
  check("short text → error", (await body(page)).includes("Paste the job description first"));
  await page.$eval("#jobDescription", (e) => {
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    set.call(e, "");
    e.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.type("#jobDescription", JD);
  await clickBtn(page, "Compare with resume");
  await wait(3000);
  let txt = await body(page);
  const { data: saved1 } = await a
    .from("interviews")
    .select("job_description, job_match")
    .eq("id", iv1)
    .single();
  check(
    "analysis saved on the interview",
    saved1.job_description === JD && Array.isArray(saved1.job_match?.gaps),
    JSON.stringify(saved1.job_match),
  );
  console.log("   job_match:", JSON.stringify(saved1.job_match));
  check("match % shown", /\d+%/.test(txt) && txt.includes("Match with your resume"));
  check(
    "gaps listed (TypeScript, Docker)",
    /skills to work on/i.test(txt) && txt.includes("TypeScript") && txt.includes("Docker"),
  );
  check("matched listed (React)", /already on your resume/i.test(txt) && txt.includes("React"));
  check(
    "Continue appears after comparing",
    await page.evaluate(() =>
      [...document.querySelectorAll("a")].some((x) => x.textContent.trim() === "Continue"),
    ),
  );
  await page.screenshot({ path: `${SP}/jd-desktop.png`, fullPage: true });
  // edit → stale
  await page.type("#jobDescription", " Also GraphQL.");
  txt = await body(page);
  check(
    "editing makes the result stale ('Compare again')",
    txt.includes("Compare again") && txt.includes("You changed the job description"),
  );

  // ---------- 2. upload a PDF job description
  const pdfPath = `${SP}/jd-sample.pdf`;
  fs.writeFileSync(
    pdfPath,
    makePdf([
      "Job: Frontend Developer",
      "Requirements: React, TypeScript, Docker, Python and SQL.",
      "You will build dashboards and REST APIs for our customers.",
    ]),
  );
  const input = await page.$('input[type="file"]');
  await input.uploadFile(pdfPath);
  await wait(5000);
  const boxText = await page.$eval("#jobDescription", (e) => e.value);
  txt = await body(page);
  check("PDF upload fills the text box", boxText.includes("Python"), boxText.slice(0, 80));
  check(
    "PDF upload runs the comparison",
    /skills to work on/i.test(txt) && txt.includes("Python") && txt.includes("Continue"),
  );
  fs.writeFileSync(`${SP}/not-a-jd.txt`, "hello");
  await input.uploadFile(`${SP}/not-a-jd.txt`);
  await wait(800);
  check(".txt upload rejected", (await body(page)).includes("Upload a PDF, DOC or DOCX file."));

  // ---------- 3. instructions + room
  await clickBtn(page, "Continue");
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
  await wait(800);
  txt = await body(page);
  check(
    "instructions: stepper at 'Instructions' (step 4)",
    (
      await page.$eval('ol[aria-label="Progress"] li[aria-current="step"]', (e) => e.textContent)
    ).includes("Instructions"),
  );
  check(
    "instructions mention the skill gaps",
    txt.includes("Starts with the skills this job needs"),
  );
  const backHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .find((x) => x.textContent.trim() === "Back")
      ?.getAttribute("href"),
  );
  check("instructions Back goes to the job step", backHref?.endsWith("/job"), backHref);
  await page.click('input[type="checkbox"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 }).catch(() => {}),
    clickBtn(page, "Start interview"),
  ]);
  await wait(1500);
  const { data: qs } = await a
    .from("interview_questions")
    .select("position, source, skill, question")
    .eq("interview_id", iv1)
    .order("position");
  console.log("   questions:", qs.map((q) => `${q.position}:${q.source}:${q.skill}`).join(" | "));
  const gapQs = qs.filter((q) => q.source === "gap");
  const { data: m1 } = await a.from("interviews").select("job_match").eq("id", iv1).single();
  const gapsList = m1.job_match.gaps;
  check(
    "gap questions fill the interview (as many as possible)",
    gapQs.length >= Math.min(gapsList.length, qs.length - 1),
    `${gapQs.length} gap of ${qs.length}; gaps=${gapsList.length}`,
  );
  check(
    "every gap skill gets at least one question (when slots allow)",
    gapsList
      .slice(0, qs.length - 1)
      .every((g) => gapQs.some((q) => (q.skill ?? "").toLowerCase() === g.toLowerCase())),
    gapsList.join(","),
  );
  // The bank planner opens with a gap question; the AI planner may open with
  // the resume project question as a warm-up.
  check(
    "a gap question comes first or second",
    qs.slice(0, 2).some((q) => q.source === "gap"),
  );
  check(
    "resume project question still included",
    qs.some((q) => q.source === "resume"),
  );
  txt = await body(page);
  check(
    "room labels gap questions",
    txt.includes("Skill gap from the job description") || /Gap/.test(txt),
  );
  await page.screenshot({ path: `${SP}/jd-room.png` });
  // answer one, skip one, end
  await page.type("textarea", "My answer about this skill gap.");
  await clickBtn(page, "Submit answer");
  await wait(3500);
  await clickBtn(page, "Skip question");
  await wait(3500);
  await clickBtn(page, "End interview");
  await wait(500);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {}),
    clickBtn(page, "Yes, end interview"),
  ]);
  await wait(1500);

  // ---------- 4. report
  await page.goto(`${BASE}/reports/${iv1}`, { waitUntil: "networkidle0", timeout: 120000 });
  txt = await body(page);
  check(
    "report has a Job match section",
    txt.includes("Job match") && /skill gaps practised/i.test(txt),
  );
  check(
    "report shows per-gap outcomes (answered / skipped / not reached)",
    /Answered|Skipped/.test(txt) && /Not reached|Not asked/.test(txt),
  );
  check("report labels gap questions 'Skill gap'", txt.includes("Skill gap"));
  check("report suggests what to learn next", txt.includes("What to learn next"));
  await page.screenshot({ path: `${SP}/jd-report.png`, fullPage: true });
  await page.emulateMediaType("print");
  txt = await body(page);
  check(
    "print view includes Job match row and section",
    txt.includes("Job match") && /\d+% · \d+ skill gap/.test(txt),
  );
  await page.emulateMediaType("screen");

  // ---------- 5. skip path
  const iv2 = await makeInterview();
  await page.goto(`${BASE}/interview/${iv2}/job`, { waitUntil: "networkidle0", timeout: 120000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {}),
    clickBtn(page, "Skip"),
  ]);
  await wait(1000);
  check(
    "Skip goes to instructions",
    page.url().endsWith(`/interview/${iv2}/instructions`),
    page.url(),
  );
  check(
    "no gap note without a job description",
    !(await body(page)).includes("Starts with the skills this job needs"),
  );
  await page.click('input[type="checkbox"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 }).catch(() => {}),
    clickBtn(page, "Start interview"),
  ]);
  await wait(1500);
  const { data: qs2 } = await a
    .from("interview_questions")
    .select("source")
    .eq("interview_id", iv2);
  check(
    "skipped JD → no gap questions",
    qs2.length > 0 && !qs2.some((q) => q.source === "gap"),
    qs2.map((q) => q.source).join(","),
  );
  await page.goto(`${BASE}/reports/${iv2}`, { waitUntil: "networkidle0", timeout: 120000 });
  check(
    "report without JD has no Job match section",
    !/skill gaps practised/i.test(await body(page)),
  );

  // ---------- 6. phone layout of the job step
  const iv3 = await makeInterview();
  const ph = await browser.newPage();
  await ph.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
  const cookies = await page.cookies();
  await ph.setCookie(...cookies);
  await a
    .from("interviews")
    .update({ job_description: JD, job_match: saved1.job_match })
    .eq("id", iv3);
  await ph.goto(`${BASE}/interview/${iv3}/job`, { waitUntil: "networkidle0", timeout: 120000 });
  const overflow = await ph.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  check(
    "phone (375px): no sideways scroll on the job step",
    overflow <= 0,
    `overflow ${overflow}px`,
  );
  await ph.screenshot({ path: `${SP}/jd-phone.png`, fullPage: true });
  await ph.close();

  // ---------- 7. admin view
  const ctx = await browser.createBrowserContext();
  const ap = await ctx.newPage();
  await ap.setViewport({ width: 1280, height: 900 });
  await ap.goto(BASE + "/admin/login", { waitUntil: "networkidle0", timeout: 120000 });
  await ap.type("#email", admEmail);
  await ap.type("#password", PW);
  await Promise.all([
    ap.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }).catch(() => {}),
    ap.click('button[type="submit"]'),
  ]);
  await ap.goto(`${BASE}/admin/interviews/${iv1}`, { waitUntil: "networkidle0", timeout: 120000 });
  txt = await body(ap);
  check(
    "admin: job description card with match and gaps",
    txt.includes("Job description") && txt.includes("Resume match") && txt.includes("Gap: "),
  );
  check("admin: gap questions labelled", txt.includes("Skill gap (job description)"));
  await ctx.close();
} finally {
  await browser.close();
  await a.auth.admin.deleteUser(cand);
  await a.auth.admin.deleteUser(adm);
  console.log(
    `\nResult: ${ok} passed, ${bad} failed (temporary users deleted; screenshots in ${SP})`,
  );
  if (bad) process.exitCode = 1;
}
