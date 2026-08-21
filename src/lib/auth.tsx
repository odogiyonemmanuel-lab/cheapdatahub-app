import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthResult = {
  error: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            "Supabase getSession error:",
            error
          );
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error(
          "Supabase authentication initialization error:",
          error
        );

        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const cleanEmail = email.trim();

      if (!cleanEmail) {
        return {
          error: "Please enter your email address.",
        };
      }

      if (!password) {
        return {
          error: "Please enter your password.",
        };
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error(
          "Supabase sign-in error:",
          error
        );

        return {
          error: getAuthErrorMessage(error),
        };
      }

      return { error: null };
    } catch (error) {
      console.error(
        "Sign-in request failed:",
        error
      );

      return {
        error: getNetworkErrorMessage(error),
      };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult> => {
    try {
      const cleanEmail = email.trim();
      const cleanName = fullName.trim();

      if (!cleanName) {
        return {
          error: "Please enter your full name.",
        };
      }

      if (!cleanEmail) {
        return {
          error: "Please enter your email address.",
        };
      }

      if (password.length < 6) {
        return {
          error: "Password must be at least 6 characters.",
        };
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
            },
          },
        });

      if (error) {
        console.error(
          "Supabase sign-up error:",
          error
        );

        return {
          error: getAuthErrorMessage(error),
        };
      }

      console.log(
        "Supabase sign-up successful:",
        {
          userId: data.user?.id,
          email: data.user?.email,
          sessionCreated: !!data.session,
        }
      );

      return { error: null };
    } catch (error) {
      console.error(
        "Sign-up request failed:",
        error
      );

      return {
        error: getNetworkErrorMessage(error),
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Supabase sign-out error:",
          error
        );
      }

      setSession(null);
      setUser(null);
    } catch (error) {
      console.error(
        "Sign-out request failed:",
        error
      );

      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function getAuthErrorMessage(error: {
  message?: string;
  status?: number;
  name?: string;
}): string {
  const message = error.message?.trim();

  if (message) {
    return message;
  }

  if (error.status === 400) {
    return "Invalid authentication request.";
  }

  if (error.status === 401) {
    return "Authentication failed. Please check your details.";
  }

  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "Authentication failed. Please try again.";
}

function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();

    if (
      message.includes("failed to fetch") ||
      message.includes("network")
    ) {
      return (
        "Unable to connect to Supabase. " +
        "Please check your Vercel Supabase environment variables " +
        "and redeploy the application."
      );
    }
  }

  if (error instanceof Error) {
    return error.message || "Authentication request failed.";
  }

  return "Authentication request failed. Please try again.";
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return ctx;
}
