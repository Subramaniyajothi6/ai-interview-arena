-- AI Interview Arena: least-privilege table access.
--
-- The project's default privileges give `anon` and `authenticated` ALL rights on
-- every new table in `public`. Row level security still filters rows, but those
-- broad grants override the column-level limits in the security migration
-- (e.g. a candidate could update profiles.role or read expected_points).
-- This migration removes the defaults and grants back only what is needed.

-- 1. Remove everything from the API roles on existing objects.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon;

-- 2. Stop future tables/sequences/functions created by migrations from being
--    granted to the API roles automatically.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- 3. Grant back exactly what the app needs (signed-out visitors get nothing).
grant select on public.profiles to authenticated;
grant update (full_name, phone, education, experience_level, experience_summary, preferred_role, avatar_url)
  on public.profiles to authenticated;

grant select on public.candidate_profiles to authenticated;

grant select on public.skills to authenticated;
grant select, insert, delete on public.candidate_skills to authenticated;

grant select, insert, delete on public.resumes to authenticated;

-- Row level security limits these to admins.
grant select, insert, update, delete on public.question_bank to authenticated;

grant select, insert on public.interviews to authenticated;

-- expected_points is deliberately not granted: it stays server-side.
grant select (id, interview_id, user_id, position, follow_up_index, parent_id, question, skill, source, created_at)
  on public.interview_questions to authenticated;

grant select on public.candidate_answers to authenticated;
grant select on public.ai_evaluations to authenticated;
grant select on public.interview_reports to authenticated;
grant select on public.improvement_plans to authenticated;

-- Row level security limits updates to admins.
grant select, update on public.app_settings to authenticated;

grant execute on function public.is_admin() to authenticated;
