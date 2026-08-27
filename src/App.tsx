import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AdminLogin from "@/components/admin/AdminLogin";
import AppShell from "@/components/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

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
   * Get the current URL.
   */

  const pathname =
    window.location.pathname;

  /*
   * Admin routes.
   */

  const isAdminRoute =
    pathname === "/admin" ||
    pathname === "/admin/";

  const isAdminLoginRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/login/";

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (loading) {
    return <LoadingScreen />;
  }

  /* =====================================================
     ADMIN LOGIN
  ===================================================== */

  if (isAdminLoginRoute) {
    /*
     * If an authenticated user visits
     * /admin/login, AdminLogin will still
     * verify whether the account is an admin.
     *
     * This prevents normal customer accounts
     * from receiving admin access.
     */

    return (
      <AdminLogin
        onSuccess={() => {
          window.location.href = "/admin";
        }}
      />
    );
  }

  /* =====================================================
     ADMIN AREA
  ===================================================== */

  if (isAdminRoute) {
    /*
     * No authenticated user?
     *
     * Send them to the dedicated
     * administrator login page.
     */

    if (!user) {
      window.location.replace(
        "/admin/login"
      );

      return <LoadingScreen />;
    }

    /*
     * The AdminDashboard continues to have
     * its own administrator verification.
     *
     * This provides a second layer of protection.
     */

    return <AdminDashboard />;
  }

  /* =====================================================
     CUSTOMER APPLICATION
  ===================================================== */

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

  /* =====================================================
     CUSTOMER AUTHENTICATION
  ===================================================== */

  if (screen === "auth") {
    return (
      <AuthScreen
        onSuccess={() => {
          setScreen("app");
        }}
      />
    );
  }

  /* =====================================================
     LANDING PAGE
  ===================================================== */

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
