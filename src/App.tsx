import {
  useEffect,
  useState,
} from "react";

import {
  AuthProvider,
  useAuth,
} from "@/lib/auth";

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
  const {
    user,
    loading,
  } = useAuth();

  const [screen, setScreen] =
    useState<Screen>("landing");

  const [view, setView] =
    useState<View>("dashboard");

  /* =====================================================
     CURRENT PATH
  ===================================================== */

  const pathname =
    window.location.pathname;

  const isAdminRoute =
    pathname === "/admin" ||
    pathname === "/admin/";

  const isAdminLoginRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/login/";

  /* =====================================================
     REDIRECT UNAUTHENTICATED ADMIN USERS
  ===================================================== */

  useEffect(() => {
    if (
      !loading &&
      isAdminRoute &&
      !user
    ) {
      window.location.assign(
        "/admin/login"
      );
    }
  }, [
    loading,
    isAdminRoute,
    user,
  ]);

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
    return (
      <AdminLogin
        onSuccess={() => {
          window.location.assign(
            "/admin"
          );
        }}
      />
    );
  }

  /* =====================================================
     ADMIN DASHBOARD
  ===================================================== */

  if (isAdminRoute) {
    /*
     * If there is no logged-in user,
     * the useEffect above redirects to
     * /admin/login.
     */

    if (!user) {
      return <LoadingScreen />;
    }

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
