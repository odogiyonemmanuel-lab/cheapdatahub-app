import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    // ---------------------------------------------------------
    // ENVIRONMENT VARIABLES
    // ---------------------------------------------------------

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    const flutterwaveSecretKey = Deno.env.get("FLW_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          error: "Supabase server configuration is missing",
        },
        500
      );
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse(
        {
          error: "Flutterwave secret key is not configured",
        },
        500
      );
    }

    // ---------------------------------------------------------
    // SUPABASE ADMIN CLIENT
    // ---------------------------------------------------------

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // ---------------------------------------------------------
    // AUTHENTICATE CUSTOMER
    // ---------------------------------------------------------

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Missing authorization header",
        },
        401
      );
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    // ---------------------------------------------------------
    // READ REQUEST
    // ---------------------------------------------------------

    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        {
          error: "Invalid request body",
        },
        400
      );
    }

    const transactionId =
      body.transaction_id ??
      body.transactionId ??
      body.id;

    if (!transactionId) {
      return jsonResponse(
        {
          error: "Flutterwave transaction ID is required",
        },
        422
      );
    }

    // ---------------------------------------------------------
    // VERIFY PAYMENT WITH FLUTTERWAVE
    // ---------------------------------------------------------

    const flutterwaveResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
        String(transactionId)
      )}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const flutterwaveData =
      await flutterwaveResponse.json().catch(() => null);

    if (!flutterwaveResponse.ok || !flutterwaveData) {
      console.error(
        "Flutterwave verification failed:",
        flutterwaveData
      );

      return jsonResponse(
        {
          error: "Unable to verify Flutterwave payment",
        },
        502
      );
    }

    const payment =
      flutterwaveData?.data;

    if (!payment) {
      return jsonResponse(
        {
          error: "Flutterwave returned no transaction data",
        },
        400
      );
    }

    // ---------------------------------------------------------
    // CHECK PAYMENT STATUS
    // ---------------------------------------------------------

    if (payment.status !== "successful") {
      return jsonResponse(
        {
          error: "Payment was not successful",
          status: payment.status ?? "unknown",
        },
        400
      );
    }

    // ---------------------------------------------------------
    // CHECK PAYMENT CURRENCY
    // ---------------------------------------------------------

    const currency =
      String(payment.currency ?? "").toUpperCase();

    if (currency !== "NGN") {
      return jsonResponse(
        {
          error: "Only NGN payments are supported",
          currency,
        },
        400
      );
    }

    // ---------------------------------------------------------
    // PAYMENT AMOUNT
    // ---------------------------------------------------------

    const amountPaid = Number(payment.amount);

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return jsonResponse(
        {
          error: "Invalid payment amount",
        },
        400
      );
    }

    // ---------------------------------------------------------
    // VERIFY CUSTOMER OWNERSHIP
    // ---------------------------------------------------------

    const paymentEmail =
      String(payment.customer?.email ?? "").trim().toLowerCase();

    const userEmail =
      String(user.email ?? "").trim().toLowerCase();

    if (!paymentEmail || paymentEmail !== userEmail) {
      return jsonResponse(
        {
          error:
            "Payment email does not match the signed-in account",
        },
        403
      );
    }

    // ---------------------------------------------------------
    // CREATE UNIQUE PAYMENT REFERENCE
    // ---------------------------------------------------------

    const reference =
      `FLW-${String(transactionId)}`;

    // ---------------------------------------------------------
    // CHECK IF PAYMENT WAS ALREADY PROCESSED
    // ---------------------------------------------------------

    const {
      data: existingTransaction,
      error: existingTransactionError,
    } = await supabase
      .from("wallet_transactions")
      .select(
        "id, user_id, amount, status, reference"
      )
      .eq("reference", reference)
      .maybeSingle();

    if (existingTransactionError) {
      console.error(
        "Transaction lookup error:",
        existingTransactionError
      );

      return jsonResponse(
        {
          error: "Unable to check payment status",
        },
        500
      );
    }

    // ---------------------------------------------------------
    // ALREADY SUCCESSFULLY CREDITED
    // ---------------------------------------------------------

    if (
      existingTransaction &&
      existingTransaction.status === "success"
    ) {
      const {
        data: wallet,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        return jsonResponse(
          {
            error: "Unable to fetch wallet balance",
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        already_processed: true,
        message: "Payment was already credited",
        amount: Number(existingTransaction.amount),
        reference,
        balance: Number(wallet?.balance ?? 0),
      });
    }

    // ---------------------------------------------------------
    // PROTECT AGAINST REUSING A PAYMENT FOR ANOTHER ACCOUNT
    // ---------------------------------------------------------

    if (
      existingTransaction &&
      existingTransaction.user_id !== user.id
    ) {
      return jsonResponse(
        {
          error:
            "This payment has already been associated with another account",
        },
        409
      );
    }

    // ---------------------------------------------------------
    // RECORD PAYMENT AS PENDING
    // ---------------------------------------------------------

    if (!existingTransaction) {
      const {
        error: insertError,
      } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          type: "funding",
          amount: amountPaid,
          reference,
          provider: "Flutterwave",
          status: "pending",
          description: "Wallet funding via Flutterwave",
          metadata: {
            flutterwave_transaction_id:
              String(transactionId),

            flutterwave_reference:
              payment.tx_ref ?? null,

            currency,

            customer_email:
              payment.customer?.email ?? null,

            customer_name:
              payment.customer?.name ?? null,

            payment_type:
              payment.payment_type ?? null,

            verified_at:
              new Date().toISOString(),
          },
        });

      if (insertError) {
        // Another request may have inserted it at
        // exactly the same time because of the
        // unique reference constraint.

        const { data: retryTransaction } =
          await supabase
            .from("wallet_transactions")
            .select(
              "id, user_id, amount, status, reference"
            )
            .eq("reference", reference)
            .maybeSingle();

        if (
          retryTransaction &&
          retryTransaction.status === "success"
        ) {
          const { data: wallet } =
            await supabase
              .from("wallets")
              .select("balance")
              .eq("user_id", user.id)
              .maybeSingle();

          return jsonResponse({
            success: true,
            already_processed: true,
            message:
              "Payment was already credited",
            amount: Number(retryTransaction.amount),
            reference,
            balance: Number(wallet?.balance ?? 0),
          });
        }

        console.error(
          "Unable to create wallet transaction:",
          insertError
        );

        return jsonResponse(
          {
            error:
              "Unable to create wallet transaction",
          },
          500
        );
      }
    }

    // ---------------------------------------------------------
    // CREDIT WALLET
    // ---------------------------------------------------------

    const {
      data: creditResult,
      error: creditError,
    } = await supabase.rpc("credit_wallet", {
      p_user_id: user.id,
      p_amount: amountPaid,
      p_reference: reference,
      p_description:
        "Wallet funded successfully via Flutterwave",
    });

    if (creditError) {
      console.error(
        "Wallet credit error:",
        creditError
      );

      // Keep transaction pending if the wallet could
      // not be credited. This allows a retry.

      return jsonResponse(
        {
          error:
            "Payment verified, but wallet credit failed",
          reference,
        },
        500
      );
    }

    // ---------------------------------------------------------
    // RETURN SUCCESS
    // ---------------------------------------------------------

    const newBalance =
      Number(creditResult?.balance ?? 0);

    return jsonResponse({
      success: true,
      already_processed: false,
      message:
        "Payment verified and wallet credited successfully",
      amount: amountPaid,
      reference,
      balance: newBalance,
    });
  } catch (error) {
    console.error(
      "Flutterwave verification error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      500
    );
  }
});
