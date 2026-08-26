import { supabase } from "@/lib/supabase";

/* =====================================================
   TYPES
===================================================== */

export type AdminStats = {
  users: number;
  fundedWallets: number;
  successfulTransactions: number;
  transactionVolume: number;
  estimatedProfit: number;
  pendingTransactions: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  wallet_balance: number;
};

export type AdminTransaction = {
  id: string;
  user_id: string;
  type: string;
  network: string | null;
  phone_number: string | null;
  plan_name: string | null;
  amount: number;
  customer_amount?: number;
  provider_cost?: number;
  profit?: number;
  status: string;
  reference: string | null;
  created_at: string;
  user_email?: string | null;
};

export type PricingRow = {
  id: string;
  product_id: string | null;
  network: string;
  product_type: "data" | "airtime";
  provider_id: string | null;
  plan_code: string | null;
  plan_name: string;
  provider_cost: number;
  customer_price: number;
  profit: number;
  is_active: boolean;
  created_at?: string;
  updated_at: string;
};

/* =====================================================
   ADMIN CHECK
   IMPORTANT:
   Your actual table is cdh_admins
===================================================== */

async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Unable to verify login: ${userError.message}`
    );
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  /*
   * Your Supabase database contains:
   *
   * cdh_admins
   *   - user_id
   *   - created_at
   *
   * Do NOT use admin_users here.
   */

  const { data, error } = await supabase
    .from("cdh_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify administrator access: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Administrator access required."
    );
  }

  return user;
}

/* =====================================================
   ADMIN DASHBOARD STATS
===================================================== */

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_dashboard_stats"
  );

  if (error) {
    throw new Error(
      `Unable to load admin statistics: ${error.message}`
    );
  }

  if (!data) {
    return {
      users: 0,
      fundedWallets: 0,
      successfulTransactions: 0,
      transactionVolume: 0,
      estimatedProfit: 0,
      pendingTransactions: 0,
    };
  }

  /*
   * Make sure numbers coming from PostgreSQL
   * are converted to JavaScript numbers.
   */

  return {
    users: Number(data.users ?? 0),

    fundedWallets: Number(
      data.fundedWallets ??
      data.funded_wallets ??
      0
    ),

    successfulTransactions: Number(
      data.successfulTransactions ??
      data.successful_transactions ??
      0
    ),

    transactionVolume: Number(
      data.transactionVolume ??
      data.transaction_volume ??
      0
    ),

    estimatedProfit: Number(
      data.estimatedProfit ??
      data.estimated_profit ??
      0
    ),

    pendingTransactions: Number(
      data.pendingTransactions ??
      data.pending_transactions ??
      0
    ),
  };
}

/* =====================================================
   ADMIN USERS
===================================================== */

export async function getAdminUsers(
  search = ""
): Promise<AdminUser[]> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_list_users",
    {
      p_search: search.trim() || null,
    }
  );

  if (error) {
    throw new Error(
      `Unable to load users: ${error.message}`
    );
  }

  return (data ?? []).map((user: AdminUser) => ({
    ...user,

    wallet_balance: Number(
      user.wallet_balance ?? 0
    ),
  }));
}

/* =====================================================
   ADMIN TRANSACTIONS
===================================================== */

export async function getAdminTransactions(
  limit = 100
): Promise<AdminTransaction[]> {
  await requireAdmin();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    500
  );

  const { data, error } = await supabase.rpc(
    "admin_list_transactions",
    {
      p_limit: safeLimit,
    }
  );

  if (error) {
    throw new Error(
      `Unable to load transactions: ${error.message}`
    );
  }

  return (data ?? []).map(
    (transaction: AdminTransaction) => {
      const customerAmount = Number(
        transaction.customer_amount ??
        transaction.amount ??
        0
      );

      const providerCost = Number(
        transaction.provider_cost ?? 0
      );

      const profit = Number(
        transaction.profit ??
        customerAmount - providerCost
      );

      return {
        ...transaction,

        amount: customerAmount,

        customer_amount: customerAmount,

        provider_cost: providerCost,

        profit,
      };
    }
  );
}

/* =====================================================
   PRICING
===================================================== */

export async function getPricing(): Promise<
  PricingRow[]
> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("cdh_product_pricing")
    .select("*")
    .order("network", {
      ascending: true,
    })
    .order("product_type", {
      ascending: true,
    })
    .order("plan_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load pricing: ${error.message}`
    );
  }

  return (data ?? []).map((item) => {
    const providerCost = Number(
      item.provider_cost ?? 0
    );

    const customerPrice = Number(
      item.customer_price ?? 0
    );

    return {
      id: item.id,

      product_id:
        item.product_id ?? null,

      network:
        item.network ?? "",

      product_type:
        item.product_type,

      provider_id:
        item.provider_id ?? null,

      plan_code:
        item.plan_code ?? null,

      plan_name:
        item.plan_name ?? "",

      provider_cost:
        providerCost,

      customer_price:
        customerPrice,

      profit:
        Number(
          item.profit ??
          customerPrice - providerCost
        ),

      is_active:
        Boolean(item.is_active),

      created_at:
        item.created_at,

      updated_at:
        item.updated_at,
    };
  }) as PricingRow[];
}

/* =====================================================
   UPDATE PRICING
===================================================== */

export async function updatePricing(
  id: string,
  customerPrice: number,
  isActive: boolean
) {
  await requireAdmin();

  if (!id) {
    throw new Error(
      "Pricing ID is required."
    );
  }

  const price = Number(customerPrice);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Customer price must be a valid non-negative amount."
    );
  }

  const { data: existing, error: fetchError } =
    await supabase
      .from("cdh_product_pricing")
      .select("provider_cost")
      .eq("id", id)
      .single();

  if (fetchError) {
    throw new Error(
      `Unable to find pricing item: ${fetchError.message}`
    );
  }

  const providerCost = Number(
    existing?.provider_cost ?? 0
  );

  const profit = price - providerCost;

  const { error } = await supabase
    .from("cdh_product_pricing")
    .update({
      customer_price: price,

      profit,

      is_active: Boolean(isActive),

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to update pricing: ${error.message}`
    );
  }

  return true;
}

/* =====================================================
   ADMIN WALLET ADJUSTMENT
===================================================== */

export async function adjustWallet(
  userId: string,
  amount: number,
  reason: string
) {
  await requireAdmin();

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const walletAmount = Number(amount);

  if (
    !Number.isFinite(walletAmount) ||
    walletAmount === 0
  ) {
    throw new Error(
      "Enter a valid non-zero amount."
    );
  }

  const walletReason =
    reason.trim();

  if (!walletReason) {
    throw new Error(
      "A reason is required."
    );
  }

  const { data, error } =
    await supabase.rpc(
      "admin_adjust_wallet",
      {
        p_user_id: userId,

        p_amount:
          walletAmount,

        p_reason:
          walletReason,
      }
    );

  if (error) {
    throw new Error(
      `Wallet adjustment failed: ${error.message}`
    );
  }

  return data;
}

/* =====================================================
   ADMIN ACCESS
===================================================== */

export async function setAdmin(
  userId: string,
  enabled: boolean
) {
  await requireAdmin();

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  /*
   * IMPORTANT:
   * Use cdh_admins, not admin_users.
   */

  if (enabled) {
    const { error } =
      await supabase
        .from("cdh_admins")
        .upsert(
          {
            user_id: userId,
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (error) {
      throw new Error(
        `Unable to grant admin access: ${error.message}`
      );
    }

    return true;
  }

  const { error } =
    await supabase
      .from("cdh_admins")
      .delete()
      .eq(
        "user_id",
        userId
      );

  if (error) {
    throw new Error(
      `Unable to remove admin access: ${error.message}`
    );
  }

  return true;
}
