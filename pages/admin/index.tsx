import AdminDashboard from "@/components/admin/AdminDashboard";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      redirect: { destination: "/auth", permanent: false },
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const role = (profile as any)?.role ?? null;

  if (error || role !== "admin") {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  return { props: {} };
};

export default function AdminPage() {
  return <AdminDashboard />;
}
