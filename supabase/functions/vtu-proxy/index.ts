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
    /*
     * ---------------------------------------------------------
     * 1. Get environment variables
     * ---------------------------------------------------------
     */

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const flutterwaveSecretKey = Deno.env.get("FLW_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error: "Supabase server configuration is missing",
        },
        500,
      );
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse(
        {
          error: "Flutterwave is not configured on the server",
        },
        500,
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. Create Supabase admin client
     * ---------------------------------------------------------
     */

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
     * 3. Authenticate the customer
     * ---------------------------------------------------------
     */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Missing authorization header",
        },
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
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    /*
     * ---------------------------------------------------------
     * 4. Read request body
     * ---------------------------------------------------------
     */

    const body = await req.json().catch(() => null);

    if (!body) {
      return jsonResponse(
        {
          error: "Invalid request body",
        },
        400,
      );
    }

    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(
        {
          error: "Enter a valid funding amount",
        },
        422,
      );
    }

    /*
     * Minimum wallet funding amount.
     *
     * Change this later if you want.
     */

    if (amount < 100) {
      return jsonResponse(
        {
          error: "Minimum wallet funding amount is ₦100",
        },
        422,
      );
    }

    /*
     * Optional maximum amount.
     */

    if (amount > 1000000) {
      return jsonResponse(
        {
          error: "Maximum wallet funding amount is ₦1,000,000",
        },
        422,
      );
    }

    /*
     * ---------------------------------------------------------
     * 5. Get customer information
     * ---------------------------------------------------------
     */

    const email =
      user.email ||
      body.email ||
      "";

    if (!email) {
      return jsonResponse(
        {
          error: "Your account does not have an email address",
        },
        422,
      );
    }

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "CheapDataHub Customer";

    /*
     * ---------------------------------------------------------
     * 6. Generate unique payment reference
     * ---------------------------------------------------------
     *
     * Never use the amount alone as a reference.
     */

    const reference =
      `CDH-${user.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
        .toUpperCase();

    /*
     * ---------------------------------------------------------
     * 7. Save pending payment
     * ---------------------------------------------------------
     */

    const { error: insertError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "funding",
        amount,
        reference,
        status: "pending",
        provider: "flutterwave",
        description: "Wallet funding",
      });

    if (insertError) {
      console.error("wallet_transactions insert error:", insertError);

      return jsonResponse(
        {
          error: "Could not create wallet funding record",
          details: insertError.message,
        },
        500,
      );
    }

    /*
     * ---------------------------------------------------------
     * 8. Initialize Flutterwave payment
     * ---------------------------------------------------------
     */

    const flutterwaveResponse = await fetch(
      `${FLUTTERWAVE_BASE_URL}/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency: "NGN",

          redirect_url:
            body.redirect_url ||
            `${req.headers.get("origin") || ""}/fund-wallet`,

          customer: {
            email,
            name: fullName,
          },

          customizations: {
            title: "CheapDataHub Wallet Funding",
            description: `Fund your CheapDataHub wallet with ₦${amount.toLocaleString(
              "en-NG",
            )}`,
            logo: "",
          },

          meta: {
            user_id: user.id,
            wallet_funding: true,
          },
        }),
      },
    );

    const flutterwaveData = await flutterwaveResponse.json();

    /*
     * ---------------------------------------------------------
     * 9. Handle Flutterwave initialization failure
     * ---------------------------------------------------------
     */

    if (
      !flutterwaveResponse.ok ||
      flutterwaveData.status !== "success"
    ) {
      console.error(
        "Flutterwave initialization failed:",
        flutterwaveData,
      );

      await supabase
        .from("wallet_transactions")
        .update({
          status: "failed",
          description: "Flutterwave payment initialization failed",
        })
        .eq("reference", reference)
        .eq("user_id", user.id);

      return jsonResponse(
        {
          error:
            flutterwaveData.message ||
            "Unable to initialize Flutterwave payment",
        },
        502,
      );
    }

    /*
     * ---------------------------------------------------------
     * 10. Return checkout URL to frontend
     * ---------------------------------------------------------
     */

    return jsonResponse({
      success: true,
      message: "Payment initialized successfully",
      reference,
      payment_link: flutterwaveData.data?.link || null,
    });
  } catch (error) {
    console.error("wallet-fund error:", error);

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
