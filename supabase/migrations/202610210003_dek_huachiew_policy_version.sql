-- Brand wording changed in the terms to Dek Huachiew Notes.
-- Existing members must accept this revision before using member features again.
create or replace function public.accept_current_policy() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before accepting the policy';
  end if;
  insert into public.policy_acceptances (user_id, policy_version)
  values (auth.uid(), '2026-10-21-2')
  on conflict (user_id, policy_version) do nothing;
end;
$$;

create or replace function public.has_current_policy() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.policy_acceptances
    where user_id = auth.uid() and policy_version = '2026-10-21-2'
  );
$$;
