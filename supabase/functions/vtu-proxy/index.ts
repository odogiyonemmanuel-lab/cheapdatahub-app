import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_BASE =
  "https://www.cheapdatahub.ng/api/v1/resellers";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
    },
  });
}

function createReference(userId: string) {
  return `CDH-${userId.slice(0, 8)}-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}`
    .toUpperCase();
}

function successfulProviderStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();

  return (
    status === "true" ||
    status === "success" ||
    status === "successful" ||
    status === "ok"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    const providerKey = Deno.env.get("CDH_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !providerKey) {
      return json(
        {
          error: "Server configuration is incomplete",
        },
        500,
      );
    }

    const authorization =
      req.headers.get("Authorization") ?? "";

    const token = authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return json(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    const action = String(
      body?.action ?? "",
    ).trim();

    if (
      !body ||
      ![
        "airtime/purchase",
        "data/purchase",
      ].includes(action)
    ) {
      return json(
        {
          error: "Invalid purchase action",
        },
        422,
      );
    }

    const phone = String(
      body.phone_number ?? "",
    ).replace(/\D/g, "");

    if (!/^\d{11}$/.test(phone)) {
      return json(
        {
          error:
            "Enter a valid 11-digit phone number",
        },
        422,
      );
    }

    const reference = createReference(user.id);

    let customerAmount = 0;
    let providerCost = 0;

    let providerPayload: Record<
      string,
      unknown
    >;

    let planName = String(
      body.plan_name ?? "",
    );

    let providerId = String(
      body.provider_id ?? "",
    );

    const network = String(
      body.network ?? "",
    ).toUpperCase();

    /*
     * =====================================================
     * DATA PURCHASE
     * =====================================================
     */

    if (action === "data/purchase") {
      const bundleId = String(
        body.bundle_id ??
          body.plan_id ??
          body.plan_code ??
          "",
      ).trim();

      if (
        !bundleId ||
        !/^\d+$/.test(bundleId)
      ) {
        return json(
          {
            error:
              "A valid data plan is required",
          },
          422,
        );
      }

      const {
        data: pricing,
        error,
      } = await admin
        .from("cdh_product_pricing")
        .select(
          `
          product_id,
          provider_id,
          network,
          plan_name,
          provider_cost,
          selling_price,
          customer_price,
          active
          `,
        )
        .eq("product_id", bundleId)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        console.error(
          "Pricing lookup error:",
          error,
        );

        return json(
          {
            error:
              "Unable to load product pricing",
          },
          500,
        );
      }

      if (!pricing) {
        return json(
          {
            error:
              "This data plan is currently unavailable",
          },
          409,
        );
      }

      providerId = String(
        pricing.provider_id ??
          providerId,
      );

      planName = String(
        pricing.plan_name ??
          planName,
      );

      providerCost = Number(
        pricing.provider_cost ?? 0,
      );

      customerAmount = Number(
        pricing.selling_price ??
          pricing.customer_price ??
          0,
      );

      if (
        !Number.isFinite(
          providerCost,
        ) ||
        !Number.isFinite(
          customerAmount,
        ) ||
        customerAmount <= 0
      ) {
        return json(
          {
            error:
              "Invalid product pricing",
          },
          500,
        );
      }

      providerPayload = {
        bundle_id: Number(bundleId),
        phone_number: phone,
      };
    }

    /*
     * =====================================================
     * AIRTIME PURCHASE
     * =====================================================
     */

    else {
      const amount = Number(
        body.amount,
      );

      if (
        !Number.isFinite(amount) ||
        amount < 100 ||
        amount > 100000
      ) {
        return json(
          {
            error:
              "Airtime amount must be between ₦100 and ₦100,000",
          },
          422,
        );
      }

      const networkDiscount: Record<
        string,
        number
      > = {
        GLO: 0.04,
        MTN: 0.025,
        "9MOBILE": 0.025,
        AIRTEL: 0.01,
      };

      const discount =
        networkDiscount[network] ?? 0;

      const {
        data: airtimePricing,
        error,
      } = await admin
        .from("cdh_airtime_pricing")
        .select(
          "markup_type,markup_value,active",
        )
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error(
          "Airtime pricing error:",
          error,
        );

        return json(
          {
            error:
              "Unable to load airtime pricing",
          },
          500,
        );
      }

      if (
        airtimePricing &&
        airtimePricing.active === false
      ) {
        return json(
          {
            error:
              "Airtime sales are temporarily unavailable",
          },
          409,
        );
      }

      const markupType = String(
        airtimePricing?.markup_type ??
          "fixed",
      );

      const markup = Number(
        airtimePricing?.markup_value ??
          0,
      );

      customerAmount =
        markupType === "percent"
          ? amount *
            (1 + markup / 100)
          : amount + markup;

      providerCost =
        amount * (1 - discount);

      providerPayload = {
        provider_id: Number(
          body.provider_id,
        ),
        phone_number: phone,
        amount,
      };

      if (
        !Number.isFinite(
          customerAmount,
        ) ||
        customerAmount <= 0 ||
        !Number.isFinite(
          providerCost,
        ) ||
        providerCost < 0
      ) {
        return json(
          {
            error:
              "Invalid airtime pricing",
          },
          500,
        );
      }
    }

    /*
     * =====================================================
     * ATOMIC WALLET DEBIT
     * =====================================================
     */

    const begin =
      await admin.rpc(
        "cdh_begin_purchase",
        {
          p_user_id: user.id,
          p_reference: reference,
          p_transaction_type:
            action === "data/purchase"
              ? "data"
              : "airtime",
          p_provider_id:
            providerId || null,
          p_network:
            network || null,
          p_phone_number: phone,
          p_plan_name: planName,
          p_customer_amount:
            customerAmount,
          p_provider_cost:
            providerCost,
          p_metadata: {
            provider:
              "cheapdatahub",
            action,
          },
        },
      );

    if (begin.error) {
      console.error(
        "Wallet debit error:",
        begin.error,
      );

      const message =
        begin.error.message.includes(
          "Insufficient wallet balance",
        )
          ? "Insufficient wallet balance"
          : begin.error.message;

      return json(
        {
          error: message,
        },
        422,
      );
    }

    /*
     * =====================================================
     * SEND PURCHASE TO CHEAPDATAHUB PROVIDER
     * =====================================================
     */

    const providerResponse =
      await fetch(
        `${PROVIDER_BASE}/${action}/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerKey}`,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify(
            providerPayload,
          ),
        },
      );

    const providerData =
      await providerResponse
        .json()
        .catch(() => null);

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    if (
      providerResponse.ok &&
      successfulProviderStatus(
        providerData?.status,
      )
    ) {
      const providerReference =
        String(
          providerData?.reference ??
            providerData?.transaction_id ??
            providerData?.data
              ?.reference ??
            providerData?.data
              ?.transaction_id ??
            "",
        );

      const completed =
        await admin.rpc(
          "cdh_complete_purchase",
          {
            p_reference: reference,
            p_provider_reference:
              providerReference ||
              null,
            p_metadata: {
              provider_response:
                providerData,
            },
          },
        );

      if (completed.error) {
        console.error(
          "Transaction finalization error:",
          completed.error,
        );

        return json(
          {
            error:
              "Purchase completed but transaction finalization failed",
            reference,
          },
          500,
        );
      }

      return json({
        success: true,
        message: String(
          providerData?.message ??
            "Purchase successful",
        ),
        reference,
        transaction_id:
          providerReference ||
          reference,
        balance: Number(
          completed.data?.[0]
            ?.balance ?? 0,
        ),
        data: providerData,
      });
    }

    /*
     * =====================================================
     * PROVIDER FAILURE → REFUND
     * =====================================================
     */

    const refund =
      await admin.rpc(
        "cdh_refund_purchase",
        {
          p_reference: reference,
          p_reason: String(
            providerData?.message ??
              "Provider purchase failed",
          ),
        },
      );

    if (refund.error) {
      console.error(
        "Refund error:",
        refund.error,
      );

      return json(
        {
          error:
            "Provider purchase failed and automatic refund could not be completed",
          reference,
        },
        502,
      );
    }

    return json(
      {
        error: String(
          providerData?.message ??
            "Purchase failed",
        ),
        reference,
        refunded: true,
        balance: Number(
          refund.data?.[0]
            ?.balance ?? 0,
        ),
        provider: providerData,
      },
      502,
    );
  } catch (error) {
    console.error(
      "vtu-proxy error",
      error,
    );

    return json(
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
