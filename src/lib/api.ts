import { supabase } from "./supabase";
import type { Transaction } from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY");
}

const EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/vtu-proxy`;

async function getHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }

  if (!session?.access_token) {
    throw new Error("Please sign in to continue");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();

  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text || "Invalid server response",
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        data?.detail ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/**
 * Get the CheapDataHub wallet balance.
 *
 * The actual CDH API key is NEVER exposed to the frontend.
 * It stays inside the Supabase Edge Function.
 */
export async function getWalletBalance(): Promise<{
  balance: number;
}> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION}/wallet/balance`, {
    method: "GET",
    headers,
  });

  const data = await parseResponse(response);

  /*
   * Supports common CDH response shapes:
   *
   * { data: { balance: 1000 } }
   * { balance: 1000 }
   * { data: { wallet_balance: 1000 } }
   */
  const rawBalance =
    data?.data?.balance ??
    data?.data?.wallet_balance ??
    data?.balance ??
    data?.wallet_balance ??
    0;

  const balance = Number(rawBalance);

  if (!Number.isFinite(balance)) {
    throw new Error("Invalid wallet balance returned by server");
  }

  return {
    balance,
  };
}

/**
 * Purchase airtime.
 */
export async function purchaseAirtime(params: {
  provider_id: number;
  phone_number: string;
  amount: number;
  network: string;
}): Promise<{
  message: string;
  reference?: string;
}> {
  if (!params.provider_id) {
    throw new Error("Airtime provider is required");
  }

  if (!params.phone_number) {
    throw new Error("Phone number is required");
  }

  if (!params.amount || params.amount <= 0) {
    throw new Error("Enter a valid airtime amount");
  }

  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION}/airtime/purchase`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider_id: params.provider_id,
      phone_number: params.phone_number,
      amount: Number(params.amount),
      network: params.network,
    }),
  });

  const data = await parseResponse(response);

  /*
   * CDH may return status as:
   * "true"
   * true
   * "success"
   */
  const status = data?.status;

  const failed =
    status === "false" ||
    status === false ||
    status === "failed" ||
    status === "error";

  if (failed) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Airtime purchase failed"
    );
  }

  return {
    message:
      data?.message ||
      data?.data?.message ||
      "Airtime purchase successful",
    reference:
      data?.reference ||
      data?.transaction_id?.toString() ||
      data?.data?.reference ||
      data?.data?.transaction_id?.toString(),
  };
}

/**
 * Purchase a data bundle.
 */
export async function purchaseData(params: {
  bundle_id: number;
  phone_number: string;
  plan_name: string;
  network: string;
  amount: number;
}): Promise<{
  message: string;
  reference?: string;
}> {
  if (!params.bundle_id) {
    throw new Error("Data bundle is required");
  }

  if (!params.phone_number) {
    throw new Error("Phone number is required");
  }

  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION}/data/purchase`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      bundle_id: params.bundle_id,
      phone_number: params.phone_number,
      plan_name: params.plan_name,
      network: params.network,
      amount: Number(params.amount),
    }),
  });

  const data = await parseResponse(response);

  const status = data?.status;

  const failed =
    status === "false" ||
    status === false ||
    status === "failed" ||
    status === "error";

  if (failed) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Data purchase failed"
    );
  }

  return {
    message:
      data?.message ||
      data?.data?.message ||
      "Data purchase successful",
    reference:
      data?.reference ||
      data?.transaction_id?.toString() ||
      data?.data?.reference ||
      data?.data?.transaction_id?.toString(),
  };
}

/**
 * Get the signed-in user's transaction history.
 */
export async function getTransactions(): Promise<Transaction[]> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION}/transactions`, {
    method: "GET",
    headers,
  });

  const data = await parseResponse(response);

  if (Array.isArray(data?.transactions)) {
    return data.transactions as Transaction[];
  }

  if (Array.isArray(data?.data?.transactions)) {
    return data.data.transactions as Transaction[];
  }

  if (Array.isArray(data?.data)) {
    return data.data as Transaction[];
  }

  return [];
}
