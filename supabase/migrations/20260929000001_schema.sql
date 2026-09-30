-- AI Interview Arena: core schema.
-- Enum values must match src/lib/constants.ts.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('candidate', 'admin');
create type public.account_status as enum ('active', 'disabled');

create type public.job_role as enum (
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst',
  'Data Scientist',
  'AI/ML Engineer',
  'Digital Marketing Executive',
  'HR Executive',
  'Business Development Executive'
);

create type public.experience_level as enum ('fresher', '0-1', '1-3', '3-5', '5+');
create type public.interview_type as enum ('technical', 'hr', 'behavioral', 'managerial', 'mixed');
create type public.difficulty as enum ('easy', 'medium', 'hard', 'expert');

-- setup: configured, no questions yet · ready: questions generated
-- in_progress: started · completed: report generated · abandoned: ended early
create type public.interview_status as enum ('setup', 'ready', 'in_progress', 'completed', 'abandoned');

create type public.resume_status as enum ('uploaded', 'analyzed', 'failed');
create type public.skill_source as enum ('resume', 'manual');
create type public.question_source as enum ('ai', 'bank', 'follow_up');
create type public.answer_mode as enum ('text', 'voice');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users: one profile per auth user (the "users" / "candidate_profiles" data)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'candidate',
  status public.account_status not null default 'active',
  full_name text not null default '' check (char_length(full_name) <= 100),
  email text not null,
  phone text check (char_length(phone) <= 30),
  education text check (char_length(education) <= 300),
  experience_level public.experience_level,
  experience_summary text check (char_length(experience_summary) <= 1000),
  preferred_role public.job_role,
  avatar_url text,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skills (normalized) and the skills each candidate has
-- ---------------------------------------------------------------------------
create table public.skills (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  category text,
  created_at timestamptz not null default now()
);
create unique index skills_name_key on public.skills (lower(name));

create table public.candidate_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete cascade,
  source public.skill_source not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);
create index candidate_skills_skill_idx on public.candidate_skills (skill_id);

-- ---------------------------------------------------------------------------
-- resumes: uploaded file + text + AI-extracted structured profile
-- ---------------------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 255),
  file_type text not null check (file_type in ('pdf', 'doc', 'docx')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  status public.resume_status not null default 'uploaded',
  raw_text text,
  -- {name, skills[], technologies[], education[], experience_years, experience[],
  --  projects[], certifications[]}
  parsed jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index resumes_user_idx on public.resumes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- question_bank: curated questions (admin managed); job_role null = all roles
-- ---------------------------------------------------------------------------
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 1000),
  job_role public.job_role,
  skill text not null check (char_length(skill) <= 60),
  difficulty public.difficulty not null,
  interview_type public.interview_type not null,
  expected_answer text not null check (char_length(expected_answer) <= 3000),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index question_bank_lookup_idx
  on public.question_bank (job_role, interview_type, difficulty) where is_active;

create trigger question_bank_updated_at before update on public.question_bank
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  job_role public.job_role not null,
  experience_level public.experience_level not null,
  interview_type public.interview_type not null,
  difficulty public.difficulty not null,
  status public.interview_status not null default 'setup',
  question_count smallint not null default 8 check (question_count between 3 and 15),
  started_at timestamptz,
  ended_at timestamptz,
  overall_score smallint check (overall_score between 0 and 100),
  created_at timestamptz not null default now()
);
create index interviews_user_idx on public.interviews (user_id, created_at desc);
create index interviews_status_idx on public.interviews (status, created_at desc);

-- ---------------------------------------------------------------------------
-- interview_questions: main questions (follow_up_index = 0) and AI follow-ups
-- (same position, follow_up_index 1, 2 … and parent_id = the main question).
-- Display order: position, follow_up_index  →  Q3, Q3a, Q3b, Q4 …
-- ---------------------------------------------------------------------------
create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position >= 1),
  follow_up_index smallint not null default 0 check (follow_up_index between 0 and 5),
  parent_id uuid references public.interview_questions (id) on delete cascade,
  question text not null,
  skill text,
  source public.question_source not null,
  bank_question_id uuid references public.question_bank (id) on delete set null,
  -- Key points a good answer covers; used by the evaluator, hidden from candidates.
  expected_points text,
  created_at timestamptz not null default now(),
  unique (interview_id, position, follow_up_index),
  check ((follow_up_index = 0) = (parent_id is null))
);
create index interview_questions_user_idx on public.interview_questions (user_id);

-- ---------------------------------------------------------------------------
-- candidate_answers: one answer per question
-- ---------------------------------------------------------------------------
create table public.candidate_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.interview_questions (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer_text text not null default '' check (char_length(answer_text) <= 10000),
  mode public.answer_mode not null default 'text',
  skipped boolean not null default false,
  duration_seconds integer check (duration_seconds >= 0),
  submitted_at timestamptz not null default now()
);
create index candidate_answers_interview_idx on public.candidate_answers (interview_id);
create index candidate_answers_user_idx on public.candidate_answers (user_id);

-- ---------------------------------------------------------------------------
-- ai_evaluations: 7 criteria (0–100) per answer. AI estimates, not objective.
-- ---------------------------------------------------------------------------
create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.candidate_answers (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  technical_accuracy smallint not null check (technical_accuracy between 0 and 100),
  relevance smallint not null check (relevance between 0 and 100),
  communication smallint not null check (communication between 0 and 100),
  clarity smallint not null check (clarity between 0 and 100),
  completeness smallint not null check (completeness between 0 and 100),
  problem_solving smallint not null check (problem_solving between 0 and 100),
  answer_quality smallint not null check (answer_quality between 0 and 100),
  question_score smallint not null check (question_score between 0 and 100),
  feedback text not null,
  needs_follow_up boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);
create index ai_evaluations_interview_idx on public.ai_evaluations (interview_id);
create index ai_evaluations_user_idx on public.ai_evaluations (user_id);

-- ---------------------------------------------------------------------------
-- interview_reports: final evaluation of a completed interview
-- ---------------------------------------------------------------------------
create table public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references public.interviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  overall_score smallint not null check (overall_score between 0 and 100),
  technical_knowledge smallint check (technical_knowledge between 0 and 100),
  communication smallint check (communication between 0 and 100),
  problem_solving smallint check (problem_solving between 0 and 100),
  relevance smallint check (relevance between 0 and 100),
  completeness smallint check (completeness between 0 and 100),
  clarity smallint check (clarity between 0 and 100),
  answer_quality smallint check (answer_quality between 0 and 100),
  summary text,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  -- Average score per skill tested in this interview: {"React": 84, "SQL": 68}
  skill_scores jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index interview_reports_user_idx on public.interview_reports (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- improvement_plans: AI career feedback for a report
-- ---------------------------------------------------------------------------
create table public.improvement_plans (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.interview_reports (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- [{week, title, topics[], hours, reason}]
  weeks jsonb not null default '[]',
  -- [{topic, improves, priority}]
  recommended_topics jsonb not null default '[]',
  -- [{question, difficulty}]
  practice_questions jsonb not null default '[]',
  -- [{title, description, duration, skills[]}]
  suggested_projects jsonb not null default '[]',
  preparation_tips text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index improvement_plans_user_idx on public.improvement_plans (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings: single row edited from the admin Settings screen
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  questions_per_interview smallint not null default 8 check (questions_per_interview between 3 and 15),
  allow_follow_ups boolean not null default true,
  max_follow_ups_per_question smallint not null default 2 check (max_follow_ups_per_question between 0 and 3),
  allow_voice_answers boolean not null default true,
  show_question_scores boolean not null default true,
  max_resume_mb smallint not null default 5 check (max_resume_mb between 1 and 5),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
