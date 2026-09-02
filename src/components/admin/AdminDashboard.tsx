import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import {
  getAdminStats,
  type AdminStats,
} from "./adminApi";

import AdminUsers from "./AdminUsers";
import AdminTransactions from "./AdminTransactions";
import AdminPricing from "./AdminPricing";
import AdminWallet from "./AdminWallet";

type Tab =
  | "overview"
  | "users"
  | "transactions"
  | "pricing"
  | "wallet";

const money = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminStats();
      setStats(result);
    } catch (error) {
      console.error("Admin dashboard error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "transactions", label: "Transactions" },
    { id: "pricing", label: "Pricing" },
    { id: "wallet", label: "Wallet" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />

              <h1 className="text-2xl font-bold">
                CheapDataHub Admin
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Manage customers, pricing, wallets and transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm ${
                tab === item.id
                  ? "bg-emerald-500 font-semibold text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {tab === "overview" &&
          (loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                icon={Users}
                label="Users"
                value={String(stats?.users ?? 0)}
              />

              <Stat
                icon={WalletCards}
                label="Funded wallets"
                value={String(stats?.fundedWallets ?? 0)}
              />

              <Stat
                icon={Activity}
                label="Successful transactions"
                value={String(stats?.successfulTransactions ?? 0)}
              />

              <Stat
                icon={CircleDollarSign}
                label="Sales volume"
                value={money(stats?.transactionVolume ?? 0)}
              />

              <Stat
                icon={TrendingUp}
                label="Estimated profit"
                value={money(stats?.estimatedProfit ?? 0)}
              />

              <Stat
                icon={Clock3}
                label="Pending transactions"
                value={String(stats?.pendingTransactions ?? 0)}
              />
            </div>
          ))}

        {tab === "users" && <AdminUsers />}

        {tab === "transactions" && <AdminTransactions />}

        {tab === "pricing" && <AdminPricing />}

        {tab === "wallet" && <AdminWallet />}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <Icon className="mb-4 h-5 w-5 text-emerald-400" />

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
