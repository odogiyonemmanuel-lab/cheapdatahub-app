// src/components/FundWallet.tsx

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  initializeWalletFunding,
  formatNairaAmount,
} from "../lib/api";
import { supabase } from "../lib/supabase";

type FundWalletProps = {
  onBack?: () => void;
  onSuccess?: () => void;
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

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
    setError("");
    setSuccess("");

    if (!amount || numericAmount <= 0) {
      setError("Enter the amount you want to fund.");
      return;
    }

    if (numericAmount < 100) {
      setError("Minimum wallet funding amount is ₦100.");
      return;
    }

    if (numericAmount > 5000000) {
      setError("Maximum wallet funding amount is ₦5,000,000.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before funding your wallet.");
      }

      const result = await initializeWalletFunding({
        amount: numericAmount,
        email: user.email ?? undefined,
        name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "",
        phone:
          user.user_metadata?.phone ??
          user.phone ??
          "",
      });

      const paymentUrl =
        result.payment_link ??
        result.checkout_url;

      if (!paymentUrl) {
        throw new Error(
          result.message ||
            "Flutterwave did not return a payment link.",
        );
      }

      setSuccess(
        "Payment page opened. Complete your payment to fund your wallet.",
      );

      /*
       * Redirect the customer to Flutterwave checkout.
       *
       * The actual wallet credit must happen on the server
       * after Flutterwave confirms the transaction.
       */
      window.location.href = paymentUrl;
    } catch (err) {
      console.error("Wallet funding error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to start wallet funding.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
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
        {/* Wallet card */}
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
            <span>Secure payment powered by Flutterwave</span>
          </div>
        </div>

        {/* Main funding card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

          {/* Quick amounts */}
          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Quick amount
            </p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {QUICK_AMOUNTS.map((value) => {
                const selected = numericAmount === value;

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickAmount(value)}
                    className={[
                      "rounded-xl border px-2 py-3 text-sm font-semibold transition",
                      selected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
                    ].join(" ")}
                  >
                    ₦{value.toLocaleString("en-NG")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount summary */}
          {numericAmount > 0 && (
            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Wallet credit
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {formatNairaAmount(numericAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span>{success}</span>
            </div>
          )}

          {/* Pay button */}
          <button
            type="button"
            onClick={handleFundWallet}
            disabled={
              loading ||
              !amount ||
              numericAmount < 100
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Connecting to Flutterwave...
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Continue to Payment
              </>
            )}
          </button>

          {/* Security information */}
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Secure wallet funding
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                You will be redirected to Flutterwave to complete
                your payment. Your wallet is credited only after
                the payment is verified by our secure server.
              </p>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">
            Payment information
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Depending on what Flutterwave makes available for your
            account, you may be able to pay using cards, bank
            transfer, USSD, or other supported Nigerian payment
            methods.
          </p>
        </div>
      </main>
    </div>
  );
}
