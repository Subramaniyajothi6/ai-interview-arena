# Decisions

A record of the main product and technical decisions in AI Interview Arena: what was decided, why, and what was considered instead. Newest decisions are added at the end of each section.

## 1. Screen states

The app needs to handle every situation a user can run into, but not every situation needs its own page. A separate page is used only when the user cannot continue where they are. Everything else is shown in place, so the user keeps their context and anything they typed.

| State | Separate screen? | How it is handled | Where |
| --- | --- | --- | --- |
| **Loading** | Yes, a skeleton | Each area shows a grey skeleton of the page while its data loads. Buttons show their own progress ("Saving…", "Preparing questions…", "Uploading…") and are disabled to prevent double submits. | `loading.tsx` in the candidate area, admin console and interview room; button `pending` states |
| **Empty** | No | Each list or card explains what will appear and offers the next step: first-interview guide on the dashboard, "No interviews yet" in history, "Your plan starts with an interview", empty table rows in admin, empty chart messages. | Inside each page |
| **Success** | Only for finishing an interview | "Interview complete" is its own screen because it ends a flow. Other successes (profile saved, reset link sent, settings saved, account created) show a green message on the same form. | `/interview/[id]/complete`; `FormAlert tone="success"` |
| **Error** | Yes | Unexpected failures show a friendly error screen with **Try again** and **Go home**; no technical details, only a reference code that matches the server log. Expected problems (wrong password, file too large) show a red message next to the form. If the root layout itself fails, a minimal fallback page renders. | `error.tsx` per area, `global-error.tsx`, `ErrorState` |
| **No internet** | Yes, for full page loads | Links and saves made while offline wait and retry automatically when the connection returns (Next.js offline mode), with a banner at the top of every page. Loading screens say "Waiting for your internet connection". If the browser has to load a whole page while offline (refresh, typing a URL), a small service worker shows our own "No internet connection" page instead of the browser's, and it reloads by itself when the connection is back. Interview answers are kept as drafts in the browser, so nothing typed is lost. | `experimental.useOffline`, `ConnectionBanner`, `OfflineHint`, `public/sw.js` + `public/offline.html` |
| **Page not found** | Yes | A friendly 404 page with links back. Opening an interview or report that does not exist, or belongs to someone else, shows the same page, so the app never confirms that another user's record exists. | `not-found.tsx`, `notFound()` |
| **Partial data** | No | Pages show what exists and label what is missing: "Evaluation pending" on reports until AI scoring runs, "Skipped" and "Not answered" questions, "Incomplete" interviews, and per-card empty messages on the dashboard when only some data exists. | Report, dashboard, history, admin detail pages |
| **Form validation error** | No | Every field is checked in the browser and again on the server (zod). Errors appear under the field that caused them, the field is marked invalid for screen readers, and what the user typed is kept. A separate page would make the user re-enter everything. | `Field` component, `src/lib/validation/*` |
| **Session expired** | No | If the login session has expired, the user is sent to the login page with "Your session has expired. Please log in again to continue." After logging in they return to the page they were on. Logins without "Remember me" end after at most 12 hours, even if the browser restores its cookies. | `src/lib/supabase/proxy.ts`, `src/lib/supabase/remember.ts`, login notices |

**Screens we decided not to build:** separate pages for empty, success (other than interview complete), partial data, form validation and session expired. They are covered by the in-place handling above. The service worker only provides the offline page; it does not cache app pages, because every page shows live, private data.

## 2. AI

- **Open-source AI, free tier.** The AI runs on OpenAI's open-weight **gpt-oss** models (Apache-2.0) hosted by **Groq** (free, no card, OpenAI-compatible API): `gpt-oss-120b` reads resumes, compares job descriptions, writes questions and writes the report and plan; the faster `gpt-oss-20b` scores each answer. Groq was chosen over Cerebras (5 requests/min free), OpenRouter free models (50 requests/day) and local Ollama (can't run on Vercel). Any OpenAI-compatible host or OpenAI itself can be used by changing environment variables; admins pick the provider in Settings.
- **Every AI step has a non-AI fallback**, so the app never breaks when the AI is slow, rate-limited or not configured: keyword resume analysis and job comparison, the 129-question bank, answers saved and scored later, and a **Prepare my report** button. Responses use strict JSON schemas and are validated before anything is saved; candidate text is passed as clearly marked data so it can't instruct the model.
- **Job description practice works without AI too.** The candidate can add the job post they are preparing for (pasted, or a PDF/DOC/DOCX read like a resume). It is compared with the resume using the same skills list and aliases, giving the skills already shown, the gaps and a match percentage. The interview fills as many slots as possible with gap questions (bank questions on each gap skill in turn, or a written question when the bank has none), keeps the resume project question, and the report shows how each gap went. The comparison is stored in `interviews.job_match` with a `method` field, so an AI comparison can replace it later without changing the screens. The step is optional; skipping it gives the usual interview.
- **AI scores are always labelled as estimates** ("AI-generated estimate — not an objective measurement of ability").
- **Scoring:** each answer gets 7 criteria and an overall question score. The interview's overall score is the average over the questions the candidate saw (skipped = 0; questions never reached after ending early are left out). Follow-ups are added only when the answer needs more depth, within the admin's per-question limit, and never repeat an earlier question in the thread.
- **The resume step is titled "Resume analysis"** and says "Read by AI" or "matched against our skills list" depending on which method was used.

## 3. Architecture and security

- **Next.js App Router with server components and server actions** instead of a separate API server. Data is read on the server, so secret keys never reach the browser.
- **Supabase** for the database, login and file storage, with **row level security on every table**: users can only read their own data, and admins can read everything. Scores are written only by trusted server code, so candidates cannot change their own scores. New tables must get explicit permissions in their migration (the project's default permissions were too broad and were locked down).
- **Resumes upload straight from the browser to private storage**, then the server checks the file's real type from its first bytes, extracts the text and analyses it. This avoids the hosting platform's request size limit and never trusts the file name.
- **Profile photos use a separate public bucket** (images only, 2 MB). Each user can only write in their own folder, and the server checks the uploaded path before saving it to the profile.
- **"Remember me"**: when unchecked, the login cookies last only until the browser closes, and the server also ends the session after 12 hours, because browsers that "continue where you left off" restore those cookies. When checked, the session is kept as usual.
- **Home page knows who is signed in.** Signed-in visitors see "Go to dashboard" and "Log out" instead of "Log in", so it is clear which account is active.
- **Notifications are built from existing data** (interviews, reports, plans) instead of a separate notifications table, so they can never get out of sync. "Seen" is remembered per browser.
- **Security headers** on every response (no framing by other sites, no MIME sniffing, strict referrer, microphone limited to this site, HTTPS only).

- **Sign-in lockout.** Supabase's sign-in limit is per IP address, and on Vercel every request reaches it from Vercel's servers, so it can't stop password guessing. The login actions record failed attempts in a server-only `login_attempts` table: after 5 wrong passwords for an email in 15 minutes (or 50 from one address, high enough for shared college or office networks) sign-in is refused for up to 15 minutes, on both the candidate and admin logins, even with the right password. A successful sign-in clears that email's count; attempts older than a day are deleted.

## 4. Design

- **The design canvas is the source of truth** for every screen, including the three phone boards. The exported `Design.pdf` (27 Sep) is older than the canvas (changed 30 Sep), so comparisons are made against the canvas.
- **One responsive codebase** instead of separate mobile pages. Phone layouts reorder and hide sections to match the mobile boards.
- **Profile is read-only until "Edit profile" is clicked.** Fields, skills and the photo can only change in edit mode; Cancel restores the saved values.
- **The reset-password card on the login page opens only when "Forgot password?" is clicked** (beside the form on wide screens; smaller screens use the reset page).
- **Small, deliberate differences from the design:**
  - The profile form has one "Experience" field, as in the design. The experience level is chosen when setting up each interview.
  - The admin funnel's last step is "Completed an interview" instead of "Viewed report", because report views are not tracked.
  - The practice-question tick boxes on the improvement plan are saved in the browser (they are personal reminders, not data an admin needs).

## 5. Testing

- **Script-based end-to-end tests with real accounts** (`npm run test:e2e`) instead of Playwright. They log in with real sessions and check every page and rule over HTTP, run against local or production, and clean up after themselves. Visual checks were done in the browser and recorded in `TESTING.md` with screenshots.
- **Database security tests** (`npm run test:db`) try forbidden actions with two real users, for example reading another user's resume or making oneself an admin, and confirm they fail.
- **Form tests in a real browser** (`npm run test:forms`) check every field and validation message in headless Chrome with temporary accounts. They never send real emails and confirm that invalid admin saves leave the settings unchanged.
- **Development server:** Next.js's separate "validation worker" is switched off (`experimental.devValidationWorker: false`). On low-memory machines it crashed and took pages down with it; the same checks now run inside the dev server. Production builds are not affected.
- **Unit tests** (`npm test`) cover validation rules, resume file checks and text extraction, and small helpers.
