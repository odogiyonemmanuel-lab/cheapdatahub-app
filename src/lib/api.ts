// src/lib/api.ts

import { supabase } from "./supabase";

/**
 * CheapDataHub API
 *
 * Wallet funding architecture:
 *
 * Browser
 *   ↓
 * Supabase Edge Function: wallet-fund
 *   ↓
 * Flutterwave Checkout
 *   ↓
 * /payment/callback
 *   ↓
 * Supabase Edge Function: flutterwave-verify
 *   ↓
 * Atomic database wallet credit
 *
 * IMPORTANT:
 * - Flutterwave secret key NEVER belongs here.
 * - Supabase service-role key NEVER belongs here.
 * - CDH API secrets NEVER belong here.
 */

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) ?? "";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const WALLET_FUND_FUNCTION = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/wallet-fund`
  : "";

const FLUTTERWAVE_VERIFY_FUNCTION = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/flutterwave-verify`
  : "";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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
  currency: string;
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

export type VerifyWalletResult = {
  success: boolean;
  message: string;
  reference?: string;
  transaction_id?: string;
  amount?: number;
  balance?: number;
  status?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function requireEnv() {
  if (!SUPABASE_URL) {
    throw new Error("Missing VITE_SUPABASE_URL.");
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY.");
  }
}

async function getAccessToken(): Promise<string> {
  requireEnv();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Unable to read login session: ${error.message}`);
  }

  if (!session?.access_token) {
    throw new Error("You must be logged in.");
  }

  return session.access_token;
}

async function getFunctionHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON_KEY!,
    "Content-Type": "application/json",
  };
}

async function callEdgeFunction<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!url) {
    throw new Error("Supabase Edge Function URL is not configured.");
  }

  const headers = await getFunctionHeaders();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let result: unknown = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    if (
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof (result as { message?: unknown }).message === "string"
    ) {
      message = (result as { message: string }).message;
    } else if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof (result as { error?: unknown }).error === "string"
    ) {
      message = (result as { error: string }).error;
    }

    throw new Error(message);
  }

  return result as T;
}

function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
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

export async function getTransactions(
  limit = 100,
): Promise<ApiTransaction[]> {
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
/* Airtime / Data                                                             */
/* -------------------------------------------------------------------------- */

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

  // Keep VTU traffic on your existing vtu-proxy.
  return callEdgeFunction<PurchaseResult>(
    `${SUPABASE_URL}/functions/v1/vtu-proxy`,
    {
      action: "airtime/purchase",
      provider_id: params.provider_id,
      phone_number: phone,
      amount,
      network: params.network,
    },
  );
}

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

  return callEdgeFunction<PurchaseResult>(
    `${SUPABASE_URL}/functions/v1/vtu-proxy`,
    {
      action: "data/purchase",
      provider_id: params.provider_id,
      phone_number: phone,
      plan_id: params.plan_id,
      plan_code: params.plan_code,
      plan_name: params.plan_name,
      amount: params.amount,
      network: params.network,
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Flutterwave wallet funding                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Start Flutterwave wallet funding.
 *
 * This calls wallet-fund directly.
 *
 * NEVER put FLW_SECRET_KEY in this file.
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

  return callEdgeFunction<FundWalletResult>(WALLET_FUND_FUNCTION, {
    amount,
    email: params.email ?? user.email ?? "",
    name: params.name ?? "",
    phone: params.phone ?? "",
  });
}

/**
 * Verify Flutterwave wallet funding.
 *
 * transactionId is the Flutterwave transaction ID returned
 * by the redirect.
 *
 * txRef is the merchant reference generated by wallet-fund.
 */
export async function verifyWalletFunding(params: {
  transactionId: string | number;
  txRef: string;
}): Promise<VerifyWalletResult> {
  const transactionId = String(params.transactionId).trim();
  const txRef = String(params.txRef).trim();

  if (!transactionId) {
    throw new Error("Flutterwave transaction ID is required.");
  }

  if (!txRef) {
    throw new Error("Flutterwave transaction reference is required.");
  }

  return callEdgeFunction<VerifyWalletResult>(
    FLUTTERWAVE_VERIFY_FUNCTION,
    {
      transaction_id: transactionId,
      tx_ref: txRef,
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Convenience                                                                */
/* -------------------------------------------------------------------------- */

export async function refreshWallet() {
  return getWalletBalance();
}

export async function refreshTransactions(limit = 100) {
  return getTransactions(limit);
}

export function calculateProfit(
  providerCost: number,
  customerPrice: number,
): number {
  return Math.max(
    0,
    Number(customerPrice || 0) - Number(providerCost || 0),
  );
}

export function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

/**
 * Generic authenticated request.
 *
 * Retained for non-wallet functions.
 */
export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  requireEnv();

  const accessToken = await getAccessToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${path.replace(/^\/+/, "")}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY!,
        "Content-Type": "application/json",
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
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body as T;
}
