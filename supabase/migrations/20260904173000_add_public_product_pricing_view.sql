create or replace view public.cdh_public_product_pricing as
select
  product_id,
  provider_id,
  network,
  plan_name,
  plan_code,
  customer_price,
  is_active
from public.cdh_product_pricing
where coalesce(active, true) = true
  and coalesce(is_active, true) = true;

grant select on public.cdh_public_product_pricing to authenticated;
revoke all on public.cdh_public_product_pricing from anon;
