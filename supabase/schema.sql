-- لاقط: شغّل الملف كاملًا في Supabase SQL Editor
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text,
  display_name text,
  bio text,
  website text,
  avatar_url text,
  github_access_token text,
  role text default 'developer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists website text;

-- مستوى المطور: beginner / intermediate / pro (بيتسأل عنه أول تسجيل)
alter table profiles add column if not exists level text;

create table if not exists skill_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  summary jsonb not null,
  repos_analyzed jsonb,
  analyzed_at timestamptz default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table skill_reports enable row level security;
alter table posts enable row level security;

drop policy if exists "profiles are publicly readable" on profiles;
drop policy if exists "users can update own profile" on profiles;
drop policy if exists "skill reports are publicly readable" on skill_reports;
drop policy if exists "posts are publicly readable" on posts;
drop policy if exists "users can insert own posts" on posts;
drop policy if exists "users can update own posts" on posts;
drop policy if exists "users can delete own posts" on posts;

create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users can update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "skill reports are publicly readable" on skill_reports for select using (true);
create policy "posts are publicly readable" on posts for select using (true);
create policy "users can insert own posts" on posts for insert with check (auth.uid() = profile_id);
create policy "users can update own posts" on posts for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "users can delete own posts" on posts for delete using (auth.uid() = profile_id);

-- صور الحسابات: Public bucket باسم avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars are publicly readable" on storage.objects;
drop policy if exists "users can upload own avatar" on storage.objects;
drop policy if exists "users can update own avatar" on storage.objects;
drop policy if exists "users can delete own avatar" on storage.objects;

create policy "avatars are publicly readable" on storage.objects for select using (bucket_id = 'avatars');
create policy "users can upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users can delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
