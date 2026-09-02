import { supabase } from "@/lib/supabase";

/**
 * Admin API helpers.
 *
 * Every function verifies that the current Supabase user is present in
 * cdh_admins before reading or changing administrative data.
 *
 * IMPORTANT: this browser-side file must never contain a Supabase service-role
 * key, Flutterwave secret key, or CheapDataHub provider secret.
 */

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

  const { data, error } = await supabase
    .from("cdh_admins")
    .select("user_id, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify administrator access: ${error.message}`,
    );
  }

  if (!data || data.is_active === false) {
    throw new Error("Administrator access required.");
  }

  return user;
}

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

const numberValue = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export async function getAdminUsers(search = ""): Promise<AdminUser[]> {
  await requireAdmin();

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, wallets(balance)")
    .order("created_at", { ascending: false });

  const term = search.trim();
  if (term) {
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw new Error(`Unable to load users: ${error.message}`);
  }

  const { data: admins, error: adminsError } = await supabase
    .from("cdh_admins")
    .select("user_id, is_active");

  if (adminsError) {
    throw new Error(`Unable to load administrator status: ${adminsError.message}`);
  }

  const adminMap = new Map(
    (admins ?? []).map((row) => [row.user_id, row.is_active !== false]),
  );

  return (data ?? []).map((row) => {
    const wallet = Array.isArray(row.wallets) ? row.wallets[0] : row.wallets;

    return {
      id: row.id,
      user_id: row.id,
      email: row.email ?? "",
      full_name: row.full_name ?? "",
      wallet_balance: numberValue(wallet?.balance),
      is_active: adminMap.get(row.id) ?? false,
    };
  });
}

export async function setAdmin(userId: string, active = true) {
  await requireAdmin();

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const { error } = await supabase.from("cdh_admins").upsert(
    {
      user_id: userId,
      is_active: active,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Unable to update administrator access: ${error.message}`);
  }
}

export async function adjustWallet(
  userId: string,
  amount: number,
  reason: string,
) {
  await requireAdmin();

  const value = Number(amount);
  if (!userId) throw new Error("User ID is required.");
  if (!Number.isFinite(value) || value === 0) {
    throw new Error("Wallet adjustment must be a non-zero number.");
  }
  if (!reason.trim()) throw new Error("A reason is required.");

  const { data: wallet, error: walletError } = await supabase
    .from("cdh_wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletError) {
    throw new Error(`Unable to read wallet: ${walletError.message}`);
  }

  if (!wallet) {
    throw new Error("Wallet not found for this user.");
  }

  const nextBalance = numberValue(wallet.balance) + value;
  if (nextBalance < 0) {
    throw new Error("Wallet balance cannot become negative.");
  }

  const { error } = await supabase
    .from("cdh_wallets")
    .update({ balance: nextBalance })
    .eq("id", wallet.id);

  if (error) {
    throw new Error(`Unable to adjust wallet: ${error.message}`);
  }

  // If a dedicated admin ledger table/RPC exists, it should be used here for
  // an immutable audit trail. The browser must not bypass RLS to write one.
  void reason;
}

export async function getAdminTransactions(): Promise<AdminTransaction[]> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_transactions")
    .select("id, user_id, type, plan_name, customer_amount, amount, status, reference, provider_reference, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Unable to load transactions: ${error.message}`);
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const emailMap = new Map<string, string>();

  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (!profileError) {
      for (const profile of profiles ?? []) {
        emailMap.set(profile.id, profile.email ?? "");
      }
    }
  }

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_email: emailMap.get(row.user_id) ?? null,
    type: row.type,
    plan_name: row.plan_name ?? null,
    amount: numberValue(row.customer_amount ?? row.amount),
    status: row.status,
    reference: row.reference ?? row.provider_reference ?? null,
    created_at: row.created_at,
  }));
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const [usersResult, walletsResult, transactionsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("cdh_wallets").select("balance"),
    supabase
      .from("cdh_transactions")
      .select("status, customer_amount, amount, profit"),
  ]);

  if (usersResult.error) {
    throw new Error(`Unable to load user statistics: ${usersResult.error.message}`);
  }
  if (walletsResult.error) {
    throw new Error(`Unable to load wallet statistics: ${walletsResult.error.message}`);
  }
  if (transactionsResult.error) {
    throw new Error(
      `Unable to load transaction statistics: ${transactionsResult.error.message}`,
    );
  }

  const transactions = transactionsResult.data ?? [];
  const successful = transactions.filter((row) => row.status === "success");
  const pending = transactions.filter((row) => row.status === "pending");

  return {
    users: usersResult.count ?? 0,
    fundedWallets: (walletsResult.data ?? []).filter(
      (row) => numberValue(row.balance) > 0,
    ).length,
    successfulTransactions: successful.length,
    transactionVolume: successful.reduce(
      (sum, row) => sum + numberValue(row.customer_amount ?? row.amount),
      0,
    ),
    estimatedProfit: successful.reduce(
      (sum, row) => sum + numberValue(row.profit),
      0,
    ),
    pendingTransactions: pending.length,
  };
}

export async function getPricing(): Promise<PricingRow[]> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_product_pricing")
    .select("*")
    .order("network", { ascending: true });

  if (error) {
    throw new Error(`Unable to load pricing: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    network: row.network ?? "",
    plan_name: row.plan_name ?? "",
    plan_code: row.plan_code ?? null,
    data_size: row.data_size ?? null,
    validity: row.validity ?? null,
    provider_cost: numberValue(row.provider_cost),
    customer_price: numberValue(row.customer_price),
    profit: numberValue(
      row.profit ?? numberValue(row.customer_price) - numberValue(row.provider_cost),
    ),
    is_active: row.is_active !== false,
  }));
}

export async function updatePricing(
  id: string,
  customerPrice: number,
  isActive: boolean,
) {
  await requireAdmin();

  const price = Number(customerPrice);
  if (!id) throw new Error("Pricing row ID is required.");
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Enter a valid customer price.");
  }

  const { data: current, error: currentError } = await supabase
    .from("cdh_product_pricing")
    .select("provider_cost")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    throw new Error(`Unable to read pricing row: ${currentError.message}`);
  }

  if (!current) throw new Error("Pricing row not found.");

  const providerCost = numberValue(current.provider_cost);

  const { error } = await supabase
    .from("cdh_product_pricing")
    .update({
      customer_price: price,
      profit: price - providerCost,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to update pricing: ${error.message}`);
  }
}

export { requireAdmin };
