import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PaymentCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Parse query parameters from the callback (e.g., ?status=success&tx_ref=...)
    const q = typeof window !== "undefined" ? new URL(window.location.href).searchParams : null;
    const s = q?.get("status") || q?.get("transaction_status");
    setStatus(s);

    // If needed, you can notify your backend here about the transaction
    // or verify the payment using your server-side endpoint.

    // After a short delay, redirect users to the app or a receipt page.
    const t = setTimeout(() => {
      router.replace(s === "success" ? "/app" : "/");
    }, 2500);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4">Payment callback</h1>
        <p className="text-slate-400 mb-2">Status: {status ?? "processing"}</p>
        <p className="text-sm text-slate-500">You will be redirected shortly...</p>
      </div>
    </div>
  );
}
