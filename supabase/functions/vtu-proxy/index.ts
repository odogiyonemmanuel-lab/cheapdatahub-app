import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  createClient,
} from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
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
        "Content-Type":
          "application/json",
      },
    },
  );
}

/**
 * Extract the route after the vtu-proxy function.
 *
 * Examples:
 *
 * /functions/v1/vtu-proxy/wallet/fund
 * -> wallet/fund
 *
 * /functions/v1/vtu-proxy/wallet/verify
 * -> wallet/verify
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

Deno.serve(async (req: Request) => {
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
      Deno.env.get(
        "FLW_SECRET_KEY",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            "Supabase server configuration is missing.",
        },
        500,
      );
    }

    if (!flutterwaveSecretKey) {
      return jsonResponse(
        {
          error:
            "Flutterwave is not configured.",
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
          error:
            "Missing authorization header.",
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
          error: "Unauthorized.",
        },
        401,
      );
    }

    const path = getPath(req);

    console.log(
      "vtu-proxy path:",
      path,
    );

    console.log(
      "Authenticated user:",
      user.id,
    );

    /*
     * ============================================
     * WALLET FUND
     * ============================================
     */

    if (path === "wallet/fund") {
      if (req.method !== "POST") {
        return jsonResponse(
          {
            error:
              "Method not allowed.",
          },
          405,
        );
      }

      const body =
        await req.json()
          .catch(() => null);

      if (!body) {
        return jsonResponse(
          {
            error:
              "
