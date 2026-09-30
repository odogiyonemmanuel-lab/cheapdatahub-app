import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // Supabase reads the recovery token from the URL and establishes a recovery session.
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      else if (data.session) setReady(true);
      else setError("This password reset link is invalid or has expired. Return to sign in and request a new link.");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) { setReady(true); setError(""); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been changed successfully. You can now sign in with your new password.");
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password. Request a new reset link.");
    } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl"><h1 className="text-xl font-bold">Set a new password</h1><p className="text-sm text-slate-400">Enter and confirm your new CheapDataHub password.</p>{ready ? <><label className="block text-sm">New password<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 outline-none focus:border-emerald-500" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></label><label className="block text-sm">Confirm new password<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 outline-none focus:border-emerald-500" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e=>setConfirm(e.target.value)} /></label><button disabled={saving} className="w-full rounded-lg bg-emerald-600 p-3 font-semibold disabled:opacity-50">{saving ? "Updating password..." : "Update password"}</button></> : <p className="text-sm text-slate-300">{error || "Checking your secure reset link..."}</p>}{error && ready && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}<a className="block text-center text-sm text-emerald-400 hover:text-emerald-300" href="/">Return to CheapDataHub sign in</a></form></main>;
}
