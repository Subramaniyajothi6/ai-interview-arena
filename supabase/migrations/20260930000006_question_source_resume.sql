-- Questions built from the candidate's resume (e.g. "walk me through your
-- project") without AI get their own source value.
alter type public.question_source add value if not exists 'resume';
