import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CDH_BASE = "https://www.cheapdatahub.ng/api/v1/resellers";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Fetch the API key from the database (service role bypasses RLS)
    const { data: secretRow, error: secretError } = await supabase
      .from("api_secrets")
      .select("key_value")
      .eq("key_name", "CDH_API_KEY")
      .maybeSingle();

    if (secretError || !secretRow) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const apiKey = secretRow.key_value;

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/vtu-proxy\/?/, "");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Route: /wallet/balance
    if (path === "wallet/balance") {
      const resp = await fetch(`${CDH_BASE}/wallet/balance/`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      const data = await resp.json();
      return jsonResponse(data, resp.ok ? 200 : resp.status);
    }

    // Route: /airtime/purchase
    if (path === "airtime/purchase") {
      const { provider_id, phone_number, amount, network } = body;
      if (!provider_id || !phone_number || !amount) {
        return jsonResponse({ error: "Missing required fields" }, 422);
      }

      const resp = await fetch(`${CDH_BASE}/airtime/purchase/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider_id, phone_number, amount }),
      });
      const data = await resp.json();
      const success = data.status === "true" || data.status === true;

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "airtime",
        network: network || "UNKNOWN",
        phone_number,
        amount: Number(amount),
        provider_ref: data.reference || data.transaction_id?.toString() || "",
        status: success ? "success" : "failed",
        message: data.message || (success ? "Airtime purchase successful" : "Airtime purchase failed"),
      });

      return jsonResponse(data, resp.ok ? 200 : resp.status);
    }

    // Route: /data/purchase
    if (path === "data/purchase") {
      const { bundle_id, phone_number, plan_name, network, amount } = body;
      if (!bundle_id || !phone_number) {
        return jsonResponse({ error: "Missing required fields" }, 422);
      }

      const resp = await fetch(`${CDH_BASE}/data/purchase/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bundle_id, phone_number }),
      });
      const data = await resp.json();
      const success = data.status === "true" || data.status === true;

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "data",
        network: network || "UNKNOWN",
        phone_number,
        amount: Number(amount) || 0,
        plan_name: plan_name || "",
        provider_ref: data.reference || data.transaction_id?.toString() || "",
        status: success ? "success" : "failed",
        message: data.message || (success ? "Data purchase successful" : "Data purchase failed"),
      });

      return jsonResponse(data, resp.ok ? 200 : resp.status);
    }

    // Route: /transactions
    if (path === "transactions") {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }
      return jsonResponse({ transactions: data });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
});
