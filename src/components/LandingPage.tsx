import { useState } from "react";
import {
  Zap,
  Wifi,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock3,
  Wallet,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

type Network = "MTN" | "Airtel" | "Glo" | "9mobile";

type DataPlan = {
  id: number;
  network: Network;
  name: string;
  price: number;
  validity: string;
  popular?: boolean;
};

const dataPlans: DataPlan[] = [
  // MTN
  {
    id: 1,
    network: "MTN",
    name: "500MB",
    price: 150,
    validity: "30 Days",
  },
  {
    id: 2,
    network: "MTN",
    name: "1GB",
    price: 300,
    validity: "30 Days",
    popular: true,
  },
  {
    id: 3,
    network: "MTN",
    name: "2GB",
    price: 600,
    validity: "30 Days",
  },
  {
    id: 4,
    network: "MTN",
    name: "3GB",
    price: 900,
    validity: "30 Days",
  },
  {
    id: 5,
    network: "MTN",
    name: "5GB",
    price: 1500,
    validity: "30 Days",
  },
  {
    id: 6,
    network: "MTN",
    name: "10GB",
    price: 3000,
    validity: "30 Days",
  },

  // Airtel
  {
    id: 7,
    network: "Airtel",
    name: "500MB",
    price: 150,
    validity: "30 Days",
  },
  {
    id: 8,
    network: "Airtel",
    name: "1GB",
    price: 300,
    validity: "30 Days",
    popular: true,
  },
  {
    id: 9,
    network: "Airtel",
    name: "2GB",
    price: 600,
    validity: "30 Days",
  },
  {
    id: 10,
    network: "Airtel",
    name: "3GB",
    price: 900,
    validity: "30 Days",
  },
  {
    id: 11,
    network: "Airtel",
    name: "5GB",
    price: 1500,
    validity: "30 Days",
  },
  {
    id: 12,
    network: "Airtel",
    name: "10GB",
    price: 3000,
    validity: "30 Days",
  },

  // Glo
  {
    id: 13,
    network: "Glo",
    name: "500MB",
    price: 150,
    validity: "30 Days",
  },
  {
    id: 14,
    network: "Glo",
    name: "1GB",
    price: 300,
    validity: "30 Days",
    popular: true,
  },
  {
    id: 15,
    network: "Glo",
    name: "2GB",
    price: 600,
    validity: "30 Days",
  },
  {
    id: 16,
    network: "Glo",
    name: "3GB",
    price: 900,
    validity: "30 Days",
  },
  {
    id: 17,
    network: "Glo",
    name: "5GB",
    price: 1500,
    validity: "30 Days",
  },

  // 9mobile
  {
    id: 18,
    network: "9mobile",
    name: "500MB",
    price: 150,
    validity: "30 Days",
  },
  {
    id: 19,
    network: "9mobile",
    name: "1GB",
    price: 300,
    validity: "30 Days",
    popular: true,
  },
  {
    id: 20,
    network: "9mobile",
    name: "2GB",
    price: 600,
    validity: "30 Days",
  },
  {
    id: 21,
    network: "9mobile",
    name: "3GB",
    price: 900,
    validity: "30 Days",
  },
  {
    id: 22,
    network: "9mobile",
    name: "5GB",
    price: 1500,
    validity: "30 Days",
  },
];

const networkStyles: Record<
  Network,
  {
    badge: string;
    dot: string;
    button: string;
  }
> = {
  MTN: {
    badge: "bg-yellow-400/10 text-yellow-300 border-yellow-400/20",
    dot: "bg-yellow-400",
    button:
      "bg-yellow-400 hover:bg-yellow-300 text-slate-950",
  },
  Airtel: {
    badge: "bg-red-500/10 text-red-300 border-red-500/20",
    dot: "bg-red-500",
    button:
      "bg-red-500 hover:bg-red-400 text-white",
  },
  Glo: {
    badge: "bg-green-500/10 text-green-300 border-green-500/20",
    dot: "bg-green-500",
    button:
      "bg-green-500 hover:bg-green-400 text-white",
  },
  "9mobile": {
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
    button:
      "bg-emerald-500 hover:bg-emerald-400 text-white",
  },
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export default function LandingPage({
  onGetStarted,
}: {
  onGetStarted?: () => void;
}) {
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network>("MTN");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visiblePlans = dataPlans.filter(
    (plan) => plan.network === selectedNetwork
  );

  const handleBuy = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }

    window.location.href = "#signup";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap
                  className="w-5 h-5 text-white"
                  fill="white"
                />
              </div>

              <div>
                <div className="font-bold text-lg leading-none">
                  SwiftVTU
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Fast • Simple • Reliable
                </div>
              </div>
            </button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-7 text-sm">
              <a
                href="#plans"
                className="text-slate-300 hover:text-white transition"
              >
                Data Plans
              </a>

              <a
                href="#services"
                className="text-slate-300 hover:text-white transition"
              >
                Services
              </a>

              <a
                href="#why-us"
                className="text-slate-300 hover:text-white transition"
              >
                Why SwiftVTU
              </a>
            </nav>

            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleBuy}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Sign In
              </button>

              <button
                onClick={handleBuy}
                className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition shadow-lg shadow-emerald-500/10"
              >
                Get Started
              </button>
            </div>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 py-4 space-y-2">
              <a
                href="#plans"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-900"
              >
                Data Plans
              </a>

              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-900"
              >
                Services
              </a>

              <a
                href="#why-us"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-900"
              >
                Why SwiftVTU
              </a>

              <button
                onClick={handleBuy}
                className="w-full mt-2 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
            <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Affordable data. Instant delivery.
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Affordable Data &
                <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Airtime in Seconds
                </span>
              </h1>

              <p className="max-w-2xl mx-auto mt-6 text-base sm:text-lg text-slate-400 leading-7">
                Buy data bundles and airtime for all major Nigerian networks
                quickly and conveniently with SwiftVTU.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <button
                  onClick={handleBuy}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-semibold transition shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  Start Buying
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#plans"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-900 font-semibold transition text-center"
                >
                  View Data Prices
                </a>
              </div>

              {/* Trust points */}
              <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 mt-9 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Instant delivery
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Secure payments
                </div>

                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-emerald-400" />
                  Available 24/7
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK SERVICES */}
        <section id="services" className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                </div>

                <h3 className="font-semibold text-lg">
                  Data Bundles
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Affordable internet bundles for your favourite network.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4">
                  <Smartphone className="w-5 h-5 text-teal-400" />
                </div>

                <h3 className="font-semibold text-lg">
                  Airtime
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Recharge your phone instantly without leaving home.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                </div>

                <h3 className="font-semibold text-lg">
                  Wallet
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Fund your wallet and use your balance whenever you need it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DATA PLANS */}
        <section id="plans" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
                <Wifi className="w-4 h-4" />
                DATA PLANS
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold">
                Choose your data plan
              </h2>

              <p className="mt-3 text-slate-500">
                Select a network below to see the available customer prices.
              </p>
            </div>

            {/* Network selector */}
            <div className="mt-9 flex flex-wrap justify-center gap-2">
              {(
                ["MTN", "Airtel", "Glo", "9mobile"] as Network[]
              ).map((network) => {
                const active = selectedNetwork === network;

                return (
                  <button
                    key={network}
                    onClick={() => setSelectedNetwork(network)}
                    className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition ${
                      active
                        ? networkStyles[network].badge
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        networkStyles[network].dot
                      }`}
                    />

                    {network}
                  </button>
                );
              })}
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {visiblePlans.map((plan) => {
                const styles = networkStyles[plan.network];

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-slate-900 border rounded-2xl p-5 transition hover:-translate-y-1 hover:border-slate-700 ${
                      plan.popular
                        ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                        : "border-slate-800"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                        POPULAR
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium ${styles.badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}
                        />
                        {plan.network}
                      </div>

                      <span className="text-xs text-slate-500">
                        {plan.validity}
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="text-3xl font-bold">
                        {plan.name}
                      </div>

                      <div className="mt-2 text-emerald-400 text-2xl font-bold">
                        {formatNaira(plan.price)}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800">
                      <button
                        onClick={handleBuy}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition ${styles.button}`}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <p className="text-xs text-slate-600">
                Prices displayed are customer-facing prices and can be
                updated from your pricing/admin system.
              </p>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section
          id="why-us"
          className="py-20 border-y border-slate-900 bg-slate-950"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Why choose SwiftVTU?
              </h2>

              <p className="mt-3 text-slate-500">
                Everything you need for simple and convenient VTU purchases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>

                <h3 className="font-semibold text-lg mt-5">
                  Fast Delivery
                </h3>

                <p className="text-sm text-slate-500 mt-2 leading-6">
                  Your airtime and data purchases are processed quickly.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-teal-400" />
                </div>

                <h3 className="font-semibold text-lg mt-5">
                  Secure
                </h3>

                <p className="text-sm text-slate-500 mt-2 leading-6">
                  Your account and transactions are protected by secure
                  authentication.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-cyan-400" />
                </div>

                <h3 className="font-semibold text-lg mt-5">
                  Simple Wallet
                </h3>

                <p className="text-sm text-slate-500 mt-2 leading-6">
                  Fund your wallet and make purchases whenever you need them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-8 sm:p-12 text-center">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -top-20 left-1/2 -translate-x-1/2" />
              </div>

              <div className="relative">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Zap
                    className="w-7 h-7 text-white"
                    fill="white"
                  />
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold mt-6">
                  Ready to get connected?
                </h2>

                <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                  Create your SwiftVTU account and start buying affordable
                  data and airtime.
                </p>

                <button
                  onClick={handleBuy}
                  className="mt-7 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition inline-flex items-center gap-2"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <Zap
                  className="w-4 h-4 text-white"
                  fill="white"
                />
              </div>

              <span className="font-semibold">
                SwiftVTU
              </span>
            </div>

            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} SwiftVTU. All rights reserved.
            </p>

            <div className="flex items-center gap-5 text-xs text-slate-500">
              <span>Secure</span>
              <span>Reliable</span>
              <span>Fast</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
