"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <div className="rounded-2xl bg-zinc-900 p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">Install LifeGPT</p>
        <p className="text-xs text-zinc-500">
          Add it to your home screen for the full app feel.
        </p>
      </div>
      <button
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") setInstalled(true);
          setDeferred(null);
        }}
        className="shrink-0 rounded-xl bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] px-4 py-2 text-sm font-semibold transition active:scale-[0.98]"
      >
        Install
      </button>
    </div>
  );
}
