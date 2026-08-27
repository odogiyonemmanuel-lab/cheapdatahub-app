```tsx
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
} from "lucide-react";

import {
  getPricing,
  updatePricing,
  type PricingRow,
} from "./adminApi";

const money = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

export default function AdminPricing() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const result = await getPricing();
      setRows(result);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to load pricing."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (row: PricingRow) => {
    setSaving(row.id);

    try {
      await updatePricing(
        row.id,
        Number(row.customer_price),
        row.is_active
      );

      alert("Price updated.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to save price."
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Loader2 className="animate-spin text-emerald-400" />
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          Pricing & Markup
        </h2>

        <p className="text-xs text-slate-500">
          Provider cost is read-only. Change only your
          customer selling price.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const profit =
            Number(row.customer_price) -
            Number(row.provider_cost);

          return (
            <div
              key={row.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-4 items-center"
            >
              <div>
                <div className="font-medium">
                  {row.network} · {row.plan_name}
                </div>

                <div className="text-xs text-slate-500">
                  {row.data_size
                    ? `${row.data_size} · `
                    : ""}
                  {row.validity
                    ? `${row.validity} · `
                    : ""}
                  Provider: {money(row.provider_cost)}
                </div>
              </div>

              <div className="text-sm text-emerald-400">
                Profit {money(profit)}
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                value={row.customer_price}
                onChange={(event) => {
                  const value =
                    Number(event.target.value);

                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id
                        ? {
                            ...item,
                            customer_price: value,
                            profit:
                              value -
                              Number(
                                item.provider_cost
                              ),
                          }
                        : item
                    )
                  );
                }}
                className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              />

              <button
                disabled={saving === row.id}
                onClick={() => save(row)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs disabled:opacity-50"
              >
                {saving === row.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                Save
              </button>
            </div>
          );
        })}

        {!rows.length && (
          <p className="text-slate-500 text-sm py-8 text-center">
            No pricing rows yet.
          </p>
        )}
      </div>
    </section>
  );
}
```
