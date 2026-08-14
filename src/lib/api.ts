import { supabase } from "./supabase";
import type { Transaction } from "@/types";

const EDGE_FUNCTION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vtu-proxy`;

async function getHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token ?? ""}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export async function getWalletBalance(): Promise<{ balance: number }> {
  const headers = await getHeaders();
  const resp = await fetch(`${EDGE_FUNCTION}/wallet/balance`, { headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || data.message || "Failed to fetch balance");
  return { balance: data.data?.balance ?? 0 };
}

export async function purchaseAirtime(params: {
  provider_id: number;
  phone_number: string;
  amount: number;
  network: string;
}): Promise<{ message: string; reference?: string }> {
  const headers = await getHeaders();
  const resp = await fetch(`${EDGE_FUNCTION}/airtime/purchase`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  const data = await resp.json();
  if (!resp.ok || data.status === "false" || data.status === false) {
    throw new Error(data.error || data.message || "Airtime purchase failed");
  }
  return { message: data.message || "Airtime purchase successful", reference: data.reference };
}

export async function purchaseData(params: {
  bundle_id: number;
  phone_number: string;
  plan_name: string;
  network: string;
  amount: number;
}): Promise<{ message: string; reference?: string }> {
  const headers = await getHeaders();
  const resp = await fetch(`${EDGE_FUNCTION}/data/purchase`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  const data = await resp.json();
  if (!resp.ok || data.status === "false" || data.status === false) {
    throw new Error(data.error || data.message || "Data purchase failed");
  }
  return { message: data.message || "Data purchase successful", reference: data.reference };
}

export async function getTransactions(): Promise<Transaction[]> {
  const headers = await getHeaders();
  const resp = await fetch(`${EDGE_FUNCTION}/transactions`, { headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Failed to fetch transactions");
  return data.transactions ?? [];
}
