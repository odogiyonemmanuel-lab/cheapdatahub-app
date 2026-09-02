import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/* Admin authentication                                                       */
/* -------------------------------------------------------------------------- */

async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Unable to verify login: ${userError.message}`);
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "cdh_is_current_user_admin",
  );

  if (adminError) {
    throw new Error(
      `Unable to verify administrator access: ${adminError.message}`,
    );
  }

  if (isAdmin !== true) {
    throw new Error("Administrator access required.");
  }

  return user;
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AdminUser = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  wallet_balance: number;
  is_active: boolean;
};

export type AdminStats = {
  users: number;
  fundedWallets: number;
  successfulTransactions: number;
  transactionVolume: number;
  estimatedProfit: number;
  pendingTransactions: number;
};

export type AdminTransaction = {
  id: string;
  user_id: string;
  user_email?: string | null;
  type: string;
  plan_name?: string | null;
  amount: number;
  status: string;
  reference?: string | null;
  created_at: string;
};

export type PricingRow = {
  id: string;
  network: string;
  plan_name: string;
  plan_code?: string | null;
  data_size?: string | null;
  validity?: string | null;
  provider_cost: number;
  customer_price: number;
  profit: number;
  is_active: boolean;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const numberValue = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* -------------------------------------------------------------------------- */
/* Admin users                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Your database does not have public.profiles.
 *
 * For now, users are loaded from cdh_wallets.
 *
 * Email information requires a secure server-side function
 * because auth.users cannot be queried directly from the browser.
 */
export async function getAdminUsers(
  search = "",
): Promise<AdminUser[]> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_wallets")
    .select("user_id, balance")
    .order("updated_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw new Error(`Unable to load users: ${error.message}`);
  }

  let users = (data ?? []).map((row) => ({
    id: row.user_id,
    user_id: row.user_id,
    email: "",
    full_name: "",
    wallet_balance: numberValue(row.balance),
    is_active: true,
  }));

  const term = search.trim().toLowerCase();

  if (term) {
    users = users.filter((user) =>
      user.user_id.toLowerCase().includes(term),
    );
  }

  return users;
}

/* -------------------------------------------------------------------------- */
/* Set admin                                                                  */
/* -------------------------------------------------------------------------- */

export async function setAdmin(
  userId: string,
  active = true,
) {
  await requireAdmin();

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const { error } = await supabase
    .from("cdh_admins")
    .upsert(
      {
        user_id: userId,
        is_active: active,
      },
      {
        onConflict: "user_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to update administrator access: ${error.message}`,
    );
  }

  return {
    success: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Wallet adjustment                                                          */
/* -------------------------------------------------------------------------- */

export async function adjustWallet(
  userId: string,
  amount: number,
  reason: string,
) {
  await requireAdmin();

  const value = Number(amount);

  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!Number.isFinite(value) || value === 0) {
    throw new Error(
      "Wallet adjustment must be a non-zero number.",
    );
  }

  if (!reason.trim()) {
    throw new Error("A reason is required.");
  }

  const { data: wallet, error: walletError } =
    await supabase
      .from("cdh_wallets")
      .select("user_id, balance")
      .eq("user_id", userId)
      .maybeSingle();

  if (walletError) {
    throw new Error(
      `Unable to read wallet: ${walletError.message}`,
    );
  }

  if (!wallet) {
    throw new Error(
      "Wallet not found for this user.",
    );
  }

  const nextBalance =
    numberValue(wallet.balance) + value;

  if (nextBalance < 0) {
    throw new Error(
      "Wallet balance cannot become negative.",
    );
  }

  const { error } = await supabase
    .from("cdh_wallets")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Unable to adjust wallet: ${error.message}`,
    );
  }

  return {
    success: true,
    balance: nextBalance,
    reason,
  };
}

/* -------------------------------------------------------------------------- */
/* Admin transactions                                                         */
/* -------------------------------------------------------------------------- */

export async function getAdminTransactions(): Promise<
  AdminTransaction[]
> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_transactions")
    .select(`
      id,
      user_id,
      transaction_type,
      status,
      reference,
      plan_name,
      customer_amount,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw new Error(
      `Unable to load transactions: ${error.message}`,
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_email: null,
    type: row.transaction_type ?? "",
    plan_name: row.plan_name ?? null,
    amount: numberValue(row.customer_amount),
    status: row.status ?? "",
    reference: row.reference ?? null,
    created_at: row.created_at,
  }));
}

/* -------------------------------------------------------------------------- */
/* Admin statistics                                                           */
/* -------------------------------------------------------------------------- */

export async function getAdminStats(): Promise<
  AdminStats
> {
  await requireAdmin();

  const [
    walletsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("cdh_wallets")
      .select("user_id, balance"),

    supabase
      .from("cdh_transactions")
      .select(`
        status,
        customer_amount,
        profit
      `),
  ]);

  if (walletsResult.error) {
    throw new Error(
      `Unable to load wallet statistics: ${walletsResult.error.message}`,
    );
  }

  if (transactionsResult.error) {
    throw new Error(
      `Unable to load transaction statistics: ${transactionsResult.error.message}`,
    );
  }

  const wallets =
    walletsResult.data ?? [];

  const transactions =
    transactionsResult.data ?? [];

  const successful =
    transactions.filter(
      (row) =>
        String(row.status).toLowerCase() ===
        "success",
    );

  const pending =
    transactions.filter(
      (row) =>
        String(row.status).toLowerCase() ===
        "pending",
    );

  const uniqueUsers = new Set(
    wallets
      .map((row) => row.user_id)
      .filter(Boolean),
  );

  return {
    users: uniqueUsers.size,

    fundedWallets:
      wallets.filter(
        (row) =>
          numberValue(row.balance) > 0,
      ).length,

    successfulTransactions:
      successful.length,

    transactionVolume:
      successful.reduce(
        (sum, row) =>
          sum +
          numberValue(
            row.customer_amount,
          ),
        0,
      ),

    estimatedProfit:
      successful.reduce(
        (sum, row) =>
          sum +
          numberValue(row.profit),
        0,
      ),

    pendingTransactions:
      pending.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

export async function getPricing(): Promise<
  PricingRow[]
> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_product_pricing")
    .select("*")
    .order("network", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load pricing: ${error.message}`,
    );
  }

  return (data ?? []).map((row) => {
    const providerCost = numberValue(
      row.provider_cost,
    );

    const customerPrice = numberValue(
      row.customer_price,
    );

    return {
      id: row.id,
      network: row.network ?? "",
      plan_name: row.plan_name ?? "",
      plan_code: row.plan_code ?? null,
      data_size: row.data_size ?? null,
      validity: row.validity ?? null,
      provider_cost: providerCost,
      customer_price: customerPrice,
      profit: numberValue(
        row.profit ??
          customerPrice - providerCost,
      ),
      is_active: row.is_active !== false,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Update pricing                                                             */
/* -------------------------------------------------------------------------- */

export async function updatePricing(
  id: string,
  customerPrice: number,
  isActive: boolean,
) {
  await requireAdmin();

  const price = Number(customerPrice);

  if (!id) {
    throw new Error(
      "Pricing row ID is required.",
    );
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Enter a valid customer price.",
    );
  }

  const { data: current, error: currentError } =
    await supabase
      .from("cdh_product_pricing")
      .select("provider_cost")
      .eq("id", id)
      .maybeSingle();

  if (currentError) {
    throw new Error(
      `Unable to read pricing row: ${currentError.message}`,
    );
  }

  if (!current) {
    throw new Error("Pricing row not found.");
  }

  const providerCost =
    numberValue(current.provider_cost);

  const profit =
    price - providerCost;

  const { error } = await supabase
    .from("cdh_product_pricing")
    .update({
      customer_price: price,
      profit,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to update pricing: ${error.message}`,
    );
  }

  return {
    success: true,
    customer_price: price,
    profit,
    is_active: isActive,
  };
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export { requireAdmin };
