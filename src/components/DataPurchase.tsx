import { useEffect, useMemo, useState } from "react";
import { purchaseData, getProductPricing, type PricingItem } from "@/lib/api";
import { NETWORKS, DATA_PLANS, formatNaira } from "@/lib/dataPlans";
import type { DataPlan } from "@/types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function DataPurchase({ onSuccess }: { onSuccess: () => void }) {
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPricing() {
      setPricingLoading(true);
      setPricingError(null);
      try {
        const rows = await getProductPricing();
        if (!cancelled) setPricing(rows);
      } catch (err) {
        if (!cancelled) setPricingError(err instanceof Error ? err.message : "Unable to load data plans");
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }
    void loadPricing();
    return () => { cancelled = true; };
  }, []);

  const pricedPlans = useMemo<DataPlan[]>(() => {
    const staticById = new Map(DATA_PLANS.map((plan) => [String(plan.bundle_id), plan]));
    return pricing
      .filter((row) => row.is_active && row.product_id)
      .map((row) => {
        const fallback = staticById.get(String(row.product_id));
        return {
          bundle_id: Number(row.product_id),
          network: String(row.network || fallback?.network || "").toUpperCase(),
          name: row.plan_name || fallback?.name || `Data Plan ${row.product_id}`,
          price: Number(row.customer_price),
          validity: fallback?.validity || "",
        };
      })
      .filter((plan) => Number.isFinite(plan.bundle_id) && Number.isFinite(plan.price) && plan.price > 0 && plan.network);
  }, [pricing]);

  const availableNetworks = NETWORKS.filter((network) =>
    pricedPlans.some((plan) => plan.network.toUpperCase() === network.name.toUpperCase())
  );
  const filteredPlans = pricedPlans.filter((plan) => plan.network.toUpperCase() === selectedNetwork.toUpperCase());
  const selectedPlan = filteredPlans.find((plan) => String(plan.bundle_id) === selectedPlanId) ?? null;

  useEffect(() => {
    if (availableNetworks.length > 0 && !availableNetworks.some((network) => network.name === selectedNetwork)) {
      setSelectedNetwork(availableNetworks[0].name);
      setSelectedPlanId("");
    }
  }, [availableNetworks, selectedNetwork]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selectedPlan) {
      setError("Select a data plan");
      return;
    }
    if (!/^\\d{11}$/.test(phone)) {
      setError("Enter a valid 11-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const result = await purchaseData({
        plan_id: String(selectedPlan.bundle_id),
        plan_code: String(selectedPlan.bundle_id),
        phone_number: phone,
        plan_name: selectedPlan.name,
        network: selectedPlan.network,
        amount: selectedPlan.price,
      });
      setSuccess((result as { pending?: boolean }).pending || (result as { status?: string }).status === "processing"
        ? result.message || "Purchase is processing. Your wallet was reserved and the transaction is being completed."
        : result.message || "Data purchase successful.");
      setPhone("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">Buy Data</h1>
      <p className="text-slate-400 text-sm mb-5">Choose a network, bundle and phone number.</p>

      {success && <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}
      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {pricingError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{pricingError}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="data-network" className="mb-1.5 block text-sm font-medium text-slate-200">Choose Service Provider</label>
          <select id="data-network" className={fieldClass} value={selectedNetwork} onChange={(e) => { setSelectedNetwork(e.target.value); setSelectedPlanId(""); }} disabled={pricingLoading || availableNetworks.length === 0 || loading}>
            {availableNetworks.map((network) => <option key={network.id} value={network.name}>{network.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="data-plan" className="mb-1.5 block text-sm font-medium text-slate-200">Choose {selectedNetwork} Bundle</label>
          <select id="data-plan" className={fieldClass} value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} disabled={pricingLoading || filteredPlans.length === 0 || loading} required>
            <option value="">{pricingLoading ? "Loading current plans..." : filteredPlans.length ? "Select a data bundle" : "No active plans available"}</option>
            {filteredPlans.map((plan) => <option key={plan.bundle_id} value={String(plan.bundle_id)}>{plan.name} — {formatNaira(plan.price)}{plan.validity ? ` · ${plan.validity}` : ""}</option>)}
          </select>
          {selectedPlan && <p className="mt-1.5 text-xs text-emerald-300">Price: {formatNaira(selectedPlan.price)}</p>}
        </div>

        <div>
          <label htmlFor="data-phone" className="mb-1.5 block text-sm font-medium text-slate-200">Phone Number</label>
          <input id="data-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\\D/g, "").slice(0, 11))} required maxLength={11} placeholder="08012345678" className={fieldClass} disabled={loading} />
        </div>

        <button type="submit" disabled={loading || pricingLoading || !selectedPlan || phone.length !== 11} className="w-full rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processing...</span> : selectedPlan ? `Buy Bundle · ${formatNaira(selectedPlan.price)}` : "Buy Bundle"}
        </button>
      </form>
    </div>
  );
}
