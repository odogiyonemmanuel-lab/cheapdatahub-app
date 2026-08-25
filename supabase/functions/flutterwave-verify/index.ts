import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flutterwaveSecretKey = Deno.env.get("FLW_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Supabase server configuration is missing" },
        500,
      );
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse(
        { error: "FLW_SECRET_KEY is not configured" },
        500,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    /*
     * ---------------------------------------------------------
     * AUTHENTICATE USER
     * ---------------------------------------------------------
     */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        { error: "Missing authorization header" },
        401,
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { error: "Unauthorized" },
        401,
      );
    }

    /*
     * ---------------------------------------------------------
     * READ REQUEST
     * ---------------------------------------------------------
     */

    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        { error: "Invalid request body" },
        400,
      );
    }

    const reference = String(
      body.reference ||
      body.tx_ref ||
      "",
    ).trim();

    if (!reference) {
      return jsonResponse(
        { error: "Payment reference is required" },
        422,
      );
    }

    /*
     * ---------------------------------------------------------
     * FIND DEPOSIT
     * ---------------------------------------------------------
     */

    const { data: deposit, error: depositError } =
      await supabase
        .from("cdh_deposits")
        .select("*")
        .eq("reference", reference)
        .eq("user_id", user.id)
        .maybeSingle();

    if (depositError) {
      console.error("Deposit lookup error:", depositError);

      return jsonResponse(
        {
          error: "Could not find wallet deposit",
          details: depositError.message,
        },
        500,
      );
    }

    if (!deposit) {
      return jsonResponse(
        {
          error: "Wallet deposit not found",
        },
        404,
      );
    }

    /*
     * ---------------------------------------------------------
     * ALREADY PAID?
     * ---------------------------------------------------------
     *
     * This protects against double wallet credit.
     */

    if (deposit.status === "success") {
      return jsonResponse({
        success: true,
        already_processed: true,
        message: "This payment has already been credited",
        reference: deposit.reference,
        amount: Number(deposit.amount),
      });
    }

    /*
     * ---------------------------------------------------------
     * VERIFY WITH FLUTTERWAVE
     * ---------------------------------------------------------
     *
     * Flutterwave supports verification using the transaction ID.
     *
     * If we don't have the transaction ID yet, we search Flutterwave
     * transactions using the tx_ref.
     */

    let flutterwaveTransaction: any = null;

    if (deposit.gateway_transaction_id) {
      const verifyResponse = await fetch(
        `${FLUTTERWAVE_BASE_URL}/transactions/${encodeURIComponent(
          deposit.gateway_transaction_id,
        )}/verify`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${flutterwaveSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const verifyData = await verifyResponse.json();

      if (
        verifyResponse.ok &&
        verifyData?.status === "success" &&
        verifyData?.data
      ) {
        flutterwaveTransaction = verifyData.data;
      }
    }

    /*
     * ---------------------------------------------------------
     * FALLBACK: SEARCH BY TX_REF
     * ---------------------------------------------------------
     */

    if (!flutterwaveTransaction) {
      const searchUrl =
        `${FLUTTERWAVE_BASE_URL}/transactions` +
        `?tx_ref=${encodeURIComponent(reference)}`;

      const searchResponse = await fetch(
        searchUrl,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${flutterwaveSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const searchData = await searchResponse.json();

      if (
        searchResponse.ok &&
        searchData?.status === "success" &&
        Array.isArray(searchData?.data) &&
        searchData.data.length > 0
      ) {
        flutterwaveTransaction = searchData.data.find(
          (transaction: any) =>
            transaction.tx_ref === reference,
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * PAYMENT NOT FOUND
     * ---------------------------------------------------------
     */

    if (!flutterwaveTransaction) {
      return jsonResponse(
        {
          success: false,
          status: "pending",
          message:
            "Flutterwave payment has not been completed or could not yet be verified.",
          reference,
        },
        202,
      );
    }

    /*
     * ---------------------------------------------------------
     * VALIDATE PAYMENT
     * ---------------------------------------------------------
     */

    const paymentStatus =
      String(
        flutterwaveTransaction.status || "",
      ).toLowerCase();

    const paymentCurrency =
      String(
        flutterwaveTransaction.currency || "",
      ).toUpperCase();

    const paidAmount =
      Number(
        flutterwaveTransaction.amount,
      );

    const expectedAmount =
      Number(deposit.amount);

    const transactionReference =
      String(
        flutterwaveTransaction.tx_ref || "",
      );

    /*
     * Must be successful.
     */

    if (paymentStatus !== "successful") {
      await supabase
        .from("cdh_deposits")
        .update({
          status: paymentStatus === "failed"
            ? "failed"
            : "pending",
          gateway_response:
            flutterwaveTransaction,
        })
        .eq("id", deposit.id);

      return jsonResponse({
        success: false,
        status: paymentStatus,
        message: "Payment has not been completed successfully",
        reference,
      }, 202);
    }

    /*
     * Currency must be NGN.
     */

    if (paymentCurrency !== "NGN") {
      return jsonResponse(
        {
          error: "Invalid payment currency",
          expected: "NGN",
          received: paymentCurrency,
        },
        422,
      );
    }

    /*
     * Amount must match.
     *
     * Never credit based only on the frontend amount.
     */

    if (paidAmount < expectedAmount) {
      await supabase
        .from("cdh_deposits")
        .update({
          status: "failed",
          gateway_response: {
            reason: "Payment amount mismatch",
            expected_amount: expectedAmount,
            paid_amount: paidAmount,
            flutterwave: flutterwaveTransaction,
          },
        })
        .eq("id", deposit.id);

      return jsonResponse(
        {
          error: "Payment amount does not match wallet deposit",
          expected_amount: expectedAmount,
          paid_amount: paidAmount,
        },
        422,
      );
    }

    /*
     * tx_ref must match our reference.
     */

    if (
      transactionReference &&
      transactionReference !== reference
    ) {
      return jsonResponse(
        {
          error: "Payment reference mismatch",
        },
        422,
      );
    }

    /*
     * ---------------------------------------------------------
     * CREDIT WALLET
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     *
     * We use your existing database wallet function rather
     * than directly modifying the wallet balance here.
     *
     * This keeps the wallet ledger authoritative.
     */

    const { data: walletResult, error: walletError } =
      await supabase.rpc(
        "credit_wallet",
        {
          p_user_id: user.id,
          p_amount: expectedAmount,
          p_reference: reference,
          p_description: "Flutterwave wallet funding",
        },
      );

    if (walletError) {
      console.error(
        "credit_wallet error:",
        walletError,
      );

      return jsonResponse(
        {
          error:
            "Payment verified but wallet credit failed",
          details: walletError.message,
          reference,
        },
        500,
      );
    }

    /*
     * ---------------------------------------------------------
     * MARK DEPOSIT AS SUCCESSFUL
     * ---------------------------------------------------------
     */

    const { error: updateError } =
      await supabase
        .from("cdh_deposits")
        .update({
          status: "success",
          gateway: "flutterwave",
          gateway_transaction_id:
            String(
              flutterwaveTransaction.id || "",
            ),
          gateway_response:
            flutterwaveTransaction,
          paid_at: new Date().toISOString(),
        })
        .eq("id", deposit.id)
        .eq("user_id", user.id);

    if (updateError) {
      console.error(
        "Deposit update error:",
        updateError,
      );

      /*
       * Wallet has already been credited.
       *
       * Return a successful verification response rather
       * than asking the customer to pay again.
       */

      return jsonResponse({
        success: true,
        wallet_credited: true,
        deposit_update_warning: true,
        reference,
        amount: expectedAmount,
        message:
          "Payment verified and wallet credited.",
      });
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
     */

    return jsonResponse({
      success: true,
      wallet_credited: true,
      reference,
      amount: expectedAmount,
      currency: "NGN",
      flutterwave_transaction_id:
        flutterwaveTransaction.id,
      message:
        "Payment verified and wallet credited successfully",
      wallet: walletResult ?? null,
    });
  } catch (error) {
    console.error(
      "flutterwave-verify error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      500,
    );
  }
});
