import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const installed = () => {
      setInstallEvent(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);

    if (choice.outcome === "dismissed") {
      sessionStorage.setItem("cheapdatahub-install-dismissed", "1");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Download className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Install CheapDataHub</p>
          <p className="mt-1 text-sm text-slate-400">
            Add CheapDataHub to your phone for faster access.
          </p>

          <button
            type="button"
            onClick={install}
            className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Install App
          </button>
        </div>

        <button
          type="button"
          aria-label="Close install prompt"
          onClick={() => setVisible(false)}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
