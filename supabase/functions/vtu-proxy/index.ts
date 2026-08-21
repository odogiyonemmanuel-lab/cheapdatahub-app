import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CDH_BASE = "https://www.cheapdatahub.ng/api/v1/resellers";

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Supabase admin client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check logged-in user
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        { error: "Missing authorization header" },
        401
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { error: "Unauthorized" },
        401
      );
    }

    // Get CheapDataHub API key from Supabase Edge Function Secrets
    const apiKey = Deno.env.get("CDH_API_KEY");

    if (!apiKey) {
      return jsonResponse(
        { error: "CDH_API_KEY is not configured" },
        500
      );
    }

    // Get request path
    const url = new URL(req.url);

    const path = url.pathname.replace(
      /^\/functions\/v1\/vtu-proxy\/?/,
      ""
    );

    // Read POST body
    let body: Record<string, unknown> = {};

    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    }

    // ============================================================
    // WALLET BALANCE
    // ============================================================

    if (path === "wallet/balance") {
      const resp = await fetch(
        `${CDH_BASE}/wallet/balance/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await resp.json().catch(() => ({}));

      return jsonResponse(
        data,
        resp.ok ? 200 : resp.status
      );
    }

    // ============================================================
    // AIRTIME PURCHASE
    // ============================================================

    if (path === "airtime/purchase") {
      const provider_id = body.provider_id;
      const phone_number = body.phone_number;
      const amount = body.amount;
      const network = body.network;

      if (!provider_id || !phone_number || !amount) {
        return jsonResponse(
          {
            error:
              "Missing required fields: provider_id, phone_number, amount",
          },
          422
        );
      }

      const resp = await fetch(
        `${CDH_BASE}/airtime/purchase/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider_id,
            phone_number,
            amount,
          }),
        }
      );

      const data = await resp.json().catch(() => ({}));

      const success =
        data.status === "true" ||
        data.status === true ||
        data.success === true;

      // Save transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "airtime",
          network: network || "UNKNOWN",
          phone_number: String(phone_number),
          amount: Number(amount),
          provider_ref:
            data.reference ||
            data.transaction_id?.toString() ||
            "",
          status: success ? "success" : "failed",
          message:
            data.message ||
            (success
              ? "Airtime purchase successful"
              : "Airtime purchase failed"),
        });

      if (transactionError) {
        console.error(
          "Transaction insert error:",
          transactionError
        );
      }

      return jsonResponse(
        data,
        resp.ok ? 200 : resp.status
      );
    }

    // ============================================================
    // DATA PURCHASE
    // ============================================================

    if (path === "data/purchase") {
      const bundle_id = body.bundle_id;
      const phone_number = body.phone_number;
      const plan_name = body.plan_name;
      const network = body.network;
      const amount = body.amount;

      if (!bundle_id || !phone_number) {
        return jsonResponse(
          {
            error:
              "Missing required fields: bundle_id, phone_number",
          },
          422
        );
      }

      const resp = await fetch(
        `${CDH_BASE}/data/purchase/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bundle_id,
            phone_number,
          }),
        }
      );

      const data = await resp.json().catch(() => ({}));

      const success =
        data.status === "true" ||
        data.status === true ||
        data.success === true;

      // Save transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "data",
          network: network || "UNKNOWN",
          phone_number: String(phone_number),
          amount: Number(amount) || 0,
          plan_name: String(plan_name || ""),
          provider_ref:
            data.reference ||
            data.transaction_id?.toString() ||
            "",
          status: success ? "success" : "failed",
          message:
            data.message ||
            (success
              ? "Data purchase successful"
              : "Data purchase failed"),
        });

      if (transactionError) {
        console.error(
          "Transaction insert error:",
          transactionError
        );
      }

      return jsonResponse(
        data,
        resp.ok ? 200 : resp.status
      );
    }

    // ============================================================
    // TRANSACTIONS
    // ============================================================

    if (path === "transactions") {
      const {
        data,
        error,
      } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (error) {
        return jsonResponse(
          {
            error: error.message,
          },
          500
        );
      }

      return jsonResponse({
        transactions: data ?? [],
      });
    }

    // ============================================================
    // UNKNOWN ROUTE
    // ============================================================

    return jsonResponse(
      {
        error: "Not found",
        path,
      },
      404
    );
  } catch (err) {
    console.error("VTU proxy error:", err);

    return jsonResponse(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      500
    );
  }
});
