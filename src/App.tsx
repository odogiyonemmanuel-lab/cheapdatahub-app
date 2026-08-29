import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";

import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

import PaymentCallback from "@/pages/payment/callback";

type View =
  | "dashboard"
  | "fund-wallet"
  | "airtime"
  | "data"
  | "transactions";

type Screen =
  | "landing"
  | "auth"
  | "app";

/* =====================================================
   LOADING SCREEN
===================================================== */

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">

        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />

        <p className="text-sm text-slate-400">
          Loading CheapDataHub...
        </p>

      </div>
    </div>
  );
}

/* =====================================================
   APP CONTENT
===================================================== */

function AppContent() {
  const { user, loading } = useAuth();

  const [screen, setScreen] =
    useState<Screen>("landing");

  const [view, setView] =
    useState<View>("dashboard");

  /*
   * Read the current browser path.
   */

  const pathname =
    window.location.pathname.replace(/\/+$/, "") || "/";

  /*
   * Supported application routes.
   */

  const isAdminRoute =
    pathname === "/admin";

  const isPaymentCallbackRoute =
    pathname === "/payment/callback";

  /*
   * ===================================================
   * AUTH LOADING
   * ===================================================
   */

  if (loading) {
    return <LoadingScreen />;
  }

  /*
   * ===================================================
   * FLUTTERWAVE PAYMENT CALLBACK
   * ===================================================
   *
   * This route is intentionally checked BEFORE
   * the normal customer application.
   *
   * Flutterwave redirects here after checkout.
   */

  if (isPaymentCallbackRoute) {
    return <PaymentCallback />;
  }

  /*
   * ===================================================
   * ADMIN AREA
   * ===================================================
   *
   * /admin
   *
   * If there is no logged-in Supabase user:
   * show AdminLogin.
   *
   * If there is a logged-in user:
   * AdminDashboard performs the administrator
   * authorization check.
   */

  if (isAdminRoute) {
    if (!user) {
      return (
        <AdminLogin
          onSuccess={() => {
            /*
             * Authentication state will update through
             * AuthProvider.
             *
             * Reloading the same URL makes the route
             * deterministic and prevents returning to
             * the customer landing page.
             */

            window.location.replace("/admin");
          }}
        />
      );
    }

    return <AdminDashboard />;
  }

  /*
   * ===================================================
   * CUSTOMER APPLICATION
   * ===================================================
   */

  if (user) {
    return (
      <AppShell
        view={view}
        setView={setView}
        onNavigate={(nextView) => {
          setView(nextView);
          setScreen("app");
        }}
      />
    );
  }

  /*
   * ===================================================
   * CUSTOMER AUTH
   * ===================================================
   */

  if (screen === "auth") {
    return (
      <AuthScreen
        onSuccess={() => {
          setScreen("app");
        }}
      />
    );
  }

  /*
   * ===================================================
   * CUSTOMER LANDING PAGE
   * ===================================================
   */

  return (
    <LandingPage
      onGetStarted={() => {
        setScreen("auth");
      }}
    />
  );
}

/* =====================================================
   MAIN APP
===================================================== */

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
