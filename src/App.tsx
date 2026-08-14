import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";

type View = "dashboard" | "airtime" | "data" | "transactions";
type Screen = "landing" | "auth" | "app";

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("landing");
  const [view, setView] = useState<View>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <AppShell
        view={view}
        setView={setView}
        onNavigate={(v) => {
          setView(v);
          setScreen("app");
        }}
      />
    );
  }

  if (screen === "auth") {
    return <AuthScreen onSuccess={() => setScreen("landing")} />;
  }

  return <LandingPage onGetStarted={() => setScreen("auth")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
