import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

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
 * Extract the route after the vtu-proxy function name.
 *
 * Examples:
 *
 * /functions/v1/vtu-proxy/wallet/fund
 * -> wallet/fund
 *
 * /vtu-proxy/wallet/fund
 * -> wallet/fund
 */
function getPath(req: Request): string {
  const url = new URL(req.url);

  let path = url.pathname;

  path = path.replace(
    /^\/functions\/v1\/vtu-proxy\/?/,
    "",
  );

  path = path.replace(
    /^\/vtu-proxy\/?/,
    "",
  );

  return path.replace(/^\/+|\/+$/g, "");
}

function generateReference(
  userId: string,
): string {
  const randomPart = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8);

  return `CDH-${userId.slice(
    0,
    8,
  )}-${Date.now()}-${randomPart}`.toUpperCase();
}

Deno.serve(async (req: Request) => {
  /**
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
    /**
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
          error: "SUPABASE_URL is missing",
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

    /**
     * ==========================================
     * SUPABASE ADMIN CLIENT
     * ==========================================
     */

   
