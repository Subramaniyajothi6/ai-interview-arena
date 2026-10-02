// Browser test of every form field and validation message (headless Chrome).
// Uses temporary accounts that are deleted at the end, never submits a valid
// registration or reset-email request (those send real emails), and checks
// that invalid admin saves leave the real settings unchanged.
//
// Run with the app running:  npm run test:forms
// Options: BASE_URL (default http://localhost:3000), CHROME_PATH.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";

const PROJECT = process.cwd();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "aia-forms-"));
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

// ---------------------------------------------------------------- helpers
const results = [];
let pass = 0;
let fail = 0;
function check(area, name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  results.push(
    `${ok ? "PASS" : "FAIL"}  ${area.padEnd(14)} ${name}${!ok && detail ? `  — got: ${detail}` : ""}`,
  );
}
const stamp = Date.now();
const users = [];
async function makeUser(label, role) {
  const email = `forms-${label}-${stamp}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Forms ${label}` },
  });
  if (error) throw error;
  users.push(data.user.id);
  if (role === "admin")
    await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  return { id: data.user.id, email, password };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(page, url) {
  await page.goto(BASE + url, { waitUntil: "networkidle0", timeout: 120000 });
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 60000 })
    .catch(() => {});
}
async function fill(page, sel, value) {
  await page.$eval(sel, (el) => {
    el.value = "";
  });
  await page.focus(sel);
  if (value) await page.keyboard.type(value, { delay: 0 });
}
async function setValue(page, sel, value) {
  // For long text: set through React's value setter, then fire input.
  await page.$eval(
    sel,
    (el, v) => {
      const proto =
        el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );
}
async function clickText(page, text, tag = "button") {
  const handles = await page.$$(tag);
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent.trim());
    const visible = await h.evaluate((el) => !!el.getClientRects().length);
    if (t === text && visible) {
      await h.click();
      return true;
    }
  }
  throw new Error(`no ${tag} "${text}"`);
}
async function settle(page, ms = 1500) {
  await wait(300);
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 30000 }).catch(() => {});
  await wait(ms);
}
// Click the first visible submit button (optionally inside `scope`).
const submit = (page, scope = "") =>
  page.evaluate((scope) => {
    const btn = [...document.querySelectorAll(`${scope} button[type="submit"]`)].find(
      (b) => b.getClientRects().length,
    );
    if (!btn) throw new Error("no visible submit button");
    btn.click();
  }, scope);
const err = (page, id) => page.$eval(`#${id}-error`, (el) => el.textContent.trim()).catch(() => "");
const alertText = (page) =>
  page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).join(" | "));
const statusText = (page) =>
  page.$$eval('[role="status"]', (els) => els.map((e) => e.textContent.trim()).join(" | "));
const body = (page) => page.evaluate(() => document.body.innerText);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
});

async function login(page, user, url = "/login") {
  await go(page, url);
  await fill(page, "#email", user.email);
  await fill(page, "#password", user.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
    submit(page),
  ]);
  await settle(page, 500);
}

try {
  const cand = await makeUser("candidate");
  const adm = await makeUser("admin", "admin");

  // ======================================================== REGISTER
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await go(page, "/register");
    await submit(page);
    await settle(page);
    check(
      "Register",
      "empty name → 'Enter your full name.'",
      (await err(page, "fullName")) === "Enter your full name.",
      await err(page, "fullName"),
    );
    check(
      "Register",
      "empty email → 'Enter a valid email address.'",
      (await err(page, "email")) === "Enter a valid email address.",
      await err(page, "email"),
    );
    check(
      "Register",
      "empty password → at least 8 characters",
      (await err(page, "password")).includes("at least 8"),
      await err(page, "password"),
    );
    check(
      "Register",
      "terms unticked → must agree",
      (await body(page)).includes("You must agree to the Terms"),
      "",
    );

    await fill(page, "#fullName", "A");
    await fill(page, "#email", "not-an-email");
    await fill(page, "#password", "short");
    await fill(page, "#confirmPassword", "different1");
    await submit(page);
    await settle(page);
    check(
      "Register",
      "1-letter name rejected",
      (await err(page, "fullName")) === "Enter your full name.",
      await err(page, "fullName"),
    );
    check(
      "Register",
      "bad email format rejected",
      (await err(page, "email")) === "Enter a valid email address.",
      await err(page, "email"),
    );
    check(
      "Register",
      "7-char password rejected",
      (await err(page, "password")).includes("at least 8"),
      await err(page, "password"),
    );

    await fill(page, "#fullName", "Priya Raman");
    await fill(page, "#email", `  ${cand.email.toUpperCase()}  `);
    await fill(page, "#password", "longenough1");
    await fill(page, "#confirmPassword", "longenough2");
    await submit(page);
    await settle(page);
    check(
      "Register",
      "passwords must match",
      (await err(page, "confirmPassword")) === "Passwords do not match.",
      await err(page, "confirmPassword"),
    );
    check(
      "Register",
      "email with spaces/capitals accepted (trimmed)",
      (await err(page, "email")) === "",
      await err(page, "email"),
    );
    check(
      "Register",
      "typed name kept after an error",
      (await page.$eval("#fullName", (e) => e.value)) === "Priya Raman",
    );
    const long = "x".repeat(73);
    await fill(page, "#password", long);
    await fill(page, "#confirmPassword", long);
    await submit(page);
    await settle(page);
    check(
      "Register",
      "73-char password rejected (max 72)",
      (await err(page, "password")).includes("at most 72"),
      await err(page, "password"),
    );
    await page.close();
  }

  // ======================================================== LOGIN
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await go(page, "/login");
    await submit(page);
    await settle(page);
    check(
      "Login",
      "empty email → error",
      (await err(page, "email")) === "Enter a valid email address.",
      await err(page, "email"),
    );
    check(
      "Login",
      "empty password → 'Enter your password.'",
      (await err(page, "password")) === "Enter your password.",
      await err(page, "password"),
    );
    await fill(page, "#email", cand.email);
    await fill(page, "#password", "wrong-password");
    await submit(page);
    await settle(page);
    check(
      "Login",
      "wrong password → 'Incorrect email or password.'",
      (await alertText(page)).includes("Incorrect email or password."),
      await alertText(page),
    );
    check(
      "Login",
      "email kept after wrong password",
      (await page.$eval("#email", (e) => e.value)) === cand.email,
    );
    await page.click('a[href="/forgot-password"]');
    await settle(page, 500);
    const cardOpen = await page.$("#forgot-email");
    check("Login", "Forgot password? opens the reset card", !!cardOpen);
    if (cardOpen) {
      await submit(page, 'form[aria-labelledby="forgot-title"]');
      await settle(page);
      check(
        "Login",
        "reset card: empty email → error",
        (await err(page, "forgot-email")) === "Enter a valid email address.",
        await err(page, "forgot-email"),
      );
    }
    await fill(page, "#password", cand.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      submit(page, "form:not([aria-labelledby])"),
    ]);
    await settle(page, 500);
    check("Login", "correct login → dashboard", page.url().endsWith("/dashboard"), page.url());
    await page.close();
  }

  // ======================================================== FORGOT PASSWORD page
  {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await go(page, "/forgot-password");
    await submit(page);
    await settle(page);
    check(
      "Forgot pwd",
      "empty email → error",
      (await err(page, "email")) === "Enter a valid email address.",
      await err(page, "email"),
    );
    await fill(page, "#email", "bad@");
    await submit(page);
    await settle(page);
    check(
      "Forgot pwd",
      "bad email → error",
      (await err(page, "email")) === "Enter a valid email address.",
      await err(page, "email"),
    );
    await page.close();
  }

  // ======================================================== ADMIN LOGIN
  {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await go(page, "/admin/login");
    await submit(page);
    await settle(page);
    check(
      "Admin login",
      "empty fields → errors",
      (await err(page, "email")) !== "" && (await err(page, "password")) !== "",
      `${await err(page, "email")} / ${await err(page, "password")}`,
    );
    await fill(page, "#email", cand.email);
    await fill(page, "#password", cand.password);
    await submit(page);
    await settle(page);
    const t = (await alertText(page)) + (await body(page));
    check(
      "Admin login",
      "candidate account refused",
      t.includes("does not have administrator access"),
      (await alertText(page)).slice(0, 80),
    );
    await page.close();
  }

  // ======================================================== SESSION ENDED ELSEWHERE
  {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const other = await makeUser("elsewhere");
    await login(page, other);
    // Another device signs this user out everywhere.
    const remote = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } },
    );
    await remote.auth.signInWithPassword({ email: other.email, password: other.password });
    await remote.auth.signOut({ scope: "global" });
    let loop = false;
    try {
      await go(page, "/dashboard");
    } catch (e) {
      loop = /TOO_MANY_REDIRECTS/.test(e.message);
    }
    check("Session", "ended elsewhere → no redirect loop", !loop);
    check(
      "Session",
      "lands on login with 'session has expired'",
      page.url().includes("/login") && (await body(page)).includes("Your session has expired"),
      page.url(),
    );
    try {
      await go(page, "/login");
    } catch {
      loop = true;
    }
    check(
      "Session",
      "login page then opens normally",
      !loop && page.url().endsWith("/login"),
      page.url(),
    );
  }

  // ======================================================== CANDIDATE (signed in)
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await login(page, cand);

  // ---- Reset password (signed in)
  await go(page, "/reset-password");
  await fill(page, "#password", "short");
  await fill(page, "#confirmPassword", "short");
  await submit(page);
  await settle(page);
  check(
    "Reset pwd",
    "short password rejected",
    (await err(page, "password")).includes("at least 8"),
    await err(page, "password"),
  );
  await fill(page, "#password", "newpassword1");
  await fill(page, "#confirmPassword", "newpassword2");
  await submit(page);
  await settle(page);
  check(
    "Reset pwd",
    "mismatch rejected",
    (await err(page, "confirmPassword")) === "Passwords do not match.",
    await err(page, "confirmPassword"),
  );

  // ---- Profile
  await go(page, "/profile");
  check(
    "Profile",
    "fields locked until Edit profile",
    await page.$eval("#fullName", (e) => e.matches(":disabled")),
  );
  await clickText(page, "Edit profile");
  await wait(300);
  check(
    "Profile",
    "Edit profile unlocks fields",
    !(await page.$eval("#fullName", (e) => e.matches(":disabled"))),
  );
  await fill(page, "#fullName", "");
  await fill(page, "#phone", "abc");
  await setValue(page, "#education", "e".repeat(301));
  await setValue(page, "#experienceSummary", "x".repeat(301));
  await clickText(page, "Save changes");
  await settle(page);
  check(
    "Profile",
    "empty name → 'Enter your full name.'",
    (await err(page, "fullName")) === "Enter your full name.",
    await err(page, "fullName"),
  );
  check(
    "Profile",
    "phone 'abc' → 'Enter a valid phone number.'",
    (await err(page, "phone")) === "Enter a valid phone number.",
    await err(page, "phone"),
  );
  check(
    "Profile",
    "education over 300 chars rejected",
    (await err(page, "education")) === "At most 300 characters.",
    await err(page, "education"),
  );
  check(
    "Profile",
    "experience over 300 chars rejected",
    (await err(page, "experienceSummary")) === "At most 300 characters.",
    await err(page, "experienceSummary"),
  );
  check(
    "Profile",
    "stays in edit mode after an error",
    !(await page.$eval("#fullName", (e) => e.matches(":disabled"))),
  );
  await clickText(page, "Cancel");
  await wait(300);
  check(
    "Profile",
    "Cancel restores saved name and locks",
    (await page.$eval("#fullName", (e) => e.value)) === "Forms candidate" &&
      (await page.$eval("#fullName", (e) => e.matches(":disabled"))),
    await page.$eval("#fullName", (e) => e.value),
  );
  await clickText(page, "Edit profile");
  await fill(page, "#fullName", "Forms Candidate Two");
  await fill(page, "#phone", "+91 98765 43210");
  await setValue(page, "#education", "B.E. Computer Science");
  await setValue(page, "#experienceSummary", "Intern, 6 months");
  await page.select("#preferredRole", "Backend Developer");
  await clickText(page, "Save changes");
  await settle(page);
  check(
    "Profile",
    "valid save → 'Profile saved.' and locks",
    (await statusText(page)).includes("Profile saved.") &&
      (await page.$eval("#fullName", (e) => e.matches(":disabled"))),
    await statusText(page),
  );
  await go(page, "/profile");
  check(
    "Profile",
    "saved values still there after reload",
    (await page.$eval("#phone", (e) => e.value)) === "+91 98765 43210" &&
      (await page.$eval("#preferredRole", (e) => e.value)) === "Backend Developer",
  );

  // ---- Skills
  check(
    "Skills",
    "+ Add skill hidden until Edit profile",
    !(await body(page)).includes("+ Add skill"),
  );
  await clickText(page, "Edit profile");
  await clickText(page, "+ Add skill");
  await wait(300);
  const addSkill = async (v) => {
    await fill(page, "#new-skill", v);
    await clickText(page, "Add");
    await settle(page, 1000);
    return page.$eval("#skill-error", (e) => e.textContent.trim()).catch(() => "");
  };
  check("Skills", "empty skill → 'Enter a skill.'", (await addSkill("")) === "Enter a skill.");
  check(
    "Skills",
    "'<script>' rejected",
    (await addSkill("<script>")) === "Use letters, numbers and simple symbols only.",
  );
  check(
    "Skills",
    "61 characters rejected",
    (await addSkill("a".repeat(61))) === "At most 60 characters.",
  );
  await addSkill(`Formsskill ${stamp}`);
  check(
    "Skills",
    "valid skill added as a chip",
    (await body(page)).includes(`Formsskill ${stamp}`),
  );

  // ---- Photo
  fs.writeFileSync(path.join(TMP, "doc.pdf"), "%PDF-1.4 test");
  fs.writeFileSync(path.join(TMP, "big.png"), Buffer.alloc(2 * 1024 * 1024 + 10, 1));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(path.join(TMP, "ok.png"), png);
  const photo = async (file) => {
    const input = await page.$('input[aria-label="Choose a profile photo"]');
    await input.uploadFile(path.join(TMP, file));
    await settle(page, 2500);
    return page.$$eval('[role="alert"]', (els) => els.map((e) => e.textContent.trim()).join(" | "));
  };
  check(
    "Photo",
    "PDF rejected",
    (await photo("doc.pdf")).includes("Use a JPG, PNG or WebP image."),
  );
  check("Photo", "over 2 MB rejected", (await photo("big.png")).includes("2 MB or smaller"));
  await photo("ok.png");
  const hasAvatar = await page.$$eval("img", (imgs) =>
    imgs.some((i) => i.src.includes("/avatars/")),
  );
  check("Photo", "valid PNG becomes the profile photo", hasAvatar);

  // ---- Interview setup
  await go(page, "/interview/new");
  check(
    "Setup",
    "defaults pre-selected (role, level, type, difficulty)",
    await page.evaluate(
      () =>
        ["experienceLevel", "interviewType", "difficulty"].every((n) =>
          document.querySelector(`input[name="${n}"]:checked`),
        ) && !!document.querySelector("#jobRole").value,
    ),
  );
  await page
    .click('input[name="interviewType"][value="hr"]', { offset: { x: 1, y: 1 } })
    .catch(async () => {
      await page.evaluate(() =>
        document.querySelector('input[name="interviewType"][value="hr"]').closest("label").click(),
      );
    });
  await wait(200);
  check("Setup", "summary follows the chosen type", (await body(page)).match(/Type\s*HR/) !== null);
  await page.evaluate(() =>
    document
      .querySelector('input[name="interviewType"][value="technical"]')
      .closest("label")
      .click(),
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
    clickText(page, "Continue"),
  ]);
  await settle(page, 500);
  check(
    "Setup",
    "Continue creates the interview → resume step",
    /\/interview\/[0-9a-f-]{36}\/resume$/.test(page.url()),
    page.url(),
  );
  const ivUrl = page.url().replace(/\/resume$/, "");

  // ---- Resume
  fs.writeFileSync(path.join(TMP, "notes.txt"), "hello");
  fs.writeFileSync(path.join(TMP, "empty.pdf"), "");
  fs.writeFileSync(
    path.join(TMP, "big.pdf"),
    Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(5 * 1024 * 1024 + 10, 32)]),
  );
  fs.writeFileSync(path.join(TMP, "fake.pdf"), "This is not really a PDF file at all.");
  const resume = async (file) => {
    const input = await page.waitForSelector("#resume-file", { timeout: 60000 }).catch(async (e) => {
      await page.screenshot({ path: path.join(os.tmpdir(), "aia-forms-resume.png"), fullPage: true });
      console.log("DEBUG url:", page.url(), "| text:", (await body(page)).slice(0, 600));
      throw e;
    });
    await input.uploadFile(file);
    await settle(page, 3000);
    return alertText(page);
  };
  check(
    "Resume",
    ".txt rejected",
    (await resume(path.join(TMP, "notes.txt"))).includes("Upload a PDF, DOC or DOCX file."),
  );
  check(
    "Resume",
    "empty file rejected",
    (await resume(path.join(TMP, "empty.pdf"))).includes("The file is empty."),
  );
  check(
    "Resume",
    "over 5 MB rejected",
    (await resume(path.join(TMP, "big.pdf"))).includes("larger than 5 MB"),
  );
  const fake = await resume(path.join(TMP, "fake.pdf"));
  check(
    "Resume",
    "renamed non-PDF rejected by content check",
    fake.length > 0 && !fake.includes("Complete"),
    fake,
  );
  await resume(path.join(PROJECT, "tests/fixtures/sample-resume.pdf"));
  await settle(page, 4000);
  check(
    "Resume",
    "real PDF analysed (skills shown)",
    (await body(page)).includes("Complete") && (await body(page)).includes("SKILLS"),
    "",
  );

  // ---- Instructions
  await go(page, `${ivUrl.replace(BASE, "")}/instructions`);
  const startDisabled = await page.evaluate(
    () =>
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Start interview"),
      )?.disabled,
  );
  check("Instructions", "Start disabled until the box is ticked", startDisabled === true);
  await page.evaluate(() => document.querySelector('input[type="checkbox"]').click());
  await wait(300);
  const startEnabled = await page.evaluate(
    () =>
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Start interview"),
      )?.disabled,
  );
  check("Instructions", "ticking the box enables Start", startEnabled === false);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {}),
    clickText(page, "Start interview"),
  ]);
  await settle(page, 1500);
  check("Instructions", "Start opens the interview room", page.url().endsWith("/room"), page.url());

  // ---- Room
  const submitDisabled = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll("button")]
          .filter((b) => b.getClientRects().length)
          .find((b) => b.textContent.includes("Submit answer"))?.disabled,
    );
  check("Room", "Submit disabled while the answer is empty", (await submitDisabled()) === true);
  await fill(page, "#answer", "   ");
  check("Room", "Submit disabled for spaces only", (await submitDisabled()) === true);
  check(
    "Room",
    "answer box limited to 10,000 characters",
    (await page.$eval("#answer", (e) => e.maxLength)) === 10000,
  );
  const firstQ = await page.$eval("h1", (e) => e.textContent);
  await fill(
    page,
    "#answer",
    "Closures keep access to variables from the scope where they were created.",
  );
  check("Room", "word count updates", (await body(page)).includes("12 words"));
  await clickText(page, "Submit answer");
  await settle(page, 2500);
  check(
    "Room",
    "valid answer moves to the next question",
    (await page.$eval("h1", (e) => e.textContent)) !== firstQ,
  );
  await clickText(page, "Skip question");
  await settle(page, 2500);
  check("Room", "Skip moves on and is listed as skipped", (await body(page)).includes("Skipped"));
  await page.close();

  // ======================================================== ADMIN (signed in)
  const ap = await (await browser.createBrowserContext()).newPage();
  await ap.setViewport({ width: 1280, height: 900 });
  await login(ap, adm, "/admin/login");
  check("Admin login", "admin account → admin console", ap.url().endsWith("/admin"), ap.url());

  // ---- Question bank
  await go(ap, "/admin/questions?new=1");
  await ap.$eval("#question", (e) => e.closest("form").requestSubmit());
  await settle(ap);
  check(
    "Questions",
    "empty question → 'Enter the question.'",
    (await err(ap, "question")) === "Enter the question." ||
      (await body(ap)).includes("Enter the question."),
  );
  check("Questions", "empty skill → 'Enter a skill.'", (await body(ap)).includes("Enter a skill."));
  check(
    "Questions",
    "empty expected answer → explained",
    (await body(ap)).includes("Describe what a good answer covers."),
  );

  // ---- Settings (only invalid values are submitted; real settings never change)
  await go(ap, "/admin/settings");
  const saveSettings = async (sel, v) => {
    await setValue(ap, sel, v);
    await clickText(ap, "Save settings");
    await settle(ap);
    return body(ap);
  };
  const settingsBefore = await admin.from("app_settings").select("*").eq("id", 1).single();
  const qpi = await ap.$('input[name="questionsPerInterview"]');
  if (qpi) {
    check(
      "Settings",
      "blank questions → 'Enter a number.'",
      (await saveSettings('input[name="questionsPerInterview"]', "")).includes("Enter a number."),
    );
    check(
      "Settings",
      "20 questions → 'At most 15.'",
      (await saveSettings('input[name="questionsPerInterview"]', "20")).includes("At most 15."),
    );
    check(
      "Settings",
      "2.5 → 'Use a whole number.'",
      (await saveSettings('input[name="questionsPerInterview"]', "2.5")).includes(
        "Use a whole number.",
      ),
    );
    await go(ap, "/admin/settings");
    check(
      "Settings",
      "6 MB resume limit → 'At most 5 MB.'",
      (await saveSettings('input[name="maxResumeMb"]', "6")).includes("At most 5 MB."),
    );
  } else check("Settings", "settings inputs found", false);
  const settingsAfter = await admin.from("app_settings").select("*").eq("id", 1).single();
  check(
    "Settings",
    "invalid saves didn't change the real settings",
    JSON.stringify(settingsBefore.data) === JSON.stringify(settingsAfter.data),
  );

  // ---- Invite admin
  await go(ap, "/admin/settings");
  await clickText(ap, "Invite admin");
  await wait(300);
  const invite = async (v) => {
    await fill(ap, "#email", v);
    await ap.$eval("#email", (e) => e.closest("form").requestSubmit());
    await settle(ap);
    return body(ap);
  };
  check(
    "Invite admin",
    "bad email → 'Enter a valid email address.'",
    (await invite("nope")).includes("Enter a valid email address."),
  );
  check(
    "Invite admin",
    "unknown email → 'No account uses this email'",
    (await invite(`nobody-${stamp}@example.com`)).includes("No account uses this email"),
  );

  // ---- Candidate search with filter characters
  await go(ap, `/admin/candidates?q=${encodeURIComponent("a),role.eq.admin%*")}`);
  check(
    "Search",
    "special characters in search don't break the page",
    !(await body(ap)).includes("Something went wrong"),
  );
  await ap.close();
} catch (e) {
  fail++;
  results.push(`ERROR ${e.stack ?? e}`);
} finally {
  await browser.close();
  for (const id of users) {
    const { data } = await admin.storage.from("avatars").list(id);
    if (data?.length)
      await admin.storage.from("avatars").remove(data.map((f) => `${id}/${f.name}`));
    const { data: r } = await admin.storage.from("resumes").list(id);
    if (r?.length) await admin.storage.from("resumes").remove(r.map((f) => `${id}/${f.name}`));
    await admin.auth.admin.deleteUser(id);
  }
  // Skills created by the test (shared list).
  await admin
    .from("skills")
    .delete()
    .eq("name", `Formsskill ${stamp}`)
    .then(
      () => {},
      () => {},
    );
}
results.push(`\nResult: ${pass} passed, ${fail} failed (temporary users deleted)`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(results.join("\n"));
if (fail) process.exitCode = 1;
