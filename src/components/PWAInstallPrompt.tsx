import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "cheapdatahub-install-dismissed";

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsStandalone(standalone);

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);

      // Show the install banner unless the visitor already dismissed it in this session.
      if (sessionStorage.getItem(DISMISSED_KEY) !== "1") {
        setVisible(true);
      }
    };

    const installed = () => {
      setInstallEvent(null);
      setVisible(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (isStandalone || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "dismissed") {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    }

    setVisible(false);
  };

  const close = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-black/30 transition hover:bg-emerald-400"
        aria-label="Install CheapDataHub"
      >
        <Download className="h-4 w-4" />
        Install App
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Download className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Install CheapDataHub</p>
          <p className="mt-1 text-sm text-slate-400">
            Install CheapDataHub on your device for faster access from your home screen.
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
          onClick={close}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
