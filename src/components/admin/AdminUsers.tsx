import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  getAdminUsers,
  setAdmin,
  type AdminUser,
} from "./adminApi";

const money = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminUsers(search);
      setUsers(result);
    } catch (error) {
      setError(
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

  return (
    <section>

      <div className="flex gap-2 mb-4">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="Search email or name"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
          />

        </div>

        <button
          onClick={load}
          className="px-4 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm"
        >
          Search
        </button>

      </div>

      {error && (
        <p className="text-red-300 text-sm mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <Loader2 className="animate-spin text-emerald-400" />
      ) : (
        <div className="space-y-2">

          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row md:items-center gap-3"
            >

              <UserRound className="w-5 h-5 text-slate-500" />

              <div className="flex-1 min-w-0">

                <div className="font-medium truncate">
                  {user.full_name || "Unnamed user"}
                </div>

                <div className="text-xs text-slate-500 truncate">
                  {user.email || user.id}
                </div>

              </div>

              <div className="flex items-center gap-1 text-sm">
                <Wallet className="w-4 h-4 text-emerald-400" />
                {money(user.wallet_balance)}
              </div>

              <button
                onClick={async () => {
                  try {
                    await setAdmin(user.id, true);
                    alert("Admin access granted.");
                  } catch (error) {
                    alert(
                      error instanceof Error
                        ? error.message
                        : "Unable to grant admin access."
                    );
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                Make admin
              </button>

            </div>
          ))}

          {!users.length && (
            <p className="text-slate-500 text-sm py-8 text-center">
              No users found.
            </p>
          )}

        </div>
      )}

    </section>
  );
}
