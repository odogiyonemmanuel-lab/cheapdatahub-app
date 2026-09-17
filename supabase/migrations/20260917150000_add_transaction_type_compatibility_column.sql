alter table public.cdh_transactions
  add column if not exists type text;

update public.cdh_transactions
set type = transaction_type
where type is distinct from transaction_type;

create or replace function public.cdh_sync_transaction_type_compatibility()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.transaction_type is not null then
    new.type := new.transaction_type;
  elsif new.type is not null then
    new.transaction_type := new.type;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cdh_sync_transaction_type_compatibility on public.cdh_transactions;

create trigger trg_cdh_sync_transaction_type_compatibility
before insert or update of transaction_type, type
on public.cdh_transactions
for each row
execute function public.cdh_sync_transaction_type_compatibility();
