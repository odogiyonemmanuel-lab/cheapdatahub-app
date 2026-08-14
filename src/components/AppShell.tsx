import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getWalletBalance, getTransactions } from "@/lib/api";
import { formatNaira } from "@/lib/dataPlans";
import type { Transaction, Wallet } from "@/types";
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
} from "lucide-react";

type View = "dashboard" | "airtime" | "data" | "transactions";

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
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cdhBalance, setCdhBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setBalanceError(null);

    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();
    setWallet(walletData as Wallet | null);

    try {
      const { balance } = await getWalletBalance();
      setCdhBalance(balance);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Unable to load balance");
    }

    try {
      const txns = await getTransactions();
      setTransactions(txns);
    } catch {
      // non-critical
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const navItems: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "airtime", label: "Airtime", icon: Smartphone },
    { key: "data", label: "Data", icon: Wifi },
    { key: "transactions", label: "History", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/50 bg-slate-900/30 p-4 fixed h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="font-bold text-lg">SwiftVTU</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                view === item.key
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar - mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold">SwiftVTU</span>
          </div>
          <button
            onClick={signOut}
            className="text-slate-400 hover:text-red-400 transition p-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
          {/* Wallet banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">CheapDataHub Wallet</div>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    <span className="text-slate-500 text-sm">Loading balance...</span>
                  </div>
                ) : balanceError ? (
                  <div className="text-sm text-amber-400 mt-1">{balanceError}</div>
                ) : (
                  <div className="text-2xl font-bold text-white">{formatNaira(cdhBalance ?? 0)}</div>
                )}
              </div>
            </div>
          </div>

          {view === "dashboard" && <DashboardView transactions={transactions} loading={loading} onNavigate={onNavigate} />}
          {view === "airtime" && <AirtimeView onSuccess={refreshData} />}
          {view === "data" && <DataView onSuccess={refreshData} />}
          {view === "transactions" && <TransactionsView transactions={transactions} loading={loading} />}
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              view === item.key ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function DashboardView({
  transactions,
  loading,
  onNavigate,
}: {
  transactions: Transaction[];
  loading: boolean;
  onNavigate: (v: View) => void;
}) {
  const recent = transactions.slice(0, 5);
  const successCount = transactions.filter((t) => t.status === "success").length;
  const totalSpent = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">Overview of your recent activity.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Spent</span>
          </div>
          <div className="text-2xl font-bold">{formatNaira(totalSpent)}</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Successful</span>
          </div>
          <div className="text-2xl font-bold">{successCount}</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Transactions</span>
          </div>
          <div className="text-2xl font-bold">{transactions.length}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => onNavigate("airtime")}
          className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-left hover:border-emerald-500/40 transition group"
        >
          <Smartphone className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition" />
          <div className="font-semibold">Buy Airtime</div>
          <div className="text-xs text-slate-400 mt-1">Top up any phone number</div>
        </button>
        <button
          onClick={() => onNavigate("data")}
          className="bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/20 rounded-2xl p-5 text-left hover:border-teal-500/40 transition group"
        >
          <Wifi className="w-6 h-6 text-teal-400 mb-3 group-hover:scale-110 transition" />
          <div className="font-semibold">Buy Data</div>
          <div className="text-xs text-slate-400 mt-1">50+ plans across all networks</div>
        </button>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <button
            onClick={() => onNavigate("transactions")}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No transactions yet. Buy airtime or data to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const icon = tx.type === "airtime" ? Smartphone : Wifi;
  const statusConfig = {
    success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
    pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
  };
  const cfg = statusConfig[tx.status];

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
        {(() => {
          const Icon = icon;
          return <Icon className="w-5 h-5 text-slate-300" />;
        })()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{tx.network}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-medium`}>
            {tx.status}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {tx.type === "data" ? tx.plan_name : `Airtime ${formatNaira(Number(tx.amount))}`} · {tx.phone_number}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-semibold text-sm">{formatNaira(Number(tx.amount))}</div>
        <div className="text-xs text-slate-500">
          {new Date(tx.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ transactions, loading }: { transactions: Transaction[]; loading: boolean }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Transaction History</h1>
      <p className="text-slate-400 text-sm mb-6">All your purchases in one place.</p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
          <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}

// Airtime and Data views are in separate files
function AirtimeView({ onSuccess }: { onSuccess: () => void }) {
  return <AirtimePurchase onSuccess={onSuccess} />;
}

function DataView({ onSuccess }: { onSuccess: () => void }) {
  return <DataPurchase onSuccess={onSuccess} />;
}

import AirtimePurchase from "./AirtimePurchase";
import DataPurchase from "./DataPurchase";
