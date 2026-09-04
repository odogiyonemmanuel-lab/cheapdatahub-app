create table if not exists public.cdh_business_profit_ledger (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.cdh_transactions(id) on delete restrict,
  reference text not null unique,
  amount numeric not null,
  entry_type text not null default 'profit' check (entry_type in ('profit','reversal','adjustment')),
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cdh_business_profit_ledger_created_idx
  on public.cdh_business_profit_ledger(created_at desc);

alter table public.cdh_business_profit_ledger enable row level security;
revoke all on public.cdh_business_profit_ledger from anon, authenticated;
grant select on public.cdh_business_profit_ledger to service_role;

create or replace function public.cdh_complete_purchase(
  p_reference text,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.cdh_transactions%rowtype;
  v_balance numeric;
  v_profit numeric;
  v_profit_reference text;
begin
  select t.* into v_tx
  from public.cdh_transactions as t
  where t.reference = trim(p_reference)
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if v_tx.status = 'pending' then
    v_profit := round(coalesce(v_tx.profit, v_tx.customer_amount - v_tx.provider_cost), 2);

    update public.cdh_transactions as t
      set status = 'success',
          provider_reference = nullif(trim(p_provider_reference), ''),
          metadata = coalesce(v_tx.metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
          completed_at = now()
      where t.id = v_tx.id;

    v_profit_reference := left(v_tx.reference || '-PROFIT', 255);
    insert into public.cdh_business_profit_ledger(
      transaction_id, reference, amount, entry_type, description, metadata
    )
      values(
        v_tx.id,
        v_profit_reference,
        v_profit,
        'profit',
        'Profit realized from successful purchase',
        jsonb_build_object(
          'customer_amount', v_tx.customer_amount,
          'provider_cost', v_tx.provider_cost,
          'network', v_tx.network,
          'transaction_type', v_tx.transaction_type
        )
      )
      on conflict (transaction_id) do nothing;
  elsif v_tx.status in ('failed','cancelled','refunded') then
    raise exception 'Transaction cannot be completed from status %', v_tx.status;
  end if;

  select w.balance into v_balance
  from public.cdh_wallets as w
  where w.user_id = v_tx.user_id;

  return query select coalesce(v_balance, 0);
end;
$$;

revoke all on function public.cdh_complete_purchase(text,text,jsonb) from public;
grant execute on function public.cdh_complete_purchase(text,text,jsonb) to service_role;
