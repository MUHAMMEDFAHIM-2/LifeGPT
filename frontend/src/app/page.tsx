"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">LifeGPT</h1>
      <p className="text-zinc-400">Your Life. Analysed. Predicted. Roasted.</p>
      <p className="text-sm">
        Backend: <span className="font-mono">{status}</span>
      </p>
    </main>
  );
}
