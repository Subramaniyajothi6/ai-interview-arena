-- Which AI service the platform uses (chosen in admin Settings).
alter table public.app_settings
  add column if not exists ai_provider text not null default 'openai'
  check (ai_provider in ('openai', 'open_source'));
