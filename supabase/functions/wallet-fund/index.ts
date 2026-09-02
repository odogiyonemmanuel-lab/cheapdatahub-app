import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

function generateReference(userId: string) {
  return `CDH-${userId.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flutterwaveSecretKey = Deno.env.get("FLW_SECRET_KEY");
    const appBaseUrl = (
      Deno.env.get("APP_BASE_URL") || Deno.env.get("SITE_URL") || ""
    ).replace(/\/+$/, "");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase server configuration is missing" }, 500);
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse({ error: "FLW_SECRET_KEY is not configured" }, 500);
    }

    if (!appBaseUrl) {
      return jsonResponse({ error: "APP_BASE_URL or SITE_URL is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 100) {
      return jsonResponse({ error: "Minimum funding amount is ₦100" }, 422);
    }

    const email = String(user.email || body.email || "").trim();
    if (!email) {
      return jsonResponse({ error: "Your account requires an email address" }, 422);
    }

    const reference = generateReference(user.id);
    const redirectUrl = `${appBaseUrl}/fund-wallet`;

    const { error: depositError } = await supabase
      .from("cdh_deposits")
      .insert({
        user_id: user.id,
        amount: Math.round(amount * 100) / 100,
        reference,
        status: "pending",
        provider: "flutterwave",
        gateway: "flutterwave",
      });

    if (depositError) {
      console.error("Unable to create wallet funding record:", depositError);
      return jsonResponse(
        {
          error: "Unable to create wallet funding record",
          details: depositError.message,
        },
        500,
      );
    }

    const flutterwaveResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: Math.round(amount * 100) / 100,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: {
          email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "CheapDataHub Customer",
          phonenumber: body.phone || user.user_metadata?.phone || undefined,
        },
        customizations: {
          title: "CheapDataHub Wallet",
          description: `Fund wallet with ₦${amount.toLocaleString("en-NG")}`,
        },
        meta: {
          user_id: user.id,
          reference,
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json().catch(() => null);

    if (!flutterwaveResponse.ok || flutterwaveData?.status !== "success") {
      console.error("Flutterwave initialization error:", flutterwaveData);

      await supabase
        .from("cdh_deposits")
        .update({
          status: "failed",
          gateway_response: flutterwaveData,
        })
        .eq("reference", reference)
        .eq("user_id", user.id);

      return jsonResponse(
        {
          error: flutterwaveData?.message || "Flutterwave initialization failed",
        },
        502,
      );
    }

    const paymentLink = flutterwaveData?.data?.link;
    if (!paymentLink) {
      await supabase
        .from("cdh_deposits")
        .update({ status: "failed", gateway_response: flutterwaveData })
        .eq("reference", reference)
        .eq("user_id", user.id);

      return jsonResponse({ error: "Flutterwave did not return a payment link" }, 502);
    }

    return jsonResponse({
      success: true,
      message: "Payment initialized",
      reference,
      payment_link: paymentLink,
      checkout_url: paymentLink,
      amount,
    });
  } catch (error) {
    console.error("wallet-fund error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});
