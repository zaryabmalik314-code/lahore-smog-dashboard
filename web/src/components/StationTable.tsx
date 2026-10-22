"use client";

import { AQI_COLORS, AQI_LABELS, type Station } from "@/lib/types";

interface StationTableProps {
  stations: Station[];
}

export default function StationTable({ stations }: StationTableProps) {
  const sorted = [...stations].sort((a, b) => (b.aqi || 0) - (a.aqi || 0));
  const maxAqi = Math.max(...sorted.map(s => s.aqi || 0), 1);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/30 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Station Readings</h3>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{sorted.length} stations</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Station</th>
              <th className="px-5 py-3 font-medium">AQI</th>
              <th className="px-5 py-3 font-medium w-32 hidden sm:table-cell">Level</th>
              <th className="px-5 py-3 font-medium">PM2.5</th>
              <th className="px-5 py-3 font-medium">PM10</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">Temp</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">Humidity</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((station) => {
              const color = AQI_COLORS[station.category];
              const pct = ((station.aqi || 0) / maxAqi) * 100;

              return (
                <tr
                  key={station.id}
                  className="border-t border-zinc-800/20 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-200 font-medium text-xs">{station.name.replace(/, Pakistan$/, "")}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-lg font-bold tabular-nums" style={{ color }}>
                      {station.aqi ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="relative h-1.5 bg-zinc-800/50 rounded-full overflow-hidden w-full">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}99, ${color})`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 tabular-nums text-xs">
                    {station.pm25 ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 tabular-nums text-xs">
                    {station.pm10 ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 tabular-nums text-xs hidden md:table-cell">
                    {station.temperature != null ? `${station.temperature}C` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 tabular-nums text-xs hidden md:table-cell">
                    {station.humidity != null ? `${station.humidity}%` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: color + "12",
                        color: color,
                        border: `1px solid ${color}20`,
                      }}
                    >
                      {AQI_LABELS[station.category]}
                    </span>
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
