"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportCard } from "@/components/ai/ReportCard";
import { generateAnalysis, getReports, type AIReport } from "@/lib/api";

export default function AnalysisPage() {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReports("analysis")
      .then(setReports)
      .catch(() => setError("Backend unreachable."))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const report = await generateAnalysis();
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
          <h1 className="text-2xl font-bold">Life Analysis</h1>
          <p className="text-sm text-zinc-500">
            The serious, evidence-based read on your week.
          </p>
        </header>

        <button
          onClick={generate}
          disabled={generating || loading}
          className="rounded-2xl bg-violet-600 py-3.5 font-semibold transition active:scale-[0.98] disabled:opacity-50"
        >
          {generating ? "Analysing your life…" : "Generate Analysis"}
        </button>

        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading && <p className="py-8 text-center text-zinc-500">Loading…</p>}

        {!loading && reports.length === 0 && !error && (
          <p className="rounded-2xl bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            No analyses yet. Generate your first one.
          </p>
        )}

        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </main>
  );
}
