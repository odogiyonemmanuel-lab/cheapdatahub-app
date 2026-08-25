import { useEffect, useState } from "react";
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

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminStats();
      setStats(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tabs: {
    id: Tab;
    label: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "users",
      label: "Users",
    },
    {
      id: "transactions",
      label: "Transactions",
    },
    {
      id: "pricing",
      label: "Pricing",
    },
    {
      id: "wallet",
      label: "Wallet",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />

              <h1 className="text-2xl font-bold">
                CheapDataHub Admin
              </h1>
            </div>

            <p className="text-sm text-slate-400 mt-1">
              Manage customers, pricing, wallets and transactions.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${
                tab === item.id
                  ? "bg-emerald-500 text-slate-950 font-semibold"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {tab === "overview" && (
          loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

              <Stat
                icon={Users}
                label="Users"
                value={String(stats?.users ?? 0)}
              />

              <Stat
                icon={WalletCards}
                label="Funded wallets"
                value={String(
                  stats?.fundedWallets ?? 0
                )}
              />

              <Stat
                icon={Activity}
                label="Successful transactions"
                value={String(
                  stats?.successfulTransactions ?? 0
                )}
              />

              <Stat
                icon={CircleDollarSign}
                label="Sales volume"
                value={money(
                  stats?.transactionVolume ?? 0
                )}
              />

              <Stat
                icon={TrendingUp}
                label="Estimated profit"
                value={money(
                  stats?.estimatedProfit ?? 0
                )}
              />

              <Stat
                icon={Clock3}
                label="Pending transactions"
                value={String(
                  stats?.pendingTransactions ?? 0
                )}
              />

            </div>
          )
        )}

        {tab === "users" && <AdminUsers />}

        {tab === "transactions" && (
          <AdminTransactions />
        )}

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

      <Icon className="w-5 h-5 text-emerald-400 mb-4" />

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>

    </div>
  );
}
