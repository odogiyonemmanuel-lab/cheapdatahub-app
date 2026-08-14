import { useState } from "react";
import { purchaseData } from "@/lib/api";
import { NETWORKS, DATA_PLANS, formatNaira } from "@/lib/dataPlans";
import type { DataPlan } from "@/types";
import { Wifi, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function DataPurchase({ onSuccess }: { onSuccess: () => void }) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("MTN");
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableNetworks = NETWORKS.filter((n) =>
    DATA_PLANS.some((p) => p.network === n.name)
  );

  const filteredPlans = DATA_PLANS.filter((p) => p.network === selectedNetwork);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPlan) {
      setError("Select a data plan");
      return;
    }
    if (!phone || phone.length < 11) {
      setError("Enter a valid 11-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const result = await purchaseData({
        bundle_id: selectedPlan.bundle_id,
        phone_number: phone,
        plan_name: selectedPlan.name,
        network: selectedPlan.network,
        amount: selectedPlan.price,
      });
      setSuccess(result.message);
      setPhone("");
      setSelectedPlan(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Buy Data</h1>
      <p className="text-slate-400 text-sm mb-6">Browse plans and top up any number instantly.</p>

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

      {/* Network tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {availableNetworks.map((network) => (
          <button
            key={network.id}
            type="button"
            onClick={() => {
              setSelectedNetwork(network.name);
              setSelectedPlan(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition whitespace-nowrap ${
              selectedNetwork === network.name
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700"
            }`}
          >
            {network.shortName}
          </button>
        ))}
      </div>

      {/* Plan list */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-300 mb-3">Select a Data Plan</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredPlans.map((plan) => (
            <button
              key={plan.bundle_id}
              type="button"
              onClick={() => setSelectedPlan(plan)}
              className={`text-left p-4 rounded-xl border-2 transition ${
                selectedPlan?.bundle_id === plan.bundle_id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-white">
                  {plan.name.split("(")[0].trim()}
                </span>
                <span className="text-xs text-slate-500">{plan.validity}</span>
              </div>
              <div className="text-xs text-slate-400 truncate">{plan.name}</div>
              <div className="text-lg font-bold text-emerald-400 mt-2">{formatNaira(plan.price)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Phone + submit - only show after plan selected */}
      {selectedPlan && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Plan</span>
              <span className="font-semibold text-white text-right text-xs">{selectedPlan.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Price</span>
              <span className="font-semibold text-emerald-400">{formatNaira(selectedPlan.price)}</span>
            </div>
          </div>

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

          <button
            type="submit"
            disabled={loading || !phone || !selectedPlan}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl py-3.5 text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                Buy Data - {formatNaira(selectedPlan.price)}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
