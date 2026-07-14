-- Estética Study: esquema Supabase
-- Ejecutar completo en Supabase → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"attempts":[],"concepts":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{"timerMinutes":60,"examLength":50,"wrongRepeatProbability":40}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings(id,settings)
values (1,'{"timerMinutes":60,"examLength":50,"wrongRepeatProbability":40}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.question_overrides (
  question_id text primary key,
  override jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'student'
  )
  on conflict (id) do update set
    email=excluded.email,
    full_name=excluded.full_name,
    updated_at=now();

  insert into public.student_progress(user_id,state)
  values (
    new.id,
    jsonb_build_object(
      'name',coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),
      'email',lower(new.email),
      'attempts','[]'::jsonb,
      'concepts','{}'::jsonb,
      'createdAt',now()::text,
      'lastLoginAt',now()::text
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id=(select auth.uid()) and role='admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.student_progress enable row level security;
alter table public.app_settings enable row level security;
alter table public.question_overrides enable row level security;
alter table public.password_reset_requests enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (id=(select auth.uid()) or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "progress_select" on public.student_progress;
create policy "progress_select" on public.student_progress
for select to authenticated
using (user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "progress_insert_own" on public.student_progress;
create policy "progress_insert_own" on public.student_progress
for insert to authenticated
with check (user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "progress_update" on public.student_progress;
create policy "progress_update" on public.student_progress
for update to authenticated
using (user_id=(select auth.uid()) or public.is_admin())
with check (user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "settings_read" on public.app_settings;
create policy "settings_read" on public.app_settings
for select to authenticated
using (true);

drop policy if exists "settings_admin_write" on public.app_settings;
create policy "settings_admin_write" on public.app_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "overrides_read" on public.question_overrides;
create policy "overrides_read" on public.question_overrides
for select to authenticated
using (true);

drop policy if exists "overrides_admin_write" on public.question_overrides;
create policy "overrides_admin_write" on public.question_overrides
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "reset_admin_read" on public.password_reset_requests;
create policy "reset_admin_read" on public.password_reset_requests
for select to authenticated
using (public.is_admin());

drop policy if exists "reset_admin_update" on public.password_reset_requests;
create policy "reset_admin_update" on public.password_reset_requests
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.app_settings, public.question_overrides to authenticated;
grant select on public.profiles, public.student_progress, public.password_reset_requests to authenticated;
grant insert, update on public.student_progress to authenticated;
grant insert, update, delete on public.app_settings, public.question_overrides to authenticated;
grant update on public.password_reset_requests to authenticated;
