-- Dek Huachiew Notes phase-one schema. Apply in a new Supabase project before seed.sql.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint username_reserved check (username not in ('admin','support','system','me','login','settings','api')),
  constraint display_name_length check (char_length(btrim(display_name)) between 1 and 50),
  constraint bio_length check (char_length(bio) <= 300)
);

create function public.lock_profile_username() returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username then
    raise exception 'username cannot be changed in this version';
  end if;
  return new;
end;
$$;
create trigger lock_profile_username_before_update before update on public.profiles
for each row execute function public.lock_profile_username();

create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  name text not null,
  unique(faculty_id, name)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  code text not null,
  title text not null,
  is_ge boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index courses_code_idx on public.courses(code);
create index courses_title_idx on public.courses(title);

create table public.course_faculties (
  course_id uuid not null references public.courses(id) on delete cascade,
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  primary key(course_id, faculty_id)
);
create index course_faculties_faculty_idx on public.course_faculties(faculty_id);

create table public.course_programs (
  course_id uuid not null references public.courses(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  primary key(course_id, program_id)
);
create index course_programs_program_idx on public.course_programs(program_id);

create type public.document_kind as enum ('summary','slides','lecture','practice','exam');
create type public.document_status as enum ('draft','published','hidden');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  owner_id uuid not null references public.profiles(id),
  title text not null,
  description text not null default '',
  kind public.document_kind not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  status public.document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint document_description_length check (char_length(description) <= 500),
  constraint document_mime_type check (mime_type in ('application/pdf','image/png','image/jpeg','image/webp')),
  constraint document_owner_path check (split_part(storage_path, '/', 1) = owner_id::text)
);
create index documents_course_published_idx on public.documents(course_id, created_at desc) where status = 'published';
create index documents_owner_idx on public.documents(owner_id, created_at desc);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, document_id)
);
create index favorites_user_created_idx on public.favorites(user_id, created_at desc, id desc);

alter table public.profiles enable row level security;
alter table public.faculties enable row level security;
alter table public.programs enable row level security;
alter table public.courses enable row level security;
alter table public.course_faculties enable row level security;
alter table public.course_programs enable row level security;
alter table public.documents enable row level security;
alter table public.favorites enable row level security;

create policy "profiles public read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles own update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "faculties public read" on public.faculties for select to anon, authenticated using (true);
create policy "programs public read" on public.programs for select to anon, authenticated using (true);
create policy "courses public read" on public.courses for select to anon, authenticated using (true);
create policy "course faculties public read" on public.course_faculties for select to anon, authenticated using (true);
create policy "course programs public read" on public.course_programs for select to anon, authenticated using (true);
create policy "documents public or owner read" on public.documents for select to anon, authenticated using (status = 'published' or owner_id = (select auth.uid()));
create policy "documents own insert" on public.documents for insert to authenticated with check (owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy "documents own update" on public.documents for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "favorites own read" on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites own insert" on public.favorites for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.documents d where d.id = document_id and d.status = 'published'));
create policy "favorites own delete" on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents','documents',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "document files published or owned" on storage.objects for select to anon, authenticated
using (bucket_id = 'documents' and (
  split_part(name, '/', 1) = (select auth.uid())::text or
  exists (select 1 from public.documents d where d.storage_path = name and d.status = 'published')
));
create policy "document files own upload" on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and split_part(name, '/', 1) = (select auth.uid())::text and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy "document files own delete" on storage.objects for delete to authenticated
using (bucket_id = 'documents' and split_part(name, '/', 1) = (select auth.uid())::text);
