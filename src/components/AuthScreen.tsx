import { useState } from "react";
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

type AuthMode = "signin" | "signup";

export default function AuthScreen({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchMode = () => {
    clearMessages();

    setMode((current) =>
      current === "signin" ? "signup" : "signin"
    );

    setPassword("");
  };

  const validateForm = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return "Please enter your email address.";
    }

    if (!trimmedEmail.includes("@")) {
      return "Please enter a valid email address.";
    }

    if (mode === "signup" && !fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!password) {
      return "Please enter your password.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    clearMessages();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const result =
        mode === "signin"
          ? await signIn(email.trim(), password)
          : await signUp(
              email.trim(),
              password,
              fullName.trim()
            );

      if (result.error) {
        setError(getFriendlyAuthError(result.error));
        return;
      }

      if (mode === "signup") {
        setSuccess(
          "Account created successfully. Please sign in to continue."
        );

        setMode("signin");
        setPassword("");
        setFullName("");

        onSuccess?.();
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
              : "Create your account and start buying data and airtime."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Full name */}
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Full Name
                </label>

                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    autoComplete="name"
                    disabled={loading}
                    required
                    className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-50"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  disabled={loading}
                  required
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete={
                    mode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  disabled={loading}
                  required
                  minLength={6}
                  className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-11 py-2.5 text-sm border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition disabled:opacity-50"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {mode === "signup" && (
                <p className="text-xs text-slate-500 mt-1.5">
                  Password must contain at least 6 characters.
                </p>
              )}
            </div>

            {/* Success */}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />

                <span>{success}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2.5 text-sm"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {loading
                ? mode === "signin"
                  ? "Signing In..."
                  : "Creating Account..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          {/* Switch auth mode */}
          <div className="mt-5 text-center text-sm text-slate-400">
            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition disabled:opacity-50"
            >
              {mode === "signin"
                ? "Sign up"
                : "Sign in"}
            </button>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Lock className="w-3.5 h-3.5" />
          Your account is protected by secure authentication.
        </div>
      </div>
    </div>
  );
}

/**
 * Convert common Supabase authentication errors
 * into messages that are easier for customers to understand.
 */
function getFriendlyAuthError(message: string): string {
  const error = message.toLowerCase();

  if (error.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (error.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  if (error.includes("user already registered")) {
    return "An account with this email already exists. Please sign in.";
  }

  if (error.includes("password should be at least")) {
    return "Your password must be at least 6 characters.";
  }

  if (error.includes("email address") && error.includes("invalid")) {
    return "Please enter a valid email address.";
  }

  if (error.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (error.includes("network")) {
    return "Network error. Please check your internet connection and try again.";
  }

  return message;
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
      Back to home
    </button>
  );
}
