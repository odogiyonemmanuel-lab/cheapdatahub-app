import { useEffect, useMemo, useState } from "react";
import { Copy, Gift, Users, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const REFERRAL_STORAGE_KEY = "cdh_pending_referral";

export default function ReferralCard() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState(0);
  const [earned, setEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const referralLink = useMemo(() => {
    if (!code) return "";
    return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
  }, [code]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const { data: profile, error: profileError } = await supabase
          .from("cdh_user_profiles")
          .select("referral_code")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!cancelled) setCode(profile?.referral_code ?? null);

        const { data: rows, error: referralError } = await supabase
          .from("cdh_referrals")
          .select("id, status")
          .eq("referrer_id", user.id);

        if (referralError) throw referralError;

        const { data: rewards, error: rewardError } = await supabase
          .from("cdh_referral_rewards")
          .select("referrer_reward")
          .eq("referrer_reward", 20);

        if (rewardError) throw rewardError;

        if (!cancelled) {
          setReferrals((rows ?? []).length);
          setEarned((rewards ?? []).reduce((sum, row) => sum + Number(row.referrer_reward || 0), 0));
        }
      } catch (error) {
        console.error("Unable to load referral details:", error);
        if (!cancelled) setMessage("Unable to load referral details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const pendingCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!pendingCode) return;

    const claim = async () => {
      const { error } = await supabase.rpc("cdh_claim_referral", {
        p_code: pendingCode,
      });

      if (!error || !error.message.toLowerCase().includes("invalid referral")) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    };

    claim().catch((error) => console.error("Unable to claim referral:", error));
  }, [user?.id]);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Copy failed. Please copy the link manually.");
    }
  };

  return (
    <section className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">Refer & Earn ₦20</h2>
          <p className="text-sm text-slate-400 mt-1">
            Invite a friend. They get ₦20 after their first successful wallet funding of ₦500 or more, and you get ₦20 after their first successful data or airtime purchase.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 mt-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading referral details...
        </div>
      ) : code ? (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <div className="text-xs text-slate-500">Your code</div>
              <div className="font-bold text-emerald-400 mt-1 tracking-wider">{code}</div>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <div className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Referrals</div>
              <div className="font-bold text-white mt-1">{referrals}</div>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <div className="text-xs text-slate-500">Referral earnings</div>
              <div className="font-bold text-white mt-1">₦{earned.toLocaleString("en-NG")}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input readOnly value={referralLink} className="flex-1 min-w-0 bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none" aria-label="Referral link" />
            <button onClick={copyLink} className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl px-4 py-2.5 text-sm transition">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-amber-400 mt-4">Your referral code is being prepared. Refresh the page in a moment.</p>
      )}

      {message && <p className="text-xs text-amber-400 mt-3">{message}</p>}
    </section>
  );
}
