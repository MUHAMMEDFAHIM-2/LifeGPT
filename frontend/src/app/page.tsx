"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-10 flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">LifeGPT</h1>
          <p className="text-zinc-400">Your Life. Analysed. Predicted. Roasted.</p>
        </header>

        <nav className="flex flex-col gap-3">
          <Link
            href="/checkin"
            className="rounded-2xl bg-violet-600 p-5 font-semibold transition active:scale-[0.98]"
          >
            Daily Check-In
            <span className="block text-sm font-normal text-violet-200">
              Log today in under a minute
            </span>
          </Link>
          <Link
            href="/history"
            className="rounded-2xl bg-zinc-900 p-5 font-semibold transition active:scale-[0.98]"
          >
            History
            <span className="block text-sm font-normal text-zinc-400">
              Everything LifeGPT knows so far
            </span>
          </Link>
        </nav>

        <p className="text-xs text-zinc-600">
          Backend: <span className="font-mono">{status}</span>
        </p>
      </div>
    </main>
  );
}
