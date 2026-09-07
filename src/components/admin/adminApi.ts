import { supabase } from "@/lib/supabase";

async function requireAdmin() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Unable to verify login: ${userError.message}`);
  if (!user) throw new Error("You must be signed in.");
  const { data: isAdmin, error: adminError } = await supabase.rpc("cdh_is_current_user_admin");
  if (adminError) throw new Error(`Unable to verify administrator access: ${adminError.message}`);
  if (isAdmin !== true) throw new Error("Administrator access required.");
  return user;
}

export type AdminUser = { id: string; user_id: string; email: string; full_name: string; wallet_balance: number; is_active: boolean; created_at?: string | null };
export type AdminStats = { users: number; fundedWallets: number; successfulTransactions: number; transactionVolume: number; estimatedProfit: number; pendingTransactions: number };
export type AdminTransaction = { id: string; user_id: string; user_email?: string | null; type: string; plan_name?: string | null; amount: number; status: string; reference?: string | null; created_at: string };
export type AdminReferral = { referral_id: string; referral_code: string; referrer_id: string; referrer_email: string; referrer_name: string; referee_id: string; referee_email: string; referee_name: string; status: string; referrer_reward: number; referee_reward: number; created_at: string; completed_at?: string | null };
export type PricingRow = { id: string; network: string; plan_name: string; plan_code?: string | null; data_size?: string | null; validity?: string | null; provider_cost: number; customer_price: number; profit: number; is_active: boolean };

const numberValue = (value: unknown): number => { const number = Number(value); return Number.isFinite(number) ? number : 0; };

export async function getAdminUsers(search = ""): Promise<AdminUser[]> {
  await requireAdmin();
  const { data, error } = await supabase.rpc("cdh_admin_users");
  if (error) throw new Error(`Unable to load users: ${error.message}`);
  let users: AdminUser[] = (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id ?? row.user_id ?? ""), user_id: String(row.user_id ?? row.id ?? ""), email: String(row.email ?? ""), full_name: String(row.full_name ?? "").trim() || "Unnamed user", wallet_balance: numberValue(row.wallet_balance ?? row.balance), is_active: row.is_active !== false, created_at: row.created_at ? String(row.created_at) : null }));
  const term = search.trim().toLowerCase();
  if (term) users = users.filter((user) => user.full_name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.user_id.toLowerCase().includes(term));
  return users;
}

export async function getAdminReferrals(): Promise<AdminReferral[]> {
  await requireAdmin();
  const { data, error } = await supabase.rpc("cdh_admin_referrals");
  if (error) throw new Error(`Unable to load referrals: ${error.message}`);
  return (data ?? []).map((row: Record<string, unknown>) => ({ referral_id: String(row.referral_id ?? ""), referral_code: String(row.referral_code ?? ""), referrer_id: String(row.referrer_id ?? ""), referrer_email: String(row.referrer_email ?? ""), referrer_name: String(row.referrer_name ?? "").trim() || "Unnamed user", referee_id: String(row.referee_id ?? ""), referee_email: String(row.referee_email ?? ""), referee_name: String(row.referee_name ?? "").trim() || "Unnamed user", status: String(row.status ?? "pending"), referrer_reward: numberValue(row.referrer_reward), referee_reward: numberValue(row.referee_reward), created_at: String(row.created_at ?? ""), completed_at: row.completed_at ? String(row.completed_at) : null }));
}

export async function setAdmin(userId: string, active = true) { await requireAdmin(); if (!userId) throw new Error("User ID is required."); const { data, error } = await supabase.rpc("cdh_admin_set_admin", { p_user_id: userId, p_active: active }); if (error) throw new Error(`Unable to update administrator access: ${error.message}`); return { success: data === true }; }
export async function removeAdmin(userId: string) { return setAdmin(userId, false); }

export async function adjustWallet(userId: string, amount: number, reason: string) { await requireAdmin(); const value = Number(amount); if (!userId) throw new Error("User ID is required."); if (!Number.isFinite(value) || value === 0) throw new Error("Wallet adjustment must be a non-zero number."); const cleanReason = reason.trim(); if (!cleanReason) throw new Error("A reason is required."); const { data, error } = await supabase.rpc("cdh_admin_adjust_wallet", { p_user_id: userId, p_amount: value, p_reason: cleanReason }); if (error) throw new Error(`Unable to adjust wallet: ${error.message}`); const result = Array.isArray(data) ? data[0] : data; return { success: true, balance: numberValue(result?.balance), reference: result?.reference ?? null, reason: cleanReason }; }

export async function getAdminTransactions(): Promise<AdminTransaction[]> {
  await requireAdmin();
  const { data, error } = await supabase.from("cdh_transactions").select("id, user_id, transaction_type, status, reference, plan_name, customer_amount, created_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Unable to load transactions: ${error.message}`);
  return (data ?? []).map((row) => ({ id: row.id, user_id: row.user_id, user_email: null, type: row.transaction_type ?? "", plan_name: row.plan_name ?? null, amount: numberValue(row.customer_amount), status: row.status ?? "", reference: row.reference ?? null, created_at: row.created_at }));
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const { data, error } = await supabase.rpc("cdh_admin_stats");
  if (error) throw new Error(`Unable to load dashboard statistics: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { users: numberValue(row?.users), fundedWallets: numberValue(row?.funded_wallets), successfulTransactions: numberValue(row?.successful_transactions), transactionVolume: numberValue(row?.transaction_volume), estimatedProfit: numberValue(row?.estimated_profit), pendingTransactions: numberValue(row?.pending_transactions) };
}

export async function getPricing(): Promise<PricingRow[]> { await requireAdmin(); const { data, error } = await supabase.from("cdh_product_pricing").select("*").order("network", { ascending: true }); if (error) throw new Error(`Unable to load pricing: ${error.message}`); return (data ?? []).map((row) => { const providerCost = numberValue(row.provider_cost); const customerPrice = numberValue(row.customer_price); return { id: String(row.id), network: row.network ?? "", plan_name: row.plan_name ?? "", plan_code: row.plan_code ?? null, data_size: row.data_size ?? null, validity: row.validity ?? null, provider_cost: providerCost, customer_price: customerPrice, profit: numberValue(row.profit ?? customerPrice - providerCost), is_active: row.is_active !== false }; }); }

export async function updatePricing(id: string, customerPrice: number, isActive: boolean) { await requireAdmin(); if (!id) throw new Error("Pricing row ID is required."); const price = Number(customerPrice); if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid customer price."); const { data: current, error: currentError } = await supabase.from("cdh_product_pricing").select("provider_cost").eq("id", id).maybeSingle(); if (currentError) throw new Error(`Unable to read pricing row: ${currentError.message}`); if (!current) throw new Error("Pricing row not found."); const providerCost = numberValue(current.provider_cost); const profit = price - providerCost; const { error } = await supabase.from("cdh_product_pricing").update({ customer_price: price, profit, is_active: isActive }).eq("id", id); if (error) throw new Error(`Unable to update pricing: ${error.message}`); return { success: true, customer_price: price, profit, is_active: isActive }; }

export { requireAdmin };
