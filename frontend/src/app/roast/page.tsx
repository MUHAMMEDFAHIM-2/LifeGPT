"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportCard } from "@/components/ai/ReportCard";
import { generateRoast, getReports, type AIReport } from "@/lib/api";

type Intensity = "light" | "brutal" | "nuclear";

const INTENSITIES: {
  value: Intensity;
  label: string;
  blurb: string;
  selected: string;
}[] = [
  {
    value: "light",
    label: "Light",
    blurb: "Friendly teasing",
    selected: "border-emerald-500 bg-emerald-500/10",
  },
  {
    value: "brutal",
    label: "Brutal",
    blurb: "Sharp and sarcastic",
    selected: "border-amber-500 bg-amber-500/10",
  },
  {
    value: "nuclear",
    label: "Destroy Me",
    blurb: "No survivors",
    selected: "border-red-500 bg-red-500/10",
  },
];

export default function RoastPage() {
  const [intensity, setIntensity] = useState<Intensity>("light");
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReports("roast")
      .then(setReports)
      .catch(() => setError("Backend unreachable."))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const report = await generateRoast(intensity);
      setReports((prev) => [report, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4">
        <header>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">Reality Check</h1>
          <p className="text-sm text-zinc-500">
            Your data. Weaponised. Choose how much you can take.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((i) => (
            <button
              key={i.value}
              onClick={() => setIntensity(i.value)}
              className={`rounded-2xl border p-3 text-center transition ${
                intensity === i.value
                  ? i.selected
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <span className="block text-sm font-semibold">{i.label}</span>
              <span className="block text-[10px] text-zinc-500">{i.blurb}</span>
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={generating || loading}
          className="rounded-2xl bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] py-3.5 font-semibold transition active:scale-[0.98] disabled:opacity-50"
        >
          {generating ? "Preparing the truth…" : "Roast Me"}
        </button>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading && <p className="py-8 text-center text-zinc-500">Loading…</p>}

        {!loading && reports.length === 0 && !error && (
          <p className="rounded-2xl bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            No roasts yet. Brave enough for the first one?
          </p>
        )}

        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </main>
  );
}
