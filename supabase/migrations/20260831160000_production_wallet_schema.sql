/* Production wallet/payment compatibility layer.
 * Keeps the original profiles/transactions/wallets schema while exposing the
 * cdh_* objects used by the application and Edge Functions.
 */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cdh_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed')),
  provider text NOT NULL DEFAULT 'flutterwave',
  gateway_transaction_id text,
  transaction_id text,
  gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdh_deposits_user_created
  ON public.cdh_deposits(user_id, created_at DESC);

ALTER TABLE public.cdh_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdh_deposits_select_own ON public.cdh_deposits;
CREATE POLICY cdh_deposits_select_own ON public.cdh_deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.cdh_wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  entry_type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdh_wallet_ledger_user_created
  ON public.cdh_wallet_ledger(user_id, created_at DESC);

ALTER TABLE public.cdh_wallet_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdh_wallet_ledger_select_own ON public.cdh_wallet_ledger;
CREATE POLICY cdh_wallet_ledger_select_own ON public.cdh_wallet_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

/* The original wallets table needs one wallet per user. */
CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_id_unique
  ON public.wallets(user_id);

/* Atomic, idempotent wallet credit. A reference can only be credited once. */
CREATE OR REPLACE FUNCTION public.credit_wallet_from_deposit(
  p_reference text,
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_new_balance numeric(14,2);
BEGIN
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid wallet credit amount';
  END IF;

  /* Idempotency: never create a second ledger entry for the same payment. */
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets(user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cdh_wallet_ledger
    WHERE reference = p_reference
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'balance', v_wallet.balance
    );
  END IF;

  v_new_balance := COALESCE(v_wallet.balance, 0) + p_amount;

  UPDATE public.wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.cdh_wallet_ledger(
    user_id, reference, entry_type, amount, balance_after, description
  ) VALUES (
    p_user_id, p_reference, 'credit', p_amount, v_new_balance,
    'Flutterwave wallet funding'
  );

  UPDATE public.cdh_deposits
  SET status = 'success', paid_at = COALESCE(paid_at, now()), updated_at = now()
  WHERE reference = p_reference AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_from_deposit(text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_deposit(text, uuid, numeric) TO service_role;

/* Compatibility views for the current frontend API. */
DROP VIEW IF EXISTS public.cdh_wallets;
CREATE VIEW public.cdh_wallets AS
SELECT id, user_id, balance, updated_at
FROM public.wallets;

DROP VIEW IF EXISTS public.cdh_transactions;
CREATE VIEW public.cdh_transactions AS
SELECT
  id,
  user_id,
  type,
  network,
  phone_number,
  plan_name,
  amount,
  amount AS customer_amount,
  amount AS provider_cost,
  0::numeric AS profit,
  status,
  provider_ref AS reference,
  provider_ref AS provider_reference,
  created_at,
  created_at AS updated_at,
  jsonb_build_object('message', message) AS metadata
FROM public.transactions;

GRANT SELECT ON public.cdh_wallets, public.cdh_transactions TO authenticated;

CREATE TABLE IF NOT EXISTS public.cdh_product_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  network text NOT NULL,
  plan_name text,
  plan_code text,
  provider_cost numeric(14,2) NOT NULL DEFAULT 0,
  customer_price numeric(14,2) NOT NULL DEFAULT 0,
  profit numeric(14,2) GENERATED ALWAYS AS (customer_price - provider_cost) STORED,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cdh_product_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cdh_product_pricing_public_read ON public.cdh_product_pricing;
CREATE POLICY cdh_product_pricing_public_read ON public.cdh_product_pricing
  FOR SELECT TO anon, authenticated USING (is_active = true);
