import { Zap, Smartphone, Wifi, ShieldCheck, Zap as ZapIcon, ArrowRight, Clock, Wallet } from "lucide-react";

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800/50 sticky top-0 backdrop-blur-xl bg-slate-950/80 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="font-bold text-lg">SwiftVTU</span>
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Instant delivery across all Nigerian networks
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight max-w-3xl mx-auto">
            Buy airtime & data
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              in seconds, not minutes
            </span>
          </h1>

          <p className="text-slate-400 text-lg mt-6 max-w-xl mx-auto leading-relaxed">
            Top up any Nigerian phone number with airtime or data bundles from MTN, Airtel, Glo, and 9mobile. Fast, reliable, and always available.
          </p>

          <button
            onClick={onGetStarted}
            className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl px-8 py-3.5 text-base transition shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
          >
            Start Topping Up
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Networks", value: "4" },
              { label: "Data Plans", value: "50+" },
              { label: "Delivery", value: "Instant" },
              { label: "Uptime", value: "99.9%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-xl py-4">
                <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">Everything you need to stay connected</h2>
          <p className="text-slate-400 mt-3">Built for speed, reliability, and ease of use.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Smartphone, title: "Airtime Top-Up", desc: "Recharge any phone number with airtime from 100 to 5,000 Naira in a single tap." },
            { icon: Wifi, title: "Data Bundles", desc: "Choose from 50+ data plans across MTN, Airtel, Glo, and 9mobile with flexible validity." },
            { icon: ZapIcon, title: "Instant Delivery", desc: "Transactions process in real-time. Your top-up reaches the phone number within seconds." },
            { icon: ShieldCheck, title: "Secure Payments", desc: "Your transactions are encrypted and your API key is never exposed to the browser." },
            { icon: Clock, title: "Transaction History", desc: "Every purchase is logged with full details so you can track your spending over time." },
            { icon: Wallet, title: "Wallet Balance", desc: "Check your CheapDataHub reseller wallet balance at any time from the dashboard." },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition group"
            >
              <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition">
                <feature.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
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
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-medium">SwiftVTU</span>
          </div>
          <p className="text-slate-500 text-sm">
            Powered by CheapDataHub API. Built for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
