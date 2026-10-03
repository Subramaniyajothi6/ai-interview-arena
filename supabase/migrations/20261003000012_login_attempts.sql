-- AI Interview Arena: lockout after repeated wrong passwords.
--
-- Supabase's own sign-in rate limit is per IP address, and on Vercel every
-- sign-in reaches Supabase from Vercel's servers, so it can't stop someone
-- guessing a password. The login actions record each failed attempt here and
-- refuse further attempts for a while once an email or address has too many.

create table public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) <= 320),
  ip text not null check (char_length(ip) <= 64),
  created_at timestamptz not null default now()
);

create index login_attempts_email_idx on public.login_attempts (email, created_at desc);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at desc);

-- Server-only: row level security with no policies and no grants, so only the
-- secret key (which bypasses RLS) can read or write it.
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
