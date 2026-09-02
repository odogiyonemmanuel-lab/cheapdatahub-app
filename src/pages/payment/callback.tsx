import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { verifyWalletFunding } from "@/lib/api";

type PaymentStatus = "verifying" | "success" | "failed";

export default function PaymentCallback() {
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [message, setMessage] = useState(
    "Please wait while we confirm your payment..."
  );
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) return;

    verificationStarted.current = true;

    void verifyPayment();
  }, []);

  async function verifyPayment() {
    try {
      const params = new URLSearchParams(window.location.search);

      const transactionId = params.get("transaction_id");
      const txRef = params.get("tx_ref");
      const returnedStatus = params.get("status");

      console.log("Flutterwave callback:", {
        transactionId,
        txRef,
        returnedStatus,
      });

      /*
       * Check if customer cancelled or payment failed
       */

      if (
        returnedStatus?.toLowerCase() === "cancelled" ||
        returnedStatus?.toLowerCase() === "failed"
      ) {
        setStatus("failed");

        setMessage(
          "The payment was cancelled or failed. No money was added to your wallet."
        );

        return;
      }

      /*
       * Flutterwave transaction ID is required
       */

      if (!transactionId) {
        setStatus("failed");

        setMessage(
          "Invalid Flutterwave transaction ID. Please contact support if money was deducted."
        );

        return;
      }

      /*
       * Merchant transaction reference is required
       */

      if (!txRef) {
        setStatus("failed");

        setMessage(
          "Flutterwave payment reference was not found. Please contact support if money was deducted."
        );

        return;
      }

      /*
       * Display the transaction reference
       */

      setReference(txRef);

      /*
       * Verify payment with Supabase Edge Function
       *
       * IMPORTANT:
       * Your flutterwave-verify function requires BOTH:
       *
       * transaction_id
       * tx_ref
       */

      const result = await verifyWalletFunding({
        transaction_id: transactionId,
        tx_ref: txRef,
      });

      console.log("Wallet verification result:", result);

      /*
       * Verification failed
       */

      if (!result?.success) {
        setStatus("failed");

        setMessage(
          result?.message ||
            "We could not confirm this payment. Please contact support if money was deducted."
        );

        return;
      }

      /*
       * Payment successful
       */

      setStatus("success");

      setMessage(
        result?.message ||
          "Payment verified and your wallet has been funded successfully."
      );

      if (
        result.amount !== undefined &&
        result.amount !== null &&
        !Number.isNaN(Number(result.amount))
      ) {
        setAmount(Number(result.amount));
      }
    } catch (error) {
      console.error(
        "Flutterwave callback verification error:",
        error
      );

      setStatus("failed");

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to verify this payment."
      );
    }
  }

  function returnToWallet() {
    window.location.href = "/?view=fund-wallet";
  }

  function formatAmount(value: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck
              className="h-8 w-8 text-emerald-400"
              strokeWidth={1.8}
            />
          </div>

          <h1 className="text-2xl font-bold text-white">
            CheapDataHub
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Wallet Payment
          </p>
        </div>

        {/* Main Card */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">

          {/* VERIFYING */}

          {status === "verifying" && (
            <div className="text-center">

              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>

              <h2 className="text-xl font-semibold">
                Verifying payment
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {message}
              </p>

              {reference && (
                <div className="mt-6 rounded-xl bg-slate-950 p-4 text-left">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Payment reference
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-300">
                    {reference}
                  </p>
                </div>
              )}

              <p className="mt-5 text-xs text-slate-600">
                Please do not close this page.
              </p>

            </div>
          )}

          {/* SUCCESS */}

          {status === "success" && (
            <div className="text-center">

              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              </div>

              <h2 className="text-xl font-semibold">
                Payment successful
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {message}
              </p>

              {amount !== null && (
                <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">

                  <p className="text-xs uppercase tracking-wide text-emerald-400/70">
                    Amount credited
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {formatAmount(amount)}
                  </p>

                </div>
              )}

              {reference && (
                <div className="mt-4 rounded-xl bg-slate-950 p-4 text-left">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Payment reference
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-300">
                    {reference}
                  </p>

                </div>
              )}

              <button
                type="button"
                onClick={returnToWallet}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                <ArrowLeft className="h-4 w-4" />

                Return to Wallet
              </button>

            </div>
          )}

          {/* FAILED */}

          {status === "failed" && (
            <div className="text-center">

              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-9 w-9 text-red-400" />
              </div>

              <h2 className="text-xl font-semibold">
                Payment not confirmed
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {message}
              </p>

              {reference && (
                <div className="mt-6 rounded-xl bg-slate-950 p-4 text-left">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Payment reference
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-300">
                    {reference}
                  </p>

                </div>
              )}

              <button
                type="button"
                onClick={returnToWallet}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />

                Return to Wallet
              </button>

            </div>
          )}

        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-600">
          Payment verification is handled securely by CheapDataHub.
        </p>

      </div>
    </div>
  );
}
