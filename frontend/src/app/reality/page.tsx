"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ProgressRing } from "@/components/ProgressRing";
import {
  getAccuracy,
  getComparisons,
  type AccuracyReport,
  type Prediction,
} from "@/lib/api";

const TARGET_META: Record<string, { label: string; icon: string }> = {
  gym_attended: { label: "Gym", icon: "💪" },
  studied: { label: "Study", icon: "📚" },
  sleep_duration: { label: "Sleep", icon: "😴" },
  mood: { label: "Mood", icon: "🙂" },
  productivity: { label: "Productivity", icon: "⚡" },
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatPredicted(p: Prediction): string {
  if (p.kind === "binary")
    return `${p.predicted_value >= 0.5 ? "Yes" : "No"} · ${Math.round(p.predicted_value * 100)}%`;
  if (p.target === "sleep_duration") return `${p.predicted_value}h`;
  return `${p.predicted_value}/10`;
}

function formatActual(p: Prediction): string {
  if (p.actual_value === null) return "—";
  if (p.kind === "binary") return p.actual_value === 1 ? "Yes" : "No";
  if (p.target === "sleep_duration") return `${p.actual_value}h`;
  return `${p.actual_value}/10`;
}

function AccuracyHero({ report }: { report: AccuracyReport }) {
  const pct =
    report.overall_accuracy !== null
      ? Math.round(report.overall_accuracy * 100)
      : null;
  return (
    <section className="rounded-2xl border border-green-500/10 bg-zinc-900 p-6 flex flex-col items-center gap-3 text-center">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        How well does LifeGPT know you?
      </h2>
      <ProgressRing value={pct} label="Prediction Accuracy" />
      <p className="text-sm text-zinc-400">{report.verdict}</p>
      <p className="text-[11px] text-zinc-600">
        {report.evaluated_predictions} predictions scored across{" "}
        {report.days_scored} {report.days_scored === 1 ? "day" : "days"}
      </p>
    </section>
  );
}

export default function RealityPage() {
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [comparisons, setComparisons] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAccuracy(), getComparisons()])
      .then(([r, c]) => {
        setReport(r);
        setComparisons(c);
      })
      .catch(() => setError("Backend unreachable."));
  }, []);

  const byDate = new Map<string, Prediction[]>();
  for (const p of comparisons ?? []) {
    const list = byDate.get(p.target_date) ?? [];
    list.push(p);
    byDate.set(p.target_date, list);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4">
        <header>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">AI vs Reality</h1>
        </header>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {!report && !error && (
          <p className="py-16 text-center text-zinc-500">Scoring…</p>
        )}

        {report && (
          <>
            <AccuracyHero report={report} />

            {report.per_target.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {report.per_target.map((t) => (
                  <div
                    key={t.target}
                    className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-0.5"
                  >
                    <span className="text-xs text-zinc-500">
                      {TARGET_META[t.target]?.icon} {t.label}
                    </span>
                    <span className="text-xl font-semibold">
                      {t.hit_rate !== null
                        ? `${Math.round(t.hit_rate * 100)}%`
                        : "—"}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {t.kind === "regression" && t.mae !== null
                        ? `MAE ${t.mae}${t.target === "sleep_duration" ? "h" : ""} · ${t.n} scored`
                        : `${t.n} scored`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {byDate.size === 0 ? (
              <section className="rounded-2xl bg-zinc-900 p-6 text-center flex flex-col gap-2">
                <p className="text-3xl">⚖️</p>
                <p className="text-sm text-zinc-400">
                  Nothing scored yet. Tomorrow&apos;s predictions are locked in —
                  log tomorrow and this page comes alive.
                </p>
              </section>
            ) : (
              [...byDate.entries()].map(([dateISO, preds]) => (
                <section
                  key={dateISO}
                  className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{formatDate(dateISO)}</h3>
                    <span className="text-xs text-zinc-500">
                      {preds.filter((p) => p.correct === 1).length}/
                      {preds.length} right
                    </span>
                  </div>
                  {preds.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span>{TARGET_META[p.target]?.icon ?? "❓"}</span>
                        {TARGET_META[p.target]?.label ?? p.target}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-zinc-500">
                          {formatPredicted(p)}
                        </span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-200">{formatActual(p)}</span>
                        <span
                          className={
                            p.correct === 1
                              ? "text-[#22c55e]"
                              : "text-red-400"
                          }
                        >
                          {p.correct === 1 ? "✓" : "✗"}
                        </span>
                      </span>
                    </div>
                  ))}
                </section>
              ))
            )}

            <p className="px-2 text-center text-[11px] text-zinc-600">
              {report.note}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
