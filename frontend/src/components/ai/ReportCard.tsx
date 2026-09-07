import type { AIReport } from "@/lib/api";

export function ReportCard({ report }: { report: AIReport }) {
  const when = new Date(report.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return (
    <article className="rounded-2xl bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>
          {when} · {report.days_of_data}{" "}
          {report.days_of_data === 1 ? "day" : "days"} of data
        </span>
        {report.intensity && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 uppercase tracking-wide">
            {report.intensity === "nuclear" ? "☢ destroy me" : report.intensity}
          </span>
        )}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {report.content}
      </div>
    </article>
  );
}
