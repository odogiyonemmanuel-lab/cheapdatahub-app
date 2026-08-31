import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reference(userId: string) {
  return `CDH-${userId.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flutterwaveSecretKey = Deno.env.get("FLW_SECRET_KEY");
    if (!supabaseUrl || !serviceRoleKey || !flutterwaveSecretKey) {
      return jsonResponse({ error: "Server payment configuration is missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount < 100 || amount > 10000000) {
      return jsonResponse({ error: "Funding amount must be between ₦100 and ₦10,000,000" }, 422);
    }

    const email = user.email || String(body?.email || "").trim();
    if (!email) return jsonResponse({ error: "A valid email address is required" }, 422);

    const txRef = reference(user.id);
    const origin = req.headers.get("origin") || "";
    const redirectUrl = String(body?.redirect_url || `${origin}/payment/callback`).trim();
    if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
      return jsonResponse({ error: "Invalid payment redirect URL" }, 422);
    }

    const { error: depositError } = await admin.from("cdh_deposits").insert({
      user_id: user.id,
      amount,
      reference: txRef,
      status: "pending",
      provider: "flutterwave",
    });
    if (depositError) {
      console.error("Deposit creation failed", depositError);
      return jsonResponse({ error: "Could not create payment record" }, 500);
    }

    const paymentResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: {
          email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || "CheapDataHub Customer",
          phonenumber: body?.phone || user.user_metadata?.phone || undefined,
        },
        customizations: {
          title: "CheapDataHub Wallet",
          description: `Fund wallet with ₦${amount.toLocaleString("en-NG")}`,
        },
        meta: { user_id: user.id, reference: txRef },
      }),
    });

    const payment = await paymentResponse.json().catch(() => null);
    if (!paymentResponse.ok || payment?.status !== "success" || !payment?.data?.link) {
      console.error("Flutterwave initialization failed", payment);
      await admin.from("cdh_deposits").update({ status: "failed", gateway_response: payment, updated_at: new Date().toISOString() }).eq("reference", txRef);
      return jsonResponse({ error: payment?.message || "Flutterwave initialization failed" }, 502);
    }

    return jsonResponse({
      success: true,
      message: "Payment initialized",
      reference: txRef,
      payment_link: payment.data.link,
      checkout_url: payment.data.link,
      amount,
    });
  } catch (error) {
    console.error("wallet-fund error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
