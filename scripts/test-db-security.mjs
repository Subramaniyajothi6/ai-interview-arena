// Database security test: row level security, column privileges and storage rules.
// Creates two temporary users, tries allowed and forbidden actions, then deletes them.
// Run: npm run test:db

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SECRET, opts);

let pass = 0,
  fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const stamp = Date.now();
const users = [];
async function makeUser(name) {
  const email = `rls-test-${name}-${stamp}@example.com`;
  // Random per run, so no credential-like value is stored in the repo.
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${name}` },
  });
  if (error) throw error;
  users.push(data.user.id);
  const client = createClient(URL, PUB, opts);
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}

try {
  const a = await makeUser("a");
  const b = await makeUser("b");
  const anon = createClient(URL, PUB, opts);

  // Profiles
  const { data: pa } = await a.client.from("profiles").select("*").eq("id", a.id).single();
  check(
    "Sign-up trigger creates profile with name",
    pa?.full_name === "Test a" && pa?.role === "candidate",
  );
  const { data: pb } = await a.client.from("profiles").select("id").eq("id", b.id);
  check("Candidate cannot read another candidate's profile", pb?.length === 0);
  const { data: allP } = await a.client.from("profiles").select("id");
  check("Candidate sees only 1 profile (own)", allP?.length === 1, `saw ${allP?.length}`);
  const { error: roleErr } = await a.client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", a.id);
  check("Candidate cannot make themselves admin", !!roleErr, roleErr?.message);
  const { error: nameErr } = await a.client
    .from("profiles")
    .update({ phone: "+91 90000 00000" })
    .eq("id", a.id);
  check("Candidate can edit own phone", !nameErr, nameErr?.message);

  // Anonymous
  const { data: anonP, error: anonErr } = await anon.from("profiles").select("id");
  check(
    "Signed-out visitor cannot read profiles",
    !!anonErr || anonP?.length === 0,
    anonErr?.message,
  );
  const { data: anonQ, error: anonQErr } = await anon.from("question_bank").select("id");
  check("Signed-out visitor cannot read question bank", !!anonQErr || anonQ?.length === 0);

  // Question bank
  const { data: qb } = await a.client.from("question_bank").select("id");
  check("Candidate cannot read question bank (answer key)", qb?.length === 0, `saw ${qb?.length}`);
  const { count: qbCount } = await admin
    .from("question_bank")
    .select("*", { count: "exact", head: true });
  check("Question bank seeded", qbCount >= 60, `${qbCount} questions`);
  const { count: skillCount } = await a.client
    .from("skills")
    .select("*", { count: "exact", head: true });
  check("Candidate can read skills list", skillCount >= 40, `${skillCount} skills`);

  // Interviews
  const cfg = {
    job_role: "Frontend Developer",
    experience_level: "fresher",
    interview_type: "technical",
    difficulty: "medium",
  };
  const { data: ia, error: iaErr } = await a.client
    .from("interviews")
    .insert({ ...cfg, user_id: a.id })
    .select()
    .single();
  check("Candidate can create own interview", !!ia && !iaErr, iaErr?.message);
  const { error: forgeErr } = await a.client.from("interviews").insert({ ...cfg, user_id: b.id });
  check("Candidate cannot create interview for someone else", !!forgeErr, forgeErr?.message);
  const { error: statusErr } = await a.client
    .from("interviews")
    .insert({ ...cfg, user_id: a.id, status: "completed" });
  check("Candidate cannot create a pre-completed interview", !!statusErr);
  const { data: upd } = await a.client
    .from("interviews")
    .update({ overall_score: 100 })
    .eq("id", ia.id)
    .select();
  check("Candidate cannot set own score", !upd || upd.length === 0);
  const { data: ib } = await b.client.from("interviews").select("id").eq("id", ia.id);
  check("Other candidate cannot see the interview", ib?.length === 0);

  // Server-written question + hidden expected points
  const { data: q } = await admin
    .from("interview_questions")
    .insert({
      interview_id: ia.id,
      user_id: a.id,
      position: 1,
      question: "What is a hook?",
      source: "ai",
      expected_points: "SECRET",
    })
    .select()
    .single();
  const { data: qa } = await a.client
    .from("interview_questions")
    .select("id, question")
    .eq("id", q.id);
  check("Candidate can read own question text", qa?.length === 1);
  const { error: epErr } = await a.client
    .from("interview_questions")
    .select("expected_points")
    .eq("id", q.id);
  check("Candidate cannot read expected answer points", !!epErr, epErr?.message);
  const { error: ansErr } = await a.client.from("candidate_answers").insert({
    question_id: q.id,
    interview_id: ia.id,
    user_id: a.id,
    answer_text: "x",
  });
  check("Candidate cannot write answers/scores directly", !!ansErr);

  // Storage
  const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
  const { error: upOwn } = await a.client.storage.from("resumes").upload(`${a.id}/cv.pdf`, pdf);
  check("Candidate can upload resume to own folder", !upOwn, upOwn?.message);
  const { error: upOther } = await a.client.storage.from("resumes").upload(`${b.id}/cv.pdf`, pdf);
  check("Candidate cannot upload into another user's folder", !!upOther, upOther?.message);
  const { data: dl } = await b.client.storage.from("resumes").download(`${a.id}/cv.pdf`);
  check("Other candidate cannot download the resume", !dl);
  const exe = new Blob(["MZ"], { type: "application/x-msdownload" });
  const { error: upExe } = await a.client.storage.from("resumes").upload(`${a.id}/bad.exe`, exe);
  check("Bucket rejects non-resume file types", !!upExe, upExe?.message);
  const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: "application/pdf" });
  const { error: upBig } = await a.client.storage.from("resumes").upload(`${a.id}/big.pdf`, big);
  check("Bucket rejects files over 5 MB", !!upBig, upBig?.message);

  // Admin
  await admin.from("profiles").update({ role: "admin" }).eq("id", b.id);
  const { data: bSeesA } = await b.client.from("profiles").select("id").eq("id", a.id);
  check("Admin can read candidate profiles", bSeesA?.length === 1);
  const { data: bQb } = await b.client.from("question_bank").select("id");
  check("Admin can read question bank", bQb?.length >= 60);
  const { data: bIv } = await b.client.from("interviews").select("id").eq("id", ia.id);
  check("Admin can read candidate interviews", bIv?.length === 1);
  const { data: cp } = await b.client.from("candidate_profiles").select("id, skills");
  check(
    "candidate_profiles view works for admin",
    Array.isArray(cp) && cp.some((r) => r.id === a.id),
  );
  const { data: dlAdmin } = await b.client.storage.from("resumes").download(`${a.id}/cv.pdf`);
  check("Admin can download candidate resume", !!dlAdmin);

  await admin.storage.from("resumes").remove([`${a.id}/cv.pdf`]);
} catch (e) {
  fail++;
  console.log("ERROR", e.message ?? e);
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id);
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .like("email", `rls-test-%-${stamp}%`);
  console.log(`\nCleanup: test users deleted (remaining test profiles: ${count ?? 0})`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
}
process.exitCode = fail > 0 ? 1 : 0;
