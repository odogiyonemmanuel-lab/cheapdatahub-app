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

export default function AppShell({ view, setView, onNavigate }: { view: any; setView: (v: any) => void; onNavigate: (v: any) => void }) {
  const { user, signOut } = useAuth();
  const [cdhBalance, setCdhBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!user?.id) { setCdhBalance(null); setLoadingBalance(false); return; }
    setLoadingBalance(true); setBalanceError(null);
    try { const result = await getWalletBalance(); setCdhBalance(Number(result.balance || 0)); }
    catch (error) { console.error("Unable to load wallet balance:", error); setBalanceError(error instanceof Error ? error.message : "Unable to load wallet balance."); }
    finally { setLoadingBalance(false); }
  }, [user?.id]);

  const refreshTransactions = useCallback(async () => {
    if (!user?.id) { setTransactions([]); setLoadingTransactions(false); return; }
    setLoadingTransactions(true); setTransactionError(null);
    try { const result = await getTransactions(100); setTransactions((result ?? []) as Transaction[]); }
    catch (error) { console.error("Unable to load transactions:", error); setTransactions([]); setTransactionError(error instanceof Error ? error.message : "Unable to load transactions."); }
    finally { setLoadingTransactions(false); }
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.allSettled([refreshBalance(), refreshTransactions()]);
    setRefreshing(false);
  }, [user?.id, refreshBalance, refreshTransactions]);

  useEffect(() => { if (user?.id) refreshData(); }, [user?.id, refreshData]);

  useEffect(() => {
    if (!user?.id) return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    const txRef = url.searchParams.get("tx_ref") || url.searchParams.get("transaction_id");
    if (!status && !txRef) return;
    if (status !== "successful" && status !== "completed" && !txRef) return;
    let cancelled = false;
    const verifyPayment = async () => {
      try {
        if (!txRef) throw new Error("Payment reference was not returned by Flutterwave.");
        const result = await verifyWalletFunding(txRef);
        if (cancelled) return;
        if (!result.success) throw new Error(result.message || "Payment verification failed.");
        await refreshData();
        window.history.replaceState({}, document.title, "/");
        alert(result.message || "Wallet funded successfully.");
      } catch (error) {
        if (cancelled) return;
        console.error("Flutterwave verification error:", error);
        window.history.replaceState({}, document.title, "/");
        alert(error instanceof Error ? error.message : "Payment verification failed. Please contact support.");
      }
    };
    verifyPayment();
    return () => { cancelled = true; };
  }, [user?.id, refreshData]);

  const navigate = useCallback((nextView: any) => { setView(nextView); onNavigate(nextView); }, [setView, onNavigate]);
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "fund-wallet", label: "Fund Wallet", icon: WalletIcon },
    { key: "airtime", label: "Airtime", icon: Smartphone },
    { key: "data", label: "Data", icon: Wifi },
    { key: "transactions", label: "History", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/50 bg-slate-900/30 p-4 fixed h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-6"><div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20"><Zap className="w-5 h-5 text-white" fill="white" /></div><span className="font-bold text-lg">CheapDataHub</span></div>
        <nav className="flex flex-col gap-1 flex-1">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => navigate(item.key)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === item.key ? "bg-emerald-500/15 text-emerald-400" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}><Icon className="w-5 h-5" />{item.label}</button>; })}</nav>
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"><LogOut className="w-5 h-5" />Sign Out</button>
      </aside>
      <div className="flex-1 lg:ml-64">
        <header className="lg:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-white" fill="white" /></div><span className="font-bold">CheapDataHub</span></div><button onClick={signOut} className="text-slate-400 hover:text-red-400 transition p-2" aria-label="Sign out"><LogOut className="w-5 h-5" /></button></header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-28 lg:pb-8">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0"><WalletIcon className="w-5 h-5 text-emerald-400" /></div><div className="min-w-0"><div className="text-xs text-slate-500 uppercase tracking-wide font-medium">CheapDataHub Wallet</div>{loadingBalance ? <div className="flex items-center gap-2 mt-1"><Loader2 className="w-4 h-4 text-slate-500 animate-spin" /><span className="text-slate-500 text-sm">Loading balance...</span></div> : balanceError ? <div className="text-sm text-amber-400 mt-1 truncate">{balanceError}</div> : <div className="text-2xl font-bold text-white">{formatNaira(cdhBalance ?? 0)}</div>}</div></div><button onClick={() => navigate("fund-wallet")} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-semibold transition flex-shrink-0"><Plus className="w-4 h-4" />Fund</button></div>
          <div className="flex justify-end mb-4"><button onClick={refreshData} disabled={refreshing} className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-400 transition disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></div>
          {view === "dashboard" && <DashboardView transactions={transactions} loading={loadingTransactions} transactionError={transactionError} onNavigate={navigate} />}
          {view === "fund-wallet" && <FundWalletView onSuccess={refreshData} user={user as any} />}
          {view === "airtime" && <AirtimeView onSuccess={refreshData} />}
          {view === "data" && <DataView onSuccess={refreshData} />}
          {view === "transactions" && <TransactionsView transactions={transactions} loading={loadingTransactions} error={transactionError} onRetry={refreshTransactions} />}
        </main>
      </div>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 flex items-center justify-around px-1 py-2 overflow-x-auto">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => navigate(item.key)} className={`flex flex-col items-center gap-1 min-w-[60px] px-2 py-1.5 rounded-lg transition ${view === item.key ? "text-emerald-400" : "text-slate-500"}`}><Icon className="w-5 h-5" /><span className="text-[9px] font-medium">{item.label}</span></button>; })}</nav>
    </div>
  );
}

function DashboardView({ transactions, loading, transactionError, onNavigate }: any) { return <div />; }
function FundWalletView({ onSuccess, user }: any) { return <div />; }
function AirtimeView({ onSuccess }: any) { return <AirtimePurchase onSuccess={onSuccess} />; }
function DataView({ onSuccess }: any) { return <DataPurchase onSuccess={onSuccess} />; }
function TransactionsView({ transactions, loading, error, onRetry }: any) { return <div />; }
