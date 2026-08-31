import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { verifyWalletFunding } from "@/lib/api";

type PaymentStatus = "verifying" | "success" | "failed";

export default function PaymentCallback() {
  const [status, setStatus] = useState<PaymentStatus>("verifying");
  const [message, setMessage] = useState("Please wait while we confirm your payment...");
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
      const transactionId = params.get("transaction_id")?.trim() ?? "";
      const txRef = params.get("tx_ref")?.trim() ?? "";
      const returnedStatus = params.get("status")?.toLowerCase();

      if (returnedStatus === "cancelled" || returnedStatus === "failed") {
        setStatus("failed");
        setMessage("The payment was cancelled or failed. No money was added to your wallet.");
        return;
      }

      if (!transactionId || !txRef) {
        setStatus("failed");
        setMessage("We could not find the complete Flutterwave payment reference. Please contact support if money was deducted.");
        return;
      }

      setReference(txRef);
      const result = await verifyWalletFunding({
        transactionId,
        txRef,
      });

      if (!result?.success) {
        setStatus("failed");
        setMessage(result?.message || "We could not confirm this payment.");
        return;
      }

      setStatus("success");
      setMessage(result.message || "Your wallet has been funded successfully.");
      if (typeof result.amount === "number") setAmount(result.amount);
    } catch (error) {
      console.error("Flutterwave callback verification error:", error);
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Unable to verify this payment.");
    }
  }

  function returnToWallet() {
    window.location.href = "/?view=fund-wallet";
  }

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck className="h-8 w-8 text-emerald-400" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold">CheapDataHub</h1>
          <p className="mt-2 text-sm text-slate-400">Wallet Payment</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
          {status === "verifying" && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Verifying payment</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
              {reference && <p className="mt-5 break-all text-xs text-slate-500">Reference: {reference}</p>}
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Payment successful</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
              {amount !== null && (
                <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <p className="text-xs uppercase tracking-wide text-emerald-400/70">Amount credited</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">{formatAmount(amount)}</p>
                </div>
              )}
              {reference && <p className="mt-4 break-all text-xs text-slate-500">Reference: {reference}</p>}
              <button type="button" onClick={returnToWallet} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
                <ArrowLeft className="h-4 w-4" /> Return to Wallet
              </button>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-9 w-9 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold">Payment not confirmed</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
              {reference && <p className="mt-5 break-all text-xs text-slate-500">Reference: {reference}</p>}
              <button type="button" onClick={returnToWallet} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                <ArrowLeft className="h-4 w-4" /> Return to Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
