export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaGoodWhen = "up",
}: {
  label: string;
  value: string | null;
  unit?: string;
  delta?: number | null;
  deltaGoodWhen?: "up" | "down";
}) {
  const showDelta = delta !== undefined && delta !== null && delta !== 0;
  const good = showDelta && (deltaGoodWhen === "up" ? delta! > 0 : delta! < 0);
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold text-white">
        {value ?? "—"}
        {value !== null && unit && (
          <span className="text-sm font-normal text-zinc-400"> {unit}</span>
        )}
      </span>
      {showDelta && (
        <span
          className={`text-xs ${good ? "text-[#0ca30c]" : "text-zinc-400"}`}
        >
          {delta! > 0 ? "▲" : "▼"} {Math.abs(delta!)} vs last week
        </span>
      )}
    </div>
  );
}
