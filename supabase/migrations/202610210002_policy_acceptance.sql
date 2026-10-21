-- Keep this version in sync with src/lib/policy.ts and the displayed policy text.
-- Apply after 202610210001_initial.sql, before opening member features.
create table public.policy_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, policy_version)
);

alter table public.policy_acceptances enable row level security;
create policy "policy acceptance own read" on public.policy_acceptances
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.policy_acceptances from public, anon, authenticated;
grant select on public.policy_acceptances to authenticated;

create function public.accept_current_policy() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting the policy';
  end if;
  insert into public.policy_acceptances (user_id, policy_version)
  values (auth.uid(), '2026-10-21')
  on conflict (user_id, policy_version) do nothing;
end;
$$;
revoke all on function public.accept_current_policy() from public, anon;
grant execute on function public.accept_current_policy() to authenticated;

create function public.has_current_policy() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.policy_acceptances
    where user_id = auth.uid() and policy_version = '2026-10-21'
  );
$$;
revoke all on function public.has_current_policy() from public, anon;
grant execute on function public.has_current_policy() to authenticated;

alter table public.documents
  add column self_created_confirmed boolean not null default false;
-- Existing publications have no authorship attestation. Hide them pending manual review.
update public.documents set status = 'hidden' where status = 'published';
alter table public.documents
  add constraint published_document_self_created
  check (status <> 'published' or self_created_confirmed);

drop policy "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and (select public.has_current_policy()));
drop policy "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.has_current_policy()))
  with check (id = (select auth.uid()) and (select public.has_current_policy()));

drop policy "documents own insert" on public.documents;
create policy "documents own insert" on public.documents for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.has_current_policy())
    and self_created_confirmed
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );
drop policy "documents own update" on public.documents;
create policy "documents own update" on public.documents for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.has_current_policy()))
  with check (owner_id = (select auth.uid()) and (select public.has_current_policy()) and self_created_confirmed);

drop policy "favorites own insert" on public.favorites;
create policy "favorites own insert" on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.has_current_policy())
    and exists (select 1 from public.documents d where d.id = document_id and d.status = 'published')
  );

drop policy "document files own upload" on storage.objects;
create policy "document files own upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and (select public.has_current_policy())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );
