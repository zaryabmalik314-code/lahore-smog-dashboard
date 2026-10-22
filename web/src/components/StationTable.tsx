"use client";

import { AQI_COLORS, AQI_LABELS, SOURCE_TIER_LABELS, type SourceTier, type Station } from "@/lib/types";

interface StationTableProps {
  stations: Station[];
}

const TIER_STYLE: Record<SourceTier, { bg: string; fg: string; border: string }> = {
  official: { bg: "rgba(16,185,129,0.10)", fg: "#34d399", border: "rgba(16,185,129,0.25)" },
  citizen: { bg: "rgba(59,130,246,0.10)", fg: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  reference: { bg: "rgba(113,113,122,0.12)", fg: "#a1a1aa", border: "rgba(113,113,122,0.25)" },
};

function formatAge(minutes: number): string {
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Value({ v, unit }: { v: number | null; unit?: string }) {
  if (v == null) {
    return <span className="text-zinc-700 text-xs" title="Not measured at this station">no sensor</span>;
  }
  return (
    <span className="text-zinc-400 tabular-nums text-xs">
      {v}
      {unit && <span className="text-zinc-600 ml-0.5">{unit}</span>}
    </span>
  );
}

export default function StationTable({ stations }: StationTableProps) {
  const sorted = [...stations].sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? 1 : -1;
    return (b.aqi || 0) - (a.aqi || 0);
  });
  const maxAqi = Math.max(...sorted.filter((s) => !s.stale).map((s) => s.aqi || 0), 1);
  const reporting = sorted.filter((s) => !s.stale).length;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/30 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Station Readings</h3>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
          {reporting} of {sorted.length} reporting
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Station</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">AQI</th>
              <th className="px-5 py-3 font-medium w-28 hidden lg:table-cell">Level</th>
              <th className="px-5 py-3 font-medium">PM2.5</th>
              <th className="px-5 py-3 font-medium hidden sm:table-cell">PM10</th>
              <th className="px-5 py-3 font-medium">Updated</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((station) => {
              const color = station.stale ? "#52525b" : AQI_COLORS[station.category];
              const pct = station.stale ? 0 : ((station.aqi || 0) / maxAqi) * 100;
              const tier = TIER_STYLE[station.tier];

              return (
                <tr
                  key={station.id}
                  className={`border-t border-zinc-800/20 transition-colors ${
                    station.stale ? "opacity-50" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-200 font-medium text-xs">
                      {station.name.replace(/, Pakistan$/, "")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: tier.bg, color: tier.fg, border: `1px solid ${tier.border}` }}
                      title={station.attribution}
                    >
                      {SOURCE_TIER_LABELS[station.tier]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-lg font-bold tabular-nums" style={{ color }}>
                      {station.stale ? "—" : station.aqi ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="relative h-1.5 bg-zinc-800/50 rounded-full overflow-hidden w-full">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Value v={station.stale ? null : station.pm25} /></td>
                  <td className="px-5 py-3.5 hidden sm:table-cell"><Value v={station.stale ? null : station.pm10} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs tabular-nums ${station.stale ? "text-red-400/70" : "text-zinc-500"}`}>
                      {formatAge(station.age_minutes)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {station.stale ? (
                      <span className="text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide bg-red-500/10 text-red-400/80 border border-red-500/20">
                        Not reporting
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: color + "12", color, border: `1px solid ${color}20` }}
                      >
                        {AQI_LABELS[station.category]}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
