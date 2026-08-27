// src/lib/api.ts

import { supabase } from "./supabase";

/**
 * CheapDataHub API
 *
 * IMPORTANT:
 * - Flutterwave Secret Key is NEVER used in the browser.
 * - Flutterwave Secret Hash is NEVER used in the browser.
 * - CDH API Secret Key is NEVER used in the browser.
 *
 * All secrets belong in Supabase Edge Function Secrets.
 */

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL as string | undefined;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const EDGE_FUNCTION = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/vtu-proxy`
  : "";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ApiTransaction = {
  id: string;
  user_id?: string;

  type:
    | "data"
    | "airtime"
    | "wallet_funding"
    | string;

  network: string;

  phone_number?: string;

  plan_name?: string | null;

  amount: number;

  customer_amount?: number;

  provider_cost?: number;

  profit?: number;

  status:
    | "pending"
    | "success"
    | "failed"
    | string;

  reference?: string | null;

  provider_reference?: string | null;

  created_at: string;

  updated_at?: string;

  metadata?: Record<string, unknown> | null;
};

/**
 * Customer wallet.
 */
export type WalletBalance = {
  balance: number;
  currency?: string;
};

/**
 * Frontend pricing representation.
 *
 * IMPORTANT:
 * These names are frontend names.
 * They are mapped from the real database columns:
 *
 * selling_price -> customer_price
 * active        -> is_active
 */
export type PricingItem = {
  id: string;

  product_id?: string | null;

  provider_id?: string | null;

  network: string;

  plan_name?: string | null;

  plan_code?: string | null;

  data_size?: string | null;

  validity?: string | null;

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

  transaction_id?: string;

  data?: unknown;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function requireEnv(): void {
  if (!SUPABASE_URL) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Check your Vercel environment variables."
    );
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY. Check your Vercel environment variables."
    );
  }
}

/**
 * Convert an unknown value to a safe number.
 */
function toNumber(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

/**
 * Get the current Supabase session.
 */
async function getSession() {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `Unable to get authentication session: ${error.message}`
    );
  }

  return data.session;
}

/**
 * Build authenticated headers for Edge Functions.
 */
async function getAuthHeaders(): Promise<
  Record<string, string>
> {
  requireEnv();

  const session = await getSession();

  if (!session?.access_token) {
    throw new Error(
      "You must be logged in to perform this action."
    );
  }

  return {
    Authorization: `Bearer ${session.access_token}`,

    apikey: SUPABASE_ANON_KEY!,

    "Content-Type": "application/json",
  };
}

/**
 * Call the VTU Supabase Edge Function.
 */
async function edgeFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  requireEnv();

  if (!EDGE_FUNCTION) {
    throw new Error(
      "Supabase Edge Function URL is not configured."
    );
  }

  const headers =
    await getAuthHeaders();

  const cleanPath =
    path.replace(/^\/+/, "");

  const url =
    `${EDGE_FUNCTION}/${cleanPath}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,

      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error(
      "Supabase Edge Function network error:",
      {
        url,
        error,
      }
    );

    if (
      error instanceof TypeError
    ) {
      throw new Error(
        "Unable to connect to the CheapDataHub server. " +
        "Please check your Supabase URL, Vercel environment variables, " +
        "and Edge Function deployment."
      );
    }

    throw error;
  }

  let body: unknown = null;

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      body =
        await response.json();
    } catch {
      body = null;
    }
  } else {
    try {
      const text =
        await response.text();

      body =
        text || null;
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    let errorMessage =
      `Request failed with status ${response.status}.`;

    if (
      body &&
      typeof body === "object"
    ) {
      const objectBody =
        body as Record<
          string,
          unknown
        >;

      if (
        typeof objectBody.error ===
        "string"
      ) {
        errorMessage =
          objectBody.error;
      } else if (
        typeof objectBody.message ===
        "string"
      ) {
        errorMessage =
          objectBody.message;
      }
    } else if (
      typeof body === "string" &&
      body.trim()
    ) {
      errorMessage =
        body;
    }

    throw new Error(
      errorMessage
    );
  }

  return body as T;
}

/* -------------------------------------------------------------------------- */
/* Current user                                                               */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Unable to get current user: ${error.message}`
    );
  }

  return user;
}

/* -------------------------------------------------------------------------- */
/* Wallet                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Get the logged-in customer's wallet balance.
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cdh_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch wallet: ${error.message}`
    );
  }

  return {
    balance:
      toNumber(data?.balance),

    currency: "NGN",
  };
}

/**
 * Get the complete wallet record.
 */
export async function getWallet() {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cdh_wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch wallet: ${error.message}`
    );
  }

  return data;
}

/**
 * Get customer's wallet ledger.
 */
export async function getWalletLedger(
  limit = 100
) {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cdh_wallet_ledger")
    .select("*")
    .eq("user_id", user.id)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to fetch wallet ledger: ${error.message}`
    );
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export async function getTransactions(
  limit = 100
): Promise<ApiTransaction[]> {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cdh_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to fetch transactions: ${error.message}`
    );
  }

  return (
    data ?? []
  ).map((tx) => ({
    ...tx,

    amount: toNumber(
      tx.customer_amount ??
        tx.amount
    ),

    customer_amount:
      toNumber(
        tx.customer_amount ??
          tx.amount
      ),

    provider_cost:
      toNumber(
        tx.provider_cost
      ),

    profit:
      toNumber(
        tx.profit
      ),
  })) as ApiTransaction[];
}

/* -------------------------------------------------------------------------- */
/* Product pricing                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Get active customer-facing product prices.
 *
 * REAL DATABASE COLUMNS:
 *
 * id
 * provider_id
 * network
 * plan_name
 * data_size
 * validity
 * provider_cost
 * selling_price
 * active
 * featured
 * sort_order
 * created_at
 * updated_at
 *
 * We map them to the frontend representation.
 */
export async function getProductPricing(): Promise<
  PricingItem[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("cdh_product_pricing")
    .select(
      `
        id,
        provider_id,
        network,
        plan_name,
        data_size,
        validity,
        provider_cost,
        selling_price,
        active,
        created_at,
        updated_at
      `
    )
    .eq("active", true)
    .order(
      "network",
      {
        ascending: true,
      }
    )
    .order(
      "plan_name",
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      `Failed to fetch product pricing: ${error.message}`
    );
  }

  return (
    data ?? []
  ).map((item) => {
    const providerCost =
      toNumber(
        item.provider_cost
      );

    const customerPrice =
      toNumber(
        item.selling_price
      );

    return {
      id: item.id,

      product_id: null,

      provider_id:
        item.provider_id ??
        null,

      network:
        item.network,

      plan_name:
        item.plan_name ??
        null,

      plan_code: null,

      data_size:
        item.data_size ??
        null,

      validity:
        item.validity ??
        null,

      provider_cost:
        providerCost,

      customer_price:
        customerPrice,

      profit:
        customerPrice -
        providerCost,

      is_active:
        Boolean(item.active),

      created_at:
        item.created_at,

      updated_at:
        item.updated_at,
    };
  });
}

/**
 * Get pricing for one product.
 *
 * The actual table does NOT have product_id.
 *
 * Therefore this helper supports lookup by
 * network + plan name instead of assuming
 * a nonexistent product_id column.
 */
export async function getProductPrice(
  network: string,
  planName: string
): Promise<PricingItem> {
  const cleanNetwork =
    network.trim();

  const cleanPlanName =
    planName.trim();

  if (!cleanNetwork) {
    throw new Error(
      "Network is required."
    );
  }

  if (!cleanPlanName) {
    throw new Error(
      "Plan name is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("cdh_product_pricing")
    .select(
      `
        id,
        provider_id,
        network,
        plan_name,
        data_size,
        validity,
        provider_cost,
        selling_price,
        active,
        created_at,
        updated_at
      `
    )
    .eq(
      "network",
      cleanNetwork
    )
    .eq(
      "plan_name",
      cleanPlanName
    )
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch product price: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "This product is currently unavailable."
    );
  }

  const providerCost =
    toNumber(
      data.provider_cost
    );

  const customerPrice =
    toNumber(
      data.selling_price
    );

  return {
    id: data.id,

    product_id: null,

    provider_id:
      data.provider_id ??
      null,

    network:
      data.network,

    plan_name:
      data.plan_name ??
      null,

    plan_code: null,

    data_size:
      data.data_size ??
      null,

    validity:
      data.validity ??
      null,

    provider_cost:
      providerCost,

    customer_price:
      customerPrice,

    profit:
      customerPrice -
      providerCost,

    is_active:
      Boolean(data.active),

    created_at:
      data.created_at,

    updated_at:
      data.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Airtime purchase                                                           */
/* -------------------------------------------------------------------------- */

export async function purchaseAirtime(
  params: {
    provider_id?: string;

    phone_number: string;

    amount: number;

    network: string;
  }
): Promise<PurchaseResult> {
  const phone =
    params.phone_number.trim();

  const amount =
    Number(params.amount);

  if (!phone) {
    throw new Error(
      "Phone number is required."
    );
  }

  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error(
      "Enter a valid phone number."
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Enter a valid airtime amount."
    );
  }

  if (!params.network) {
    throw new Error(
      "Network is required."
    );
  }

  return edgeFetch<PurchaseResult>(
    "airtime/purchase",
    {
      method: "POST",

      body: JSON.stringify({
        provider_id:
          params.provider_id,

        phone_number:
          phone,

        amount,

        network:
          params.network,
      }),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Data purchase                                                              */
/* -------------------------------------------------------------------------- */

export async function purchaseData(
  params: {
    provider_id?: string;

    phone_number: string;

    plan_id?: string;

    plan_code?: string;

    plan_name?: string;

    amount?: number;

    network: string;
  }
): Promise<PurchaseResult> {
  const phone =
    params.phone_number.trim();

  if (!phone) {
    throw new Error(
      "Phone number is required."
    );
  }

  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error(
      "Enter a valid phone number."
    );
  }

  if (!params.network) {
    throw new Error(
      "Network is required."
    );
  }

  if (
    !params.plan_id &&
    !params.plan_code &&
    !params.plan_name
  ) {
    throw new Error(
      "Data plan is required."
    );
  }

  return edgeFetch<PurchaseResult>(
    "data/purchase",
    {
      method: "POST",

      body: JSON.stringify({
        provider_id:
          params.provider_id,

        phone_number:
          phone,

        plan_id:
          params.plan_id,

        plan_code:
          params.plan_code,

        plan_name:
          params.plan_name,

        amount:
          params.amount,

        network:
          params.network,
      }),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Flutterwave wallet funding                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Initialize Flutterwave wallet funding.
 *
 * Browser:
 *
 * FundWallet
 *     ↓
 * initializeWalletFunding()
 *     ↓
 * vtu-proxy/wallet/fund
 *
 * Flutterwave Secret Key NEVER enters this file.
 */
export async function initializeWalletFunding(
  params: {
    amount: number;

    email?: string;

    name?: string;

    phone?: string;
  }
): Promise<FundWalletResult> {
  const amount =
    Number(params.amount);

  if (
    !Number.isFinite(amount) ||
    amount < 100
  ) {
    throw new Error(
      "Minimum wallet funding amount is ₦100."
    );
  }

  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const email =
    params.email?.trim() ||
    user.email ||
    "";

  if (!email) {
    throw new Error(
      "Your account email is required for payment."
    );
  }

  try {
    const result =
      await edgeFetch<FundWalletResult>(
        "wallet/fund",
        {
          method: "POST",

          body: JSON.stringify({
            amount,

            email,

            name:
              params.name?.trim() ||
              "",

            phone:
              params.phone?.trim() ||
              "",
          }),
        }
      );

    return result;
  } catch (error) {
    console.error(
      "Wallet funding initialization failed:",
      error
    );

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Flutterwave verification                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Verify Flutterwave wallet funding.
 *
 * Final wallet credit must remain server-side.
 */
export async function verifyWalletFunding(
  reference: string
) {
  const cleanReference =
    reference.trim();

  if (!cleanReference) {
    throw new Error(
      "Payment reference is required."
    );
  }

  return edgeFetch<FundWalletResult>(
    "wallet/verify",
    {
      method: "POST",

      body: JSON.stringify({
        reference:
          cleanReference,
      }),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                        */
/* -------------------------------------------------------------------------- */

export async function refreshWallet() {
  return getWalletBalance();
}

export async function refreshTransactions(
  limit = 100
) {
  return getTransactions(limit);
}

/**
 * Calculate profit for display.
 *
 * Server-side profit remains authoritative.
 */
export function calculateProfit(
  providerCost: number,
  customerPrice: number
): number {
  return (
    Number(customerPrice || 0) -
    Number(providerCost || 0)
  );
}

/**
 * Format NGN amount.
 */
export function formatNairaAmount(
  amount: number
): string {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",

      currency: "NGN",

      maximumFractionDigits: 0,
    }
  ).format(
    Number(amount) || 0
  );
}

/**
 * Generic authenticated Edge Function request.
 */
export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return edgeFetch<T>(
    path,
    options
  );
}
