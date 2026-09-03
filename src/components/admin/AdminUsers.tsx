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
    maximumFractionDigits: 2,
  })}`;

function getUserDisplayName(user: AdminUser) {
  const fullName = user.full_name?.trim();

  if (fullName) {
    return fullName;
  }

  const email = user.email?.trim();

  if (email && email.includes("@")) {
    return email.split("@")[0];
  }

  if (email) {
    return email;
  }

  return "User";
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const load = async (searchValue = search) => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminUsers(searchValue);
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
    void load("");
  }, []);

  const handleMakeAdmin = async (user: AdminUser) => {
    if (user.is_active) {
      return;
    }

    setUpdatingUserId(user.id);

    try {
      await setAdmin(user.id, true);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                is_active: true,
              }
            : currentUser
        )
      );

      alert(`${getUserDisplayName(user)} is now an administrator.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to grant admin access."
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <section>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void load();
              }
            }}
            placeholder="Search email or name"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold text-sm"
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
        <div className="py-10 flex justify-center">
          <Loader2 className="animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const displayName = getUserDisplayName(user);
            const isUpdating = updatingUserId === user.id;

            return (
              <div
                key={user.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <UserRound className="w-5 h-5 text-slate-500 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {displayName}
                  </div>

                  <div className="text-xs text-slate-500 truncate">
                    {user.email || user.id}
                  </div>

                  {user.is_active && (
                    <div className="text-xs text-emerald-400 mt-1">
                      Administrator
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <Wallet className="w-4 h-4 text-emerald-400" />

                  {money(user.wallet_balance)}
                </div>

                <button
                  type="button"
                  disabled={user.is_active || isUpdating}
                  onClick={() => void handleMakeAdmin(user)}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs disabled:opacity-60 ${
                    user.is_active
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}

                  {user.is_active ? "Admin" : "Make admin"}
                </button>
              </div>
            );
          })}

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
