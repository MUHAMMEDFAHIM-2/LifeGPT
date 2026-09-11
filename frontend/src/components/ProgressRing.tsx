export function ProgressRing({
  value,
  size = 160,
  stroke = 12,
  label,
}: {
  /** 0-100, or null to show a placeholder ring. */
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value ?? 0;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={stroke}
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: "drop-shadow(0 0 6px rgba(34, 197, 94, 0.65))",
              transition: "stroke-dashoffset 0.6s ease",
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-bold text-white">
          {value !== null ? `${value}%` : "—"}
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wide text-zinc-500 text-center px-4">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
