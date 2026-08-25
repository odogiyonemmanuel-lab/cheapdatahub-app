import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  getAdminTransactions,
  type AdminTransaction,
} from "./adminApi";

const money = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

export default function AdminTransactions() {
  const [rows, setRows] = useState<
    AdminTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const result =
        await getAdminTransactions();

      setRows(result);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to load transactions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section>

      <div className="flex justify-between items-center mb-4">

        <div>
          <h2 className="text-lg font-semibold">
            Transactions
          </h2>

          <p className="text-xs text-slate-500">
            Latest 100 transactions.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-lg bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

      </div>

      {loading ? (
        <Loader2 className="animate-spin text-emerald-400" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">

          <table className="w-full text-sm">

            <thead className="bg-slate-900 text-slate-500 text-left">

              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">User</th>
                <th className="p-3">Product</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reference</th>
              </tr>

            </thead>

            <tbody>

              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-800"
                >

                  <td className="p-3 whitespace-nowrap">
                    {new Date(
                      row.created_at
                    ).toLocaleString("en-NG")}
                  </td>

                  <td className="p-3 max-w-48 truncate">
                    {row.user_email ||
                      row.user_id}
                  </td>

                  <td className="p-3">
                    {row.type}
                    {row.plan_name
                      ? ` · ${row.plan_name}`
                      : ""}
                  </td>

                  <td className="p-3 font-medium">
                    {money(row.amount)}
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-1 rounded-full bg-slate-800 text-xs">
                      {row.status}
                    </span>
                  </td>

                  <td className="p-3 text-xs text-slate-500 max-w-48 truncate">
                    {row.reference || "—"}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {!rows.length && (
            <p className="p-8 text-center text-slate-500">
              No transactions yet.
            </p>
          )}

        </div>
      )}

    </section>
  );
}
