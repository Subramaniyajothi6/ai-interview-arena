# AI Interview Arena: project handover

This guide explains what the project does, every feature that has been built, and how to run the
whole project on your own computer from scratch.

| | |
|---|---|
| Live app | https://ai-interview-arena-mu.vercel.app |
| Source code | https://github.com/Subramaniyajothi6/ai-interview-arena |
| Stack | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage), open-source AI (gpt-oss via Groq), Vercel |

You can review the app on the live link without any setup. Follow the steps in
[Run it on your computer](#run-it-on-your-computer) to work on the code.

---

## What the app does

AI Interview Arena is an AI-powered mock interview and candidate evaluation platform.

- **Candidates** set up an interview (role, experience, type, difficulty), upload their resume,
  optionally add the job description they are preparing for, answer AI-written questions by text
  or voice, get follow-up questions when an answer is thin, and receive a scored report with a
  5-week improvement plan.
- **Admins** manage candidates, interviews, the question bank, reports, analytics and app settings.

AI scores are always shown as estimates to guide practice, not as an objective measurement of
ability.

---

## Features

### Accounts and security

- Register, log in, log out, forgot password and reset password (email links).
- Email confirmation on sign-up, sent through a custom SMTP sender.
- "Remember me": unticked, the session ends when the browser closes (and after 12 hours at most).
- Session ended on another device: the user is sent to the login page with a clear notice.
- Sign-in lockout: after 5 wrong passwords for an email in 15 minutes (or 50 from one network
  address), sign-in is refused for up to 15 minutes, on both candidate and admin logins.
- Separate admin login with a role check; disabled accounts cannot sign in.
- Row level security on every table: candidates only ever see their own data; admins see all.
- Security headers (frame, content-type, referrer, permissions, HSTS); secret keys are server-only.

### Interview flow (candidate)

1. **Setup**: job role (9 roles), experience level, interview type (technical, HR, behavioral,
   managerial, mixed) and difficulty (easy to expert), with a live summary.
2. **Resume**: upload PDF, DOC or DOCX (up to 5 MB). Files are checked by their real content, not
   just the name. The AI reads the resume into skills, technologies, education, experience,
   projects and certifications. A previous resume can be reused.
3. **Job description (optional)**: paste the job post or upload it as PDF/DOC/DOCX. It is compared
   with the resume: match percentage, skills already on the resume, and **skill gaps**.
4. **Instructions**: what to expect, microphone check, and a note listing the gaps to practise.
5. **Interview room**:
   - AI-written questions for the role, level, type and difficulty, starting with the job's skill
     gaps, plus one question about a project on the resume.
   - Answer by **text** or **voice** (speech-to-text, editable before submitting).
   - Drafts are saved in the browser; answers survive a reload or a short loss of connection.
   - Each answer is scored on 7 criteria with written feedback.
   - **Follow-up questions** when an answer is vague (up to the admin's limit per question; never a
     repeat of an earlier follow-up).
   - Timer, progress list, skip question, end interview early (with confirmation).
6. **Complete**: questions answered, skipped and time taken.

### Results

- **Evaluation report**: AI summary, overall score, 7 criteria (technical accuracy, relevance,
  communication, clarity, completeness, problem solving, answer quality), strengths, areas for
  improvement, skill scores, job match with the result for each gap, and every question with the
  answer, score and feedback. Scores are coloured by result (green 75+, amber 50–74, red below 50).
  "Download" prints a clean A4 report or saves it as PDF.
- **Improvement plan**: 5 weeks of topics with hours and the reason for each week, recommended
  topics by priority, practice questions (with progress ticks), suggested projects, preparation
  tips. It can be regenerated and downloaded.
- **Dashboard**: average and best score, score trend, where you stand on each criterion, next best
  practice, improvement focus, strengths and recent interviews.
- **History**: every interview with filters by role, type, status and date.
- **Profile**: edit details, skills and photo; the resume on file.
- **Notifications** for completed interviews, reports and new plans.

### Admin console

- **Dashboard**: totals, candidate funnel, items that need attention, interviews per week, top roles.
- **Candidates**: search, filters, pagination, CSV export; detail page with profile, skills,
  resume (opens the file), interviews, and **disable / enable account**.
- **Interviews**: list and detail with every answer, AI scores, feedback, follow-ups, the job
  description and the expected answer for each question (admin only).
- **Question bank**: 129 seeded questions; add, edit, delete, filter by role, skill, level and type.
- **Reports** and **Analytics**.
- **Settings**: questions per interview, follow-ups on/off and the limit per question, voice
  answers on/off, show per-question scores to candidates, maximum resume size, AI provider (with
  connection status), and admin accounts (invite an existing user as admin).

### AI

- Open-source models: **gpt-oss-120b** (reads resumes, compares job descriptions, writes
  questions, writes the report and plan) and **gpt-oss-20b** (scores each answer), hosted by
  **Groq** on its free tier. OpenAI can be chosen instead in admin Settings.
- Every AI step has a non-AI fallback, so the app never breaks: keyword resume analysis and job
  comparison, a 129-question bank, answers saved and scored later, and a "Prepare my report" button.
- AI responses follow strict JSON schemas and are validated before anything is saved; text written
  by the candidate is treated as data, not instructions.

### Design and experience

- **Light and dark mode** on every page. It follows the device setting until the user chooses with
  the switch (sliding switch next to the bell; a smaller icon in the interview room and on phones).
- Responsive layouts for phone, tablet and desktop, including dedicated phone layouts for the
  dashboard, interview room and report.
- Loading, empty, error, offline and "not found" screens; an offline page served when the
  connection is lost; actions retry when the connection returns.
- Clicking your name or avatar in the header opens your profile.

### Quality

- Automated tests: unit tests, database security tests, end-to-end tests, form validation tests,
  job-description tests, sign-in lockout tests and a live AI test (see [Tests](#tests)).
- Documentation in `docs/`: API, database, testing (32 test cases), decisions, and the manual test log.

---

## Run it on your computer

### 1. Install the tools

- **Node.js 20.9 or later** (https://nodejs.org). Check with `node -v`.
- **Git** (optional, only if you clone instead of using the zip).
- **Google Chrome or Microsoft Edge** (only needed for the browser test suites).

### 2. Get the code

Either unzip `ai-interview-arena.zip`, or clone it:

```bash
git clone https://github.com/Subramaniyajothi6/ai-interview-arena.git
cd ai-interview-arena
```

Then install the packages (this creates `node_modules`, about a minute):

```bash
npm install
```

### 3. Choose a database

You need a Supabase project. Pick **one** option.

**Option A: use the existing project** (quickest, shares data with the live app)

Ask the project owner to add you as a member of the Supabase organisation
(Supabase dashboard → Organization → Members → Invite). Then open the project and copy the keys
from **Project Settings → API Keys** in step 4. Skip to step 4.

**Option B: create your own project** (your own empty copy)

1. Sign in at https://supabase.com and create a new project. Pick the region closest to you and
   note the **project ref** (the part before `.supabase.co` in the project URL).
2. Create the tables, security rules, storage buckets and seed data (skills and the question bank)
   by applying the migrations in `supabase/migrations`:

   ```bash
   npx supabase login                       # opens the browser once
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push                     # applies all 12 migrations
   ```

3. In the Supabase dashboard, **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`
4. Email (optional but recommended): Supabase's built-in email only sends a few emails per hour.
   - For local testing, you can turn **Authentication → Sign In / Providers → Email → Confirm email**
     off, so new accounts can log in without an email.
   - For real use, set a custom sender in **Authentication → Emails → SMTP Settings** (for example
     a Gmail address with an app password: host `smtp.gmail.com`, port `465`). The SMTP password
     is stored only in Supabase; the app never needs it.

### 4. Create the AI key (free)

1. Sign up at https://console.groq.com (no card needed).
2. **API Keys → Create API Key**, and copy the key (it starts with `gsk_`).

Each developer can use their own key. Without a key the app still works, using the keyword
analysis and the question bank instead of AI.

### 5. Add your settings file

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Value | Secret |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys → Project URL | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key on the same page | No |
| `SUPABASE_SECRET_KEY` | A **secret** key on the same page | **Yes** |
| `OPEN_SOURCE_AI_API_KEY` | Your Groq key from step 4 | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | No |

Leave the other lines as they are (the defaults are correct). `.env.local` is ignored by git: never
commit it or share it in chat, email or a shared drive.

### 6. Start the app

```bash
npm run dev
```

Open http://localhost:3000 and register an account.

### 7. Make yourself an admin

In the Supabase dashboard, open **SQL Editor** and run (with your email):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Then sign in at http://localhost:3000/admin/login.

### 8. Turn on the AI

In the admin console, go to **Settings → AI service**:

- "Open-source AI model" should show **Connected** (it reads your Groq key).
- Set **Provider** to **Open-source AI model** and click **Save settings**.

New interviews now use the AI. (On a fresh database the provider starts as "OpenAI API"; without
an OpenAI key the app falls back to the non-AI features until you switch.)

---

## Tests

Run these with the app running (`npm run dev`) in another terminal.

| Command | What it checks |
|---|---|
| `npm test` | Unit tests (no app or database needed) |
| `npm run typecheck` · `npm run lint` | TypeScript and lint checks |
| `npm run test:db` | Database security: row level security, column privileges, storage rules |
| `npm run test:e2e` | Every page with real sessions, the interview flow, access control, headers |
| `npm run test:forms` | Every form field and validation message (uses Chrome or Edge) |
| `npm run test:job` | Job-description step (uses Chrome or Edge) |
| `npm run test:lockout` | Sign-in lockout (uses Chrome or Edge) |
| `npm run test:ai` | One full interview with real AI (needs the Groq key; about 12 AI requests) |

The test suites create temporary accounts and delete them when they finish. Add `BASE_URL=<url>`
to run the browser suites against a deployment, and `CHROME_PATH=<path>` if Chrome or Edge is not
found automatically.

---

## Deploy to Vercel

1. Push the code to a GitHub repository and import it at https://vercel.com/new.
2. In **Settings → Environment Variables**, add the same variables as `.env.local`, with
   `NEXT_PUBLIC_SITE_URL` set to the deployment URL. Mark the two secrets as sensitive.
3. Choose a function region close to the database (Settings → Functions).
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the deployment URL and
   add `<deployment URL>/auth/callback` to the redirect URLs.

Every push to the main branch then deploys automatically.

---

## Project structure

```
src/app/            pages and server actions
  (auth)/           login, register, forgot and reset password
  (candidate)/      dashboard, interview setup steps, report, history, plan, profile
  (focus)/          interview room and completion screen (no sidebar)
  admin/            admin login and console
  api/              admin file and CSV routes
src/components/     shared UI (score ring, criteria bars, theme switch, forms, layout)
src/lib/            AI (lib/ai), interview logic, resume reading, validation, Supabase clients
supabase/migrations database schema, security rules, storage buckets, seed data
scripts/            test suites
tests/unit/         unit tests
docs/               API, database, testing, decisions, test log, this guide
```

## Further documentation

- `docs/API.md`: server actions, route handlers, route protection and who can call what
- `docs/DATABASE.md`: tables, relationships, security model, migrations
- `docs/TESTING.md`: automated suites and 32 test cases with results
- `docs/DECISIONS.md`: product and technical decisions
- `docs/TEST-RUN.md`: the manual test run with every issue found and how it was fixed
