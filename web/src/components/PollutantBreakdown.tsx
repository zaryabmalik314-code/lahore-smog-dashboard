"use client";

import type { Station } from "@/lib/types";

interface PollutantBreakdownProps {
  stations: Station[];
  measured: string[];
}

const POLLUTANTS = [
  { key: "pm25" as const, name: "PM2.5", limit: 15, unit: "µg/m³", who: "24-hour", color: "#9e1414" },
  { key: "pm10" as const, name: "PM10", limit: 45, unit: "µg/m³", who: "24-hour", color: "#d1500a" },
  { key: "no2" as const, name: "NO₂", limit: 25, unit: "µg/m³", who: "annual", color: "#8a6500" },
  { key: "so2" as const, name: "SO₂", limit: 40, unit: "µg/m³", who: "24-hour", color: "#6b21a8" },
  { key: "co" as const, name: "CO", limit: 4, unit: "mg/m³", who: "24-hour", color: "#0f766e" },
  { key: "o3" as const, name: "O₃", limit: 100, unit: "µg/m³", who: "8-hour", color: "#1a7f37" },
];

/** Average across only the stations that actually report this pollutant. */
function avg(stations: Station[], key: keyof Station): { value: number; n: number } | null {
  const vals = stations
    .map((s) => s[key])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return { value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), n: vals.length };
}

export default function PollutantBreakdown({ stations, measured }: PollutantBreakdownProps) {
  const rows = POLLUTANTS.map((p) => ({ ...p, stat: avg(stations, p.key) })).filter(
    (p) => measured.includes(p.key) && p.stat !== null
  );

  const notMeasured = POLLUTANTS.filter((p) => !measured.includes(p.key)).map((p) => p.name);
  const maxVal = Math.max(...rows.map((r) => r.stat!.value), 1);

  return (
    <section className="panel flex flex-col">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Concentrations against WHO guidelines
        </h3>
        <span className="field-label">Network mean</span>
      </div>

      <div className="p-5 flex-1">
        {rows.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--ink-3)" }}>
            No pollutant concentrations are being reported by the network.
          </p>
        ) : (
          <div className="space-y-5">
            {rows.map((p) => {
              const { value, n } = p.stat!;
              const pct = Math.min((value / maxVal) * 100, 100);
              const limitPct = Math.min((p.limit / maxVal) * 100, 100);
              const exceeds = value > p.limit;

              return (
                <div key={p.key}>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                        {p.name}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>
                        {n} station{n === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold tabular" style={{ color: "var(--ink)" }}>
                        {value}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>{p.unit}</span>
                      {exceeds && (
                        <span
                          className="text-[10px] font-bold tabular"
                          style={{ color: "var(--aqi-unhealthy-ink)" }}
                        >
                          {Math.round(value / p.limit)}× limit
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative h-3" style={{ background: "var(--paper-sunk)" }}>
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: p.color }}
                      title={`${p.name}: ${value} ${p.unit}`}
                    />
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        left: `${limitPct}%`,
                        width: "2px",
                        background: "var(--ink)",
                        marginLeft: "-1px",
                      }}
                      title={`WHO ${p.who} guideline: ${p.limit} ${p.unit}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span style={{ width: "2px", height: "11px", background: "var(--ink)" }} />
          <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>
            WHO guideline value
          </span>
        </div>
        {notMeasured.length > 0 && (
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            Not measured by this network: {notMeasured.join(", ")}.
          </p>
        )}
      </div>
    </section>
  );
}
