-- Larger GoodNotes exports on Supabase Free. Apply after free_upload_limits.sql.
-- Supabase Free allows at most 50 MB per object; keep an additional project-wide
-- headroom by stopping new uploads once existing objects reach 750 MB.
update storage.buckets
set file_size_limit = 50000000
where id = 'documents';

create or replace function public.can_upload_document_on_free_plan() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and (select count(*) from storage.objects where bucket_id = 'documents') < 50
    and (
      select count(*) from storage.objects
      where bucket_id = 'documents'
        and split_part(name, '/', 1) = (select auth.uid())::text
    ) < 5
    and (
      select coalesce(sum(coalesce((metadata->>'size')::bigint, 50000000)), 0)
      from storage.objects where bucket_id = 'documents'
    ) < 750000000;
$$;
