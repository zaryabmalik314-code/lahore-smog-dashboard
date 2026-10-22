"use client";

import type { Station } from "@/lib/types";

interface PollutantBreakdownProps {
  stations: Station[];
  measured: string[];
}

const POLLUTANTS = [
  { key: "pm25" as const, name: "PM2.5", limit: 15, unit: "ug/m3", who: "WHO 24hr", color: "#ef4444" },
  { key: "pm10" as const, name: "PM10", limit: 45, unit: "ug/m3", who: "WHO 24hr", color: "#f97316" },
  { key: "no2" as const, name: "NO2", limit: 25, unit: "ug/m3", who: "WHO annual", color: "#eab308" },
  { key: "so2" as const, name: "SO2", limit: 40, unit: "ug/m3", who: "WHO 24hr", color: "#a855f7" },
  { key: "co" as const, name: "CO", limit: 4, unit: "mg/m3", who: "WHO 24hr", color: "#06b6d4" },
  { key: "o3" as const, name: "O3", limit: 100, unit: "ug/m3", who: "WHO 8hr", color: "#22c55e" },
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
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-zinc-300">Pollutant Levels vs WHO Limits</h3>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Network Avg</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center">
          No pollutant concentrations are being reported by the network right now.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => {
            const { value, n } = p.stat!;
            const pct = Math.min((value / maxVal) * 100, 100);
            const limitPct = Math.min((p.limit / maxVal) * 100, 100);
            const exceeds = value > p.limit;

            return (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-zinc-400">{p.name}</span>
                    <span className="text-[9px] text-zinc-600">{n} station{n === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold tabular-nums ${exceeds ? "text-red-400" : "text-zinc-300"}`}>
                      {value}
                    </span>
                    <span className="text-[10px] text-zinc-600">{p.unit}</span>
                    {exceeds && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold">
                        {Math.round(value / p.limit)}x
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${p.color}cc, ${p.color})`,
                      boxShadow: exceeds ? `0 0 8px ${p.color}40` : "none",
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-px"
                    style={{ left: `${limitPct}%`, background: "#ffffff30" }}
                    title={`WHO ${p.who}: ${p.limit} ${p.unit}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-zinc-800/30">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-white/20" />
          <span className="text-[10px] text-zinc-600">WHO safe limit</span>
        </div>
        {notMeasured.length > 0 && (
          <span className="text-[10px] text-zinc-600">
            Not measured by this network: {notMeasured.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
