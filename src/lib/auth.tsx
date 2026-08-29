import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseClient";

type User = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
} | null;

type AuthContextValue = {
  user: User;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapSbUser(sbUser: SbUser | null | undefined): User {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    email: sbUser.email ?? null,
    user_metadata: sbUser.user_metadata ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        const currentSession = (data as any)?.session ?? (data as any);
        const currentUser = currentSession?.user ?? null;
        if (!mounted) return;
        setSession(currentSession);
        setUser(mapSbUser(currentUser));
      } catch (e) {
        console.warn("AuthProvider initial session error", e);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = (nextSession as any)?.user ?? null;
      setSession(nextSession ?? null);
      setUser(mapSbUser(nextUser));
    });

    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  async function signInWithEmail(email: string, password: string) {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      const res = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (res.error) throw res.error;
      setSession(res.data?.session ?? null);
      setUser(mapSbUser(res.data?.user ?? null));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
