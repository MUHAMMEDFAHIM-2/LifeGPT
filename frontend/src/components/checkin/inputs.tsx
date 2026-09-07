"use client";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function RatingSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-violet-400">{value}/10</span>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 0.5,
  max = 24,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 flex-1 min-w-[8rem]">
      <span className="text-sm text-zinc-300">
        {label}
        {unit && <span className="text-zinc-500"> ({unit})</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="rounded-xl bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500"
      />
    </label>
  );
}

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 flex-1 min-w-[8rem]">
      <span className="text-sm text-zinc-300">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-zinc-800 px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]"
      />
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full"
    >
      <span className="text-sm text-zinc-300">{label}</span>
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${
          value ? "bg-violet-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  max = 30,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 rounded-full bg-zinc-800 text-lg text-zinc-300 active:bg-zinc-700"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-white">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-9 w-9 rounded-full bg-zinc-800 text-lg text-zinc-300 active:bg-zinc-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
