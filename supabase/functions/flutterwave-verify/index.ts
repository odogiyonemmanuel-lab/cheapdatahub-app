import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const transactionId = String(body?.transaction_id || "").trim();
    const txRef = String(body?.tx_ref || body?.reference || "").trim();
    if (!transactionId || !txRef) {
      return jsonResponse({ error: "transaction_id and tx_ref are required" }, 422);
    }

    const { data: deposit, error: depositError } = await admin
      .from("cdh_deposits")
      .select("*")
      .eq("reference", txRef)
      .eq("user_id", user.id)
      .maybeSingle();

    if (depositError) {
      console.error("Deposit lookup error", depositError);
      return jsonResponse({ error: "Could not find wallet deposit" }, 500);
    }
    if (!deposit) return jsonResponse({ error: "Wallet deposit not found" }, 404);

    if (deposit.status === "success") {
      return jsonResponse({
        success: true,
        already_processed: true,
        message: "This payment has already been credited",
        reference: txRef,
        amount: Number(deposit.amount),
      });
    }

    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${flutterwaveSecretKey}` },
      },
    );
    const verifyData = await verifyResponse.json().catch(() => null);
    if (!verifyResponse.ok || verifyData?.status !== "success" || !verifyData?.data) {
      return jsonResponse({
        success: false,
        status: "pending",
        message: verifyData?.message || "Flutterwave payment could not be verified yet",
        reference: txRef,
      }, 202);
    }

    const payment = verifyData.data;
    const paymentStatus = String(payment.status || "").toLowerCase();
    const paymentCurrency = String(payment.currency || "").toUpperCase();
    const paymentReference = String(payment.tx_ref || "").trim();
    const paidAmount = Number(payment.amount);
    const expectedAmount = Number(deposit.amount);

    if (paymentReference !== txRef) return jsonResponse({ error: "Payment reference mismatch" }, 422);
    if (paymentStatus !== "successful") {
      await admin.from("cdh_deposits").update({
        status: paymentStatus === "failed" ? "failed" : "pending",
        gateway_response: payment,
        transaction_id: transactionId,
        gateway_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      }).eq("id", deposit.id).eq("user_id", user.id);
      return jsonResponse({ success: false, status: paymentStatus, message: "Payment has not completed successfully", reference: txRef }, 202);
    }
    if (paymentCurrency !== "NGN") return jsonResponse({ error: "Invalid payment currency", expected: "NGN", received: paymentCurrency }, 422);
    if (!Number.isFinite(paidAmount) || paidAmount < expectedAmount) {
      await admin.from("cdh_deposits").update({ status: "failed", gateway_response: { reason: "Payment amount mismatch", expected_amount: expectedAmount, paid_amount: paidAmount, flutterwave: payment }, updated_at: new Date().toISOString() }).eq("id", deposit.id);
      return jsonResponse({ error: "Payment amount does not match wallet deposit" }, 422);
    }

    const { data: creditResult, error: creditError } = await admin.rpc("credit_wallet_from_deposit", {
      p_reference: txRef,
      p_user_id: user.id,
      p_amount: expectedAmount,
    });
    if (creditError) {
      console.error("Wallet credit error", creditError);
      return jsonResponse({ error: "Payment verified but wallet credit failed", details: creditError.message, reference: txRef }, 500);
    }

    const { error: depositUpdateError } = await admin.from("cdh_deposits").update({
      status: "success",
      provider: "flutterwave",
      transaction_id: transactionId,
      gateway_transaction_id: transactionId,
      gateway_response: payment,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", deposit.id).eq("user_id", user.id);

    if (depositUpdateError) {
      console.error("Deposit update warning", depositUpdateError);
      return jsonResponse({ success: true, wallet_credited: true, reference: txRef, amount: expectedAmount, message: "Payment verified and wallet credited", deposit_update_warning: true });
    }

    return jsonResponse({
      success: true,
      wallet_credited: true,
      reference: txRef,
      amount: expectedAmount,
      currency: "NGN",
      flutterwave_transaction_id: transactionId,
      message: "Payment verified and wallet credited successfully",
      wallet: creditResult ?? null,
    });
  } catch (error) {
    console.error("flutterwave-verify error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
