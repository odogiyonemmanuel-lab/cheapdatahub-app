import { supabase } from "../../lib/supabase";

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
  status: string;
  reference: string | null;
  created_at: string;
  user_email?: string | null;
};

export type PricingRow = {
  id: string;
  network: string;
  product_type: "data" | "airtime";
  provider_id: string | null;
  plan_code: string | null;
  plan_name: string;
  provider_price: number;
  selling_price: number;
  active: boolean;
  updated_at: string;
};

async function requireAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Administrator access required.");
  }

  return user;
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_dashboard_stats"
  );

  if (error) throw error;

  return data as AdminStats;
}

export async function getAdminUsers(
  search = ""
): Promise<AdminUser[]> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_list_users",
    {
      p_search: search || null,
    }
  );

  if (error) throw error;

  return (data ?? []) as AdminUser[];
}

export async function getAdminTransactions(): Promise<
  AdminTransaction[]
> {
  await requireAdmin();

  const { data, error } = await supabase.rpc(
    "admin_list_transactions",
    {
      p_limit: 100,
    }
  );

  if (error) throw error;

  return (data ?? []) as AdminTransaction[];
}

export async function getPricing(): Promise<PricingRow[]> {
  await requireAdmin();

  const { data, error } = await supabase
    .from("product_pricing")
    .select("*")
    .order("network")
    .order("product_type")
    .order("plan_name");

  if (error) throw error;

  return (data ?? []) as PricingRow[];
}

export async function updatePricing(
  id: string,
  sellingPrice: number,
  active: boolean
) {
  await requireAdmin();

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new Error(
      "Selling price must be a valid non-negative amount."
    );
  }

  const { error } = await supabase
    .from("product_pricing")
    .update({
      selling_price: sellingPrice,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function adjustWallet(
  userId: string,
  amount: number,
  reason: string
) {
  await requireAdmin();

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Enter a non-zero amount.");
  }

  if (!reason.trim()) {
    throw new Error("A reason is required.");
  }

  const { error } = await supabase.rpc(
    "admin_adjust_wallet",
    {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason.trim(),
    }
  );

  if (error) throw error;
}

export async function setAdmin(
  userId: string,
  enabled: boolean
) {
  await requireAdmin();

  if (enabled) {
    const { error } = await supabase
      .from("admin_users")
      .upsert(
        { user_id: userId },
        { onConflict: "user_id" }
      );

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}
