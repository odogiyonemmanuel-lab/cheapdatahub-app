-- Fix admin dashboard user count to match Supabase Auth users.
-- Previously cdh_admin_stats counted cdh_wallets, which could be lower
-- than the actual number of registered users.

create or replace function public.cdh_admin_stats()
returns table(
  users bigint,
  funded_wallets bigint,
  successful_transactions bigint,
  transaction_volume numeric,
  estimated_profit numeric,
  pending_transactions bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.cdh_is_current_user_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    (select count(*) from auth.users),
    (select count(*) from public.cdh_wallets where balance > 0),
    (select count(*) from public.cdh_transactions where lower(coalesce(status, '')) in ('success', 'successful')),
    (select coalesce(sum(customer_amount), 0) from public.cdh_transactions where lower(coalesce(status, '')) in ('success', 'successful')),
    (select coalesce(sum(profit), 0) from public.cdh_transactions where lower(coalesce(status, '')) in ('success', 'successful')),
    (select count(*) from public.cdh_transactions where lower(coalesce(status, '')) = 'pending');
end;
$$;

revoke all on function public.cdh_admin_stats() from public;
grant execute on function public.cdh_admin_stats() to authenticated, service_role;
