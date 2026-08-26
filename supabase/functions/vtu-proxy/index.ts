import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_BASE_URL =
  "https://api.flutterwave.com/v3";

function jsonResponse(
  data: unknown,
  status = 200,
) {
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

/**
 * Extract the route after vtu-proxy.
 *
 * Examples:
 *
 * /vtu-proxy/wallet/fund
 * -> wallet/fund
 *
 * /functions/v1/vtu-proxy/wallet/fund
 * -> wallet/fund
 */
function getPath(req: Request) {
  const url = new URL(req.url);

  return url.pathname
    .replace(
      /^\/functions\/v1\/vtu-proxy\/?/,
      "",
    )
    .replace(
      /^\/vtu-proxy\/?/,
      "",
    )
    .replace(/^\/+|\/+$/g, "");
}

function generateReference(
  userId: string,
) {
  return (
    `CDH-${userId.slice(
      0,
      8,
    )}-${Date.now()}-${crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)}`
  ).toUpperCase();
}

Deno.serve(
  async (req: Request) => {
    /*
     * ==========================================
     * CORS PREFLIGHT
     * ==========================================
     */

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      /*
       * ==========================================
       * ENVIRONMENT VARIABLES
       * ==========================================
       */

      const supabaseUrl =
        Deno.env.get("SUPABASE_URL");

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        );

      const flutterwaveSecretKey =
        Deno.env.get(
          "FLW_SECRET_KEY",
        );

      if (!supabaseUrl) {
        return jsonResponse(
          {
            error:
              "SUPABASE_URL is missing",
          },
          500,
        );
      }

      if (!serviceRoleKey) {
        return jsonResponse(
          {
            error:
              "SUPABASE_SERVICE_ROLE_KEY is missing",
          },
          500,
        );
      }

      if (!flutterwaveSecretKey) {
        return jsonResponse(
          {
            error:
              "FLW_SECRET_KEY is missing",
          },
          500,
        );
      }

      /*
       * ==========================================
       * SUPABASE ADMIN CLIENT
       * ==========================================
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
       * ==========================================
       * AUTHENTICATE USER
       * ==========================================
       */

      const authHeader =
        req.headers.get(
          "Authorization",
        );

      if (!authHeader) {
        return jsonResponse(
          {
            error:
              "Missing authorization header",
          },
          401,
        );
      }

      const token =
        authHeader.replace(
          /^Bearer\s+/i,
          "",
        );

      const {
        data: {
          user,
        },
        error: authError,
      } =
        await supabase.auth.getUser(
          token,
        );

      if (authError || !user) {
        console.error(
          "Authentication error:",
          authError,
        );

        return jsonResponse(
          {
            error:
              "Unauthorized",
          },
          401,
        );
      }

      /*
       * ==========================================
       * DETERMINE ENDPOINT
       * ==========================================
       */

      const path =
        getPath(req);

      console.log(
        "vtu-proxy endpoint:",
        path,
      );

      console.log(
        "Authenticated user:",
        user.id,
      );

      /*
       * ==========================================
       * WALLET FUNDING
       * ==========================================
       */

      if (
        path === "wallet/fund"
      ) {
        if (
          req.method !== "POST"
        ) {
          return jsonResponse(
            {
              error:
                "Method not allowed",
            },
            405,
          );
        }

        const body =
          await req
            .json()
            .catch(() => null);

        if (!body) {
          return jsonResponse(
            {
              error:
                "Invalid request body",
            },
            400,
          );
        }

        const amount =
          Number(body.amount);

        /*
         * Validate amount
         */

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          return jsonResponse(
            {
              error:
                "Enter a valid funding amount",
            },
            422,
          );
        }

        if (
          amount < 100
        ) {
          return jsonResponse(
            {
              error:
                "Minimum wallet funding amount is ₦100",
            },
            422,
          );
        }

        if (
          amount > 5_000_000
        ) {
          return jsonResponse(
            {
              error:
                "Maximum wallet funding amount is ₦5,000,000",
            },
            422,
          );
        }

        /*
         * ==========================================
         * CUSTOMER INFORMATION
         * ==========================================
         */

        const email =
          user.email ||
          body.email ||
          "";

        if (!email) {
          return jsonResponse(
            {
              error:
                "Your account does not have an email address",
            },
            422,
          );
        }

        const fullName =
          user.user_metadata
            ?.full_name ||
          user.user_metadata
            ?.name ||
          body.name ||
          "CheapDataHub Customer";

        const phone =
          user.phone ||
          body.phone ||
          "";

        /*
         * ==========================================
         * GENERATE PAYMENT REFERENCE
         * ==========================================
         */

        const reference =
          generateReference(
            user.id,
          );

        console.log(
          "Creating wallet funding:",
          {
            reference,
            userId:
              user.id,
            amount,
          },
        );

        /*
         * ==========================================
         * CREATE PENDING DEPOSIT
         *
         * Wallet is NOT credited here.
         * ==========================================
         */

        const {
          error: depositError,
        } = await supabase
          .from("cdh_deposits")
          .insert({
            user_id:
              user.id,

            amount,

            reference,

            status:
              "pending",

            provider:
              "flutterwave",
          });

        if (depositError) {
          console.error(
            "Deposit insert error:",
            depositError,
          );

          return jsonResponse(
            {
              error:
                "Could not create wallet funding record",

              details:
                depositError.message,
            },
            500,
          );
        }

        /*
         * ==========================================
         * REDIRECT URL
         * ==========================================
         */

        const origin =
          req.headers.get(
            "origin",
          );

        /*
         * Send Flutterwave back to your application.
         *
         * The frontend can then verify
         * the transaction.
         */

        const redirectUrl =
          body.redirect_url ||
          (
            origin
              ? `${origin}/`
              : "https://cheapdatahub-app.vercel.app/"
          );

        /*
         * ==========================================
         * INITIALIZE FLUTTERWAVE PAYMENT
         * ==========================================
         */

        const flutterwaveResponse =
          await fetch(
            `${FLUTTERWAVE_BASE_URL}/payments`,
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${flutterwaveSecretKey}`,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  tx_ref:
                    reference,

                  amount,

                  currency:
                    "NGN",

                  redirect_url:
                    redirectUrl,

                  customer: {
                    email,

                    name:
                      fullName,

                    phonenumber:
                      phone ||
                      undefined,
                  },

                  customizations: {
                    title:
                      "CheapDataHub",

                    description:
                      `Fund CheapDataHub wallet with ₦${amount.toLocaleString(
                        "en-NG",
                      )}`,
                  },

                  payment_options:
                    "card,banktransfer,ussd,account",

                  meta: {
                    user_id:
                      user.id,

                    wallet_funding:
                      true,

                    reference,
                  },
                }),
            },
          );

        let flutterwaveData:
          | Record<
              string,
              any
            >
          | null = null;

        try {
          flutterwaveData =
            await flutterwaveResponse.json();
        } catch {
          flutterwaveData =
            null;
        }

        console.log(
          "Flutterwave status:",
          flutterwaveResponse.status,
        );

        console.log(
          "Flutterwave response:",
          flutterwaveData,
        );

        /*
         * ==========================================
         * HANDLE FLUTTERWAVE FAILURE
         * ==========================================
         */

        if (
          !flutterwaveResponse.ok ||
          flutterwaveData?.status !==
            "success"
        ) {
          await supabase
            .from(
              "cdh_deposits",
            )
            .update({
              status:
                "failed",
            })
            .eq(
              "reference",
              reference,
            )
            .eq(
              "user_id",
              user.id,
            );

          return jsonResponse(
            {
              error:
                flutterwaveData?.message ||
                "Unable to initialize Flutterwave payment",
            },
            502,
          );
        }

        /*
         * ==========================================
         * GET FLUTTERWAVE PAYMENT LINK
         * ==========================================
         */

        const paymentLink =
          flutterwaveData
            ?.data
            ?.link;

        if (!paymentLink) {
          console.error(
            "No Flutterwave payment link:",
            flutterwaveData,
          );

          await supabase
            .from(
              "cdh_deposits",
            )
            .update({
              status:
                "failed",
            })
            .eq(
              "reference",
              reference,
            );

          return jsonResponse(
            {
              error:
                "Flutterwave did not return a payment link",
            },
            502,
          );
        }

        /*
         * ==========================================
         * SUCCESS
         * ==========================================
         */

        return jsonResponse(
          {
            success:
              true,

            message:
              "Payment initialized successfully",

            reference,

            payment_link:
              paymentLink,

            checkout_url:
              paymentLink,

            amount,
          },
          200,
        );
      }

      /*
       * ==========================================
       * UNKNOWN ENDPOINT
       * ==========================================
       */

      return jsonResponse(
        {
          error:
            `Unknown vtu-proxy endpoint: ${
              path || "/"
            }`,
        },
        404,
      );
    } catch (error) {
      console.error(
        "vtu-proxy error:",
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
  },
);
