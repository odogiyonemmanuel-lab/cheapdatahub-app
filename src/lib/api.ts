// src/lib/api.ts

import { supabase } from "./supabase";

/**
 * CheapDataHub API
 *
 * IMPORTANT:
 * - Flutterwave secret key is NEVER used here.
 * - Flutterwave secret hash is NEVER used here.
 * - CDH API secret key is NEVER used here.
 *
 * Those secrets belong in Supabase Edge Function Secrets.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const EDGE_FUNCTION = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/vtu-proxy`
  : "";

export type ApiTransaction = {
  id: string;
  user_id?: string;
  type: "data" | "airtime" | string;
  network: string;
  phone_number: string;
  plan_name?: string | null;
  amount: number;
  customer_amount?: number;
  provider_cost?: number;
  profit?: number;
  status: "pending" | "success" | "failed" | string;
  reference?: string | null;
  provider_reference?: string | null;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
};

export type WalletBalance = {
  balance: number;
  currency?: string;
};

export type PricingItem = {
  id: string;
  product_id?: string | null;
  network: string;
  plan_name?: string | null;
  plan_code?: string | null;
  provider_cost: number;
  customer_price: number;
  profit: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PurchaseResult = {
  success: boolean;
  message: string;
  reference?: string;
  transaction_id?: string;
  balance?: number;
  data?: unknown;
};

export type FundWalletResult = {
  success: boolean;
  message: string;
  reference?: string;
  payment_link?: string;
  checkout_url?: string;
  amount?: number;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function requireEnv() {
  if (!SUPABASE_URL) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  requireEnv();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be logged in.");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY!,
    "Content-Type": "application/json",
  };
}

async function edgeFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!EDGE_FUNCTION) {
    throw new Error("Supabase URL is not configured.");
  }

  const headers = await getAuthHeaders();

  const response = await fetch(
    `${EDGE_FUNCTION}/${path.replace(/^\/+/, "")}`,
    {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    },
  );

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorMessage =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : body &&
            typeof body === "object" &&
            "message" in body &&
            typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return body as T;
}

function toNumber(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

/* -------------------------------------------------------------------------- */
/* Current user                                                               */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

/* -------------------------------------------------------------------------- */
/* Wallet                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Get the logged-in customer's real wallet balance.
 *
 * Uses the cdh_wallets table created by your SQL setup.
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("cdh_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }

  return {
    balance: toNumber(data?.balance),
    currency: "NGN",
  };
}

/**
 * Return the complete wallet record.
 */
export async function getWallet() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("cdh_wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }

  return data;
}

/**
 * Get the customer's wallet ledger.
 *
 * This is the permanent record of:
 * + wallet credits
 * - wallet debits
 */
export async function getWalletLedger(limit = 100) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("cdh_wallet_ledger")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch wallet ledger: ${error.message}`);
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export async function getTransactions(limit = 100): Promise<ApiTransaction[]> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("cdh_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return (data ?? []).map((tx) => ({
    ...tx,
    amount: toNumber(tx.customer_amount ?? tx.amount),
    customer_amount: toNumber(tx.customer_amount ?? tx.amount),
    provider_cost: toNumber(tx.provider_cost),
    profit: toNumber(tx.profit),
  })) as ApiTransaction[];
}

/* -------------------------------------------------------------------------- */
/* Public pricing                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Get active customer-facing product prices.
 *
 * The customer sees customer_price.
 * Provider cost remains private.
 */
export async function getProductPricing(): Promise<PricingItem[]> {
  const { data, error } = await supabase
    .from("cdh_product_pricing")
    .select("*")
    .eq("is_active", true)
    .order("network", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch product pricing: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    ...item,
    provider_cost: toNumber(item.provider_cost),
    customer_price: toNumber(item.customer_price),
    profit: toNumber(
      item.profit ??
        toNumber(item.customer_price) - toNumber(item.provider_cost),
    ),
  })) as PricingItem[];
}

/**
 * Get pricing for one product.
 */
export async function getProductPrice(productId: string) {
  if (!productId) {
    throw new Error("Product ID is required.");
  }

  const { data, error } = await supabase
    .from("cdh_product_pricing")
    .select("*")
    .eq("product_id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch product price: ${error.message}`);
  }

  if (!data) {
    throw new Error("This product is currently unavailable.");
  }

  return {
    ...data,
    provider_cost: toNumber(data.provider_cost),
    customer_price: toNumber(data.customer_price),
    profit: toNumber(
      data.profit ??
        toNumber(data.customer_price) - toNumber(data.provider_cost),
    ),
  } as PricingItem;
}

/* -------------------------------------------------------------------------- */
/* Data / Airtime purchase                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Purchase airtime.
 *
 * IMPORTANT:
 * The actual provider API call and wallet debit must happen
 * server-side in Supabase Edge Functions.
 *
 * The browser must NEVER contain the CDH secret API key.
 */
export async function purchaseAirtime(params: {
  provider_id?: string;
  phone_number: string;
  amount: number;
  network: string;
}): Promise<PurchaseResult> {
  const phone = params.phone_number.trim();
  const amount = Number(params.amount);

  if (!phone) {
    throw new Error("Phone number is required.");
  }

  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error("Enter a valid phone number.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid airtime amount.");
  }

  if (!params.network) {
    throw new Error("Network is required.");
  }

  return edgeFetch<PurchaseResult>("airtime/purchase", {
    method: "POST",
    body: JSON.stringify({
      provider_id: params.provider_id,
      phone_number: phone,
      amount,
      network: params.network,
    }),
  });
}

/**
 * Purchase data.
 */
export async function purchaseData(params: {
  provider_id?: string;
  phone_number: string;
  plan_id?: string;
  plan_code?: string;
  plan_name?: string;
  amount?: number;
  network: string;
}): Promise<PurchaseResult> {
  const phone = params.phone_number.trim();

  if (!phone) {
    throw new Error("Phone number is required.");
  }

  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error("Enter a valid phone number.");
  }

  if (!params.network) {
    throw new Error("Network is required.");
  }

  if (!params.plan_id && !params.plan_code) {
    throw new Error("Data plan is required.");
  }

  return edgeFetch<PurchaseResult>("data/purchase", {
    method: "POST",
    body: JSON.stringify({
      provider_id: params.provider_id,
      phone_number: phone,
      plan_id: params.plan_id,
      plan_code: params.plan_code,
      plan_name: params.plan_name,
      amount: params.amount,
      network: params.network,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Flutterwave wallet funding                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Start a Flutterwave wallet funding transaction.
 *
 * Flutterwave Secret Key is NOT used from the browser.
 * The Supabase Edge Function uses FLW_SECRET_KEY.
 */
export async function initializeWalletFunding(params: {
  amount: number;
  email?: string;
  name?: string;
  phone?: string;
}): Promise<FundWalletResult> {
  const amount = Number(params.amount);

  if (!Number.isFinite(amount) || amount < 100) {
    throw new Error("Minimum wallet funding amount is ₦100.");
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return edgeFetch<FundWalletResult>("wallet/fund", {
    method: "POST",
    body: JSON.stringify({
      amount,
      email: params.email ?? user.email,
      name: params.name ?? "",
      phone: params.phone ?? "",
    }),
  });
}

/**
 * Verify a Flutterwave payment after checkout.
 *
 * Final wallet credit should still be controlled by the
 * server-side verification/webhook logic.
 */
export async function verifyWalletFunding(reference: string) {
  if (!reference) {
    throw new Error("Payment reference is required.");
  }

  return edgeFetch<FundWalletResult>("wallet/verify", {
    method: "POST",
    body: JSON.stringify({
      reference,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                        */
/* -------------------------------------------------------------------------- */

export async function refreshWallet() {
  return getWalletBalance();
}

export async function refreshTransactions(limit = 100) {
  return getTransactions(limit);
}

/**
 * Calculate profit on the frontend for display only.
 *
 * The authoritative profit should always be calculated/stored
 * server-side when the transaction is created.
 */
export function calculateProfit(
  providerCost: number,
  customerPrice: number,
): number {
  return Math.max(
    0,
    Number(customerPrice || 0) - Number(providerCost || 0),
  );
}

/**
 * Format NGN amount.
 */
export function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

/**
 * Generic authenticated request helper.
 *
 * Useful for future admin functions.
 */
export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return edgeFetch<T>(path, options);
}
