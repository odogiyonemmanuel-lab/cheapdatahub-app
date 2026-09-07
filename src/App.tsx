import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import PaymentCallback from "@/pages/payment/callback.tsx";
import Referrals from "@/pages/Referrals";

type View = "dashboard" | "fund-wallet" | "airtime" | "data" | "transactions";
type Screen = "landing" | "auth" | "app";

const REFERRAL_STORAGE_KEY = "cdh_pending_referral";

function LoadingScreen() {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /><p className="text-sm text-slate-400">Loading CheapDataHub...</p></div></div>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("landing");
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref?.trim()) localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim().toUpperCase());
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const isAdminRoute = pathname === "/admin";
  const isPaymentCallbackRoute = pathname === "/payment/callback";
  const isReferralRoute = pathname === "/referrals";

  if (loading) return <LoadingScreen />;
  if (isPaymentCallbackRoute) return <PaymentCallback />;

  if (isReferralRoute) {
    return user ? <Referrals /> : <AuthScreen onSuccess={() => window.location.replace("/referrals")} />;
  }

  if (isAdminRoute) {
    if (!user) return <AdminLogin onSuccess={() => window.location.replace("/admin")} />;
    return <AdminDashboard />;
  }

  if (user) {
    return <div className="relative min-h-screen">
      <AppShell view={view} setView={setView} onNavigate={(nextView) => { setView(nextView); setScreen("app"); }} />
      <a href="/referrals" className="lg:hidden fixed right-2 bottom-[78px] z-50 flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 font-semibold text-[10px] rounded-lg px-2.5 py-2 shadow-lg transition" aria-label="Refer and Earn"><span>🎁</span><span>Refer & Earn</span></a>
      <a href="/referrals" className="hidden lg:flex fixed left-4 bottom-16 w-56 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 transition"><span className="text-base">🎁</span><span>Refer & Earn ₦20</span></a>
    </div>;
  }

  if (screen === "auth") return <AuthScreen onSuccess={() => setScreen("app")} />;
  return <LandingPage onGetStarted={() => setScreen("auth")} />;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
