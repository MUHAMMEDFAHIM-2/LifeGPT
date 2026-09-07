"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatTile } from "@/components/dashboard/StatTile";
import {
  MoodProductivityChart,
  SleepChart,
} from "@/components/dashboard/charts";
import {
  getSummary,
  getTrends,
  type AnalyticsSummary,
  type TrendPoint,
} from "@/lib/api";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSummary(), getTrends(14)])
      .then(([s, t]) => {
        setSummary(s);
        setTrends(t);
      })
      .catch(() =>
        setError("Backend unreachable. Start the API server and refresh."),
      );
  }, []);

  const today = summary?.today;
  const week = summary?.week;
  const enoughForCharts = (trends?.filter((t) => t.mood !== null).length ?? 0) >= 2;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-8 flex flex-col gap-4">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-sm text-zinc-500">{greeting()}</p>
            <h1 className="text-3xl font-bold">LifeGPT</h1>
          </div>
          {summary && (
            <p className="text-xs text-zinc-500">
              {summary.total_entries}{" "}
              {summary.total_entries === 1 ? "day" : "days"} logged
            </p>
          )}
        </header>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!summary && !error && (
          <p className="py-16 text-center text-zinc-500">Loading…</p>
        )}

        {summary && (
          <>
            {today?.logged ? (
              <Card title="Today">
                <div className="flex justify-between">
                  <StatInline label="Mood" value={today.mood} />
                  <StatInline label="Energy" value={today.energy} />
                  <StatInline label="Productivity" value={today.productivity} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-zinc-500">Gym</span>
                    <span
                      className={`text-lg font-semibold ${
                        today.gym_attended ? "text-[#0ca30c]" : "text-zinc-500"
                      }`}
                    >
                      {today.gym_attended ? "✓" : "—"}
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Link
                href="/checkin"
                className="rounded-2xl bg-violet-600 p-5 font-semibold transition active:scale-[0.98]"
              >
                Log today
                <span className="block text-sm font-normal text-violet-200">
                  You haven&apos;t checked in yet
                </span>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Avg sleep (7d)"
                value={week?.avg_sleep?.toString() ?? null}
                unit="h"
                delta={summary.deltas.sleep}
              />
              <StatTile
                label="Gym days (7d)"
                value={week ? `${week.gym_days}/${week.days_logged}` : null}
                delta={summary.deltas.gym_rate}
              />
              <StatTile
                label="Avg mood (7d)"
                value={week?.avg_mood?.toString() ?? null}
                unit="/10"
                delta={summary.deltas.mood}
              />
              <StatTile
                label="Avg productivity (7d)"
                value={week?.avg_productivity?.toString() ?? null}
                unit="/10"
                delta={summary.deltas.productivity}
              />
            </div>

            {(summary.streaks.logging > 1 || summary.streaks.gym > 1) && (
              <div className="flex gap-3">
                {summary.streaks.logging > 1 && (
                  <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
                    🔥 {summary.streaks.logging}-day logging streak
                  </span>
                )}
                {summary.streaks.gym > 1 && (
                  <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
                    💪 {summary.streaks.gym}-day gym streak
                  </span>
                )}
              </div>
            )}

            {enoughForCharts && trends ? (
              <>
                <Card title="Sleep — last 14 days">
                  <SleepChart data={trends} />
                </Card>
                <Card title="Mood & productivity — last 14 days">
                  <MoodProductivityChart data={trends} />
                </Card>
              </>
            ) : (
              <Card title="Trends">
                <p className="text-sm text-zinc-400">
                  Charts unlock after a couple of logged days. LifeGPT can&apos;t
                  analyse what it hasn&apos;t seen.
                </p>
              </Card>
            )}
          </>
        )}

        <nav className="flex flex-col gap-3 pt-2">
          <Link
            href="/checkin"
            className="rounded-2xl bg-zinc-900 p-4 font-semibold transition active:scale-[0.98]"
          >
            Daily Check-In
            <span className="block text-sm font-normal text-zinc-400">
              Log or edit a day
            </span>
          </Link>
          <Link
            href="/patterns"
            className="rounded-2xl bg-zinc-900 p-4 font-semibold transition active:scale-[0.98]"
          >
            Life Patterns
            <span className="block text-sm font-normal text-zinc-400">
              What your data says about you
            </span>
          </Link>
          <Link
            href="/history"
            className="rounded-2xl bg-zinc-900 p-4 font-semibold transition active:scale-[0.98]"
          >
            History
            <span className="block text-sm font-normal text-zinc-400">
              Everything LifeGPT knows so far
            </span>
          </Link>
        </nav>
      </div>
    </main>
  );
}

function StatInline({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-semibold">
        {value ?? "—"}
        <span className="text-xs font-normal text-zinc-500">/10</span>
      </span>
    </div>
  );
}
