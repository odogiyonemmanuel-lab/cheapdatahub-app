/*
  CheapDataHub wallet funding schema.

  This migration aligns the database with the production frontend and
  Flutterwave Edge Functions, which use the cdh_* tables.
*/

create table if not exists public.cdh_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance numeric(18,2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cdh_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.cdh_wallets(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(18,2) not null check (amount > 0),
  reference text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.cdh_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18,2) not null check (amount >= 100),
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'successful', 'failed')),
  provider text not null default 'flutterwave',
  gateway text,
  transaction_id text,
  gateway_transaction_id text,
  gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cdh_deposits_user_id
  on public.cdh_deposits(user_id);

create index if not exists idx_cdh_deposits_status
  on public.cdh_deposits(status);

create index if not exists idx_cdh_ledger_user_id_created_at
  on public.cdh_wallet_ledger(user_id, created_at desc);

alter table public.cdh_wallets enable row level security;
alter table public.cdh_wallet_ledger enable row level security;
alter table public.cdh_deposits enable row level security;

drop policy if exists cdh_wallets_select_own on public.cdh_wallets;
create policy cdh_wallets_select_own
  on public.cdh_wallets for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists cdh_ledger_select_own on public.cdh_wallet_ledger;
create policy cdh_ledger_select_own
  on public.cdh_wallet_ledger for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists cdh_deposits_select_own on public.cdh_deposits;
create policy cdh_deposits_select_own
  on public.cdh_deposits for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.cdh_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cdh_wallets_touch_updated_at on public.cdh_wallets;
create trigger cdh_wallets_touch_updated_at
before update on public.cdh_wallets
for each row execute function public.cdh_touch_updated_at();

drop trigger if exists cdh_deposits_touch_updated_at on public.cdh_deposits;
create trigger cdh_deposits_touch_updated_at
before update on public.cdh_deposits
for each row execute function public.cdh_touch_updated_at();

-- Create the cdh_* wallet for every new Supabase Auth user.
create or replace function public.cdh_handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cdh_wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists cdh_on_auth_user_created on auth.users;
create trigger cdh_on_auth_user_created
after insert on auth.users
for each row execute function public.cdh_handle_new_user_wallet();

-- Backfill wallets for users who already existed before this migration.
insert into public.cdh_wallets (user_id)
select id from auth.users
on conflict (user_id) do nothing;

/*
  Atomically credit a wallet exactly once for a deposit reference.
  The unique ledger reference plus the wallet row lock makes retries safe.
*/
create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text default 'Wallet funding'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.cdh_wallets%rowtype;
  v_existing public.cdh_wallet_ledger%rowtype;
  v_new_balance numeric(18,2);
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Credit amount must be greater than zero';
  end if;

  if nullif(trim(p_reference), '') is null then
    raise exception 'Payment reference is required';
  end if;

  insert into public.cdh_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.cdh_wallets
  where user_id = p_user_id
  for update;

  select * into v_existing
  from public.cdh_wallet_ledger
  where reference = trim(p_reference)
  limit 1;

  if v_existing.id is not null then
    if v_existing.user_id <> p_user_id then
      raise exception 'Payment reference already belongs to another user';
    end if;

    return jsonb_build_object(
      'already_processed', true,
      'balance', v_wallet.balance,
      'reference', v_existing.reference
    );
  end if;

  v_new_balance := v_wallet.balance + round(p_amount::numeric, 2);

  update public.cdh_wallets
  set balance = v_new_balance,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.cdh_wallet_ledger (
    user_id,
    wallet_id,
    type,
    amount,
    reference,
    description
  ) values (
    p_user_id,
    v_wallet.id,
    'credit',
    round(p_amount::numeric, 2),
    trim(p_reference),
    coalesce(nullif(trim(p_description), ''), 'Wallet funding')
  );

  return jsonb_build_object(
    'already_processed', false,
    'balance', v_new_balance,
    'reference', trim(p_reference),
    'amount', round(p_amount::numeric, 2)
  );
end;
$$;

grant execute on function public.credit_wallet(uuid, numeric, text, text)
to service_role;

-- The service role bypasses RLS; authenticated users never get direct write
-- access to deposits, wallet balances, or the wallet ledger.
