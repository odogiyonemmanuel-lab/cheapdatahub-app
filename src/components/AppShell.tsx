import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

import {
  getWalletBalance,
  getTransactions,
  initializeWalletFunding,
  verifyWalletFunding,
} from "@/lib/api";

import { formatNaira } from "@/lib/dataPlans";
import type { Transaction } from "@/types";

import {
  Zap,
  LayoutDashboard,
  Smartphone,
  Wifi,
  Receipt,
  LogOut,
  Wallet as WalletIcon,
  Loader2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  CreditCard,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import AirtimePurchase from "./AirtimePurchase";
import DataPurchase from "./DataPurchase";

type View =
  | "dashboard"
  | "fund-wallet"
  | "airtime"
  | "data"
  | "transactions";

type UserLike = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    phone?: string;
  };
};

export default function AppShell({
  view,
  setView,
  onNavigate,
}: {
  view: View;
  setView: (v: View) => void;
  onNavigate: (v: View) => void;
}) {
  const { user, signOut } = useAuth();

  const [cdhBalance, setCdhBalance] =
    useState<number | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loadingBalance, setLoadingBalance] =
    useState(true);

  const [loadingTransactions, setLoadingTransactions] =
    useState(true);

  const [balanceError, setBalanceError] =
    useState<string | null>(null);

  const [transactionError, setTransactionError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * Load wallet balance
   * ---------------------------------------------------------
   */
  const refreshBalance = useCallback(async () => {
    if (!user?.id) {
      setCdhBalance(null);
      setLoadingBalance(false);
      return;
    }

    setLoadingBalance(true);
    setBalanceError(null);

    try {
      const result = await getWalletBalance();

      setCdhBalance(
        Number(result.balance || 0)
      );
    } catch (error) {
      console.error(
        "Unable to load wallet balance:",
        error
      );

      setBalanceError(
        error instanceof Error
          ? error.message
          : "Unable to load wallet balance."
      );
    } finally {
      setLoadingBalance(false);
    }
  }, [user?.id]);

  /*
   * ---------------------------------------------------------
   * Load transactions
   * ---------------------------------------------------------
   */
  const refreshTransactions = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);
    setTransactionError(null);

    try {
      const result = await getTransactions(100);

      /*
       * The API transaction structure is compatible with
       * the application's Transaction type for display.
       */
      setTransactions(
        (result ?? []) as Transaction[]
      );
    } catch (error) {
      console.error(
        "Unable to load transactions:",
        error
      );

      setTransactions([]);

      setTransactionError(
        error instanceof Error
          ? error.message
          : "Unable to load transactions."
      );
    } finally {
      setLoadingTransactions(false);
    }
  }, [user?.id]);

  /*
   * ---------------------------------------------------------
   * Refresh everything
   * ---------------------------------------------------------
   */
  const refreshData = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setRefreshing(true);

    await Promise.allSettled([
      refreshBalance(),
      refreshTransactions(),
    ]);

    setRefreshing(false);
  }, [
    user?.id,
    refreshBalance,
    refreshTransactions,
  ]);

  /*
   * ---------------------------------------------------------
   * Initial data load
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    refreshData();
  }, [user?.id, refreshData]);

  /*
   * ---------------------------------------------------------
   * Handle Flutterwave return
   *
   * Flutterwave redirects the customer back to:
   *
   * /fund-wallet?status=successful&tx_ref=...
   *
   * The actual wallet credit must be performed by the
   * server-side verification endpoint.
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const url = new URL(
      window.location.href
    );

    const status =
      url.searchParams.get("status");

    const txRef =
      url.searchParams.get("tx_ref") ||
      url.searchParams.get("transaction_id");

    /*
     * Nothing to verify.
     */
    if (!status && !txRef) {
      return;
    }

    /*
     * Only process a Flutterwave return.
     */
    if (
      status !== "successful" &&
      status !== "completed" &&
      !txRef
    ) {
      return;
    }

    let cancelled = false;

    const verifyPayment = async () => {
      try {
        if (!txRef) {
          throw new Error(
            "Payment reference was not returned by Flutterwave."
          );
        }

        /*
         * Server-side verification.
         */
        const result =
          await verifyWalletFunding(
            txRef
          );

        if (cancelled) {
          return;
        }

        if (!result.success) {
          throw new Error(
            result.message ||
              "Payment verification failed."
          );
        }

        /*
         * Refresh wallet and transaction
         * history after successful verification.
         */
        await refreshData();

        /*
         * Remove Flutterwave query parameters
         * from the browser URL.
         */
        window.history.replaceState(
          {},
          document.title,
          "/"
        );

        alert(
          result.message ||
            "Wallet funded successfully."
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Flutterwave verification error:",
          error
        );

        /*
         * Keep the URL clean even when verification
         * fails.
         */
        window.history.replaceState(
          {},
          document.title,
          "/"
        );

        alert(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Please contact support."
        );
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshData]);

  /*
   * ---------------------------------------------------------
   * Navigation
   * ---------------------------------------------------------
   */
  const navigate = useCallback(
    (nextView: View) => {
      setView(nextView);
      onNavigate(nextView);
    },
    [setView, onNavigate]
  );

  const navItems: {
    key: View;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      key: "fund-wallet",
      label: "Fund Wallet",
      icon: WalletIcon,
    },
    {
      key: "airtime",
      label: "Airtime",
      icon: Smartphone,
    },
    {
      key: "data",
      label: "Data",
      icon: Wifi,
    },
    {
      key: "transactions",
      label: "History",
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/50 bg-slate-900/30 p-4 fixed h-screen">

        <div className="flex items-center gap-2 px-2 py-3 mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap
              className="w-5 h-5 text-white"
              fill="white"
            />
          </div>

          <span className="font-bold text-lg">
            CheapDataHub
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() =>
                  navigate(item.key)
                }
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  view === item.key
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-5 h-5" />

                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-5 h-5" />

          Sign Out
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <div className="flex-1 lg:ml-64">

        {/* ===================================================
            MOBILE HEADER
        =================================================== */}
        <header className="lg:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
              <Zap
                className="w-4 h-4 text-white"
                fill="white"
              />
            </div>

            <span className="font-bold">
              CheapDataHub
            </span>
          </div>

          <button
            onClick={signOut}
            className="text-slate-400 hover:text-red-400 transition p-2"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-28 lg:pb-8">

          {/* =================================================
              WALLET BANNER
          ================================================= */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">

            <div className="flex items-center gap-3 min-w-0">

              <div className="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <WalletIcon className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="min-w-0">

                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                  CheapDataHub Wallet
                </div>

                {loadingBalance ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />

                    <span className="text-slate-500 text-sm">
                      Loading balance...
                    </span>
                  </div>
                ) : balanceError ? (
                  <div className="text-sm text-amber-400 mt-1 truncate">
                    {balanceError}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    {formatNaira(
                      cdhBalance ?? 0
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() =>
                navigate("fund-wallet")
              }
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-semibold transition flex-shrink-0"
            >
              <Plus className="w-4 h-4" />

              Fund
            </button>
          </div>

          {/* =================================================
              REFRESH
          ================================================= */}
          <div className="flex justify-end mb-4">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>
          </div>

          {/* =================================================
              DASHBOARD
          ================================================= */}
          {view === "dashboard" && (
            <DashboardView
              transactions={transactions}
              loading={loadingTransactions}
              transactionError={
                transactionError
              }
              onNavigate={navigate}
            />
          )}

          {/* =================================================
              FUND WALLET
          ================================================= */}
          {view === "fund-wallet" && (
            <FundWalletView
              onSuccess={refreshData}
              user={user as UserLike | null}
            />
          )}

          {/* =================================================
              AIRTIME
          ================================================= */}
          {view === "airtime" && (
            <AirtimeView
              onSuccess={refreshData}
            />
          )}

          {/* =================================================
              DATA
          ================================================= */}
          {view === "data" && (
            <DataView
              onSuccess={refreshData}
            />
          )}

          {/* =================================================
              TRANSACTIONS
          ================================================= */}
          {view === "transactions" && (
            <TransactionsView
              transactions={transactions}
              loading={loadingTransactions}
              error={transactionError}
              onRetry={refreshTransactions}
            />
          )}
        </main>
      </div>

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ===================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 flex items-center justify-around px-1 py-2 overflow-x-auto">

        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() =>
                navigate(item.key)
              }
              className={`flex flex-col items-center gap-1 min-w-[60px] px-2 py-1.5 rounded-lg transition ${
                view === item.key
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" />

              <span className="text-[9px] font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}


/* =========================================================
   DASHBOARD
========================================================= */

function DashboardView({
  transactions,
  loading,
  transactionError,
  onNavigate,
}: {
  transactions: Transaction[];
  loading: boolean;
  transactionError: string | null;
  onNavigate: (v: View) => void;
}) {
  const recent =
    transactions.slice(0, 5);

  const successCount =
    transactions.filter(
      (t) => t.status === "success"
    ).length;

  const totalSpent =
    transactions
      .filter(
        (t) => t.status === "success"
      )
      .reduce(
        (sum, t) =>
          sum + Number(t.amount || 0),
        0
      );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        Dashboard
      </h1>

      <p className="text-slate-400 text-sm mb-6">
        Overview of your recent activity.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Total Spent
            </span>
          </div>

          <div className="text-2xl font-bold">
            {formatNaira(totalSpent)}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>

            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Successful
            </span>
          </div>

          <div className="text-2xl font-bold">
            {successCount}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>

            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Transactions
            </span>
          </div>

          <div className="text-2xl font-bold">
            {transactions.length}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        <button
          onClick={() =>
            onNavigate("fund-wallet")
          }
          className="bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 rounded-2xl p-5 text-left hover:border-blue-500/40 transition group"
        >
          <WalletIcon className="w-6 h-6 text-blue-400 mb-3 group-hover:scale-110 transition" />

          <div className="font-semibold">
            Fund Wallet
          </div>

          <div className="text-xs text-slate-400 mt-1">
            Add money securely
          </div>
        </button>

        <button
          onClick={() =>
            onNavigate("airtime")
          }
          className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-left hover:border-emerald-500/40 transition group"
        >
          <Smartphone className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition" />

          <div className="font-semibold">
            Buy Airtime
          </div>

          <div className="text-xs text-slate-400 mt-1">
            Top up any phone number
          </div>
        </button>

        <button
          onClick={() =>
            onNavigate("data")
          }
          className="bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/20 rounded-2xl p-5 text-left hover:border-teal-500/40 transition group"
        >
          <Wifi className="w-6 h-6 text-teal-400 mb-3 group-hover:scale-110 transition" />

          <div className="font-semibold">
            Buy Data
          </div>

          <div className="text-xs text-slate-400 mt-1">
            Data plans for all networks
          </div>
        </button>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Recent Transactions
          </h2>

          <button
            onClick={() =>
              onNavigate("transactions")
            }
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : transactionError ? (
          <TransactionError
            message={transactionError}
          />
        ) : recent.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />

            <p className="text-slate-400 text-sm">
              No transactions yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   FUND WALLET
========================================================= */

function FundWalletView({
  onSuccess,
  user,
}: {
  onSuccess: () => Promise<void>;
  user: UserLike | null;
}) {
  const [amount, setAmount] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [processing, setProcessing] =
    useState(false);

  const quickAmounts = [
    500,
    1000,
    2000,
    5000,
    10000,
  ];

  const handlePayment = async () => {
    setError(null);

    const paymentAmount =
      Number(amount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount < 100
    ) {
      setError(
        "Minimum wallet funding amount is ₦100."
      );
      return;
    }

    if (
      paymentAmount > 5_000_000
    ) {
      setError(
        "Maximum wallet funding amount is ₦5,000,000."
      );
      return;
    }

    if (!user) {
      setError(
        "Please log in again."
      );
      return;
    }

    setProcessing(true);

    try {
      /*
       * The Edge Function creates the Flutterwave
       * hosted checkout and returns payment_link.
       *
       * DO NOT expose the Flutterwave secret key
       * in the browser.
       */
      const initialized =
        await initializeWalletFunding({
          amount: paymentAmount,
          email:
            user.email ?? undefined,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "CheapDataHub Customer",
          phone:
            user.phone ||
            user.user_metadata?.phone ||
            undefined,
        });

      if (
        !initialized.success
      ) {
        throw new Error(
          initialized.message ||
            "Unable to initialize payment."
        );
      }

      const paymentLink =
        initialized.payment_link ||
        initialized.checkout_url;

      if (!paymentLink) {
        throw new Error(
          "Flutterwave did not return a payment link."
        );
      }

      /*
       * Redirect to Flutterwave's hosted checkout.
       */
      window.location.assign(
        paymentLink
      );
    } catch (error) {
      console.error(
        "Wallet funding error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to initialize payment."
      );

      setProcessing(false);
    }
  };

  return (
    <div className="max-w-xl">

      <div className="flex items-center gap-3 mb-6">

        <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-blue-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Fund Wallet
          </h1>

          <p className="text-sm text-slate-400">
            Add money securely using Flutterwave.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">

        <label className="block text-sm font-medium mb-3">
          Enter Amount
        </label>

        <div className="relative mb-5">

          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
            ₦
          </span>

          <input
            type="number"
            min="100"
            max="5000000"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value
              )
            }
            placeholder="100"
            disabled={processing}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-4 text-lg font-semibold outline-none focus:border-emerald-500 transition disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {quickAmounts.map(
            (value) => (
              <button
                key={value}
                type="button"
                disabled={processing}
                onClick={() =>
                  setAmount(
                    String(value)
                  )
                }
                className="border border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-lg py-2 text-sm transition disabled:opacity-50"
              >
                {formatNaira(value)}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-3 mb-5 text-sm">

            <AlertCircle className="w-5 h-5 flex-shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />

              Redirecting to Flutterwave...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />

              Pay with Flutterwave
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center mt-4">
          Your wallet will only be credited after secure payment verification.
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   TRANSACTION ROW
========================================================= */

function TransactionRow({
  tx,
}: {
  tx: Transaction;
}) {
  const icon =
    tx.type === "airtime"
      ? Smartphone
      : Wifi;

  const statusConfig = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },

    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },

    pending: {
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  };

  const cfg =
    statusConfig[
      tx.status as keyof typeof statusConfig
    ] ||
    statusConfig.pending;

  const Icon = icon;
  const StatusIcon = cfg.icon;

  const amount =
    Number(tx.amount || 0);

  const date = tx.created_at
    ? new Date(
        tx.created_at
      ).toLocaleDateString(
        "en-NG",
        {
          month: "short",
          day: "numeric",
        }
      )
    : "";

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">

      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>

      <div className="flex-1 min-w-0">

        <div className="flex items-center gap-2 flex-wrap">

          <span className="font-medium text-sm">
            {tx.network || "Transaction"}
          </span>

          <span
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium`}
          >
            <StatusIcon className="w-3 h-3" />

            {tx.status}
          </span>
        </div>

        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {tx.type === "data"
            ? tx.plan_name ||
              "Data purchase"
            : `Airtime ${formatNaira(
                amount
              )}`}

          {tx.phone_number
            ? ` · ${tx.phone_number}`
            : ""}
        </div>
      </div>

      <div className="text-right flex-shrink-0">

        <div className="font-semibold text-sm">
          {formatNaira(amount)}
        </div>

        <div className="text-xs text-slate-500">
          {date}
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   TRANSACTION ERROR
========================================================= */

function TransactionError({
  message,
}: {
  message: string;
}) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">

      <div className="flex items-start gap-3">

        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />

        <div>
          <p className="font-medium text-red-300">
            Unable to load transactions
          </p>

          <p className="text-sm text-red-300/70 mt-1 break-words">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   TRANSACTIONS
========================================================= */

function TransactionsView({
  transactions,
  loading,
  error,
  onRetry,
}: {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
}) {
  return (
    <div>

      <div className="flex items-start justify-between gap-4 mb-6">

        <div>
          <h1 className="text-2xl font-bold mb-1">
            Transaction History
          </h1>

          <p className="text-slate-400 text-sm">
            All your purchases and transactions.
          </p>
        </div>

        <button
          onClick={onRetry}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-400 hover:text-white transition disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">

          <div className="flex items-start gap-3">

            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />

            <div className="flex-1">

              <p className="font-medium text-red-300">
                Failed to fetch transactions
              </p>

              <p className="text-sm text-red-300/70 mt-1 break-words">
                {error}
              </p>

              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition text-sm"
              >
                <RefreshCw className="w-4 h-4" />

                Try again
              </button>
            </div>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">

          <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />

          <p className="text-slate-400 text-sm">
            No transactions yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   AIRTIME
========================================================= */

function AirtimeView({
  onSuccess,
}: {
  onSuccess: () => Promise<void>;
}) {
  return (
    <AirtimePurchase
      onSuccess={onSuccess}
    />
  );
}


/* =========================================================
   DATA
========================================================= */

function DataView({
  onSuccess,
}: {
  onSuccess: () => Promise<void>;
}) {
  return (
    <DataPurchase
      onSuccess={onSuccess}
    />
  );
}
