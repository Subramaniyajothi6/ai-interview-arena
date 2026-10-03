# API

The app has no separate REST API. Pages call the server in two ways:

- **Server Actions** (Next.js `"use server"` functions): every form and button that changes data.
  They run on the server, are called directly from React, and are protected by Next.js (encrypted
  action IDs, same-origin check) and by the checks below.
- **Route Handlers** (`route.ts`): four GET endpoints for things a browser opens as a link (email
  links, a file download, a resume).

Every write is checked three times: the request must come from a signed-in user, the action checks
the user's role and ownership itself, and the database's row level security (RLS) only allows
access to the user's own rows (admins: all rows). Writes that a user must not make themselves (AI
scores, reports, follow-up questions, admin changes) go through the server-only admin client after
those checks.

## Conventions

| | |
|---|---|
| Validation | Every input is validated with zod (`src/lib/validation/*`). Invalid input returns field errors, never an exception. |
| Form actions | Signature `(previousState, formData) => state`, used with React's `useActionState`. The state carries `error`, `success`, `fieldErrors` and, after a failed save, the submitted `values` so the form keeps what was typed. |
| Button actions | Plain async functions returning `{ ok, ... }` or `{ error }`. |
| Auth helpers | `requireUser()` and `requireAdmin()` in `src/lib/auth.ts` redirect to the login page when there is no valid session. |
| Errors | User-facing messages are plain sentences ("We couldn't save the question. Please try again."). Technical details stay in the server log. |
| AI | Actions that use AI fall back to the non-AI path if the AI fails or is not configured; the request still succeeds. |

## Route protection

`src/proxy.ts` (Next.js 16 "proxy", formerly middleware) runs on every page request except static
files and `/api/*`:

- refreshes the session cookie;
- ends "Remember me"-off sessions after 12 hours;
- redirects signed-out users from `/dashboard`, `/interview`, `/history`, `/plan`, `/profile`,
  `/reports` to `/login?next=…` (with `error=session_expired` when an old session cookie was found),
  and from `/admin/*` to `/admin/login`;
- sends signed-in users away from `/login`, `/register` and `/forgot-password` to the dashboard.

These are fast, optimistic redirects; real authorisation happens again in each page, action and RLS.

---

## Route Handlers

### `GET /auth/callback`

Landing point for links in Supabase emails (confirm sign-up, reset password).

| Query | Meaning |
|---|---|
| `code` | One-time code from the email link |
| `next` | Where to go afterwards (a path inside the app; default `/dashboard`) |

Exchanges the code for a session cookie and redirects to `next`. An invalid or expired code
redirects to `/login?error=link_expired`. `next` must start with `/` (never another site).

### `GET /auth/signout`

Clears this browser's login cookies and shows the login page. Used when a session was ended
elsewhere (signed out on another device, account disabled) so the user is not bounced between
pages.

| Query | Meaning |
|---|---|
| `admin=1` | Go to `/admin/login` instead of `/login` |
| `error` | `session_expired` or `account_disabled`, shown as a notice |
| `next` | Path to return to after signing in again |

### `GET /api/admin/candidates/export`

Downloads the candidate list as CSV. **Admins only** (401 when signed out, 403 for other users).

| Query | Meaning |
|---|---|
| `q` | Search in name or email |
| `role` | Preferred job role |
| `status` | `active` or `disabled` |

Columns: name, email, phone, education, preferred role, experience, interviews, status, registered,
last active (up to 5,000 rows). Cells that start with `=`, `+`, `-` or `@` are escaped so a
spreadsheet cannot run them as formulas.

### `GET /api/admin/resumes/[id]`

Opens a candidate's resume. **Admins only** (401 / 403). Looks up the resume, creates a signed URL
for the private `resumes` storage bucket valid for 60 seconds, and redirects to it. 404 when the
resume does not exist.

---

## Server Actions

### Accounts: `src/app/(auth)/actions.ts`

| Action | Who | What it does |
|---|---|---|
| `login(state, formData)` | Anyone | `email`, `password`, `remember`, `next`. Refuses with "Too many sign-in attempts…" after 5 wrong passwords for the email in 15 minutes (or 50 from one address). Signs in; without "Remember me" the session ends when the browser closes. Records failed attempts, clears them on success. Admins are sent to `/admin`, others to `next` or `/dashboard`. |
| `register(state, formData)` | Anyone | `fullName`, `email`, `password`, `confirmPassword`, `terms`. Creates the account; with email confirmation on, returns "We sent a confirmation link…". Explains rate limits, existing accounts and weak passwords. |
| `forgotPassword(state, formData)` | Anyone | `email`. Sends a reset link. Always answers the same way, so it can't be used to find out which emails have accounts (except the email rate-limit message, which applies to every address). |
| `resetPassword(state, formData)` | Signed in via the reset link | `password`, `confirmPassword`. Sets the new password. |
| `logout()` | Signed in | Signs out this browser and goes to `/login`. |
| `adminLogin(state, formData)` | Anyone | Same as `login` (including the lockout), then refuses accounts that are not active admins ("This account does not have administrator access."). |
| `adminLogout()` | Admin | Signs out and goes to `/admin/login`. |

### Interview setup and results: `src/app/(candidate)/interview/actions.ts`

| Action | Who | What it does |
|---|---|---|
| `createInterview(state, formData)` | Candidate | `jobRole`, `experienceLevel`, `interviewType`, `difficulty`. Creates the interview (question count from admin settings) and goes to the resume step. |
| `processResume({ interviewId, path, fileName })` | Owner | The browser first uploads the file to the user's own storage folder; this action downloads it, checks size and real file type (PDF/DOC/DOCX by content), extracts the text, analyses it (AI, or keyword fallback), saves it and attaches it to the interview. Returns the analysis. |
| `attachExistingResume({ interviewId, resumeId })` | Owner | Reuses a resume uploaded before. |
| `saveJobDescription({ interviewId, text })` | Owner | 30–20,000 characters. Compares the job with the resume (AI, or keyword fallback) and saves the match: required skills, matched, gaps, match %. |
| `readJobDescriptionFile(formData)` | Owner | `interviewId`, `file` (PDF/DOC/DOCX, up to 2 MB). Returns the text; the file itself is not stored. |
| `clearJobDescription(interviewId)` | Owner | Removes the job description (the "Skip" button). |
| `startInterview(interviewId)` | Owner | Needs a resume. Writes the questions (AI: gap questions first plus a resume project question; fallback: the question bank), starts the timer and opens the room. Safe against double clicks. |
| `generateReport(interviewId)` | Owner | For a finished interview: scores any unscored answers, then builds the report and the 5-week plan. Used by "Prepare my report" and "Regenerate". |

All interview actions only work on the caller's own interview, and setup actions only while it is
still being set up.

### Interview room: `src/app/(focus)/interview/[id]/room/actions.ts`

| Action | Who | What it does |
|---|---|---|
| `submitAnswer({ interviewId, questionId, answer, mode, skipped, durationSeconds })` | Owner | Up to 10,000 characters; `mode` is `text` or `voice`. Saves the answer (a repeated submit is ignored). With AI: scores it on 7 criteria with feedback and, if the answer is thin and follow-ups are allowed, adds a follow-up question (never repeating an earlier one in the thread). When every question is answered, completes the interview and builds the report. Returns `{ ok: true, done }`. |
| `endInterview(interviewId)` | Owner | Ends the interview early (answers so far are kept) and builds the report. |

### Profile: `src/app/(candidate)/profile/actions.ts`

| Action | Who | What it does |
|---|---|---|
| `updateProfile(state, formData)` | Signed in | `fullName`, `phone`, `preferredRole`, `education`, `experienceSummary`. |
| `setAvatar(path)` | Signed in | After the browser uploads a photo to the user's own `avatars` folder (JPG/PNG/WebP, 2 MB), saves it as the profile photo and removes the old one. |
| `addSkill(state, formData)` | Signed in | `name` (letters, numbers and simple symbols, up to 60). Adds it to the shared skills list if new, then to the profile. |
| `removeSkill(formData)` | Signed in | `skillId`. |

### Admin console: `src/app/admin/(console)/actions.ts`

All admin actions call `requireAdmin()` first.

| Action | What it does |
|---|---|
| `setCandidateStatus(formData)` | `id`, `status` (`active` / `disabled`). Disabling also blocks sign-in at the auth level; enabling lifts it. Admin accounts can't be changed here. |
| `saveQuestion(state, formData)` | Add or edit a question-bank question: `question`, `jobRole` (blank = all roles), `skill`, `difficulty`, `interviewType`, `expectedAnswer`, `isActive`, and `id` when editing. |
| `deleteQuestion(formData)` | `id`. |
| `saveSettings(state, formData)` | Questions per interview (3–15), follow-ups on/off and the limit per question (0–3), voice answers on/off, show per-question scores, maximum resume size (1–5 MB), AI provider (`openai` / `open_source`). |
| `addAdmin(state, formData)` | `email` of an existing account; gives it admin access. |
| `removeAdmin(formData)` | `id`. You can't remove yourself or the first (owner) admin. |

---

## Data access summary

| Data | Candidate | Admin |
|---|---|---|
| Own profile, resumes, interviews, answers | Read and write own | Read all |
| AI evaluations, reports, improvement plans | Read own (written by the server) | Read all |
| Question bank | No access (expected answers stay hidden) | Full |
| App settings | Read | Read and write |
| Sign-in attempts | No access | No access (server only) |

Full table definitions and policies: [DATABASE.md](DATABASE.md).
