# AI Interview Arena

An AI-powered mock interview and candidate evaluation platform. Candidates configure an interview, upload their resume, answer AI-generated questions by text or voice, get adaptive follow-up questions, and receive a scored report with a personalized improvement plan. Admins manage candidates, interviews, the question bank and analytics.

> AI scores are estimates to guide practice, not objective measurements of a candidate's ability.

## Tech stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend      | Next.js Route Handlers and Server Actions                     |
| Database     | Supabase PostgreSQL with row level security                   |
| Auth         | Supabase Auth                                                 |
| File storage | Supabase Storage (private `resumes` bucket)                   |
| AI           | OpenAI API (server-side only)                                 |
| Deployment   | Vercel                                                        |

## Getting started

### Prerequisites

- Node.js 20.9 or later
- A Supabase project
- A free Groq API key for the open-source AI (console.groq.com), or an OpenAI key

### Installation

```bash
git clone https://github.com/<your-username>/ai-interview-arena.git
cd ai-interview-arena
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable                               | Where it is used                               | Secret |
| -------------------------------------- | ---------------------------------------------- | ------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser and server                             | No     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server                             | No     |
| `SUPABASE_SECRET_KEY`                  | Server only (trusted writes such as AI scores) | Yes    |
| `OPENAI_API_KEY`                       | Server only (all AI calls)                     | Yes    |
| `OPENAI_MODEL`                         | Server only, optional (default `gpt-4o-mini`)  | No     |
| `OPENAI_TRANSCRIBE_MODEL`              | Server only, optional (default `whisper-1`)    | No     |
| `NEXT_PUBLIC_SITE_URL`                 | Auth email redirect links                      | No     |

Secret keys are only read in files marked `server-only`, so importing them into browser code fails the build.

## Scripts

| Command              | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `npm run dev`        | Start the development server                                            |
| `npm run build`      | Production build                                                        |
| `npm run start`      | Run the production build                                                |
| `npm run lint`       | ESLint                                                                  |
| `npm run typecheck`  | TypeScript type check                                                   |
| `npm run format`     | Prettier                                                                |
| `npm test`           | Unit tests (Vitest)                                                     |
| `npm run test:db`    | Database security tests                                                 |
| `npm run test:e2e`   | End-to-end tests (app running)                                          |
| `npm run test:forms` | Form validation tests in the browser (app running)                      |
| `npm run test:job`   | Job-description feature tests in the browser (app running)              |
| `npm run test:ai`    | Live AI test: one full interview with real AI (app running, AI key set) |

## Project structure

```
src/
  app/              routes (candidate app, admin console, API)
  components/ui/    design-system components
  lib/              constants, env, Supabase clients, AI helpers
supabase/
  migrations/       database schema, security policies, storage
docs/               PPT, UI/UX design, database, API and testing docs
```

## Documentation

- [Database](docs/DATABASE.md): schema, relationships, security model and migrations
- [Testing](docs/TESTING.md): automated suites, 32 test cases with results and screenshots
- [Decisions](docs/DECISIONS.md): product and technical decisions, including how loading, empty, error, offline and other screen states are handled

API and deployment documentation will be added in `docs/` as each part is built.
