alter table public.cdh_transactions add column if not exists provider_reference text;

create index if not exists cdh_transactions_provider_reference_idx on public.cdh_transactions(provider_reference) where provider_reference is not null;

create or replace function public.cdh_begin_purchase(
  p_user_id uuid, p_reference text, p_transaction_type text, p_provider_id text,
  p_network text, p_phone_number text, p_plan_name text, p_customer_amount numeric,
  p_provider_cost numeric, p_metadata jsonb default '{}'::jsonb
) returns table(transaction_id uuid, balance numeric)
language plpgsql security definer set search_path = public as $$
declare v_balance numeric(18,2); v_tx_id uuid;
begin
  if p_user_id is null then raise exception 'User ID is required'; end if;
  if coalesce(trim(p_reference),'') = '' then raise exception 'Reference is required'; end if;
  if p_transaction_type not in ('airtime','data') then raise exception 'Invalid transaction type'; end if;
  if p_customer_amount is null or p_customer_amount <= 0 then raise exception 'Customer amount must be positive'; end if;
  if p_provider_cost is null or p_provider_cost < 0 then raise exception 'Provider cost cannot be negative'; end if;
  insert into public.cdh_wallets(user_id,balance,updated_at) values(p_user_id,0,now()) on conflict(user_id) do nothing;
  select w.balance into v_balance from public.cdh_wallets as w where w.user_id=p_user_id for update;
  if v_balance < round(p_customer_amount,2) then raise exception 'Insufficient wallet balance'; end if;
  insert into public.cdh_transactions(user_id,transaction_type,status,reference,provider_id,network,phone_number,plan_name,customer_amount,provider_cost,profit,metadata)
  values(p_user_id,p_transaction_type,'pending',trim(p_reference),p_provider_id,p_network,p_phone_number,p_plan_name,round(p_customer_amount,2),round(p_provider_cost,2),round(p_customer_amount-p_provider_cost,2),coalesce(p_metadata,'{}'::jsonb)) returning id into v_tx_id;
  v_balance := v_balance - round(p_customer_amount,2);
  update public.cdh_wallets as w set balance=v_balance,updated_at=now() where w.user_id=p_user_id;
  insert into public.cdh_wallet_ledger(user_id,entry_type,amount,balance_after,reference,description,metadata)
  values(p_user_id,'purchase',-round(p_customer_amount,2),v_balance,trim(p_reference),'VTU purchase',coalesce(p_metadata,'{}'::jsonb));
  return query select v_tx_id,v_balance;
end; $$;

create or replace function public.cdh_complete_purchase(
  p_reference text, p_provider_reference text, p_metadata jsonb default '{}'::jsonb
) returns table(balance numeric)
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_balance numeric;
begin
  select t.user_id into v_user from public.cdh_transactions as t where t.reference=trim(p_reference) for update;
  if v_user is null then raise exception 'Transaction not found'; end if;
  update public.cdh_transactions as t set status='success', provider_reference=nullif(trim(coalesce(p_provider_reference,'')),''), metadata=coalesce(t.metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb), completed_at=now()
  where t.reference=trim(p_reference) and t.status='pending';
  select w.balance into v_balance from public.cdh_wallets as w where w.user_id=v_user;
  return query select v_balance;
end; $$;

create or replace function public.cdh_refund_purchase(
  p_reference text, p_reason text default 'VTU purchase failed'
) returns table(balance numeric)
language plpgsql security definer set search_path = public as $$
declare v_tx public.cdh_transactions%rowtype; v_balance numeric; v_refund_reference text;
begin
  select t.* into v_tx from public.cdh_transactions as t where t.reference=trim(p_reference) for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'pending' then
    select w.balance into v_balance from public.cdh_wallets as w where w.user_id=v_tx.user_id;
    return query select v_balance; return;
  end if;
  update public.cdh_wallets as w set balance=w.balance+v_tx.customer_amount,updated_at=now() where w.user_id=v_tx.user_id returning w.balance into v_balance;
  if v_balance is null then raise exception 'Wallet not found during refund'; end if;
  v_refund_reference := left(v_tx.reference||'-REFUND',255);
  update public.cdh_transactions as t set status='refunded', metadata=coalesce(t.metadata,'{}'::jsonb)||jsonb_build_object('refund_reason',coalesce(p_reason,''),'refund_reference',v_refund_reference), completed_at=now() where t.id=v_tx.id;
  insert into public.cdh_wallet_ledger(user_id,entry_type,amount,balance_after,reference,description,metadata)
  values(v_tx.user_id,'refund',v_tx.customer_amount,v_balance,v_refund_reference,coalesce(p_reason,'VTU purchase failed'),jsonb_build_object('original_transaction_id',v_tx.id,'original_reference',v_tx.reference));
  return query select v_balance;
end; $$;

revoke all on function public.cdh_begin_purchase(uuid,text,text,text,text,text,text,numeric,numeric,jsonb) from public;
revoke all on function public.cdh_complete_purchase(text,text,jsonb) from public;
revoke all on function public.cdh_refund_purchase(text,text) from public;
grant execute on function public.cdh_begin_purchase(uuid,text,text,text,text,text,text,numeric,numeric,jsonb) to service_role;
grant execute on function public.cdh_complete_purchase(text,text,jsonb) to service_role;
grant execute on function public.cdh_refund_purchase(text,text) to service_role;