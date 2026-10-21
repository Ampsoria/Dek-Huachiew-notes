-- Starter limits for a small Free-plan pilot. Apply after 202610210004_reviews.sql.
-- 50 objects * 10 MiB leaves headroom below Supabase Free's 1 GB Storage quota.
-- Raise these values in a new migration when measured usage justifies it.
update storage.buckets
set file_size_limit = 10485760
where id = 'documents';

create function public.can_upload_document_on_free_plan() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and (select count(*) from storage.objects where bucket_id = 'documents') < 50
    and (
      select count(*) from storage.objects
      where bucket_id = 'documents'
        and split_part(name, '/', 1) = (select auth.uid())::text
    ) < 5;
$$;
revoke all on function public.can_upload_document_on_free_plan() from public, anon;
grant execute on function public.can_upload_document_on_free_plan() to authenticated;

drop policy "document files own upload" on storage.objects;
create policy "document files own upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and (select public.has_current_policy())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  and (select public.can_upload_document_on_free_plan())
);
