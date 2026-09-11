"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { askLifeGPT, type ChatTurn } from "@/lib/api";

const SUGGESTIONS = [
  "Should I go to bed now?",
  "How is my sleep lately?",
  "Am I going to the gym tomorrow?",
  "What should I improve first?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking) return;
    setInput("");
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setThinking(true);
    try {
      const res = await askLifeGPT(message, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach my brain (the backend). Try again in a moment.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="mx-auto w-full max-w-md flex flex-col flex-1 px-4 pt-6 pb-32">
        <header className="pb-4">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← LifeGPT
          </Link>
          <h1 className="text-2xl font-bold">Ask LifeGPT</h1>
          <p className="text-sm text-zinc-500">
            It knows your data. Ask accordingly.
          </p>
        </header>

        {messages.length === 0 && (
          <div className="flex flex-col gap-2 py-6">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-300 transition active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end bg-green-600 text-white"
                  : "self-start bg-zinc-900 text-zinc-200"
              }`}
            >
              {m.content}
            </div>
          ))}
          {thinking && (
            <div className="self-start rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
              Consulting your data…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-5 pt-8"
      >
        <div className="mx-auto flex max-w-md gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your life…"
            className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="rounded-2xl bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] px-5 font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </form>
    </main>
  );
}
