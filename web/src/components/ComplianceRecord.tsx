"use client";

import { AQI_COLORS, AQI_INK, getAQICategory } from "@/lib/types";

export interface DayPoint {
  day: string;
  mean: number;
  peak: number;
  low: number;
  samples: number;
}

/**
 * The record rather than the moment.
 *
 * An index number says what the air is doing now; a count of days above the
 * limit is what a compliance or accountability conversation runs on.
 */
export default function ComplianceRecord({ days }: { days: DayPoint[] }) {
  if (days.length === 0) return null;

  // Both standards, since NEQS is what is enforceable and WHO is the
  // health-based target — a reader needs to see the gap between them.
  const overNeqs = days.filter((d) => d.mean > 100).length;
  const overWho = days.filter((d) => d.mean > 50).length;
  const worst = days.reduce((a, b) => (b.peak > a.peak ? b : a));
  const max = Math.max(...days.map((d) => d.peak), 100);

  return (
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          The record so far
        </h3>
        <span className="field-label">
          {days.length} day{days.length === 1 ? "" : "s"} on record
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3" >
        {[
          { label: "Days above AQI 100", value: `${overNeqs} of ${days.length}`, tone: overNeqs > 0 ? "var(--aqi-unhealthy-sensitive-ink)" : undefined },
          { label: "Days above AQI 50", value: `${overWho} of ${days.length}`, tone: overWho > 0 ? "var(--aqi-unhealthy-ink)" : undefined },
          { label: "Worst day", value: `${worst.peak} on ${worst.day}`, tone: AQI_INK[getAQICategory(worst.peak)] },
        ].map((c, i) => (
          <div
            key={c.label}
            className="px-5 py-4"
            style={{
              borderLeft: i > 0 ? "1px solid var(--panel-border)" : undefined,
              borderBottom: "1px solid var(--panel-border)",
            }}
          >
            <p className="field-label">{c.label}</p>
            <p className="text-xl font-bold tabular mt-1.5" style={{ color: c.tone || "var(--ink)" }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily range: low to peak, so a day's spread is visible not just its mean. */}
      <div className="px-5 py-4 overflow-x-auto">
        <div className="flex items-end gap-2 min-w-max" style={{ height: 120 }}>
          {days.map((d) => {
            const top = (d.peak / max) * 100;
            const bottom = (d.low / max) * 100;
            return (
              <div key={d.day} className="flex flex-col items-center gap-1.5" style={{ width: 42 }}>
                <span className="text-[10px] tabular" style={{ color: AQI_INK[getAQICategory(d.peak)] }}>
                  {d.peak}
                </span>
                <div className="relative w-full" style={{ height: 76, background: "var(--paper-sunk)" }}>
                  <div
                    className="absolute w-full"
                    style={{
                      bottom: `${bottom}%`,
                      height: `${Math.max(top - bottom, 3)}%`,
                      background: AQI_COLORS[getAQICategory(d.mean)],
                      borderRadius: 3,
                    }}
                    title={`${d.day}: mean ${d.mean}, ${d.low}–${d.peak} from ${d.samples} stations`}
                  />
                </div>
                <span className="text-[9px]" style={{ color: "var(--ink-3)" }}>
                  {d.day.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid var(--panel-border)", background: "var(--paper-sunk)" }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Each bar spans a day&apos;s lowest to highest hourly reading, coloured by its mean. Counts
          are against daily mean index, not the 24-hour concentration a formal compliance finding
          would use, and cover only the days recorded here — recording began recently, so this is
          a growing record rather than a historical one.
        </p>
      </div>
    </section>
  );
}
