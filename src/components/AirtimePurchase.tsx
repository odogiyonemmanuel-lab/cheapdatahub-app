import { useState } from "react";
import { purchaseAirtime } from "@/lib/api";
import { NETWORKS, AIRTIME_PRESETS, formatNaira } from "@/lib/dataPlans";
import { Smartphone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function AirtimePurchase({ onSuccess }: { onSuccess: () => void }) {
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone || phone.length < 11) {
      setError("Enter a valid 11-digit phone number");
      return;
    }
    if (!amount || amount < 100) {
      setError("Minimum amount is 100");
      return;
    }

    setLoading(true);
    try {
      const result = await purchaseAirtime({
        provider_id: selectedNetwork.id,
        phone_number: phone,
        amount: Number(amount),
        network: selectedNetwork.name,
      });
      setSuccess(result.message);
      setPhone("");
      setAmount("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Buy Airtime</h1>
      <p className="text-slate-400 text-sm mb-6">Top up any Nigerian phone number instantly.</p>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Network selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Select Network</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                type="button"
                onClick={() => setSelectedNetwork(network)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                  selectedNetwork.id === network.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${network.color}20`, color: network.color }}
                >
                  {network.shortName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-white">{network.shortName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Phone number */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            required
            placeholder="08012345678"
            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-sm border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Amount (NGN)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            required
            min={100}
            placeholder="Enter amount"
            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-sm border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {AIRTIME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  amount === preset
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                }`}
              >
                {formatNaira(preset)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {amount && phone && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">You are sending</span>
              <span className="font-semibold text-white">
                {formatNaira(Number(amount))} airtime
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">To</span>
              <span className="font-semibold text-white">{phone}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Network</span>
              <span className="font-semibold text-white">{selectedNetwork.shortName}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !phone || !amount}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl py-3.5 text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Smartphone className="w-5 h-5" />
              Buy Airtime
            </>
          )}
        </button>
      </form>
    </div>
  );
}
