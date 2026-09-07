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
      <a href="/referrals" className="fixed right-4 bottom-20 lg:bottom-6 z-50 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-full px-4 py-3 shadow-lg shadow-emerald-500/20 transition">🎁 Refer & Earn ₦20</a>
    </div>;
  }

  if (screen === "auth") return <AuthScreen onSuccess={() => setScreen("app")} />;
  return <LandingPage onGetStarted={() => setScreen("auth")} />;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
