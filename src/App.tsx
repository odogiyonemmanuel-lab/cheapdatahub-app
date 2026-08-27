import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";

import AdminLogin from "@/components/admin/AdminLogin";
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">

        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />

        <p className="text-sm text-slate-400">
          Loading CheapDataHub...
        </p>

      </div>
    </div>
  );
}

function AppContent() {
  const {
    user,
    loading,
  } = useAuth();

  const [screen, setScreen] =
    useState<Screen>("landing");

  const [view, setView] =
    useState<View>("dashboard");

  /*
   * Remove trailing slash so:
   *
   * /admin
   * /admin/
   *
   * are treated the same.
   */

  const pathname =
    window.location.pathname.replace(
      /\/+$/,
      ""
    ) || "/";

  /*
   * ================================================
   * ADMIN ROUTES
   * ================================================
   */

  const isAdminLogin =
    pathname === "/admin/login";

  const isAdminDashboard =
    pathname === "/admin";

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  /*
   * ================================================
   * LOADING
   * ================================================
   */

  if (loading) {
    return <LoadingScreen />;
  }

  /*
   * ================================================
   * ADMIN LOGIN
   * ================================================
   */

  if (isAdminLogin) {
    return <AdminLogin onSuccess={() => {}} />;
  }

  /*
   * ================================================
   * ADMIN DASHBOARD
   * ================================================
   */

  if (isAdminDashboard) {

    /*
     * There is no authenticated user.
     *
     * Send them to the dedicated admin login.
     */

    if (!user) {
      window.location.href =
        "/admin/login";

      return <LoadingScreen />;
    }

    return <AdminDashboard />;
  }

  /*
   * ================================================
   * ANY OTHER /admin/* ROUTE
   * ================================================
   */

  if (isAdminRoute) {
    window.location.href =
      "/admin/login";

    return <LoadingScreen />;
  }

  /*
   * ================================================
   * CUSTOMER APPLICATION
   * ================================================
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
   * ================================================
   * CUSTOMER AUTH
   * ================================================
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
   * ================================================
   * CUSTOMER LANDING PAGE
   * ================================================
   */

  return (
    <LandingPage
      onGetStarted={() => {
        setScreen("auth");
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
