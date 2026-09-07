import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { getAdminReferrals, type AdminReferral } from "./adminApi";

const money = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function AdminReferrals() {
  const [rows, setRows] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await getAdminReferrals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load referrals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.referral_code, row.referrer_email, row.referrer_name, row.referee_email, row.referee_name, row.status]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  const completed = rows.filter((row) => ["completed", "rewarded"].includes(row.status.toLowerCase())).length;
  const totalEarned = rows.reduce((sum, row) => sum + row.referrer_reward + row.referee_reward, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Total referrals" value={String(rows.length)} />
        <Summary label="Completed" value={String(completed)} />
        <Summary label="Rewards issued" value={money(totalEarned)} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Referral activity</h2>
            <p className="text-xs text-slate-500">Monitor referrers, invited customers and rewards.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or code"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500 sm:w-64"
            />
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl bg-slate-800 px-3 py-2 hover:bg-slate-700 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <Users className="mx-auto mb-3 h-8 w-8" />
            No referrals found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Referrer</th>
                  <th className="px-3 py-3">Invited customer</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Referrer reward</th>
                  <th className="px-3 py-3">Customer reward</th>
                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((row) => (
                  <tr key={row.referral_id} className="align-top hover:bg-slate-800/30">
                    <td className="px-3 py-4"><div className="font-medium">{row.referrer_name}</div><div className="text-xs text-slate-500">{row.referrer_email}</div></td>
                    <td className="px-3 py-4"><div className="font-medium">{row.referee_name}</div><div className="text-xs text-slate-500">{row.referee_email}</div></td>
                    <td className="px-3 py-4 font-mono text-xs text-emerald-300">{row.referral_code || "—"}</td>
                    <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${row.status.toLowerCase() === "completed" || row.status.toLowerCase() === "rewarded" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{row.status || "pending"}</span></td>
                    <td className="px-3 py-4">{money(row.referrer_reward)}</td>
                    <td className="px-3 py-4">{money(row.referee_reward)}</td>
                    <td className="px-3 py-4 text-xs text-slate-400">{new Date(row.created_at).toLocaleString("en-NG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
