# Testing report

This document covers how AI Interview Arena is tested and the results of the test cases required for the project (registration through production deployment).

> **Status of AI features:** AI evaluation, follow-up questions and AI-written reports are not enabled yet (no AI provider key configured). Questions currently come from the curated question bank, resume analysis uses keyword matching, and voice answers use the browser's built-in speech-to-text. Test cases that depend on the AI provider are marked **Blocked (AI)**.

## Automated tests

| Suite | Command | What it covers | Result |
| --- | --- | --- | --- |
| Unit tests (Vitest) | `npm test` | Form validation (register, login, reset, profile, skills, interview setup), resume file checks (type sniffing, size, renamed files), PDF/DOCX text extraction, keyword resume analysis, search sanitising, CSV formula safety, "Remember me" cookies, plan data, resume entry display, session deadlines, admin settings and question rules, sign-in error messages, labels | **45 / 45 passed** |
| Database security | `npm run test:db` | Row level security, column privileges and storage policies (resumes and profile photos) with two real users (32 allowed/forbidden actions) | **32 / 32 passed** |
| End-to-end | `npm run test:e2e` (app running) | Every candidate and admin page with real sessions, the full interview flow, access control, security headers, disable/enable accounts, expired sessions, offline page (50 checks) | **50 / 50 passed** |
| Forms (browser) | `npm run test:forms` (app running) | Every form field and validation message in headless Chrome: register, login, reset card, forgot password, admin login, reset password, profile (edit mode, Cancel, save), skills, photo upload, interview setup, resume upload (wrong type, empty, too large, renamed file, real PDF), instructions, interview room, question bank, settings, invite admin, admin search, and a session ended on another device | **74 / 74 passed** |
| Static checks | `npm run typecheck`, `npm run lint`, `npm run build` | TypeScript, ESLint, production build | **Passing** |
| Dependency audit | `npm audit --omit=dev` | Known vulnerabilities in production dependencies | **0 vulnerabilities** |

The end-to-end and database suites create temporary users with random passwords and delete them (and their files) when they finish. `BASE_URL=https://your-deployment npm run test:e2e` runs the same checks against a deployment.

## Test cases

Status key: **Pass** · **Blocked (AI)** = needs the AI provider · **Pending** = not yet possible. Screenshots are stored in `docs/screenshots/`.

| ID | Area | Test case | Steps | Expected result | Actual result | Status | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Registration | Register a new candidate | Open `/register`, enter name, email, matching passwords (8+ chars), accept terms, submit | Account is created; confirmation email is sent (or user is signed in when confirmation is off); a profile row is created with the name | Account and profile created; "Check your email" shown with confirmation on (e2e TC-02, db test "Sign-up trigger creates profile") | Pass | [t01-register.jpg](screenshots/t01-register.jpg) |
| T02 | Registration | Registration validation | Submit an empty form; then mismatched passwords; then an email with a trailing space | Clear message under each invalid field; all errors shown at once; trailing spaces are ignored | All field errors shown together; "Passwords do not match."; trailing-space email accepted (unit tests "registration") | Pass | [t02-register-errors.jpg](screenshots/t02-register-errors.jpg) |
| T03 | Login | Log in with valid credentials | Open `/login`, enter correct email and password | Candidate lands on the dashboard; admins land on the admin console | Candidate → `/dashboard`; admin → `/admin` (e2e TC-08, TC-33) | Pass | [t03-login.jpg](screenshots/t03-login.jpg) |
| T04 | Login | Log in with a wrong password | Enter a valid email and a wrong password | "Incorrect email or password." without revealing which is wrong | Message shown; no session created | Pass | To capture |
| T05 | Logout | Log out | Click **Logout** in the sidebar | Session ends; protected pages redirect to login | Redirected to `/login`; `/dashboard` redirects back to login (e2e TC-05) | Pass | To capture |
| T06 | Forgot password | Request a password reset | `/forgot-password`, enter email, submit; open the emailed link | Same confirmation for any email (no account probing); link opens "Set a new password" | Confirmation shown; link goes through `/auth/callback` to `/reset-password` | Pass | To capture |
| T07 | Resume upload | Upload PDF and DOCX resumes | New interview → Resume step → drop a PDF, then a DOCX | File stored in the user's private folder; analysis panel shows skills, technologies, education, experience, projects, certifications | Verified in the browser with the real upload: file stored, analysis shows 3 skills, 11 technologies, education, experience and projects. Both formats extracted identically in unit tests | Pass | [t07-resume-analysis.jpg](screenshots/t07-resume-analysis.jpg) |
| T08 | Resume validation | Reject invalid files | Upload a `.txt`, an `.exe` renamed to `.pdf`, a file over 5 MB, an empty file | Each is rejected with a clear message; nothing is stored | All rejected (content sniffing catches renamed files; bucket enforces type and size) (unit "resume file validation"; e2e TC-16) | Pass | [t08-resume-invalid.jpg](screenshots/t08-resume-invalid.jpg) |
| T09 | Interview setup | Configure an interview | `/interview/new`: choose role, experience (Fresher…5+ Years), type (Technical…Mixed), difficulty (Easy…Expert) | All 9 roles, 5 levels, 5 types and 4 difficulties available; summary updates live; Continue creates the interview | All options present; invalid values rejected (e2e TC-12; unit "interview setup") | Pass | [t09-setup.jpg](screenshots/t09-setup.jpg) |
| T10 | Question generation | Questions for the chosen setup | Complete setup and resume, tick instructions, **Start interview** | Relevant questions for role, type and difficulty, plus one about a resume project | Questions chosen from the 129-question bank (mixed = all types, easier first) + a resume project question. AI-generated questions: Blocked (AI) | Pass (bank) / Blocked (AI) | [t12-room.jpg](screenshots/t12-room.jpg) |
| T11 | Interview start | Start and resume steps are enforced | Try opening Instructions before uploading a resume | Candidate is sent back to the resume step | Redirected to `/resume` (e2e TC-14) | Pass | — |
| T12 | Interview room | Room layout | Start an interview | Question N of M, timer, progress rail, answer area, Skip and Submit | All elements present (e2e TC-19) | Pass | [t12-room.jpg](screenshots/t12-room.jpg) |
| T13 | Answer submission | Submit text, voice and skipped answers | Type an answer and submit; record a voice answer (Chrome/Edge) and submit; skip one | Answers saved; room advances; drafts autosave; voice transcript is editable before submitting | Verified in the browser: typed answer submitted, room moved to Q2; Skip marked Q2 "Skipped"; draft autosave indicator shown (also e2e TC-23). Voice uses the browser's speech-to-text | Pass | [t13-answer.jpg](screenshots/t13-answer.jpg) |
| T14 | AI evaluation | Score each answer on 7 criteria | Submit an answer | Scores for technical accuracy, relevance, communication, clarity, completeness, problem solving, answer quality + feedback, labelled as estimates | Report shows "Evaluation pending" until the AI provider is configured | Blocked (AI) | — |
| T15 | Follow-up questions | Follow-up based on the previous answer | Give a shallow answer | A follow-up question (Q3a) appears | Data model and UI support follow-ups (Q3a labels, admin view); generation needs the AI provider | Blocked (AI) | — |
| T16 | Interview completion | Complete or end early | Answer the last question; separately, **End interview** mid-way (with confirmation) | Completion page with answered, skipped and duration; ended-early interviews marked "Incomplete" | Verified in the browser: End interview asked for confirmation, then showed "Interview ended" with 1/8 answered, 1 skipped, 1:12 (also e2e TC-24) | Pass | [t16-complete.jpg](screenshots/t16-complete.jpg) |
| T17 | Final report | View the report | Completion → **Review your answers** | Every question with the candidate's answer (text/voice/skipped); scores and plan once AI is on | Answers listed with "Evaluation pending" (e2e TC-25) | Pass (answers) / Blocked (AI scores) | [t17-report.jpg](screenshots/t17-report.jpg) |
| T18 | Interview history | Past interviews with filters | `/history`, filter by role, type and date range | Table of interviews with status, score and links; filters narrow the list | Listed and filtered correctly (e2e TC-26, TC-27) | Pass | [t18-history.jpg](screenshots/t18-history.jpg) |
| T19 | Dashboard | Candidate dashboard | `/dashboard` before and after an interview | First-interview guide when new; stats, trend, skills and type charts, recent interviews once there is data | Guide and recent interviews shown (e2e TC-08, TC-28); score charts fill in once AI scores exist | Pass | [t19-dashboard.jpg](screenshots/t19-dashboard.jpg) |
| T20 | Admin login | Admin sign-in and role check | `/admin/login` with an admin; then with a candidate account | Admin reaches the console; candidate sees "does not have administrator access" | As expected (e2e TC-31, TC-34) | Pass | [t20-admin-dashboard.jpg](screenshots/t20-admin-dashboard.jpg) |
| T21 | Candidate search | Search and filter candidates | Admin → Candidates: search by name/email, filter by role and status; export CSV | Matching candidates, pagination, CSV download | Search, filters and CSV work; CSV neutralises spreadsheet formulas (e2e TC-35, TC-38; unit "CSV export") | Pass | [t21-candidates.jpg](screenshots/t21-candidates.jpg) |
| T22 | Question bank | Add, edit, delete questions | Admin → Question Bank: add a question, edit it, delete it; try as a candidate | Changes saved; candidates cannot read or change the bank | Works; candidate blocked by row level security (e2e TC-41) | Pass | [t22-question-bank.jpg](screenshots/t22-question-bank.jpg) |
| T23 | Unauthorized access | Protected pages and data isolation | Signed out: open `/dashboard`, `/admin`, admin APIs. As a candidate: open admin pages, read another user's data, read answer keys, write scores | All blocked | Redirects/401/403 as expected; data isolation enforced by RLS (e2e TC-05–07, TC-13, TC-20–22, TC-29, TC-31–32; `npm run test:db`) | Pass | To capture |
| T24 | API failure | Server or network error | Stop Supabase access (e.g. wrong key) or break a page | Friendly "Something went wrong" page with **Try again**; forms show a readable error instead of crashing; unknown URLs show a 404 page | Error boundaries on every section, global error page, friendly 404 (e2e TC-46); forms return messages such as "We couldn't save…" | Pass | [t24-not-found.jpg](screenshots/t24-not-found.jpg) |
| T25 | AI failure | AI provider unavailable | Remove the AI key or simulate a timeout | Interview continues; evaluation retried or marked pending with a clear message | Current behaviour: interviews work fully without AI and show "Evaluation pending" | Pass (graceful) / Blocked (AI retry) | — |
| T26 | Mobile responsiveness | Phone layout | Open pages at 390 px width (Chrome DevTools) | No sideways scrolling; bottom tab bar for candidates; stacked layouts; readable forms | Verified at 390 px: all candidate pages (bottom tab bar, no sideways scroll) and all 7 admin pages (fixed an overflow bug, see below) | Pass | [t26-mobile.jpg](screenshots/t26-mobile.jpg) |
| T27 | Desktop responsiveness | Wide screens | Open at 1280 px and 2560 px | Content capped at 1280 px and centred; landing page fits one screen | Verified at 768/1024/1280/2560 px | Pass | [t19-dashboard.jpg](screenshots/t19-dashboard.jpg) |
| T28 | Security | Secrets, headers, uploads | Build and inspect the browser bundle; check response headers; `npm audit` | No secret keys in browser code; security headers present; 0 known vulnerabilities; uploads validated | Secret key and OpenAI key absent from `.next/static`; X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy (microphone self only), HSTS present (e2e TC-04); audit clean | Pass | To capture |
| T29 | Admin | Disable / enable an account | Admin → candidate → **Disable account**, try to log in as that candidate, then **Enable account** | Disabled user cannot sign in; re-enabled user can | "User is banned" when disabled; login works again after enabling (e2e TC-45) | Pass | To capture |
| T30 | Admin | Settings take effect | Turn off **Allow voice answers**; set max resume size to 2 MB | Voice tab disappears from the room; 3 MB resume rejected | Both enforced (room hides Voice; size checked in browser and on the server) | Pass | [t30-settings.jpg](screenshots/t30-settings.jpg) |
| T31 | Production deployment | Live site works | Deploy to Vercel; run `BASE_URL=<live url> npm run test:e2e` | All checks pass on the live URL | Deployment is the next milestone | Pending | To capture |

**Totals (31 cases):** 25 pass · 3 pass for everything except the AI part (T10, T17, T25) · 2 blocked until the AI provider is configured (T14, T15) · 1 pending deployment (T31).

## Browser test run

The main flow was also run in Chrome with real clicks and typing (not scripts), which exercises every server action: create interview → upload resume (analysis complete) → instructions → **Start interview** (8 questions, including a resume-project question) → submit a typed answer → skip a question → **End interview** with confirmation → completion page → report → history → dashboard; admin: **Save question**, **Save settings**, candidate list, question bank edit panel, settings. All worked.

## Bugs found and fixed during testing

| Bug | Found by | Fix |
| --- | --- | --- |
| Emails with a trailing space (common with phone keyboards/autofill) were rejected as invalid | Unit test | Emails are trimmed and lower-cased before the format check |
| Every PDF upload failed a size check because pdf.js takes over the file buffer | Page-flow test | The PDF parser gets a copy; file size is read before extraction |
| Candidate dashboard showed "Completed interviews 0" and the first-interview guide after interviews were finished (it counted AI reports, not interviews) | Browser run | Completed count and completion rate now use interview status; the guide only shows before the first interview |
| Admin pages scrolled sideways on phones (a hidden "Actions" table label escaped the table's scroll area) | Browser run at 390 px | Tables now contain their hidden labels |
| Resume/instructions pages were titled "Interview" instead of "New interview" | Browser run | Title fixed |
| A test script used a fixed password, flagged by GitGuardian as a possible secret | GitGuardian | Test users now get a random password per run (no real secret was ever committed) |
| Stopping and restarting voice recording quickly (Re-record) could leave the old recogniser restarting itself in the background | Code review during the design check | A recogniser that has been replaced now just ends |
| Dashboard trend said "Last 1 interviews" | Browser run | Singular/plural wording |
| A session ended on another device (or a disabled account) made the browser bounce between `/login` and `/dashboard` forever ("too many redirects") | Forms test | Pages now clear the leftover login cookies through `/auth/signout` and show "Your session has expired" |
| Logging out (or a refused admin login) signed the user out on every device | Forms test | Logout now only ends the session in the current browser |
| Every refused login said "Incorrect email or password", even when the real reason was too many attempts, an unconfirmed email or a disabled account | Forms test | Each case now gets its own message; wrong details stay vague so emails can't be probed |
| Admin settings: a blank "Max follow-ups" saved as 0, and letters or decimals showed technical messages | Forms test | Clear messages: "Enter a number." / "Use a whole number." / "At least …" / "At most …" |

## Security measures verified

- **Authentication and route protection:** `src/proxy.ts` redirects signed-out users; every page and server action re-checks the user (`requireUser` / `requireAdmin`); admin APIs return 401/403.
- **Authorization and data isolation:** row level security on every table; candidates only see their own rows; admins read all; column privileges hide expected answers and prevent role changes (`npm run test:db`).
- **Trusted writes:** answers, scores and reports are written only by server code with the secret key.
- **Secrets:** `.env.local` is git-ignored and has never been committed; secret keys are only imported by `server-only` modules and are absent from the browser bundle.
- **File uploads:** private bucket, per-user folders, type allow-list, size limit (bucket + server), content sniffing (magic bytes) against renamed files, extracted text length limits.
- **Input handling:** zod validation for every form; search text sanitised before database filters; CSV export neutralises spreadsheet formulas; redirects only to in-app paths.
- **HTTP headers:** X-Frame-Options SAMEORIGIN (no framing by other sites), X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (microphone for this site only), Strict-Transport-Security.
- **Rate limiting:** sign-in, sign-up and password reset are rate-limited by Supabase Auth.

## Manual test checklist

Screenshots in `docs/screenshots/` were taken during the browser run. Cases marked "To capture" (logout, forgot password, disable account, unauthorized access) can be captured while re-testing with the test accounts in `test-accounts.local.md` (local only) or with newly registered accounts.
