"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/api";

const INK_MUTED = "#898781";
const GRID = "#2c2c2a";
const SERIES_1 = "#3987e5"; // blue — mood / sleep
const SERIES_2 = "#d95926"; // orange — productivity

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">{dayLabel(label ?? "")}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-zinc-300">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}: <span className="font-mono">{p.value ?? "—"}</span>
        </p>
      ))}
    </div>
  );
}

export function SleepChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={dayLabel}
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 12]}
          ticks={[0, 4, 8, 12]}
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff0d" }} />
        <Bar
          dataKey="sleep_duration"
          name="Sleep"
          fill={SERIES_1}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MoodProductivityChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 4, left: -22, bottom: 0 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            tick={{ fill: INK_MUTED, fontSize: 11 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tick={{ fill: INK_MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
          <Line
            dataKey="mood"
            name="Mood"
            stroke={SERIES_1}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES_1, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            dataKey="productivity"
            name="Productivity"
            stroke={SERIES_2}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES_2, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 px-1">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: SERIES_1 }}
          />
          Mood
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: SERIES_2 }}
          />
          Productivity
        </span>
      </div>
    </div>
  );
}
