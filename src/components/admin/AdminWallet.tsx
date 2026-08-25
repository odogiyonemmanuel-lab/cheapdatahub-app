import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  WalletCards,
} from "lucide-react";

import {
  adjustWallet,
  getAdminUsers,
  type AdminUser,
} from "./adminApi";

const money = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

export default function AdminWallet() {
  const [users, setUsers] = useState<AdminUser[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<AdminUser | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const result = await getAdminUsers(search);
      setUsers(result);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!selected) {
      alert("Select a user.");
      return;
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value === 0) {
      alert("Enter a non-zero amount.");
      return;
    }

    if (!reason.trim()) {
      alert("Enter a reason.");
      return;
    }

    try {
      await adjustWallet(
        selected.id,
        value,
        reason
      );

      alert("Wallet adjusted successfully.");

      setAmount("");
      setReason("");
      setSelected(null);

      await load();

    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to adjust wallet."
      );
    }
  };

  return (
    <section>

      <div className="mb-5">

        <h2 className="text-lg font-semibold">
          Wallet Management
        </h2>

        <p className="text-xs text-slate-500">
          Positive amount credits a wallet. Negative
          amount debits it. Every adjustment is logged.
        </p>

      </div>

      <div className="flex gap-2 mb-4">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") load();
            }}
            placeholder="Find customer"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm"
          />

        </div>

        <button
          onClick={load}
          className="px-4 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm"
        >
          Search
        </button>

      </div>

      {loading ? (
        <Loader2 className="animate-spin text-emerald-400" />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">

          <div className="space-y-2">

            {users.map((user) => (
              <button
                key={user.id}
                onClick={() =>
                  setSelected(user)
                }
                className={`w-full text-left rounded-xl border p-4 ${
                  selected?.id === user.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >

                <div className="flex items-center gap-3">

                  <WalletCards className="w-5 h-5 text-emerald-400" />

                  <div className="flex-1">

                    <div className="font-medium">
                      {user.full_name || "Unnamed"}
                    </div>

                    <div className="text-xs text-slate-500">
                      {user.email}
                    </div>

                  </div>

                  <div className="font-semibold">
                    {money(user.wallet_balance)}
                  </div>

                </div>

              </button>
            ))}

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 h-fit">

            <h3 className="font-semibold mb-4">
              {selected
                ? `Adjust ${
                    selected.full_name ||
                    selected.email ||
                    "customer"
                  }`
                : "Select a customer"}
            </h3>

            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Amount: 1000 or -500"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm mb-3"
            />

            <input
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Reason"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm mb-4"
            />

            <button
              disabled={!selected}
              onClick={submit}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold disabled:opacity-40"
            >
              Apply wallet adjustment
            </button>

          </div>

        </div>
      )}

    </section>
  );
}
