import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/router";

export default function AppPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    if (typeof window !== "undefined") router.replace("/auth");
    return null;
  }

  return (
    <AppShell
      view="dashboard"
      setView={() => {}}
      onNavigate={() => {}}
    />
  );
}
