"use client";

import { AQI_COLORS, AQI_LABELS, getAQICategory, type AQICategory } from "@/lib/types";
import type { Outlook } from "@/lib/outlook";

const BANDS: { max: number; category: AQICategory; short: string }[] = [
  { max: 50, category: "good", short: "0" },
  { max: 100, category: "moderate", short: "51" },
  { max: 150, category: "unhealthy_sensitive", short: "101" },
  { max: 200, category: "unhealthy", short: "151" },
  { max: 300, category: "very_unhealthy", short: "201" },
  { max: 500, category: "hazardous", short: "301" },
];

/** Where a value sits on the 0–500 scale, as a percentage. */
function markerPosition(aqi: number): number {
  const clamped = Math.min(Math.max(aqi, 0), 500);
  // Each band occupies an equal sixth of the bar, so the pointer tracks the
  // band rather than the raw number — which is how the scale is read.
  const i = BANDS.findIndex((b) => clamped <= b.max);
  const band = i === -1 ? BANDS.length - 1 : i;
  const lower = band === 0 ? 0 : BANDS[band - 1].max;
  const within = (clamped - lower) / (BANDS[band].max - lower);
  return ((band + within) / BANDS.length) * 100;
}

export function AQIScale({ value }: { value: number }) {
  return (
    <div>
      <div className="flex gap-0.5">
        {BANDS.map((b) => (
          <div key={b.short} className="scale-seg" style={{ background: AQI_COLORS[b.category] }} />
        ))}
      </div>
      <div className="relative h-3 mt-1">
        <div
          className="absolute top-0 -translate-x-1/2 text-[9px] font-bold tabular"
          style={{ left: `${markerPosition(value)}%`, color: "var(--ink)" }}
        >
          ▲
        </div>
      </div>
      <div className="flex justify-between">
        {BANDS.map((b) => (
          <span key={b.short} className="text-[9px] tabular" style={{ color: "var(--ink-3)" }}>
            {b.short}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  value: number;
  reportingCount: number;
  whoMultiple: number | null;
  pm25Avg: number | null;
  outlook: Outlook | null;
  advisoryAction: string;
  advisoryMessage: string;
}

export default function AQIHero({
  value,
  reportingCount,
  whoMultiple,
  pm25Avg,
  outlook,
  advisoryAction,
  advisoryMessage,
}: Props) {
  const category = getAQICategory(value);
  const fill = AQI_COLORS[category];

  const trend =
    outlook?.city_direction && outlook.city_rate !== null && outlook.city_direction !== "steady"
      ? `${outlook.city_direction === "worsening" ? "Rising" : "Falling"} ${Math.abs(outlook.city_rate)}/hr`
      : outlook?.city_direction === "steady"
        ? "Holding steady"
        : null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-5">
      {/* Filled index panel — the single number the page exists to report. */}
      <div className="panel-filled p-6 flex flex-col" style={{ background: fill }}>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.82)" }}
        >
          Network air quality index
        </p>

        <div className="flex items-end gap-3 mt-3">
          <span
            className="font-bold tabular leading-[0.85]"
            style={{ fontSize: "76px", color: "#fff" }}
          >
            {value}
          </span>
          {trend && (
            <span
              className="text-xs font-semibold mb-2 px-2 py-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.22)", color: "#fff" }}
            >
              {trend}
            </span>
          )}
        </div>

        <p className="text-xl font-semibold mt-1" style={{ color: "#fff" }}>
          {AQI_LABELS[category]}
        </p>

        <div
          className="mt-4 pt-4 grid grid-cols-2 gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.22)" }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.75)" }}>
              Dominant
            </p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#fff" }}>
              PM2.5 {pm25Avg !== null ? `${pm25Avg} µg/m³` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.75)" }}>
              Vs WHO
            </p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#fff" }}>
              {whoMultiple !== null ? `${whoMultiple}× guideline` : "—"}
            </p>
          </div>
        </div>

        <p className="text-[10px] mt-3" style={{ color: "rgba(255,255,255,0.72)" }}>
          Mean of {reportingCount} reporting station{reportingCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Advisory + scale */}
      <div className="panel rule-top p-6 flex flex-col">
        <p className="field-label">Public health advisory</p>
        <h2 className="text-xl font-semibold mt-1.5" style={{ color: "var(--ink)" }}>
          {advisoryAction}
        </h2>
        <p className="text-sm mt-2 leading-relaxed max-w-2xl" style={{ color: "var(--ink-2)" }}>
          {advisoryMessage}
        </p>

        <div className="mt-auto pt-6">
          <p className="field-label mb-2">Index scale</p>
          <AQIScale value={value} />
        </div>
      </div>
    </section>
  );
}
