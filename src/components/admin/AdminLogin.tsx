import { FormEvent, useState } from "react";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
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

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      /* =================================================
         SIGN IN
      ================================================= */

      const result = await signIn(
        email,
        password
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      /* =================================================
         GET AUTHENTICATED USER
      ================================================= */

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to retrieve authenticated user:",
          userError
        );

        await supabase.auth.signOut();

        setError(
          "Unable to verify your administrator account. Please try again."
        );

        return;
      }

      if (!user) {
        await supabase.auth.signOut();

        setError(
          "Login was not completed. Please try again."
        );

        return;
      }

      /* =================================================
         VERIFY ADMIN ACCESS
      ================================================= */

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
          "Administrator verification error:",
          adminError
        );

        await supabase.auth.signOut();

        setError(
          "Unable to verify administrator access. Please try again."
        );

        return;
      }

      if (!admin) {
        await supabase.auth.signOut();

        setError(
          "Administrator access required. This account is not authorized to access the admin dashboard."
        );

        return;
      }

      /* =================================================
         ADMIN VERIFIED
      ================================================= */

      onSuccess();
    } catch (err) {
      console.error(
        "Admin login failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* =================================================
            BRANDING
        ================================================= */}

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
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

        {/* =================================================
            LOGIN CARD
        ================================================= */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">
              Admin Login
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Sign in with your administrator account.
            </p>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm leading-5 text-red-300">
                {error}
              </p>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

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
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* =================================================
            SECURITY NOTICE
        ================================================= */}

        <p className="mt-6 text-center text-xs leading-5 text-slate-600">
          Authorized administrator access only.
          <br />
          Your account must be registered in the
          CheapDataHub administrator system.
        </p>
      </div>
    </div>
  );
}
