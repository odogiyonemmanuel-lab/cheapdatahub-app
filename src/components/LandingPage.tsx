import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Smartphone,
  Wifi,
  ShieldCheck,
  Zap as ZapIcon,
  ArrowRight,
  Clock,
  Wallet,
  Loader2,
} from "lucide-react";
import { getPublicDataPricing } from "@/lib/api";
import { DATA_PLANS, NETWORKS, formatNaira } from "@/lib/dataPlans";

type PublicPlan = {
  bundle_id: number;
  network: string;
  plan_name: string;
  selling_price: number;
  active: boolean;
};

export default function LandingPage({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let mounted = true;

    getPublicDataPricing()
      .then(({ products }) => {
        if (mounted && products.length) {
          setPlans(products.filter((product) => product.active));
        }
      })
      .catch(() => {
        // Fallback catalogue if the public pricing endpoint
        // is temporarily unavailable.
        if (mounted) {
          setPlans(
            DATA_PLANS.map((plan) => ({
              bundle_id: plan.bundle_id,
              network: plan.network,
              plan_name: plan.name,
              selling_price: plan.price,
              active: true,
            }))
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingPlans(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const displayPlans = useMemo(() => {
    const filtered =
      selectedNetwork === "ALL"
        ? plans
        : plans.filter((plan) => plan.network === selectedNetwork);

    return filtered
      .slice()
      .sort((a, b) => a.selling_price - b.selling_price)
      .slice(0, 12);
  }, [plans, selectedNetwork]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 sticky top-0 backdrop-blur-xl bg-slate-950/80 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap
                className="w-5 h-5 text-white"
                fill="white"
              />
            </div>

            <span className="font-bold text-lg">
              SwiftVTU
            </span>
          </div>

          <button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-lg px-5 py-2 text-sm transition"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />

            Affordable data across Nigerian networks
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight max-w-3xl mx-auto">
            Buy airtime & data

            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              at prices you'll love
            </span>
          </h1>

          <p className="text-slate-400 text-lg mt-6 max-w-xl mx-auto leading-relaxed">
            Fast, affordable data bundles for MTN, Airtel,
            Glo, and 9mobile. See our prices before you even
            create an account.
          </p>

          <button
            onClick={onGetStarted}
            className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl px-8 py-3.5 text-base transition shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
          >
            Start Topping Up

            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              {
                label: "Networks",
                value: "4",
              },
              {
                label: "Data Plans",
                value: "50+",
              },
              {
                label: "Delivery",
                value: "Instant",
              },
              {
                label: "Availability",
                value: "24/7",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-900/50 border border-slate-800 rounded-xl py-4"
              >
                <div className="text-2xl font-bold text-emerald-400">
                  {stat.value}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC DATA PRICES */}
      <section
        id="data-prices"
        className="max-w-6xl mx-auto px-4 sm:px-6 pb-20"
      >
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-emerald-500/5">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-2">
              <Wifi className="w-4 h-4" />
              DATA PRICES
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold">
              Affordable data plans
            </h2>

            <p className="text-slate-400 mt-2">
              Pick a network and see our current customer prices.
            </p>
          </div>

          {/* Network filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-7">
            <button
              onClick={() => setSelectedNetwork("ALL")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                selectedNetwork === "ALL"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All
            </button>

            {NETWORKS.map((network) => (
              <button
                key={network.name}
                onClick={() =>
                  setSelectedNetwork(network.name)
                }
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  selectedNetwork === network.name
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {network.shortName}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loadingPlans && (
            <div className="py-14 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading current prices...
            </div>
          )}

          {/* Empty */}
          {!loadingPlans && displayPlans.length === 0 && (
            <div className="py-14 text-center text-slate-400">
              Data plans are temporarily unavailable.
              Please check back shortly.
            </div>
          )}

          {/* Plans */}
          {!loadingPlans && displayPlans.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {displayPlans.map((plan) => (
                <button
                  key={plan.bundle_id}
                  onClick={onGetStarted}
                  className="group text-left bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-bold tracking-wide text-emerald-400">
                      {plan.network}
                    </span>

                    <span className="text-xs text-slate-500">
                      Tap to buy
                    </span>
                  </div>

                  <div className="font-semibold text-sm text-white line-clamp-2 min-h-10">
                    {plan.plan_name}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-2">
                    <span className="text-xl font-extrabold text-white">
                      {formatNaira(plan.selling_price)}
                    </span>

                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-7 text-center">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-7 py-3 rounded-xl font-semibold transition"
            >
              View All Plans & Buy Data

              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">
            Everything you need to stay connected
          </h2>

          <p className="text-slate-400 mt-3">
            Built for speed, reliability, and ease of use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Smartphone,
              title: "Airtime Top-Up",
              desc: "Recharge any phone number with airtime from 100 to 5,000 Naira in a single tap.",
            },
            {
              icon: Wifi,
              title: "Data Bundles",
              desc: "Choose from 50+ data plans across MTN, Airtel, Glo, and 9mobile with flexible validity.",
            },
            {
              icon: ZapIcon,
              title: "Instant Delivery",
              desc: "Transactions process in real-time. Your top-up reaches the phone number within seconds.",
            },
            {
              icon: ShieldCheck,
              title: "Secure Payments",
              desc: "Your transactions are encrypted and your API key is never exposed to the browser.",
            },
            {
              icon: Clock,
              title: "Transaction History",
              desc: "Every purchase is logged with full details so you can track your spending over time.",
            },
            {
              icon: Wallet,
              title: "Wallet Balance",
              desc: "Fund your SwiftVTU wallet securely and use it for fast airtime and data purchases.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition group"
            >
              <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
                <feature.icon className="w-5 h-5 text-emerald-400" />
              </div>

              <h3 className="font-semibold text-lg">
                {feature.title}
              </h3>

              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-3xl font-bold">
            Ready to get started?
          </h2>

          <p className="text-slate-400 mt-3 max-w-md mx-auto">
            Create your free account and make your first top-up in under a minute.
          </p>

          <button
            onClick={onGetStarted}
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl px-8 py-3.5 transition shadow-lg shadow-emerald-500/25"
          >
            Create Account

            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
              <Zap
                className="w-4 h-4 text-white"
                fill="white"
              />
            </div>

            <span className="font-medium">
              SwiftVTU
            </span>
          </div>

          <p className="text-slate-500 text-sm">
            Powered by CheapDataHub API. Built for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
