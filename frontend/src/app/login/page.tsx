"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold">LifeGPT</h1>
          <p className="text-sm text-zinc-500">Your life. Locked.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-2xl bg-zinc-900 px-4 py-3.5 text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-green-500"
        />
        {error && (
          <p className="rounded-xl bg-red-500/15 px-4 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="rounded-2xl bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] py-3.5 font-semibold transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
