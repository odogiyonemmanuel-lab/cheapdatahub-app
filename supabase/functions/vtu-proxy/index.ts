import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FLUTTERWAVE_BASE_URL =
  "https://api.flutterwave.com/v3";

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function getPath(req: Request) {
  const url = new URL(req.url);

  return url.pathname
    .replace(/^\/functions\/v1\/vtu-proxy\/?/, "")
    .replace(/^\/+|\/+$/g, "");
}

function generateReference(userId: string) {
  return (
    `CDH-${userId.slice(0, 8)}-${Date.now()}-${crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)}`
  ).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const flutterwaveSecretKey =
      Deno.env.get("FLW_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "Supabase server configuration missing",
        },
        500,
      );
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse(
        {
          error:
            "Flutterwave secret key missing",
        },
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

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const token = authHeader.replace(
      /^Bearer\s+/i,
      "",
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const path = getPath(req);

    /*
     * =====================================
     * INITIALIZE WALLET PAYMENT
     * =====================================
     */

    if (path === "wallet/fund") {
      const body = await req
        .json()
        .catch(() => null);

      if (!body) {
        return jsonResponse(
          {
            error: "Invalid request",
          },
          400,
        );
      }

      const amount = Number(body.amount);

      if (
        !Number.isFinite(amount) ||
        amount < 100
      ) {
        return jsonResponse(
          {
            error:
              "Minimum funding amount is ₦100",
          },
          422,
        );
      }

      const email =
        user.email || body.email;

      if (!email) {
        return jsonResponse(
          {
            error:
              "Your account requires an email address",
          },
          422,
        );
      }

      const reference =
        generateReference(user.id);

      /*
       * Create pending deposit.
       */

      const { error: depositError } =
        await supabase
          .from("cdh_deposits")
          .insert({
            user_id: user.id,
            amount,
            reference,
            status: "pending",
            provider: "flutterwave",
          });

      if (depositError) {
        console.error(depositError);

        return jsonResponse(
          {
            error:
              "Could not create payment record",
          },
          500,
        );
      }

      const origin =
        req.headers.get("origin") || "";

      const redirectUrl =
        body.redirect_url ||
        `${origin}/fund-wallet`;

      /*
       * Create Flutterwave payment.
       */

      const flutterwaveResponse =
        await fetch(
          `${FLUTTERWAVE_BASE_URL}/payments`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${flutterwaveSecretKey}`,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              tx_ref: reference,

              amount,

              currency: "NGN",

              redirect_url: redirectUrl,

              customer: {
                email,

                name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  "CheapDataHub Customer",
              },

              customizations: {
                title:
                  "CheapDataHub Wallet",

                description:
                  `Fund wallet with ₦${amount.toLocaleString(
                    "en-NG",
                  )}`,
              },

              meta: {
                user_id: user.id,
                reference,
              },
            }),
          },
        );

      const flutterwaveData =
        await flutterwaveResponse
          .json()
          .catch(() => null);

      if (
        !flutterwaveResponse.ok ||
        flutterwaveData?.status !==
          "success"
      ) {
        console.error(
          "Flutterwave error:",
          flutterwaveData,
        );

        return jsonResponse(
          {
            error:
              flutterwaveData?.message ||
              "Flutterwave initialization failed",
          },
          502,
        );
      }

      const paymentLink =
        flutterwaveData?.data?.link;

      if (!paymentLink) {
        return jsonResponse(
          {
            error:
              "Flutterwave did not return a payment link",
          },
          502,
        );
      }

      return jsonResponse({
        success: true,
        message:
          "Payment initialized",

        reference,

        payment_link:
          paymentLink,

        checkout_url:
          paymentLink,

        amount,
      });
    }

    /*
     * =====================================
     * VERIFY PAYMENT
     * =====================================
     */

    if (path === "wallet/verify") {
      const body = await req
        .json()
        .catch(() => null);

      const reference = String(
        body?.reference || "",
      ).trim();

      if (!reference) {
        return jsonResponse(
          {
            error:
              "Payment reference required",
          },
          422,
        );
      }

      /*
       * Find deposit.
       */

      const {
        data: deposit,
        error: depositError,
      } = await supabase
        .from("cdh_deposits")
        .select("*")
        .eq("reference", reference)
        .eq("user_id", user.id)
        .maybeSingle();

      if (depositError || !deposit) {
        return jsonResponse(
          {
            error:
              "Payment record not found",
          },
          404,
        );
      }

      /*
       * Already successful.
       */

      if (
        deposit.status === "successful"
      ) {
        return jsonResponse({
          success: true,

          message:
            "Payment already verified",

          reference,

          amount:
            Number(deposit.amount),
        });
      }

      /*
       * Verify directly with Flutterwave.
       */

      const verifyResponse =
        await fetch(
          `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
            reference,
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${flutterwaveSecretKey}`,
            },
          },
        );

      const verifyData =
        await verifyResponse
          .json()
          .catch(() => null);

      console.log(
        "Flutterwave verify:",
        verifyData,
      );

      if (
        !verifyResponse.ok ||
        verifyData?.status !==
          "success" ||
        !verifyData?.data
      ) {
        return jsonResponse(
          {
            success: false,

            message:
              "Payment could not be verified",
          },
          400,
        );
      }

      const payment =
        verifyData.data;

      const expectedAmount =
        Number(deposit.amount);

      const paidAmount =
        Number(payment.amount);

      const paymentStatus =
        String(
          payment.status || "",
        ).toLowerCase();

      const currency =
        String(
          payment.currency || "",
        ).toUpperCase();

      /*
       * Security checks.
       */

      if (
        payment.tx_ref !== reference
      ) {
        return jsonResponse(
          {
            error:
              "Payment reference mismatch",
          },
          400,
        );
      }

      if (
        paymentStatus !==
        "successful"
      ) {
        return jsonResponse(
          {
            success: false,

            message:
              `Payment status: ${payment.status}`,
          },
          400,
        );
      }

      if (currency !== "NGN") {
        return jsonResponse(
          {
            error:
              "Invalid payment currency",
          },
          400,
        );
      }

      if (
        paidAmount < expectedAmount
      ) {
        return jsonResponse(
          {
            error:
              "Incorrect payment amount",
          },
          400,
        );
      }

      /*
       * Store Flutterwave transaction ID.
       */

      await supabase
        .from("cdh_deposits")
        .update({
          transaction_id:
            String(payment.id),

          status:
            "processing",
        })
        .eq("id", deposit.id);

      /*
       * ATOMIC WALLET CREDIT.
       */

      const { data: creditResult, error: creditError } =
        await supabase.rpc(
          "credit_wallet_from_deposit",
          {
            p_reference:
              reference,

            p_user_id:
              user.id,

            p_amount:
              expectedAmount,
          },
        );

      if (creditError) {
        console.error(
          "Wallet credit error:",
          creditError,
        );

        return jsonResponse(
          {
            error:
              "Payment verified but wallet credit failed",
          },
          500,
        );
      }

      return jsonResponse({
        success: true,

        message:
          "Payment successful. Wallet credited.",

        reference,

        amount:
          expectedAmount,

        wallet_result:
          creditResult,
      });
    }

    return jsonResponse(
      {
        error:
          `Unknown endpoint: ${path}`,
      },
      404,
    );
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server error",
      },
      500,
    );
  }
});
