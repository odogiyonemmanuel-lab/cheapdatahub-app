import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Gift, Users, Wallet } from "lucide-react";
import { getMyReferralHistory, getReferralSummary, type ReferralSummary } from "@/lib/referrals";

export default function Referrals() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; status: string; created_at: string; rewarded_at: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getReferralSummary(), getMyReferralHistory()])
      .then(([s, h]) => { setSummary(s); setHistory(h); })
      .catch(e => setError(e instanceof Error ? e.message : "Unable to load referrals."))
      .finally(() => setLoading(false));
  }, []);

  const copy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => window.location.href = "/"} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"><ArrowLeft className="w-4 h-4" />Back to CheapDataHub</button>
        <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-3 mb-3"><Gift className="w-7 h-7 text-emerald-400" /><h1 className="text-2xl font-bold">Refer & Earn</h1></div>
          <p className="text-slate-300 text-sm leading-6">Invite a friend to CheapDataHub. When your friend completes their first successful airtime or data purchase, you both receive <strong className="text-emerald-400">₦50</strong> in your wallets.</p>
        </div>

        {loading && <div className="text-slate-400 py-10 text-center">Loading your referral details...</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4">{error}</div>}

        {!loading && !error && summary && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat icon={<Users />} label="Invited" value={summary.invited} />
            <Stat icon={<Check />} label="Rewarded" value={summary.rewarded} />
            <Stat icon={<Wallet />} label="Earned" value={`₦${summary.totalEarned.toLocaleString("en-NG")}`} />
            <Stat icon={<Gift />} label="Pending" value={summary.pending} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Your referral code</p>
            <div className="text-2xl font-bold text-emerald-400 tracking-wider mb-4">{summary.referralCode || "Generating..."}</div>
            <p className="text-xs text-slate-500 mb-2">Share this link</p>
            <div className="flex gap-2">
              <input readOnly value={summary.referralLink} className="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300" />
              <button onClick={copy} className="shrink-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg px-3 py-2 text-sm">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? "Copied" : "Copy"}</button>
            </div>
            <p className="text-xs text-slate-500 mt-3">Example: your friend opens the link, signs up, and their first successful purchase unlocks both ₦50 bonuses.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Referral history</h2>
            {history.length === 0 ? <p className="text-sm text-slate-500">No referrals yet. Share your link to get started.</p> : <div className="space-y-3">{history.map(item => <div key={item.id} className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0"><div><div className="text-sm text-slate-300">Referral</div><div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString("en-NG")}</div></div><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === "rewarded" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{item.status === "rewarded" ? "Rewarded ₦50" : "Waiting for first purchase"}</span></div>)}</div>}
          </div>
        </>}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-emerald-400 mb-2">{icon}</div><div className="text-xs text-slate-500">{label}</div><div className="font-bold mt-1">{value}</div></div>;
}
