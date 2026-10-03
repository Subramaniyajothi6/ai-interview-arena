// Browser test of the sign-in lockout: 5 wrong passwords per email in 15 minutes,
// then refused (even with the right password, on the admin login too, any letter
// case); other users unaffected; a successful sign-in clears the count; the
// attempts table is not readable with the browser key. Temporary accounts and
// their attempts are deleted at the end.
//
// Run with the app running:  npm run test:lockout   (BASE_URL for a deployment)
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const BASE = process.env.BASE_URL || "http://localhost:3000";
const mk = async (l) => {
  const email = `lock-${l}-${Date.now()}@example.com`,
    pw = crypto.randomUUID() + "Aa1!";
  const { data } = await admin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    user_metadata: { full_name: `Lock ${l}` },
  });
  return { id: data.user.id, email, pw };
};
const victim = await mk("victim"),
  other = await mk("other");
let ok = 0,
  bad = 0;
const check = (n, c, d = "") => {
  if (c) ok++;
  else bad++;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`);
};
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
async function attempt(path, email, pw) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "networkidle0", timeout: 60000 });
  await p.type("#email", email);
  await p.type("#password", pw);
  await Promise.all([
    p.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }).catch(() => {}),
    p.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 400));
  const msg = await p
    .$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).join(" | "))
    .catch(() => "");
  const url = p.url().replace(BASE, "");
  await ctx.close();
  return { msg, url };
}
try {
  const msgs = [];
  for (let i = 1; i <= 5; i++)
    msgs.push((await attempt("/login", victim.email, "wrong-password-1")).msg);
  check(
    "wrong passwords 1–5 → 'Incorrect email or password.'",
    msgs.every((m) => m.includes("Incorrect email or password.")),
    msgs.join(" / "),
  );
  const sixth = await attempt("/login", victim.email, "wrong-password-1");
  check(
    "6th attempt → refused with the wait time",
    /Too many sign-in attempts\. Please wait 1[45] minutes/.test(sixth.msg),
    sixth.msg,
  );
  const right = await attempt("/login", victim.email, victim.pw);
  check(
    "correct password while locked → still refused, not signed in",
    right.url.startsWith("/login") && right.msg.includes("Too many"),
    `${right.url} · ${right.msg}`,
  );
  const adm = await attempt("/admin/login", victim.email, victim.pw);
  check("admin login for the same email → also locked", adm.msg.includes("Too many"), adm.msg);
  const caps = await attempt("/login", victim.email.toUpperCase(), victim.pw);
  check("same email in capitals → also locked", caps.msg.includes("Too many"), caps.msg);
  const fine = await attempt("/login", other.email, other.pw);
  check("another user signs in normally", fine.url === "/dashboard", fine.url);
  // success clears the count: 2 wrong, then right, then the count is gone
  await attempt("/login", other.email, "nope-1");
  await attempt("/login", other.email, "nope-2");
  const before = (
    await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", other.email)
  ).count;
  const ok2 = await attempt("/login", other.email, other.pw);
  const after = (
    await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", other.email)
  ).count;
  check(
    "successful sign-in clears that email's failed attempts",
    ok2.url === "/dashboard" && before === 2 && after === 0,
    `before ${before}, after ${after}`,
  );
  const { data: anon, error: anonErr } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
    .from("login_attempts")
    .select("*")
    .limit(1);
  check(
    "the attempts table can't be read from the browser key",
    !!anonErr || (anon ?? []).length === 0,
    anonErr?.message ?? `${anon?.length} rows`,
  );
} finally {
  await browser.close();
  await admin.from("login_attempts").delete().in("email", [victim.email, other.email]);
  await admin.auth.admin.deleteUser(victim.id);
  await admin.auth.admin.deleteUser(other.id);
  console.log(`\nResult: ${ok} passed, ${bad} failed (temporary users and their attempts deleted)`);
}
