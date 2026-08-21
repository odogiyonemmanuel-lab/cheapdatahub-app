import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  ArrowLeft,
} from "lucide-react";

export default function AuthScreen({ onSuccess }: { onSuccess?: () => void }) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      // Basic validation
      const cleanEmail = email.trim();
      const cleanName = fullName.trim();

      if (!cleanEmail) {
        setError("Please enter your email address.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup" && !cleanName) {
        setError("Please enter your full name.");
        return;
      }

      const result =
        mode === "signin"
          ? await signIn(cleanEmail, password)
          : await signUp(cleanEmail, password, cleanName);

      if (result?.error) {
        setError(result.error);
        return;
      }

      // Successful signup
      if (mode === "signup") {
        setMode("signin");
        setError(
          "Account created successfully. Please check your email if confirmation is required, then sign in."
        );
        setEmail(cleanEmail);
        setPassword("");
        setFullName("");
        onSuccess?.();
      }
    } catch (err) {
      console.error("Authentication error:", err);

      if (err instanceof Error) {
        setError(err.message || "Authentication failed.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Zap
              className="w-7 h-7 text-white"
              fill="white"
            />
          </div>

          <h1 className="text-2xl font-bold text-white">
            SwiftVTU
          </h1>

          <p className="text-slate-400 mt-1 text-sm">
            {mode === "signin"
              ? "Welcome back. Sign in to continue."
              : "Create your account to get started."}
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Full name */}
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>

                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    disabled={loading}
                    className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-60"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-60"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  disabled={loading}
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-60"
                  placeholder="••••••••"
                />
              </div>

              <p className="text-xs text-slate-500 mt-1.5">
                Minimum 6 characters
              </p>
            </div>

            {/* Error / success message */}
            {error && (
              <div
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  error.toLowerCase().includes("successfully")
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {/* Switch sign in / sign up */}
          <div className="mt-5 text-center text-sm text-slate-400">
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}

            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-50"
            >
              {mode === "signin"
                ? "Sign up"
                : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BackToHome({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Home
    </button>
  );
}
