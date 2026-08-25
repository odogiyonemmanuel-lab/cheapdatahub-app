// supabase/functions/wallet-funding/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY");

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generateReference(userId: string) {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12);

  return `CDH-WALLET-${userId.slice(0, 8)}-${timestamp}-${random}`;
}

Deno.serve(async (req) => {
  /*
   * CORS
   */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        message: "Method not allowed",
      },
      405,
    );
  }

  try {
    /*
     * Make sure Flutterwave secret exists.
     */
    if (!FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY is missing.");

      return jsonResponse(
        {
          success: false,
          message:
            "Flutterwave is not configured on the server.",
        },
        500,
      );
    }

    /*
     * Get customer's access token.
     */
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          message: "Missing authorization.",
        },
        401,
      );
    }

    /*
     * Create a Supabase client using the customer's JWT.
     */
    const supabaseUser = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    /*
     * Verify the logged-in user.
     */
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid or expired login session.",
        },
        401,
      );
    }

    /*
     * Read request body.
     */
    const body = await req.json();

    const amount = Number(body.amount);

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : user.email;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    /*
     * Validate amount.
     */
    if (!Number.isFinite(amount)) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid funding amount.",
        },
        400,
      );
    }

    if (amount < 100) {
      return jsonResponse(
        {
          success: false,
          message: "Minimum wallet funding amount is ₦100.",
        },
        400,
      );
    }

    if (amount > 5_000_000) {
      return jsonResponse(
        {
          success: false,
          message:
            "Maximum wallet funding amount is ₦5,000,000.",
        },
        400,
      );
    }

    if (!email) {
      return jsonResponse(
        {
          success: false,
          message:
            "Your account does not have an email address.",
        },
        400,
      );
    }

    /*
     * Generate a unique transaction reference.
     *
     * The reference contains a short user identifier so the
     * webhook can associate the payment with the customer.
     */
    const txRef = generateReference(user.id);

    /*
     * Your frontend should send the customer back to the app
     * after Flutterwave checkout.
     *
     * Change this later if your production domain is different.
     */
    const appUrl =
      Deno.env.get("APP_URL") ??
      "http://localhost:5173";

    const redirectUrl =
      `${appUrl}/wallet/payment-success?tx_ref=${encodeURIComponent(
        txRef,
      )}`;

    /*
     * Create Flutterwave Standard checkout.
     *
     * Flutterwave's Standard API uses:
     * POST https://api.flutterwave.com/v3/payments
     */
    const flutterwaveResponse = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount,
          currency: "NGN",
          redirect_url: redirectUrl,

          customer: {
            email,
            name: name || "CheapDataHub Customer",
            phonenumber: phone || undefined,
          },

          customizations: {
            title: "CheapDataHub Wallet",
            description:
              "Fund your CheapDataHub prepaid wallet",
            logo: "",
          },

          payment_options:
            "card,banktransfer,ussd,account,internetbanking,nqr,opay",

          meta: {
            user_id: user.id,
            purpose: "wallet_funding",
            amount,
            tx_ref: txRef,
          },
        }),
      },
    );

    const flutterwaveData =
      await flutterwaveResponse.json();

    console.log(
      "Flutterwave initialization response:",
      JSON.stringify({
        status: flutterwaveResponse.status,
        success: flutterwaveData?.status,
      }),
    );

    if (!flutterwaveResponse.ok) {
      console.error(
        "Flutterwave initialization failed:",
        flutterwaveData,
      );

      return jsonResponse(
        {
          success: false,
          message:
            flutterwaveData?.message ??
            "Unable to initialize Flutterwave payment.",
        },
        400,
      );
    }

    /*
     * Flutterwave should return:
     *
     * data.link
     *
     * We return that link to the frontend.
     */
    const paymentLink =
      flutterwaveData?.data?.link;

    if (!paymentLink) {
      console.error(
        "Flutterwave response did not contain a payment link:",
        flutterwaveData,
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Flutterwave did not return a payment link.",
        },
        502,
      );
    }

    /*
     * IMPORTANT:
     *
     * We DO NOT credit the wallet here.
     *
     * The customer has only been sent to checkout.
     *
     * Wallet credit will happen after the webhook/payment
     * verification step.
     */

    return jsonResponse({
      success: true,
      message:
        "Flutterwave payment initialized successfully.",
      reference: txRef,
      payment_link: paymentLink,
      checkout_url: paymentLink,
      amount,
    });
  } catch (error) {
    console.error(
      "wallet-funding error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});
