// End-to-end test against a running app (default http://localhost:3000).
// Creates a temporary candidate and admin, drives every page with real
// sessions, checks access control and security headers, then deletes the
// temporary users and their files.
//
//   npm run dev          (in another terminal)
//   npm run test:e2e     (BASE_URL=https://… to test a deployment)

import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pass = 0;
let fail = 0;
function check(id, name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${name}${detail ? `  — ${detail}` : ""}`);
}

// React inserts <!-- --> between text fragments; strip it before matching.
const plain = (html) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

async function get(path, cookie = "") {
  const r = await fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const text = r.status === 200 ? plain(await r.text()) : "";
  // Redirects issued after a page has started streaming (e.g. below a loading
  // state) arrive as a 200 with a refresh meta tag instead of a 307.
  const meta = text.match(
    /id="__next-page-redirect" http-equiv="refresh" content="\d+;url=([^"]+)"/,
  );
  return {
    status: r.status,
    loc: r.headers.get("location") ?? meta?.[1] ?? "",
    redirected: r.status === 307 || Boolean(meta),
    text,
    headers: r.headers,
  };
}

const stamp = Date.now();
const created = [];

async function makeUser(label, role) {
  const email = `e2e-${label}-${stamp}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${label}` },
  });
  if (error) throw error;
  created.push(data.user.id);
  if (role === "admin")
    await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);

  // Log in exactly as the browser would and capture the session cookies.
  const jar = new Map();
  const sb = createServerClient(URL_, PUB, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (c) =>
        c.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  await sb.auth.signInWithPassword({ email, password });
  return {
    id: data.user.id,
    email,
    password,
    sb,
    cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}

try {
  // ---------------------------------------------------------------- public
  let p = await get("/");
  check(
    "TC-01",
    "Landing page loads",
    p.status === 200 && p.text.includes("Practice interviews that"),
  );
  p = await get("/register");
  check(
    "TC-02",
    "Registration page loads",
    p.status === 200 && p.text.includes("Create your account"),
  );
  p = await get("/login");
  check(
    "TC-03",
    "Login page loads with admin link",
    p.status === 200 && p.text.includes("Welcome back") && p.text.includes("Admin sign in"),
  );
  const h = p.headers;
  check(
    "TC-04",
    "Security headers present",
    h.get("x-frame-options") === "SAMEORIGIN" &&
      h.get("x-content-type-options") === "nosniff" &&
      (h.get("permissions-policy") ?? "").includes("microphone=(self)"),
  );

  // ------------------------------------------------------ unauthorised access
  p = await get("/dashboard");
  check(
    "TC-05",
    "Signed-out user is sent to login",
    p.status === 307 && p.loc.includes("/login?next=%2Fdashboard"),
    p.loc,
  );
  p = await get("/admin/candidates");
  check(
    "TC-06",
    "Signed-out user cannot open admin",
    p.status === 307 && p.loc.includes("/admin/login"),
    p.loc,
  );
  p = await get("/api/admin/candidates/export");
  check("TC-07", "Signed-out user cannot call admin API", p.status === 401);

  // -------------------------------------------------------------- candidate
  const cand = await makeUser("candidate", "candidate");
  const adm = await makeUser("admin", "admin");

  p = await get("/dashboard", cand.cookie);
  check(
    "TC-08",
    "Candidate dashboard shows first-interview guide",
    p.status === 200 &&
      p.text.includes("Welcome back, E2E") &&
      p.text.includes("Take your first mock interview"),
  );
  p = await get("/login", cand.cookie);
  check(
    "TC-09",
    "Signed-in user skips the login page",
    p.status === 307 && p.loc.endsWith("/dashboard"),
    p.loc,
  );
  p = await get("/profile", cand.cookie);
  check(
    "TC-10",
    "Profile page loads read-only with Edit profile",
    p.status === 200 && p.text.includes("Edit profile") && p.text.includes("Change password"),
  );
  p = await get("/history", cand.cookie);
  check("TC-11", "History empty state", p.text.includes("No interviews yet"));
  p = await get("/interview/new", cand.cookie);
  check(
    "TC-12",
    "Interview setup shows every option",
    [
      "0–1 Years",
      "5+ Years",
      "Managerial",
      "Mixed",
      "Expert",
      "Business Development Executive",
    ].every((s) => p.text.includes(s)),
  );

  // Interview created the way the setup form does (RLS as the candidate).
  const { data: iv } = await cand.sb
    .from("interviews")
    .insert({
      user_id: cand.id,
      job_role: "Backend Developer",
      experience_level: "1-3",
      interview_type: "technical",
      difficulty: "medium",
    })
    .select("id")
    .single();
  const forged = await cand.sb.from("interviews").insert({
    user_id: adm.id,
    job_role: "Backend Developer",
    experience_level: "1-3",
    interview_type: "technical",
    difficulty: "medium",
  });
  check("TC-13", "Candidate cannot create an interview for someone else", Boolean(forged.error));

  p = await get(`/interview/${iv.id}/instructions`, cand.cookie);
  check("TC-14", "Cannot skip the resume step", p.redirected && p.loc.includes("/resume"), p.loc);

  // Resume upload: file goes to the candidate's private folder.
  const pdf = new Uint8Array(
    readFileSync(new URL("../tests/fixtures/sample-resume.pdf", import.meta.url)),
  );
  const path = `${cand.id}/${crypto.randomUUID()}.pdf`;
  const up = await cand.sb.storage
    .from("resumes")
    .upload(path, pdf, { contentType: "application/pdf" });
  check("TC-15", "Resume uploads to own private folder", !up.error, up.error?.message);
  const other = await cand.sb.storage
    .from("resumes")
    .upload(`${adm.id}/x.pdf`, pdf, { contentType: "application/pdf" });
  const exe = await cand.sb.storage
    .from("resumes")
    .upload(`${cand.id}/x.exe`, new Uint8Array([0x4d, 0x5a]), {
      contentType: "application/x-msdownload",
    });
  check(
    "TC-16",
    "Upload rejected for other folders and non-resume types",
    Boolean(other.error) && Boolean(exe.error),
  );

  const { data: resume } = await cand.sb
    .from("resumes")
    .insert({
      user_id: cand.id,
      storage_path: path,
      file_name: "sample-resume.pdf",
      file_type: "pdf",
      file_size: pdf.byteLength,
    })
    .select("id")
    .single();
  await admin
    .from("resumes")
    .update({
      status: "analyzed",
      parsed: {
        method: "keyword",
        name: "E2E",
        skills: ["SQL"],
        technologies: ["PostgreSQL"],
        education: ["B.E."],
        experience: [],
        projects: ["Task manager app"],
        certifications: [],
        experience_years: 1,
      },
    })
    .eq("id", resume.id);
  await admin.from("interviews").update({ resume_id: resume.id }).eq("id", iv.id);
  p = await get(`/interview/${iv.id}/resume`, cand.cookie);
  check(
    "TC-17",
    "Resume analysis is shown",
    p.text.includes("Resume analysis") &&
      p.text.includes("PostgreSQL") &&
      p.text.includes("Task manager app"),
  );
  p = await get(`/interview/${iv.id}/instructions`, cand.cookie);
  check(
    "TC-18",
    "Instructions page with microphone check",
    p.status === 200 && p.text.includes("Before you begin") && p.text.includes("Microphone check"),
  );

  // Questions chosen from the bank (what startInterview stores).
  const { data: bank } = await admin
    .from("question_bank")
    .select("id, question, skill, expected_answer")
    .eq("job_role", "Backend Developer")
    .eq("interview_type", "technical")
    .limit(4);
  await admin.from("interview_questions").insert(
    bank.map((q, i) => ({
      interview_id: iv.id,
      user_id: cand.id,
      position: i + 1,
      question: q.question,
      skill: q.skill,
      source: "bank",
      bank_question_id: q.id,
      expected_points: q.expected_answer,
    })),
  );
  await admin
    .from("interviews")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      question_count: bank.length,
    })
    .eq("id", iv.id);

  p = await get(`/interview/${iv.id}/room`, cand.cookie);
  check(
    "TC-19",
    "Interview room shows question 1 with timer and progress",
    p.status === 200 &&
      p.text.includes(`Question 1 of ${bank.length}`) &&
      p.text.includes(bank[0].question) &&
      p.text.includes("Progress"),
  );
  check(
    "TC-20",
    "Expected answers never reach the candidate",
    !p.text.includes(bank[0].expected_answer.slice(0, 40)),
  );
  const leak = await cand.sb
    .from("interview_questions")
    .select("expected_points")
    .eq("interview_id", iv.id);
  check("TC-21", "Candidate cannot query expected answers", Boolean(leak.error));
  const forgedScore = await cand.sb
    .from("candidate_answers")
    .insert({ question_id: bank[0].id, interview_id: iv.id, user_id: cand.id, answer_text: "x" });
  check("TC-22", "Candidate cannot write answers or scores directly", Boolean(forgedScore.error));

  // Answers saved the way submitAnswer does (server, trusted client).
  const { data: qs } = await admin
    .from("interview_questions")
    .select("id, position")
    .eq("interview_id", iv.id)
    .order("position");
  await admin.from("candidate_answers").insert([
    {
      question_id: qs[0].id,
      interview_id: iv.id,
      user_id: cand.id,
      answer_text: "Use EXPLAIN ANALYZE and add the right index.",
      mode: "text",
      skipped: false,
    },
    {
      question_id: qs[1].id,
      interview_id: iv.id,
      user_id: cand.id,
      answer_text: "Voice transcript answer.",
      mode: "voice",
      skipped: false,
    },
    {
      question_id: qs[2].id,
      interview_id: iv.id,
      user_id: cand.id,
      answer_text: "",
      mode: "text",
      skipped: true,
    },
  ]);
  p = await get(`/interview/${iv.id}/room`, cand.cookie);
  check(
    "TC-23",
    "Room advances past answered and skipped questions",
    p.text.includes(`Question 4 of ${bank.length}`),
  );
  await admin.from("candidate_answers").insert({
    question_id: qs[3].id,
    interview_id: iv.id,
    user_id: cand.id,
    answer_text: "Final answer.",
    mode: "text",
    skipped: false,
  });
  await admin
    .from("interviews")
    .update({ status: "completed", ended_at: new Date(Date.now() + 10 * 60000).toISOString() })
    .eq("id", iv.id);

  p = await get(`/interview/${iv.id}/complete`, cand.cookie);
  check(
    "TC-24",
    "Completion page shows answered, skipped and duration",
    p.text.includes("Interview complete") && p.text.includes("3/4") && p.text.includes("Duration"),
  );
  p = await get(`/reports/${iv.id}`, cand.cookie);
  check(
    "TC-25",
    "Report lists answers (evaluation pending until AI is on)",
    p.text.includes("Use EXPLAIN ANALYZE") &&
      p.text.includes("Your answer (voice)") &&
      p.text.includes("Skipped") &&
      p.text.includes("Evaluation pending"),
  );
  p = await get("/history?type=technical", cand.cookie);
  check(
    "TC-26",
    "History lists the interview and filters work",
    p.text.includes("Backend Developer") && p.text.includes("View answers"),
  );
  p = await get("/history?type=hr", cand.cookie);
  check("TC-27", "History filter excludes other types", p.text.includes("No interviews match"));
  p = await get("/dashboard", cand.cookie);
  check(
    "TC-28",
    "Dashboard shows the interview",
    p.text.includes("Recent interviews") && p.text.includes("Backend Developer"),
  );

  // ----------------------------------------------------------- isolation
  const { data: peek } = await adm.sb.from("interviews").select("id").eq("id", iv.id);
  const candPeek = await createClient(URL_, PUB, { auth: { persistSession: false } })
    .from("interviews")
    .select("id")
    .eq("id", iv.id);
  check("TC-29", "Signed-out API call sees no interview data", (candPeek.data ?? []).length === 0);
  check("TC-30", "Admin can read candidate interviews", (peek ?? []).length === 1);

  // ---------------------------------------------------------------- admin
  p = await get("/admin", cand.cookie);
  check(
    "TC-31",
    "Candidate is blocked from admin pages",
    p.status === 307 && p.loc.includes("not_admin"),
    p.loc,
  );
  p = await get("/api/admin/candidates/export", cand.cookie);
  check("TC-32", "Candidate is blocked from admin APIs", p.status === 403);
  p = await get("/dashboard", adm.cookie);
  check(
    "TC-33",
    "Admin is sent from candidate area to admin console",
    p.status === 307 && p.loc.endsWith("/admin"),
    p.loc,
  );
  p = await get("/admin", adm.cookie);
  check(
    "TC-34",
    "Admin dashboard",
    p.status === 200 && p.text.includes("Candidate funnel") && p.text.includes("Needs attention"),
  );
  p = await get(`/admin/candidates?q=${encodeURIComponent("E2E candidate")}`, adm.cookie);
  check(
    "TC-35",
    "Candidate search",
    p.text.includes("E2E candidate") && p.text.includes("Showing 1–1 of 1"),
  );
  p = await get(`/admin/candidates/${cand.id}`, adm.cookie);
  check(
    "TC-36",
    "Candidate detail with resume and history",
    p.text.includes("Candidate profile") &&
      p.text.includes("sample-resume.pdf") &&
      p.text.includes("Backend Developer"),
  );
  p = await get(`/api/admin/resumes/${resume.id}`, adm.cookie);
  check(
    "TC-37",
    "Admin opens resume via short-lived signed link",
    p.status === 307 && p.loc.includes("/object/sign/resumes/"),
  );
  p = await get("/api/admin/candidates/export?q=e2e", adm.cookie);
  check(
    "TC-38",
    "CSV export",
    p.status === 200 &&
      (p.headers.get("content-type") ?? "").includes("text/csv") &&
      p.text.includes("E2E candidate"),
  );
  p = await get(`/admin/interviews/${iv.id}`, adm.cookie);
  check(
    "TC-39",
    "Interview detail shows answers and expected answers",
    p.text.includes("Use EXPLAIN ANALYZE") && p.text.includes("Expected answer (admin only)"),
  );
  p = await get("/admin/questions?type=managerial", adm.cookie);
  check("TC-40", "Question bank with filters", p.status === 200 && p.text.includes("Managerial"));
  const ins = await adm.sb
    .from("question_bank")
    .insert({
      question: "E2E temporary question?",
      skill: "Testing",
      difficulty: "easy",
      interview_type: "technical",
      expected_answer: "Anything sensible.",
      created_by: adm.id,
    })
    .select("id")
    .single();
  const upd = await adm.sb
    .from("question_bank")
    .update({ skill: "QA" })
    .eq("id", ins.data?.id)
    .select("skill")
    .single();
  const del = await adm.sb.from("question_bank").delete().eq("id", ins.data?.id).select("id");
  const candIns = await cand.sb.from("question_bank").insert({
    question: "Hack?",
    skill: "x",
    difficulty: "easy",
    interview_type: "hr",
    expected_answer: "nothing at all",
  });
  check(
    "TC-41",
    "Admin adds, edits and deletes questions; candidates cannot",
    !ins.error && upd.data?.skill === "QA" && del.data?.length === 1 && Boolean(candIns.error),
  );
  p = await get(`/admin/reports?id=${iv.id}`, adm.cookie);
  check(
    "TC-42",
    "Admin reports page",
    p.text.includes("Evaluation pending") && p.text.includes("Download"),
  );
  p = await get("/admin/analytics?period=all", adm.cookie);
  check(
    "TC-43",
    "Analytics page",
    p.text.includes("Score distribution") && p.text.includes("Completion rate"),
  );
  p = await get("/admin/settings", adm.cookie);
  check(
    "TC-44",
    "Settings page",
    p.text.includes("Interview defaults") &&
      p.text.includes("AI service") &&
      p.text.includes("Admin accounts"),
  );

  // Disable / re-enable (what setCandidateStatus does).
  await admin.from("profiles").update({ status: "disabled" }).eq("id", cand.id);
  await admin.auth.admin.updateUserById(cand.id, { ban_duration: "876000h" });
  const banned = await createClient(URL_, PUB, {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email: cand.email, password: cand.password });
  await admin.auth.admin.updateUserById(cand.id, { ban_duration: "none" });
  await admin.from("profiles").update({ status: "active" }).eq("id", cand.id);
  check("TC-45", "Disabled candidate cannot sign in", Boolean(banned.error), banned.error?.message);

  p = await get("/this-page-does-not-exist", cand.cookie);
  check(
    "TC-46",
    "Unknown page shows friendly 404",
    p.status === 404 || p.text.includes("Page not found"),
  );

  // An auth cookie that no longer holds a valid session = expired session.
  const ref = new URL(URL_).hostname.split(".")[0];
  p = await get("/history", `sb-${ref}-auth-token=base64-eyJleHBpcmVkIjp0cnVlfQ`);
  check(
    "TC-47",
    "Expired session goes to login with a notice",
    p.status === 307 && p.loc.includes("/login?error=session_expired&next=%2Fhistory"),
    p.loc,
  );
  p = await get("/login?error=session_expired");
  check(
    "TC-48",
    "Login explains that the session expired",
    p.text.includes("Your session has expired"),
  );

  p = await get("/", cand.cookie);
  check(
    "TC-49",
    "Home page shows the signed-in account's dashboard link",
    p.text.includes("Go to dashboard") && p.text.includes("Log out"),
  );
  const sw = await fetch(`${BASE}/sw.js`);
  const offline = await fetch(`${BASE}/offline.html`).then((r) => r.text());
  check(
    "TC-50",
    "Offline page and service worker are served",
    sw.status === 200 &&
      (sw.headers.get("cache-control") ?? "").includes("no-store") &&
      offline.includes("No internet connection"),
  );
} catch (e) {
  fail++;
  console.log("ERROR", e?.message ?? e);
} finally {
  // Clean up: storage files first, then users (profile rows cascade).
  for (const id of created) {
    const { data: files } = await admin.storage.from("resumes").list(id);
    if (files?.length)
      await admin.storage.from("resumes").remove(files.map((f) => `${id}/${f.name}`));
    await admin.auth.admin.deleteUser(id);
  }
  console.log(`\nCleanup: ${created.length} temporary users deleted`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  process.exitCode = fail > 0 ? 1 : 0;
}
