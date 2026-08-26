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
===================================================== */

async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify administrator access: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Administrator access required.");
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

  return (
    data ?? {
      users: 0,
      fundedWallets: 0,
      successfulTransactions: 0,
      transactionVolume: 0,
      estimatedProfit: 0,
      pendingTransactions: 0,
    }
  ) as AdminStats;
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
    wallet_balance: Number(user.wallet_balance ?? 0),
  }));
}

/* =====================================================
   ADMIN TRANSACTIONS
===================================================== */

export async function getAdminTransactions(
  limit = 100
): Promise<AdminTransaction[]> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_list_transactions",
    {
      p_limit: limit,
    }
  );

  if (error) {
    throw new Error(
      `Unable to load transactions: ${error.message}`
    );
  }

  return (data ?? []).map((transaction: AdminTransaction) => ({
    ...transaction,
    amount: Number(
      transaction.customer_amount ??
      transaction.amount ??
      0
    ),
    customer_amount: Number(
      transaction.customer_amount ??
      transaction.amount ??
      0
    ),
    provider_cost: Number(
      transaction.provider_cost ?? 0
    ),
    profit: Number(
      transaction.profit ?? 0
    ),
  }));
}

/* =====================================================
   PRICING
===================================================== */

export async function getPricing(): Promise<PricingRow[]> {
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
      ...item,

      product_id:
        item.product_id ?? null,

      provider_cost:
        providerCost,

      customer_price:
        customerPrice,

      profit: Number(
        item.profit ??
          customerPrice - providerCost
      ),

      is_active:
        Boolean(item.is_active),
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
    throw new Error("Pricing ID is required.");
  }

  if (
    !Number.isFinite(customerPrice) ||
    customerPrice < 0
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
    existing.provider_cost ?? 0
  );

  const profit =
    Number(customerPrice) - providerCost;

  const { error } = await supabase
    .from("cdh_product_pricing")
    .update({
      customer_price: Number(customerPrice),

      profit,

      is_active: isActive,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to update pricing: ${error.message}`
    );
  }
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
    throw new Error("User ID is required.");
  }

  if (
    !Number.isFinite(amount) ||
    amount === 0
  ) {
    throw new Error(
      "Enter a non-zero amount."
    );
  }

  if (!reason.trim()) {
    throw new Error(
      "A reason is required."
    );
  }

  const { data, error } = await supabase.rpc(
    "admin_adjust_wallet",
    {
      p_user_id: userId,

      p_amount: Number(amount),

      p_reason: reason.trim(),
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
    throw new Error("User ID is required.");
  }

  if (enabled) {
    const { error } = await supabase
      .from("admin_users")
      .upsert(
        {
          user_id: userId,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw new Error(
        `Unable to grant admin access: ${error.message}`
      );
    }

    return;
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Unable to remove admin access: ${error.message}`
    );
  }
}
