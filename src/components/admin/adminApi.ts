import { supabase } from "@/lib/supabase";

/**
 * Admin API helpers.
 *
 * IMPORTANT:
 * - Browser code never contains SUPABASE_SERVICE_ROLE_KEY.
 * - Browser code never contains Flutterwave secret keys.
 * - Admin access is verified using the server-side RPC:
 *   cdh_is_current_user_admin()
 */

async function requireAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Unable to verify login: ${userError.message}`,
    );
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const {
    data: isAdmin,
    error: adminError,
  } = await supabase.rpc(
    "cdh_is_current_user_admin",
  );

  if (adminError) {
    console.error(
      "Admin verification error:",
      adminError,
    );

    throw new Error(
      `Unable to verify administrator access: ${adminError.message}`,
    );
  }

  if (isAdmin !== true) {
    throw new Error(
      "Administrator access required.",
    );
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
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/* -------------------------------------------------------------------------- */
/* Admin Users                                                                */
/* -------------------------------------------------------------------------- */

export async function getAdminUsers(
  search = "",
): Promise<AdminUser[]> {
  await requireAdmin();

  let query = supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        full_name,
        wallets(balance)
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  const term = search.trim();

  if (term) {
    query = query.or(
      `email.ilike.%${term}%,full_name.ilike.%${term}%`,
    );
  }

  const {
    data,
    error,
  } = await query.limit(100);

  if (error) {
    throw new Error(
      `Unable to load users: ${error.message}`,
    );
  }

  return (data ?? []).map((row) => {
    const wallet = Array.isArray(
      row.wallets,
    )
      ? row.wallets[0]
      : row.wallets;

    return {
      id: row.id,
      user_id: row.id,
      email: row.email ?? "",
      full_name: row.full_name ?? "",
      wallet_balance: numberValue(
        wallet?.balance,
      ),

      /**
       * We do not expose the complete cdh_admins table
       * to the browser anymore.
       */
      is_active: false,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Admin Status                                                               */
/* -------------------------------------------------------------------------- */

/**
 * IMPORTANT:
 *
 * This function requires strict RLS policies.
 *
 * Recommended long-term solution:
 * move admin changes to a Supabase Edge Function.
 */
export async function setAdmin(
  userId: string,
  active = true,
) {
  await requireAdmin();

  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  const {
    error,
  } = await supabase
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
}

/* -------------------------------------------------------------------------- */
/* Wallet                                                                     */
/* -------------------------------------------------------------------------- */

export async function adjustWallet(
  userId: string,
  amount: number,
  reason: string,
) {
  await requireAdmin();

  const value = Number(amount);

  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (
    !Number.isFinite(value) ||
    value === 0
  ) {
    throw new Error(
      "Wallet adjustment must be a non-zero number.",
    );
  }

  if (!reason.trim()) {
    throw new Error(
      "A reason is required.",
    );
  }

  const {
    data: wallet,
    error: walletError,
  } = await supabase
    .from("cdh_wallets")
    .select(
      "id, balance",
    )
    .eq(
      "user_id",
      userId,
    )
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

  const currentBalance = numberValue(
    wallet.balance,
  );

  const nextBalance =
    currentBalance + value;

  if (nextBalance < 0) {
    throw new Error(
      "Wallet balance cannot become negative.",
    );
  }

  const {
    error,
  } = await supabase
    .from("cdh_wallets")
    .update({
      balance: nextBalance,
    })
    .eq(
      "id",
      wallet.id,
    );

  if (error) {
    throw new Error(
      `Unable to adjust wallet: ${error.message}`,
    );
  }

  console.log(
    "Wallet adjusted:",
    {
      userId,
      amount: value,
      reason,
    },
  );

  return {
    success: true,
    balance: nextBalance,
  };
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export async function getAdminTransactions(): Promise<
  AdminTransaction[]
> {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("cdh_transactions")
    .select(
      `
        id,
        user_id,
        type,
        plan_name,
        customer_amount,
        amount,
        status,
        reference,
        provider_reference,
        created_at
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(100);

  if (error) {
    throw new Error(
      `Unable to load transactions: ${error.message}`,
    );
  }

  const rows = data ?? [];

  const userIds = [
    ...new Set(
      rows
        .map(
          (row) => row.user_id,
        )
        .filter(Boolean),
    ),
  ];

  const emailMap =
    new Map<string, string>();

  if (userIds.length > 0) {
    const {
      data: profiles,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, email",
      )
      .in(
        "id",
        userIds,
      );

    if (!profileError) {
      for (
        const profile of profiles ?? []
      ) {
        emailMap.set(
          profile.id,
          profile.email ?? "",
        );
      }
    }
  }

  return rows.map(
    (row) => ({
      id: row.id,

      user_id:
        row.user_id,

      user_email:
        emailMap.get(
          row.user_id,
        ) ?? null,

      type:
        row.type,

      plan_name:
        row.plan_name ?? null,

      amount:
        numberValue(
          row.customer_amount ??
            row.amount,
        ),

      status:
        row.status,

      reference:
        row.reference ??
        row.provider_reference ??
        null,

      created_at:
        row.created_at,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard Statistics                                                       */
/* -------------------------------------------------------------------------- */

export async function getAdminStats(): Promise<
  AdminStats
> {
  await requireAdmin();

  const [
    usersResult,
    walletsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      ),

    supabase
      .from("cdh_wallets")
      .select(
        "balance",
      ),

    supabase
      .from("cdh_transactions")
      .select(
        `
          status,
          customer_amount,
          amount,
          profit
        `,
      ),
  ]);

  if (usersResult.error) {
    throw new Error(
      `Unable to load user statistics: ${usersResult.error.message}`,
    );
  }

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

  const transactions =
    transactionsResult.data ?? [];

  const successful =
    transactions.filter(
      (row) =>
        String(
          row.status,
        ).toLowerCase() ===
        "success",
    );

  const pending =
    transactions.filter(
      (row) =>
        String(
          row.status,
        ).toLowerCase() ===
        "pending",
    );

  const fundedWallets =
    (
      walletsResult.data ?? []
    ).filter(
      (row) =>
        numberValue(
          row.balance,
        ) > 0,
    ).length;

  const transactionVolume =
    successful.reduce(
      (sum, row) =>
        sum +
        numberValue(
          row.customer_amount ??
            row.amount,
        ),

      0,
    );

  const estimatedProfit =
    successful.reduce(
      (sum, row) =>
        sum +
        numberValue(
          row.profit,
        ),

      0,
    );

  return {
    users:
      usersResult.count ?? 0,

    fundedWallets,

    successfulTransactions:
      successful.length,

    transactionVolume,

    estimatedProfit,

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

  const {
    data,
    error,
  } = await supabase
    .from(
      "cdh_product_pricing",
    )
    .select("*")
    .order(
      "network",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load pricing: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row) => {
      const providerCost =
        numberValue(
          row.provider_cost,
        );

      const customerPrice =
        numberValue(
          row.customer_price,
        );

      return {
        id:
          row.id,

        network:
          row.network ?? "",

        plan_name:
          row.plan_name ?? "",

        plan_code:
          row.plan_code ?? null,

        data_size:
          row.data_size ?? null,

        validity:
          row.validity ?? null,

        provider_cost:
          providerCost,

        customer_price:
          customerPrice,

        profit:
          numberValue(
            row.profit ??
              customerPrice -
                providerCost,
          ),

        is_active:
          row.is_active !== false,
      };
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Update Pricing                                                             */
/* -------------------------------------------------------------------------- */

export async function updatePricing(
  id: string,
  customerPrice: number,
  isActive: boolean,
) {
  await requireAdmin();

  const price =
    Number(customerPrice);

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

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from(
      "cdh_product_pricing",
    )
    .select(
      "provider_cost",
    )
    .eq(
      "id",
      id,
    )
    .maybeSingle();

  if (currentError) {
    throw new Error(
      `Unable to read pricing row: ${currentError.message}`,
    );
  }

  if (!current) {
    throw new Error(
      "Pricing row not found.",
    );
  }

  const providerCost =
    numberValue(
      current.provider_cost,
    );

  const profit =
    price - providerCost;

  const {
    error,
  } = await supabase
    .from(
      "cdh_product_pricing",
    )
    .update({
      customer_price: price,
      profit,
      is_active: isActive,
    })
    .eq(
      "id",
      id,
    );

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

export {
  requireAdmin,
};
