"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPatterns, type PatternsResponse } from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  sleep: "😴",
  exercise: "💪",
  focus: "🧠",
  work: "💼",
  rhythm: "📅",
};

function MaturityBanner({
  maturity,
}: {
  maturity: PatternsResponse["maturity"];
}) {
  const pct = maturity.next_unlock
    ? Math.min(100, Math.round((maturity.days_logged / maturity.next_unlock) * 100))
    : 100;
  return (
    <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">{maturity.label}</h2>
        <span className="text-xs text-zinc-500">
          {maturity.days_logged}
          {maturity.next_unlock ? ` / ${maturity.next_unlock}` : ""} days
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-zinc-400">{maturity.description}</p>
    </section>
  );
}

function WeekdayChart({
  profile,
}: {
  profile: NonNullable<PatternsResponse["weekday_profile"]>;
}) {
  const data = profile.map((p) => ({
    day: p.weekday.slice(0, 3),
    productivity: p.avg_productivity,
  }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
        <CartesianGrid stroke="#2c2c2a" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#898781", fontSize: 11 }}
          axisLine={{ stroke: "#2c2c2a" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 5, 10]}
          tick={{ fill: "#898781", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#ffffff0d" }}
          contentStyle={{
            background: "#09090b",
            border: "1px solid #ffffff1a",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#fff" }}
        />
        <Bar
          dataKey="productivity"
          name="Avg productivity"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PatternsPage() {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPatterns()
      .then(setData)
      .catch(() => setError("Backend unreachable."));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4">
        <header>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">Life Patterns</h1>
        </header>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {!data && !error && (
          <p className="py-16 text-center text-zinc-500">Analysing…</p>
        )}

        {data && (
          <>
            <MaturityBanner maturity={data.maturity} />

            {data.insights.length === 0 ? (
              <section className="rounded-2xl bg-zinc-900 p-6 text-center flex flex-col gap-2">
                <p className="text-3xl">🔍</p>
                <p className="text-sm text-zinc-400">
                  No patterns detected yet. Keep logging — comparisons start
                  appearing after ~5 days of data, and LifeGPT only reports
                  patterns it can actually back up.
                </p>
              </section>
            ) : (
              <div className="flex flex-col gap-3">
                {data.insights.map((ins) => (
                  <section
                    key={ins.id}
                    className="rounded-2xl bg-zinc-900 p-4 flex gap-3"
                  >
                    <span className="text-xl">
                      {CATEGORY_ICONS[ins.category] ?? "✨"}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm text-zinc-200">{ins.text}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            ins.confidence === "pattern"
                              ? "bg-green-500/15 text-green-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {ins.confidence}
                        </span>
                        {"n" in ins.evidence && (
                          <span className="text-[10px] text-zinc-600">
                            {String(ins.evidence.n)} days
                            {"r" in ins.evidence &&
                              ` · r=${Number(ins.evidence.r)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {data.weekday_profile && (
              <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Productivity by weekday
                </h2>
                <WeekdayChart profile={data.weekday_profile} />
              </section>
            )}

            <p className="px-2 text-center text-[11px] text-zinc-600">
              {data.note}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
