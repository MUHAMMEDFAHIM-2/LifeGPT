"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getEntries, type DailyEntry } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-zinc-400">
      {label} <span className="font-mono text-zinc-200">{value}</span>
    </span>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<DailyEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEntries(60)
      .then(setEntries)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load entries"),
      );
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4">
        <header>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">History</h1>
        </header>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {entries === null && !error && (
          <p className="py-16 text-center text-zinc-500">Loading…</p>
        )}

        {entries?.length === 0 && (
          <div className="py-16 text-center flex flex-col gap-3">
            <p className="text-zinc-400">No entries yet.</p>
            <Link href="/checkin" className="text-green-400 underline">
              Log your first day →
            </Link>
          </div>
        )}

        {entries?.map((e) => (
          <Link
            key={e.id}
            href="/checkin"
            className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-2 active:bg-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{formatDate(e.date)}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  e.gym_attended
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {e.gym_attended ? "Gym ✓" : "No gym"}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {e.sleep_duration !== null && (
                <Stat label="Sleep" value={`${e.sleep_duration}h`} />
              )}
              {e.mood !== null && <Stat label="Mood" value={`${e.mood}/10`} />}
              {e.energy !== null && (
                <Stat label="Energy" value={`${e.energy}/10`} />
              )}
              {e.productivity !== null && (
                <Stat label="Prod." value={`${e.productivity}/10`} />
              )}
              {e.study_hours !== null && (
                <Stat label="Study" value={`${e.study_hours}h`} />
              )}
            </div>
            {e.notes && (
              <p className="text-xs text-zinc-500 line-clamp-2">{e.notes}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
