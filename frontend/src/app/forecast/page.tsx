"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  generatePredictions,
  getForecastCommentary,
  getPredictions,
  type Prediction,
} from "@/lib/api";

const TARGET_LABELS: Record<string, { label: string; icon: string }> = {
  gym_attended: { label: "Go to the gym", icon: "💪" },
  studied: { label: "Study", icon: "📚" },
  sleep_duration: { label: "Sleep", icon: "😴" },
  mood: { label: "Mood", icon: "🙂" },
  productivity: { label: "Productivity", icon: "⚡" },
};

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatValue(p: Prediction): string {
  if (p.kind === "binary") return `${Math.round(p.predicted_value * 100)}%`;
  if (p.target === "sleep_duration") return `${p.predicted_value} h`;
  return `${p.predicted_value}/10`;
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-green-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-500">
        {Math.round(value * 100)}% confident
      </span>
    </div>
  );
}

export default function ForecastPage() {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  async function fetchCommentary() {
    setCommentaryLoading(true);
    try {
      const res = await getForecastCommentary();
      setCommentary(res.commentary);
    } catch {
      setCommentary("LifeGPT is speechless right now. Try again in a moment.");
    } finally {
      setCommentaryLoading(false);
    }
  }
  // Locale-dependent text must not be server-rendered (hydration mismatch).
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setDateLabel(tomorrowLabel());
  }, []);

  useEffect(() => {
    const target = tomorrowISO();
    getPredictions(target)
      .then((existing) =>
        existing.length > 0 ? existing : generatePredictions(target),
      )
      .then(setPredictions)
      .catch(() => setError("Backend unreachable."));
  }, []);

  const binary = predictions?.filter((p) => p.kind === "binary") ?? [];
  const regression = predictions?.filter((p) => p.kind === "regression") ?? [];
  const daysOfData = predictions?.[0]?.days_of_data ?? 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4">
        <header>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">Life Forecast</h1>
          <p className="text-sm text-zinc-500">{dateLabel || " "}</p>
        </header>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {!predictions && !error && (
          <p className="py-16 text-center text-zinc-500">Predicting…</p>
        )}

        {predictions && predictions.length === 0 && (
          <p className="rounded-2xl bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            Not enough data to predict yet. Log a few days first.
          </p>
        )}

        {binary.length > 0 && (
          <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Will you…
            </h2>
            {binary.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <span className="text-lg">
                    {TARGET_LABELS[p.target]?.icon ?? "❓"}
                  </span>
                  {TARGET_LABELS[p.target]?.label ?? p.target}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-lg font-semibold ${
                      p.predicted_value >= 0.5 ? "text-green-300" : "text-zinc-400"
                    }`}
                  >
                    {formatValue(p)}
                  </span>
                  <ConfidenceBar value={p.confidence} />
                </div>
              </div>
            ))}
          </section>
        )}

        {regression.length > 0 && (
          <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Predicted levels
            </h2>
            {regression.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-sm text-zinc-200">
                  <span className="text-lg">
                    {TARGET_LABELS[p.target]?.icon ?? "❓"}
                  </span>
                  {TARGET_LABELS[p.target]?.label ?? p.target}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-semibold text-white">
                    {formatValue(p)}
                  </span>
                  <ConfidenceBar value={p.confidence} />
                </div>
              </div>
            ))}
          </section>
        )}

        {predictions && predictions.length > 0 && (
          <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              LifeGPT&apos;s take
            </h2>
            {commentary ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {commentary}
              </p>
            ) : (
              <button
                onClick={fetchCommentary}
                disabled={commentaryLoading}
                className="rounded-xl bg-zinc-800 py-2.5 text-sm font-medium text-zinc-200 transition active:scale-[0.98] disabled:opacity-50"
              >
                {commentaryLoading ? "Consulting the data…" : "Get commentary"}
              </button>
            )}
          </section>
        )}

        {predictions && predictions.length > 0 && (
          <p className="px-2 text-center text-[11px] text-zinc-600">
            Based on {daysOfData} logged {daysOfData === 1 ? "day" : "days"}.
            Predictions are locked in now and scored against reality once you
            log tomorrow.
          </p>
        )}
      </div>
    </main>
  );
}
