"use client";
import { useEffect, useState } from "react";
import { getVapidPublicKey, subscribePush } from "@/lib/api";
import { getExistingSubscription, pushSupported, subscribeToPush } from "@/lib/push";

type Status = "checking" | "hidden" | "offer" | "denied" | "enabling" | "enabled" | "error";

export function NotificationBanner() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!pushSupported()) {
      setStatus("hidden");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    getExistingSubscription().then((sub) => {
      setStatus(sub ? "hidden" : "offer");
    });
  }, []);

  async function enable() {
    setStatus("enabling");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "offer");
        return;
      }
      const { key } = await getVapidPublicKey();
      const sub = await subscribeToPush(key);
      await subscribePush(sub.toJSON());
      setStatus("enabled");
    } catch {
      setStatus("error");
    }
  }

  if (status === "checking" || status === "hidden") return null;

  return (
    <div className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-2">
      {status === "offer" && (
        <>
          <p className="text-sm text-zinc-200">
            Get a reminder at 9 PM if you haven&apos;t logged today.
          </p>
          <button
            onClick={enable}
            className="rounded-xl bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] py-2.5 text-sm font-semibold transition active:scale-[0.98]"
          >
            Enable reminders
          </button>
        </>
      )}
      {status === "enabling" && (
        <p className="text-sm text-zinc-400">Setting up notifications…</p>
      )}
      {status === "enabled" && (
        <p className="text-sm text-emerald-400">
          Reminders on. LifeGPT will nudge you at 9 PM if needed.
        </p>
      )}
      {status === "denied" && (
        <p className="text-xs text-zinc-500">
          Notifications are blocked for LifeGPT. Enable them in your
          browser&apos;s site settings to get the 9 PM reminder.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">
          Couldn&apos;t enable notifications. Try again in a moment.
        </p>
      )}
    </div>
  );
}
