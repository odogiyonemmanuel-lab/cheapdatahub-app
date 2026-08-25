import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";
import AdminDashboard from "@/components/admin/AdminDashboard";

type View =
  | "dashboard"
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
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />

        <p className="text-sm text-slate-400">
          Loading CheapDataHub...
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  const [screen, setScreen] =
    useState<Screen>("landing");

  const [view, setView] =
    useState<View>("dashboard");

  /*
   * Check whether the current URL is /admin.
   *
   * Example:
   * https://your-domain.com/admin
   */
  const isAdminRoute =
    window.location.pathname === "/admin" ||
    window.location.pathname === "/admin/";

  /*
   * Authentication is still loading.
   */
  if (loading) {
    return <LoadingScreen />;
  }

  /*
   * ==============================
   * ADMIN AREA
   * ==============================
   *
   * The AdminDashboard performs
   * the actual admin_users check.
   */
  if (isAdminRoute) {
    /*
     * User is not logged in.
     * Send them to the login screen.
     */
    if (!user) {
      return (
        <AuthScreen
          onSuccess={() => {
            window.location.href = "/admin";
          }}
        />
      );
    }

    /*
     * Logged-in users see the admin
     * dashboard. AdminDashboard will
     * reject users who aren't admins.
     */
    return <AdminDashboard />;
  }

  /*
   * ==============================
   * NORMAL CUSTOMER APPLICATION
   * ==============================
   */

  /*
   * User is authenticated.
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
   * ==============================
   * AUTHENTICATION SCREEN
   * ==============================
   */

  if (screen === "auth") {
    return (
      <AuthScreen
        onSuccess={() => {
          setScreen("landing");
        }}
      />
    );
  }

  /*
   * ==============================
   * LANDING PAGE
   * ==============================
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
