-- شغّل الملف ده مرة واحدة في Supabase SQL Editor عشان تجهّز قاعدة البيانات

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text,
  avatar_url text,
  github_access_token text, -- provider token, used server-side only
  role text default 'developer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists skill_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  summary jsonb not null,
  repos_analyzed jsonb,
  analyzed_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table skill_reports enable row level security;

-- أي حد يقدر يقرا البروفايلات (عشان صفحة discover العامة)
create policy "profiles are publicly readable"
  on profiles for select
  using (true);

-- بس صاحب البروفايل يقدر يعدّل بياناته
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- أي حد يقدر يقرا تقارير المهارات (عشان صفحة discover)
create policy "skill reports are publicly readable"
  on skill_reports for select
  using (true);

-- ملحوظة: الكتابة في الجدولين بتتم بس من خلال الـ service role
-- (من جوه API routes على السيرفر)، فمفيش policy للـ insert من المتصفح مباشرة.
