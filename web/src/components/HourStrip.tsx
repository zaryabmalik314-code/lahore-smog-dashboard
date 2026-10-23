"use client";

import { AQI_COLORS, getAQICategory } from "@/lib/types";
import type { TrendPoint } from "@/lib/types";

/**
 * The trailing hours as a row of coloured chips.
 *
 * A line chart answers "what is the shape"; this answers "what was it at 14:00"
 * without reading an axis, which is the question someone scanning a bulletin
 * actually has.
 */
export default function HourStrip({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return null;

  return (
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Hour by hour
        </h3>
        <span className="field-label">
          {points.length} hour{points.length === 1 ? "" : "s"} on record
        </span>
      </div>

      <div className="px-5 py-4 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {points.map((p) => {
            const fill = AQI_COLORS[getAQICategory(p.aqi)];
            return (
              <div key={p.time} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] tabular" style={{ color: "var(--ink-3)" }}>
                  {p.time}
                </span>
                <div
                  className="chip flex items-center justify-center py-2 px-2"
                  style={{ background: fill }}
                  title={`${p.aqi} AQI from ${p.samples} station${p.samples === 1 ? "" : "s"}`}
                >
                  <span className="text-xs font-bold tabular" style={{ color: "#fff" }}>
                    {p.aqi}
                  </span>
                </div>
                <span className="text-[9px] tabular" style={{ color: "var(--ink-3)" }}>
                  {p.samples}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="px-5 py-2.5"
        style={{ borderTop: "1px solid var(--panel-border)", background: "var(--paper-sunk)" }}
      >
        <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
          Figure under each chip is the number of stations that contributed to that hour. Hours
          with no stored reading are absent rather than filled in.
        </p>
      </div>
    </section>
  );
}
