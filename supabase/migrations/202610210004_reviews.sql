-- One public rating/review per member and document. Apply after policy migrations.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  reviewed_storage_path text not null,
  reviewed_file_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, user_id)
);
create index reviews_document_created_idx on public.reviews (document_id, created_at desc);

-- A snapshot of the reviewed file keeps old reviews tied to that file when versioning arrives.
create function public.prepare_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare reviewed_file record;
begin
  if tg_op = 'INSERT' then
    select d.storage_path, d.file_name into reviewed_file
    from public.documents d where d.id = new.document_id;
    if not found then raise exception 'Document not found'; end if;
    new.reviewed_storage_path := reviewed_file.storage_path;
    new.reviewed_file_name := reviewed_file.file_name;
    new.created_at := now();
  else
    new.id := old.id;
    new.document_id := old.document_id;
    new.user_id := old.user_id;
    new.reviewed_storage_path := old.reviewed_storage_path;
    new.reviewed_file_name := old.reviewed_file_name;
    new.created_at := old.created_at;
  end if;
  new.body := btrim(new.body);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.prepare_review() from public, anon, authenticated;
create trigger prepare_review_before_write before insert or update on public.reviews
for each row execute function public.prepare_review();

alter table public.reviews enable row level security;
revoke all on public.reviews from public, anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

create policy "reviews public or involved read" on public.reviews for select to anon, authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and (
        d.status = 'published'
        or d.owner_id = (select auth.uid())
      )
    )
    or user_id = (select auth.uid())
  );
create policy "reviews member insert" on public.reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.has_current_policy())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.status = 'published'
      and d.owner_id <> (select auth.uid())
    )
  );
create policy "reviews own update" on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) and (select public.has_current_policy()))
  with check (
    user_id = (select auth.uid())
    and (select public.has_current_policy())
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.status = 'published'
      and d.owner_id <> (select auth.uid())
    )
  );
create policy "reviews own delete" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- SECURITY INVOKER makes the aggregate obey review RLS (including hidden files).
create view public.document_review_summary with (security_invoker = true) as
  select document_id,
         count(*)::integer as review_count,
         round(avg(rating)::numeric, 1) as average_rating
  from public.reviews
  group by document_id;
revoke all on public.document_review_summary from public, anon, authenticated;
grant select on public.document_review_summary to anon, authenticated;

-- A creator's score uses active reviews on all of their published documents.
create view public.profile_review_summary with (security_invoker = true) as
  select d.owner_id as user_id,
         count(r.id)::integer as review_count,
         round(avg(r.rating)::numeric, 1) as average_rating
  from public.documents d
  join public.reviews r on r.document_id = d.id
  where d.status = 'published'
  group by d.owner_id;
revoke all on public.profile_review_summary from public, anon, authenticated;
grant select on public.profile_review_summary to anon, authenticated;
