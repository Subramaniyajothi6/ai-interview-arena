-- AI Interview Arena: practise for a specific job.
--
-- A candidate can add the job description they are preparing for. It is
-- compared with their resume, and interview questions focus on the skills
-- the job asks for that the resume doesn't show (the "gaps").

-- job_match: {method, required[], matched[], gaps[], match_percent}
-- Candidates read both columns through the existing table-level select grant;
-- only trusted server code (secret key) writes them.
alter table public.interviews
  add column job_description text check (char_length(job_description) <= 20000),
  add column job_match jsonb;

-- Questions chosen to practise a skill gap from the job description.
alter type public.question_source add value if not exists 'gap';
