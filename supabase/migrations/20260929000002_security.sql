-- AI Interview Arena: access control.
--
-- Model
--   * Candidates can read only their own rows (user-level data isolation).
--   * Admins can read everything; they manage the question bank and settings.
--   * Scores, answers, reports and plans are written only by trusted server code
--     using the secret key (service_role), so candidates cannot forge results.
--   * Nothing is granted to `anon` (signed-out visitors).
--
-- The project has "automatically expose new tables" turned off, so every
-- privilege below is granted explicitly.

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- True when the signed-in user is an active admin. SECURITY DEFINER so it can
-- read profiles without recursing through the profiles RLS policies.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;

-- Creates the profile row when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps profiles.email in sync if the user changes their login email.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- candidate_profiles: candidate view of profiles with skills (spec table name).
-- security_invoker makes the caller's RLS apply.
-- ---------------------------------------------------------------------------
create view public.candidate_profiles
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.education,
  p.experience_level,
  p.experience_summary,
  p.preferred_role,
  p.status,
  p.created_at,
  p.last_active_at,
  coalesce(
    array_agg(s.name order by s.name) filter (where s.id is not null),
    '{}'
  ) as skills,
  (
    select r.id from public.resumes r
    where r.user_id = p.id
    order by r.created_at desc
    limit 1
  ) as latest_resume_id
from public.profiles p
left join public.candidate_skills cs on cs.user_id = p.id
left join public.skills s on s.id = cs.skill_id
where p.role = 'candidate'
group by p.id;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- Trusted server code (secret key) can do everything; RLS is bypassed for it.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant execute on function public.is_admin() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- profiles: candidates may edit only their own personal details, never role/status.
grant select on public.profiles to authenticated;
grant update (full_name, phone, education, experience_level, experience_summary, preferred_role, avatar_url)
  on public.profiles to authenticated;

grant select on public.candidate_profiles to authenticated;

grant select on public.skills to authenticated;
grant select, insert, delete on public.candidate_skills to authenticated;

grant select, insert, delete on public.resumes to authenticated;

grant select, insert, update, delete on public.question_bank to authenticated;

grant select, insert on public.interviews to authenticated;

-- expected_points is deliberately not granted: it stays server-side.
grant select (id, interview_id, user_id, position, follow_up_index, parent_id, question, skill, source, created_at)
  on public.interview_questions to authenticated;

grant select on public.candidate_answers to authenticated;
grant select on public.ai_evaluations to authenticated;
grant select on public.interview_reports to authenticated;
grant select on public.improvement_plans to authenticated;

grant select, update on public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.resumes enable row level security;
alter table public.question_bank enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_questions enable row level security;
alter table public.candidate_answers enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.interview_reports enable row level security;
alter table public.improvement_plans enable row level security;
alter table public.app_settings enable row level security;

-- profiles
create policy "Users read own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- skills: shared vocabulary, readable by any signed-in user
create policy "Signed-in users read skills"
  on public.skills for select to authenticated
  using (true);

-- candidate_skills
create policy "Users read own skills; admins read all"
  on public.candidate_skills for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users add own skills"
  on public.candidate_skills for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove own skills"
  on public.candidate_skills for delete to authenticated
  using (user_id = (select auth.uid()));

-- resumes
create policy "Users read own resumes; admins read all"
  on public.resumes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users add own resumes"
  on public.resumes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users delete own resumes"
  on public.resumes for delete to authenticated
  using (user_id = (select auth.uid()));

-- question_bank: admin only (candidates never see expected answers)
create policy "Admins read question bank"
  on public.question_bank for select to authenticated
  using ((select public.is_admin()));

create policy "Admins add questions"
  on public.question_bank for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins edit questions"
  on public.question_bank for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete questions"
  on public.question_bank for delete to authenticated
  using ((select public.is_admin()));

-- interviews
create policy "Users read own interviews; admins read all"
  on public.interviews for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users create own interviews"
  on public.interviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'setup');

-- interview data written by the server; readable by owner and admins
create policy "Users read own questions; admins read all"
  on public.interview_questions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users read own answers; admins read all"
  on public.candidate_answers for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users read own evaluations; admins read all"
  on public.ai_evaluations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users read own reports; admins read all"
  on public.interview_reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users read own plans; admins read all"
  on public.improvement_plans for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- app_settings
create policy "Signed-in users read settings"
  on public.app_settings for select to authenticated
  using (true);

create policy "Admins update settings"
  on public.app_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
