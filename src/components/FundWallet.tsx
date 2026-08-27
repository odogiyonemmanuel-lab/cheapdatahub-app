// src/components/FundWallet.tsx

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Wallet,
  AlertCircle,
} from "lucide-react";

import {
  initializeWalletFunding,
  formatNairaAmount,
} from "../lib/api";

import { supabase } from "../lib/supabase";

type FundWalletProps = {
  onBack?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const QUICK_AMOUNTS = [
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
];

export default function FundWallet({
  onBack,
  onSuccess,
}: FundWalletProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const numericAmount = Number(amount);

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
    setError("");
    setSuccess("");
  };

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value.replace(/[^\d]/g, "");

    setAmount(value);
    setError("");
    setSuccess("");
  };

  const handleFundWallet = async () => {
    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    const fundingAmount = Number(amount);

    if (!amount || !Number.isFinite(fundingAmount)) {
      setError("Enter a valid amount.");
      return;
    }

    if (fundingAmount < 100) {
      setError("Minimum wallet funding amount is ₦100.");
      return;
    }

    if (fundingAmount > 5_000_000) {
      setError(
        "Maximum wallet funding amount is ₦5,000,000.",
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * Confirm that the user is logged in.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      /*
       * Create the return URL.
       *
       * Flutterwave will redirect the customer back here
       * after payment.
       *
       * You can change "/fund-wallet" if your router uses
       * another path.
       */
      const redirectUrl = new URL(
        "/fund-wallet",
        window.location.origin,
      ).toString();

      /*
       * Initialize payment through Supabase Edge Function.
       *
       * The browser does NOT use your Flutterwave secret key.
       */
      const result = await initializeWalletFunding({
        amount: fundingAmount,

        email: user.email ?? undefined,

        name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "",

        phone:
          user.user_metadata?.phone ??
          user.phone ??
          "",

        /*
         * If your initializeWalletFunding type does not yet
         * accept redirect_url, add it to src/lib/api.ts.
         */
        redirect_url: redirectUrl,
      });

      if (!result.success) {
        throw new Error(
          result.message ||
            "Unable to initialize wallet funding.",
        );
      }

      const paymentUrl =
        result.payment_link ??
        result.checkout_url;

      if (
        !paymentUrl ||
        typeof paymentUrl !== "string"
      ) {
        throw new Error(
          "Flutterwave did not return a valid payment link.",
        );
      }

      setSuccess(
        "Redirecting you to Flutterwave to complete your payment...",
      );

      /*
       * Redirect to Flutterwave checkout.
       */
      window.location.assign(paymentUrl);
    } catch (err) {
      console.error(
        "Wallet funding error:",
        err,
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to start wallet funding. Please try again.";

      setError(message);

      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              aria-label="Go back"
            >
              <ArrowLeft size={21} />
            </button>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Fund Wallet
            </h1>

            <p className="text-sm text-slate-500">
              Add money to your CheapDataHub wallet
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Wallet Banner */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-100">
                Wallet funding
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Add money securely
              </h2>
            </div>

            <div className="rounded-2xl bg-white/15 p-3">
              <Wallet size={28} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-100">
            <ShieldCheck size={18} />

            <span>
              Secure payment powered by Flutterwave
            </span>
          </div>
        </div>

        {/* Funding Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {/* Amount */}
          <div className="mb-6">
            <label
              htmlFor="wallet-amount"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Amount to fund
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                ₦
              </span>

              <input
                id="wallet-amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white py-4 pl-10 pr-4 text-2xl font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Minimum funding amount: ₦100
            </p>
          </div>

          {/* Quick Amounts */}
          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Quick amount
            </p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {QUICK_AMOUNTS.map((value) => {
                const selected =
                  numericAmount === value;

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleQuickAmount(value)
                    }
                    className={[
                      "rounded-xl border px-2 py-3 text-sm font-semibold transition disabled:opacity-50",

                      selected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
                    ].join(" ")}
                  >
                    ₦
                    {value.toLocaleString(
                      "en-NG",
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {numericAmount > 0 && (
            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Wallet credit
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {formatNairaAmount(
                    numericAmount,
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex gap-3 rounded-xl border border-
