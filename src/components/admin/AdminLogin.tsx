import { FormEvent, useState } from "react";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type AdminLoginProps = {
  onSuccess: () => void;
};

export default function AdminLogin({
  onSuccess,
}: AdminLoginProps) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      /*
       * ================================================
       * 1. SUPABASE LOGIN
       * ================================================
       */

      const result = await signIn(
        cleanEmail,
        password
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      /*
       * ================================================
       * 2. GET CURRENT USER
       * ================================================
       */

      const {
        data,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "getUser error:",
          userError
        );

        setError(
          "Login succeeded, but we could not verify your session."
        );

        return;
      }

      const user = data.user;

      if (!user) {
        setError(
          "No authenticated user was found."
        );

        return;
      }

      console.log(
        "Authenticated user:",
        user.id,
        user.email
      );

      /*
       * ================================================
       * 3. VERIFY ADMIN
       * ================================================
       */

      const {
        data: admin,
        error: adminError,
      } = await supabase
        .from("cdh_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        console.error(
          "cdh_admins query error:",
          adminError
        );

        setError(
          `Unable to verify administrator access: ${adminError.message}`
        );

        return;
      }

      if (!admin) {
        setError(
          "This account is not registered as an administrator."
        );

        return;
      }

      /*
       * ================================================
       * 4. ADMIN VERIFIED
       * ================================================
       */

      console.log(
        "ADMIN VERIFIED:",
        user.email
      );

      /*
       * Do not use React state to navigate.
       * Perform a real browser navigation.
       */

      window.location.href = "/admin";
    } catch (err) {
      console.error(
        "Admin login exception:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="mb-8 text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck
              className="h-8 w-8 text-emerald-400"
              strokeWidth={1.8}
            />
          </div>

          <h1 className="text-2xl font-bold text-white">
            CheapDataHub
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Administrator Portal
          </p>

        </div>

        {/* CARD */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">

          <h2 className="text-xl font-semibold text-white">
            Admin Login
          </h2>

          <p className="mt-1 mb-6 text-sm text-slate-400">
            Sign in with your administrator account.
          </p>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm leading-5 text-red-300">
                {error}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* EMAIL */}

            <div>

              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>

              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@example.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <div className="relative">

                <input
                  id="admin-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>

              </div>

            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Sign in to Admin
                </>
              )}

            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Authorized administrator access only.
        </p>

      </div>
    </div>
  );
}
