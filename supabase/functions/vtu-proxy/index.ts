import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const PROVIDER_BASE = "https://www.cheapdatahub.ng/api/v1/resellers";
const PROVIDER_IDS: Record<string, number> = { MTN: 1, GLO: 2, AIRTEL: 3, "9MOBILE": 4 };

function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } }); }
function ref(userId: string) { return `CDH-${userId.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase(); }
function providerStatus(value: unknown) { const s = String(value ?? "").toLowerCase().trim(); if (["true", "success", "successful", "ok"].includes(s)) return "success"; if (["initiated", "processing", "pending"].includes(s)) return "pending"; if (["false", "failed", "failure", "refunded", "cancelled", "canceled"].includes(s)) return "failed"; return "unknown"; }
function providerMessage(data: any) { return String(data?.message ?? data?.error ?? data?.detail ?? "Provider did not approve the purchase").slice(0, 500); }
async function fetchWithTimeout(url: string, init: RequestInit, ms = 25000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), ms); try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); } }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const providerKey = Deno.env.get("CDH_API_KEY");
    if (!supabaseUrl || !serviceRoleKey || !providerKey) return json({ error: "Server configuration is incomplete" }, 500);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const action = String(body?.action ?? "").trim();
    if (!body || !["airtime/purchase", "data/purchase"].includes(action)) return json({ error: "Invalid purchase action" }, 422);
    const phone = String(body.phone_number ?? "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(phone)) return json({ error: "Enter a valid 11-digit phone number" }, 422);
    const network = String(body.network ?? "").toUpperCase().trim();
    if (!network || !(network in PROVIDER_IDS)) return json({ error: "Unsupported network" }, 422);

    const reference = ref(user.id);
    let customerAmount = 0, providerCost = 0, planName = "", providerId = String(PROVIDER_IDS[network]);
    let providerPayload: Record<string, unknown>;

    if (action === "data/purchase") {
      const bundleId = String(body.bundle_id ?? body.plan_id ?? body.plan_code ?? "").trim();
      if (!bundleId || !/^\d+$/.test(bundleId)) return json({ error: "A valid data plan is required" }, 422);
      const { data: pricingRows, error } = await admin.from("cdh_product_pricing")
        .select("product_id,provider_id,network,plan_name,provider_cost,selling_price,customer_price,active,is_active")
        .eq("product_id", bundleId).eq("network", network.toLowerCase()).eq("active", true).eq("is_active", true)
        .order("updated_at", { ascending: false }).limit(1);
      if (error) return json({ error: "Unable to load product pricing" }, 500);
      const pricing = pricingRows?.[0];
      if (!pricing) return json({ error: "This data plan is currently unavailable" }, 409);
      providerId = String(pricing.provider_id ?? providerId);
      planName = String(pricing.plan_name ?? ""); providerCost = Number(pricing.provider_cost ?? 0); customerAmount = Number(pricing.selling_price ?? pricing.customer_price ?? 0);
      if (!Number.isFinite(providerCost) || providerCost < 0 || !Number.isFinite(customerAmount) || customerAmount <= 0) return json({ error: "Invalid product pricing" }, 500);
      providerPayload = { bundle_id: Number(bundleId), phone_number: phone };
    } else {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 100 || amount > 100000) return json({ error: "Airtime amount must be between ₦100 and ₦100,000" }, 422);
      const { data: ap, error } = await admin.from("cdh_airtime_pricing").select("markup_type,markup_value,active").eq("id", 1).maybeSingle();
      if (error) return json({ error: "Unable to load airtime pricing" }, 500);
      if (ap && ap.active === false) return json({ error: "Airtime sales are temporarily unavailable" }, 409);
      const markupType = String(ap?.markup_type ?? "fixed"), markup = Number(ap?.markup_value ?? 0);
      const discount: Record<string, number> = { GLO: 0.04, MTN: 0.025, "9MOBILE": 0.025, AIRTEL: 0.01 };
      customerAmount = markupType === "percent" ? amount * (1 + markup / 100) : amount + markup;
      providerCost = amount * (1 - discount[network]);
      providerPayload = { provider_id: PROVIDER_IDS[network], phone_number: phone, amount };
      if (!Number.isFinite(customerAmount) || customerAmount <= 0 || !Number.isFinite(providerCost) || providerCost < 0) return json({ error: "Invalid airtime pricing" }, 500);
    }

    const begin = await admin.rpc("cdh_begin_purchase", { p_user_id: user.id, p_reference: reference, p_transaction_type: action === "data/purchase" ? "data" : "airtime", p_provider_id: providerId, p_network: network, p_phone_number: phone, p_plan_name: planName, p_customer_amount: customerAmount, p_provider_cost: providerCost, p_metadata: { provider: "cheapdatahub", action, network } });
    if (begin.error) { const message = begin.error.message ?? "Unable to start purchase"; return json({ error: message.includes("Insufficient wallet balance") ? "Insufficient wallet balance" : message }, 422); }

    let providerResponse: Response;
    try {
      providerResponse = await fetchWithTimeout(`${PROVIDER_BASE}/${action}/`, { method: "POST", headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(providerPayload) });
    } catch (error) {
      await admin.from("cdh_transactions").update({ status: "processing", metadata: { provider: "cheapdatahub", action, network, provider_transport_error: error instanceof Error ? error.message.slice(0, 300) : "Provider request failed" } }).eq("reference", reference).eq("status", "pending");
      return json({ success: false, pending: true, reference, message: "Purchase is being processed. Please check Transaction History shortly." }, 202);
    }

    const providerData = await providerResponse.json().catch(() => null);
    const state = providerStatus(providerData?.status);
    if (providerResponse.ok && state === "success") {
      const providerReference = String(providerData?.reference ?? providerData?.transaction_id ?? providerData?.data?.reference ?? providerData?.data?.transaction_id ?? "").trim();
      const completed = await admin.rpc("cdh_complete_purchase", { p_reference: reference, p_provider_reference: providerReference || null, p_metadata: { provider_response: providerData, provider_http_status: providerResponse.status } });
      if (completed.error) {
        await admin.from("cdh_transactions").update({ status: "processing", metadata: { provider_response: providerData, finalization_error: completed.error.message.slice(0, 500) } }).eq("reference", reference).eq("status", "pending");
        return json({ success: false, pending: true, reference, message: "Provider confirmed the purchase, but final confirmation is still processing." }, 202);
      }
      return json({ success: true, message: providerMessage(providerData), reference, transaction_id: providerReference || reference, balance: Number(completed.data?.[0]?.balance ?? 0), data: providerData });
    }
    if (state === "pending" || (providerResponse.status >= 500 && providerResponse.status < 600)) {
      await admin.from("cdh_transactions").update({ status: "processing", metadata: { provider_response: providerData, provider_http_status: providerResponse.status } }).eq("reference", reference).eq("status", "pending");
      return json({ success: false, pending: true, reference, message: "Purchase is being processed. Please check Transaction History shortly." }, 202);
    }

    const refund = await admin.rpc("cdh_refund_purchase", { p_reference: reference, p_reason: providerMessage(providerData) });
    if (refund.error) {
      console.error("VTU refund failed", { reference, error: refund.error.message });
      return json({ error: "Provider purchase failed. Your wallet refund is pending automatic recovery.", reference, refund_pending: true }, 502);
    }
    return json({ error: providerMessage(providerData), reference, refunded: true, balance: Number(refund.data?.[0]?.balance ?? 0) }, 502);
  } catch (error) {
    console.error("vtu-proxy error", error);
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500);
  }
});