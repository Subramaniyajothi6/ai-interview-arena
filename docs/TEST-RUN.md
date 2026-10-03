# Full-flow manual test run

A step-by-step walk through the whole app as a real user, recording what passed, what failed, why,
and how each problem is fixed. Automated suites are described in [TESTING.md](./TESTING.md).

| | |
|---|---|
| Started | 2026-10-02 |
| Environment | `npm run dev` on localhost:3000 (A–C5), then production https://ai-interview-arena-mu.vercel.app (from 2026-10-02 evening); same Supabase project `ai-interview-arena` |
| Browser | Chrome, desktop + DevTools device emulation |
| AI | Off (questions from the bank, keyword resume analysis, "Evaluation pending" reports) |

**Result key:** ✅ Pass · ❌ Fail · 🔧 Fixed (failed, then fixed and re-tested) · ⏸️ Blocked (needs an earlier step) · ⬜ Not run yet

**Issue status:** Open · Fixing · Fixed – awaiting re-test · Closed · Won't fix

---

## Summary

| Part | Steps | ✅ | ❌ / 🔧 | ⏸️ | ⬜ |
|---|---|---|---|---|---|
| A. New candidate | 5 sections | 4 (A2–A5) | 0 (1 fixed) | 0 | 1 (A1) |
| B. An interview | 6 sections | 6 (all) | 0 (2 fixed) | 0 | 0 |
| C. Admin | 7 sections | 7 (all) | 0 (2 fixed) | 0 | 0 |
| D. Edge cases | 7 cases | 7 (all; D1 after fix) | 0 | 0 | 0 |
| E. Different data | 25 checks | 0 | 0 | 0 | 25 |
| F. Job description | 11 checks | 0 | 0 | 0 | 11 |
| G. AI | 14 checks | 14 local + 14 production | 0 | 0 | 0 |

Open issues: **0** · Fixed, awaiting re-test: **0** · Closed: **7**

---

## Sample data

`scripts/seed-sample.mjs` fills one candidate account so every screen can be checked with
different data. Re-running replaces the previous sample (everything the account owns is deleted
first; name and photo are kept). Admin accounts are refused.

```bash
npm run seed:sample -- sample@gmail.com --scenario=rich    # realistic history (default)
npm run seed:sample -- sample@gmail.com --scenario=edge    # extremes
npm run seed:sample -- sample@gmail.com --scenario=empty   # brand-new account
```

| Scenario | What it creates | Use it for |
|---|---|---|
| `rich` | 8 interviews over 6 weeks: 6 completed with reports (scores 52 → 61 → 58 → 71 → 66 → 79), every interview type, 1 ended early, 1 in progress (3 of 8 answered); skipped and voice answers; follow-up questions; resume (real PDF); 7 skills; filled profile; 5-week improvement plan | Part E1, B6, C2–C4 with plenty of data |
| `edge` | Scores 0, 3 and 100; 15 questions all skipped; very long answers, feedback and resume entries; max follow-ups; ended with no answers; interviews in setup and ready; empty strengths/plan lists; 6-week plan; 16 skills; long profile text | Part E2 — layout and empty-list handling |
| `empty` | Nothing (profile fields cleared) | A4 (empty dashboard), A5, Part B from scratch |

Seeded scores are sample values standing in for AI estimates (`model = "sample-data"`).
Currently loaded on `sample@gmail.com`: **rich** (2026-10-02).

---

## Part A: New candidate

### A1. Home page

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Open localhost:3000 while logged out | "Log in" and "Get started" at the top | ⬜ | |

### A2. Register

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Click Get started, click Create account with everything empty | Red message under each field, plus one about the Terms | ✅ | |
| 2 | Fill name, email, password (8+), confirm password, tick Terms | Fields accept input | ✅ | |
| 3 | Click Create account | Green "We sent a confirmation link to …" | ✅ (after fix) | [#1](#1--sign-up-shows-a-generic-error) — re-tested on production with Gmail SMTP |

### A3. Confirm the email

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Open the email, click the link | Logged in, on the Dashboard | ✅ | Production: email arrived, link opened the live Dashboard |

### A4. Empty dashboard

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Look at the greeting | Shows your first name | ✅ | |
| 2 | Look for the getting-started guide | "Take your first mock interview" appears | ✅ | |
| 3 | Look at the chart cards | Each shows a message instead of being blank | ✅ | |
| 4 | Open the bell | Nothing new | ✅ | |

### A5. Profile

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Open Profile | Every field is greyed out (read-only) | ✅ | |
| 2 | Edit profile → fill phone, preferred role, education, experience | Fields become editable | ✅ | |
| 3 | Add 2 skills with + Add skill | Both skills appear | ✅ | |
| 4 | Change photo → pick a small JPG/PNG | Photo preview updates | ✅ | |
| 5 | Save changes | "Profile saved.", fields lock again | ✅ | |
| 6 | Look at the header | Photo shows top-right | ✅ | |
| 7 | Reload the page | Everything is still there | ✅ | |

---

## Part B: An interview

### B1. Setup

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | New Interview → choose role, experience, Technical, Easy | Summary panel updates with each choice | ✅ | |
| 2 | Continue | Goes to the Resume step | ✅ | |

### B2. Resume

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Upload a .txt file | "Upload a PDF, DOC or DOCX file." | ✅ | |
| 2 | Upload a real resume (PDF or DOCX) | "Resume analysis" shows skills, education, experience, projects; main line of each entry in bold | ✅ | |
| 3 | Continue | Goes to Instructions | ✅ | |

### B3. Instructions

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Look at Start interview | Disabled until "I've read the instructions" is ticked | ✅ | |
| 2 | Tick it, Start interview | Interview room opens | ✅ | |

### B4. Interview room

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Look at the room | "Question 1 of 8", running timer, progress list on the right | ✅ | |
| 2 | Empty answer box | Submit answer disabled | ✅ | |
| 3 | Type an answer to Q1, submit | Next question, green "Answered" strip above it | ✅ | |
| 4 | Skip Q2 | Right-hand list marks it "Skipped" | ✅ | |
| 5 | Voice tab → mic → allow microphone → speak | Words appear in "Live transcript" and can be edited | ✅ | |
| 6 | Type without submitting, reload | Typed text is still there | ✅ | |
| 7 | DevTools → Network → Offline, click Submit answer | Offline banner, text stays | ✅ | |
| 8 | Back online | Answer goes through by itself | ✅ | |
| 9 | Answer the rest, or End interview → confirm | Goes to Interview complete | ✅ (after fix) | [#2](#2--end-interview-does-nothing-when-the-page-is-scrolled) |

### B5. Complete and report

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Look at Interview complete | Answered count, skipped count, time taken | ✅ | |
| 2 | Review your answers | Every question with its Type, "Evaluation pending", time taken | ✅ (after fix) | [#3](#3--report-has-no-time-taken-and-download-prints-the-whole-app-page) |
| 3 | Click "Your answer" under a question | Answer opens; skipped says Skipped, ended early says Incomplete | ✅ | |
| 4 | Download | Print preview shows a clean report: header + every question and answer | ✅ (after fix) | [#3](#3--report-has-no-time-taken-and-download-prints-the-whole-app-page) |

### B6. After the interview

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Dashboard | Total interviews 1, Completed 1, listed under Recent interviews | ✅ | |
| 2 | History, then type filter = HR | Listed; HR filter hides it | ✅ | |
| 3 | Bell | Orange dot; "… interview completed" | ✅ | |
| 4 | Improvement Plan | "Your personalised plan starts with an interview" (expected while AI is off) | ✅ | |

---

## Part C: Admin

### C1. Admin login

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Log out, open /admin/login, use the candidate account | "This account does not have administrator access." | ✅ | |
| 2 | Log in with the admin account | Admin dashboard | ✅ | |

### C2. Dashboard

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Look at the numbers | Include the new candidate and interview | ✅ | |

### C3. Candidates

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Search for your name | Candidate appears | ✅ | |
| 2 | Open the candidate | Profile, skills, resume (opens the file), interview | ✅ | |
| 3 | Export CSV | CSV file downloads | ✅ | |

### C4. Interviews

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Open your interview | Every question shows the answer; "Expected answer (admin only)" opens | ✅ | |
| 2 | Final interview report card | Button only when a report exists; otherwise explains why | ✅ (after fix) | [#4](#4--admin-view-final-report-goes-in-a-circle-when-there-is-no-report) |

### C5. Question bank

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Add question → save empty | Errors under each field | ✅ (after fix, production) | [#5](#5--a-failed-save-wipes-what-was-typed-question-bank-also-settings-and-profile) |
| 2 | Fill in properly, save | Appears in the list | ✅ (after fix, production) | [#5](#5--a-failed-save-wipes-what-was-typed-question-bank-also-settings-and-profile) |
| 3 | Edit, save again | Changes shown | ✅ | |
| 4 | Delete it | Removed from the list | ✅ | |

### C6. Settings

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Clear "Questions per interview", Save settings | "Enter a number." | ✅ | Production, 2026-10-03 |
| 2 | Put back 8, save | "Settings saved." | ✅ | Production, 2026-10-03 |
| 3 | Turn Allow voice answers off, save; start a new interview as the candidate | Voice tab is gone | ✅ | Production, 2026-10-03 |
| 4 | Turn the setting back on | Voice tab returns | ✅ | Production, 2026-10-03 |

### C7. Disable an account

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Disable account; log in as the candidate in a private window | "This account has been disabled…" | ✅ | Production, 2026-10-03 (temporary test candidate) |
| 2 | Enable account | Candidate can log in again | ✅ | Production, 2026-10-03 (temporary test candidate) |

---

## Part D: Edge cases

| # | Case | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Wrong password 5+ times quickly | Eventually "Too many sign-in attempts…" | ✅ (after fix) | [#7](#7--no-lockout-after-repeated-wrong-passwords) — was never blocked; fixed: 6th wrong password refused (localhost and production, `npm run test:lockout`) |
| 2 | Session ended elsewhere: log in in two browsers, change password in one (Forgot password → email link), reload the other | "Your session has expired", no endless redirect | ✅ | Production: all sessions revoked elsewhere → /login?error=session_expired, 2 navigations, no loop |
| 3 | Remember me unticked | Logged out after closing Chrome, or after 12 h at most | ✅ | Production: unticked → signed out after fully closing and reopening Chrome (same profile), and after the 12 h deadline; ticked → still signed in after reopening (400-day cookies) |
| 4 | Open /xyz | Friendly 404 page | ✅ | Production: 404 "Page not found" |
| 5 | Open another user's report ID as the candidate | 404 page, not their data | ✅ | Production: report, room and complete pages show the 404 page and none of the other user's data (status 200 because the page streams; noindex set) |
| 6 | DevTools Offline → F5, then back online | "No internet connection" page; reloads by itself | ✅ | Checked by the user in a real browser, 2026-10-03 |
| 7 | Ctrl+Shift+M → iPhone: dashboard, room, report | Match the mobile designs, no sideways scroll | ✅ | Production at 390 px: dashboard, room, report, plan, history — no sideways scroll |

---

## Part E: Different data (sample data)

### E1. Rich history (`--scenario=rich`)

| # | Screen | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Dashboard tiles | Total 8, Completed 6, average and best (79) scores, change "+13 vs last interview" | ⬜ | |
| 2 | Dashboard charts | Trend line shows the rise and dips; criteria, skills and interview-type cards filled | ⬜ | |
| 3 | Dashboard recent list | In-progress interview offers Resume; abandoned one shown as ended early | ⬜ | |
| 4 | Resume card | "Sample_Resume.pdf · Analysed · 8 skills found" | ⬜ | |
| 5 | History | 8 rows; filters by type / status / role narrow the list; criterion averages shown | ⬜ | |
| 6 | Latest report (79) | Scores per question, follow-ups labelled 2a / 2b / 5a, feedback, skill scores, "+13 vs last interview", plan preview | ⬜ | |
| 7 | Older report with skips | Skipped questions say "Skipped", no score | ⬜ | |
| 8 | Abandoned interview | Opens sensibly (no report, answered questions kept) | ⬜ | |
| 9 | Resume the in-progress interview | Room opens at question 4 of 8, earlier answers marked | ⬜ | |
| 10 | Improvement Plan | 5 weeks, topics with priorities, practice questions, 2 projects with "Builds:", tips | ⬜ | |
| 11 | Bell | Several notifications, newest first | ⬜ | |
| 12 | Profile | Phone, role, education, experience, 7 skills, resume shown | ⬜ | |
| 13 | Admin: candidate detail | Profile, skills, resume opens as a PDF, 8 interviews | ⬜ | |
| 14 | Admin: dashboard / analytics / reports | Numbers include the sample interviews | ⬜ | |
| 15 | Phone width (iPhone) | Dashboard, report and plan fit with no sideways scroll | ⬜ | |

### E2. Extremes (`--scenario=edge`)

| # | Screen | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | Report with score 0, 15 questions all skipped | No crash; every row "Skipped"; empty strengths / improvements handled | ⬜ | |
| 2 | Report with score 100 and very long answers | Long text wraps or collapses; score ring shows 100 | ⬜ | |
| 3 | Report with 2 follow-ups on two questions | Labels 1a / 1b / 3a / 3b in order | ⬜ | |
| 4 | Plan with empty lists (score-0 report) | Sensible empty states, no blank cards | ⬜ | |
| 5 | Plan with 6 weeks and long titles | Timeline wraps, no overflow | ⬜ | |
| 6 | Interview ended with no answers | Opens without errors | ⬜ | |
| 7 | Interviews in setup / ready | Recent list links continue setup / open instructions | ⬜ | |
| 8 | Profile with 16 skills and long text | Wraps; no overflow at 375 px | ⬜ | |
| 9 | Dashboard and history with these extremes | Charts handle 0 and 100; no overflow | ⬜ | |
| 10 | Admin candidate detail and interview detail | Long text and 15 questions render | ⬜ | |

---

## Part F: Job description (added 2026-10-02)

Automated: `npm run test:job` — 33/33 passed locally. Manual checks below are for the live site.

| # | Step | Expected | Result | Issue |
|---|---|---|---|---|
| 1 | New interview → setup → resume → Continue | Step 3 "Job description (optional)" opens; stepper shows 5 steps | ⬜ | |
| 2 | Click Compare with resume with a few words only | "Paste the job description first…" | ⬜ | |
| 3 | Paste a real job post → Compare with resume | Match %, "Skills to work on", "Already on your resume"; Continue appears | ⬜ | |
| 4 | Edit the text | Result marked out of date; button becomes "Compare again" | ⬜ | |
| 5 | Upload a job description PDF/DOCX | Text fills the box and the comparison runs; a .txt is rejected | ⬜ | |
| 6 | Continue → Instructions | "Starts with the skills this job needs" lists the gaps | ⬜ | |
| 7 | Start interview | First questions are on the gap skills, labelled "Skill gap from the job description" | ⬜ | |
| 8 | Finish or end → report | "Job match" section: each gap with Answered / Skipped / Not reached, "What to learn next"; gap questions labelled "Skill gap"; Download includes it | ⬜ | |
| 9 | New interview → Job description → Skip | Instructions without the gap note; normal questions; no Job match on the report | ⬜ | |
| 10 | Admin → Interviews → that interview | Job description card (match %, gaps, full text); questions labelled "Skill gap (job description)" | ⬜ | |
| 11 | Phone width | Job step fits with no sideways scroll; after comparing, the page scrolls to the result | ⬜ | |

---

## Part G: AI (open-source gpt-oss via Groq, added 2026-10-03)

Automated: `npm run test:ai` — 18/18 passed locally. Manual checks below: first on localhost, then production.

| # | Step | Expected | Local | Production | Issue |
|---|---|---|---|---|---|
| 1 | Admin → Settings → AI service | "Open-source AI model: Connected — Groq · openai/gpt-oss-120b"; Provider = Open-source AI model | ✅ | ✅ | |
| 2 | New interview → upload your real resume | Analysis fills in within ~10 s and says "Read by AI"; entries look right | ✅ | ✅ | |
| 3 | Paste a real job post → Compare with resume | Sensible gaps and matched skills (not only exact keywords) | ✅ | ✅ | |
| 4 | Start interview | Questions fit your resume, the role and the gaps; one about a resume project | ✅ | ✅ | |
| 5 | Give one good, detailed answer | Next question within a few seconds | ✅ | ✅ | |
| 6 | Give one short, vague answer | A follow-up (e.g. Q2a) appears asking for the missing detail | ✅ | ✅ | |
| 7 | Answer by voice once | Transcript is scored like typed text | ✅ | ✅ | |
| 8 | Finish all questions (or End interview) | Report within ~10 s: overall score, 7 criteria, strengths, improvements, feedback per question | ✅ | ✅ | |
| 9 | Report → scores make sense | Good answer clearly higher than the vague one; feedback refers to what you said | ✅ | ✅ | |
| 10 | Improvement Plan | 5 weeks, topics with priorities, practice questions, 2 projects, tips — aimed at your gaps | ✅ | ✅ | |
| 11 | Plan → Regenerate | New plan appears after a few seconds | ✅ | ✅ | |
| 12 | Dashboard / History | Score, charts and "Where you stand" fill in from the new report | ✅ | ✅ | |
| 13 | Admin → Interviews → that interview | Scores, AI feedback, follow-ups and expected answers shown | ✅ | ✅ | |
| 14 | Admin → Settings → Allow AI follow-ups off → new interview with vague answers | No follow-ups; turn it back on afterwards | ✅ | ✅ | |

---

## Issues

Each issue: where it happened, what was expected, what actually happened, the root cause, the fix,
and how it was re-tested.

### #1 — Sign-up shows a generic error

| | |
|---|---|
| Found at | A2 step 3 (Create account) · also blocks A3 and D2 |
| Severity | Major — blocks sign-up; would hit real users after deploy |
| Status | **Closed** — 2026-10-02: Gmail SMTP configured, Confirm email on, real sign-up on production received the email and the link opened the live Dashboard |
| Screen | Mobile emulation (549 px), Chrome DevTools |

**Expected:** green "We sent a confirmation link to …".

**Actual:** red "We couldn't create your account. Please try again."

**Root cause:** Supabase's built-in email sender only allows a few emails per hour. Once that limit
was used up, `signUp` returned `over_email_send_rate_limit` (HTTP 429). The register action only
recognised "already exists" and "weak password", so everything else fell through to the generic
message. Forgot password had the same blind spot and showed "a reset link is on its way" even when
nothing was sent.

**Fix:**

1. Done — `signUpErrorMessage()` in `src/lib/validation/auth.ts` turns Supabase error codes into
   clear messages (email limit, already exists, weak password, unusable address). Register now says
   "We've sent too many emails in the last hour. Please wait a while and try again."
2. Done — Forgot password reports the email limit too (the limit applies to every address, so this
   reveals nothing about which accounts exist).
3. Done — unit tests for the new messages (`tests/unit/validation.test.ts`).
4. To do before deploy — connect a custom SMTP sender (e.g. Resend) in Supabase → Authentication →
   Emails → SMTP Settings, which removes the few-emails-per-hour cap.

**Workaround while testing:** turn off "Confirm email" in Supabase (Authentication → Sign In /
Providers → Email). Sign-up then logs straight in to the Dashboard (no green message, skip A3).
Turn it back on afterwards.

**Re-test:** after the limit resets (or with SMTP connected), register a new email → green
confirmation message → A3 link works. Then mark A2.3, A3 and D2 accordingly.

---

### #2 — End interview does nothing when the page is scrolled

| | |
|---|---|
| Found at | B4 step 9 (End interview) |
| Severity | Major — the candidate can't end an interview early |
| Status | **Closed** — re-tested by the user 2026-10-02, works |
| Screen | Mobile emulation 549 × 546 (also desktop when the page scrolls) |

**Expected:** clicking End interview shows "End the interview now?" with Keep going / Yes, end interview.

**Actual:** nothing seemed to happen; the interview stayed in progress.

**Root cause:** the confirm bar was placed in the page *below* the sticky header, so it opened at the
top of the page. Once the page was scrolled (easy on a short screen), the bar opened off-screen —
reproduced in headless Chrome: page scrolled 228 px, bar drawn 228 px above the visible area.
A second, hidden weakness: `endInterview` ignored a failed database update and redirected anyway,
which would have bounced the user straight back to the room with no message.

**Fix:**

1. The confirm bar now sits inside the sticky header, so it is always on screen, and focus moves to
   "Yes, end interview" (keyboard and screen-reader users land on it).
2. Errors while ending are shown inside the confirm bar instead of further down the page.
3. `endInterview` (`src/app/(focus)/interview/[id]/room/actions.ts`) returns an error if the update
   fails, instead of redirecting.

**Verified:** headless Chrome with the page scrolled down, at 549 × 546 (phone) and 1280 × 600
(desktop): bar in view, focus on the confirm button, lands on /complete, interview saved as ended
(`abandoned`).

**Re-test:** in the room, scroll down, click End / End interview → confirm bar visible → Yes →
"Interview ended" page.

---

### #3 — Report has no time taken, and Download prints the whole app page

| | |
|---|---|
| Found at | B5 steps 2 and 4 (report, Download) |
| Severity | Minor — information missing; printout not usable as a report |
| Status | **Closed** — re-tested by the user 2026-10-02 (hard refresh needed once to drop the old bottom nav) |

**Expected:** the report shows how long the interview took; Download gives a clean report of the
questions and answers.

**Actual:** time taken was only on the "Interview complete" screen. Download printed the screen as
it looked: sidebar, header, bottom nav, buttons, and answers hidden inside collapsed "Your answer"
sections.

**Root cause:** the report didn't load `started_at` / `ended_at`; the page had no print layout
(only a few buttons were marked `print:hidden`).

**Fix:**

1. Report header now shows a ⏱ time-taken chip and "N/M answered · K skipped".
   Shared `formatDuration()` in `src/lib/format.ts` (also used by the complete page; m:ss, h:mm:ss
   past an hour) with unit tests.
2. Print layout (browser print / Save as PDF — no extra library):
   - Candidate sidebar, header and bottom nav are hidden when printing.
   - A print-only header: candidate name, role, experience, interview type and difficulty, date,
     time taken, questions answered/skipped, status, overall score (or "Evaluation pending").
   - "Questions and answers": every question (with follow-ups as Q2a, Q2b), its skill, the full
     answer (text/voice) or "Skipped" / "Not answered", plus score and feedback when available.
     Each question avoids being split across pages.
   - Score, criteria, strengths/improvements and plan preview still print when a report exists.

**Verified:** headless Chrome print preview (A4) for an interview without AI scores and for a
scored sample report — no app navigation, header and full answers present.

**Re-test:** open a report → time chip visible → Download → print preview shows the clean report.

---

### #4 — Admin "View final report" goes in a circle when there is no report

| | |
|---|---|
| Found at | C4 (admin interview detail) |
| Severity | Minor — confusing navigation, no data problem |
| Status | **Closed** — re-tested by the user 2026-10-02 |

**Expected:** the button leads somewhere useful.

**Actual:** for an interview without a report, the card said "The report is generated once AI
evaluation is enabled" but still showed **View final report**. It opened Reports, which only said
"Evaluation pending" with **Open full interview** — back to the page you came from.
The candidate detail page did the same: **View report** for every finished interview.

**Root cause:** both links were shown based on the interview being finished, not on a report
existing.

**Fix:**

1. Admin interview detail: **View final report** only when a report exists. Otherwise the card
   explains why there is none (finished → "created once AI evaluation is enabled; the answers
   above are the full record for now"; not finished → "created when the candidate finishes and AI
   evaluation is enabled").
2. Admin candidate detail: **View report** only when a report exists; otherwise **Open** goes to the
   interview's questions and answers.
3. The Reports page itself is unchanged: it still lists unscored interviews with "—" and a link to
   the full answers, which is useful to an admin.

**Verified:** headless Chrome as a temporary admin — scored interview shows the button; ended-early
and in-progress interviews show the explanation with no button; candidate detail links switch
between View report and Open.

**Re-test:** open your interview in admin → no button, explanation shown. Open a `sample@gmail.com`
scored interview → View final report works.

---

### #5 — A failed save wipes what was typed (question bank, also settings and profile)

| | |
|---|---|
| Found at | C5 (Add question) · same weakness in C6 (settings) and A5 (profile) |
| Severity | Major — the question could not be added in practice; edits were silently lost |
| Status | **Closed** — re-tested by the user on production 2026-10-02 |

**Expected:** if a field is invalid, show the error and keep everything else that was typed.

**Actual:** after a save with any invalid field (e.g. an expected answer under 10 characters), every
field went blank and only the error message stayed — so it looked like the form "did something" and
nothing was added (no question was saved). Dropdowns (role, type, difficulty) jumped back to their
first values, so a retry could save the wrong role/type/difficulty. Settings and profile reverted
to the saved values, silently dropping the other edits.

**Root cause:** React 19 resets a form after its action finishes. The auth forms send the typed
values back so the fields refill; the question, settings and profile forms didn't. Dropdowns also
reset to the defaults they were first drawn with, even when their default value changes later.

**Fix:**

1. `saveQuestion`, `saveSettings` (`src/app/admin/(console)/actions.ts`) and `updateProfile`
   (`src/app/(candidate)/profile/actions.ts`) return what was submitted whenever the save fails.
2. The three forms refill from those values and are re-drawn after a failed save (a `key` based on
   the submitted values), so dropdowns, checkboxes and text all show what was entered.
3. Profile **Cancel** still goes back to the saved values and clears the error.

**Verified (headless Chrome, 28/28):** question — empty save shows 3 errors; invalid save keeps the
question, skill, role, type, difficulty and expected answer (also on a repeated failed save); valid
save stores the chosen values, edit and delete work. Settings — blank number shows "Enter a number."
and keeps the toggle, AI-provider and resume-limit edits; database unchanged. Profile — blank name
keeps the other edits (including the role dropdown); Cancel restores saved values; valid save works.
Regression: `npm run test:forms` 74/74, unit tests 49/49.

**Re-test:** C5 — save with a short expected answer → error, everything kept → fix it → saved and
listed → edit → delete.

---

### #6 — Downloaded report looks different on the live site and locally

| | |
|---|---|
| Found at | Part G step 8 (production check), report Download |
| Severity | Minor — same content, different layout and margins |
| Status | **Closed** — fix deployed (dc681e6); the user adjusts margins/scale in the print dialog as needed |

**Expected:** the same printout everywhere.

**Actual:** live site (Brave, margins "None"): score and criteria side by side, but text touching
the page edge ("ob match" cut off). Local (Chrome, default margins): everything stacked in the phone
layout, 6 pages instead of 5.

**Root cause:** not local vs production — both sites served identical pages (checked with the same
report on both). A4 is about 720 px wide with margins and 790 px without, either side of the 768 px
point where the layout switches from phone to desktop, so the browser's margin setting decided the
layout. There were also no page margins of our own.

**Fix:** `src/app/globals.css` — printing always uses the desktop (md) layout, and `@page` sets A4
with 12 mm margins. The long Job match card may now split across pages (each gap row stays whole)
instead of leaving a blank gap.

**Verified:** headless Chrome print layout identical at 718 px and 794 px; PDF with the app's margins;
end-to-end 50/50.

**Re-test:** Download in Chrome and Brave with default margins → same layout, text clear of the edges.

---

### #7 — No lockout after repeated wrong passwords

| | |
|---|---|
| Found at | D1 (wrong password many times quickly) |
| Severity | Major (security) — passwords can be guessed without any slowdown |
| Status | **Closed** — deployed (7c72014); `npm run test:lockout` 8/8 on production |

**Expected:** after several wrong passwords, "Too many sign-in attempts. Please wait a few minutes and try again."

**Actual:** 41 wrong passwords in a row (about 1 a second, localhost) were all answered "Incorrect email or
password."; nothing was ever blocked.

**Root cause:** the app only shows the "too many attempts" message when Supabase refuses a sign-in with a
rate-limit error. Supabase's sign-in limit (30 requests / 5 min per IP) did not trigger for failed passwords
at this volume, and on Vercel every request reaches Supabase from Vercel's servers rather than the user's IP.

**Fix (done):** an app-level limit in the login actions (candidate and admin): count failed attempts per email
(and per IP) in a small database table; after 5 failures in 15 minutes, refuse further attempts for 15 minutes
with "Too many sign-in attempts. Please wait N minutes and try again.", and clear the count after a successful sign-in. Implemented in `src/lib/login-throttle.ts` (`checkLoginLock`, `recordLoginFailure`, `clearLoginFailures`), used by `login` and `adminLogin`; migration `…12_login_attempts.sql` (server-only table). Per-address limit 50 so shared networks aren't locked out.

**Verified (localhost):** `npm run test:lockout` 8/8; unit tests for the lockout rule; forms 74/74, e2e 50/50, db 32/32.

---

<!-- Copy this block for each new issue. -->
<!--
### #N — Short title

| | |
|---|---|
| Found at | Part/step |
| Severity | Blocker / Major / Minor / Cosmetic |
| Status | Open |
| Screen | width / device |

**Expected:**

**Actual:**

**Root cause:**

**Fix:**

**Re-test:**
-->

## Before deploy (collected from issues)

- [x] Custom SMTP sender in Supabase (#1) — Gmail SMTP (smtp.gmail.com:465), 30 emails/h
- [x] "Confirm email" turned back on in Supabase (#1 workaround)
