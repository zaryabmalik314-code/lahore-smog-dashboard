"use client";

import { AQI_COLORS, AQI_LABELS, type Station } from "@/lib/types";

interface StationTableProps {
  stations: Station[];
}

export default function StationTable({ stations }: StationTableProps) {
  const sorted = [...stations].sort((a, b) => (b.aqi || 0) - (a.aqi || 0));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">Station Readings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 text-xs">
              <th className="px-5 py-3 font-medium">Station</th>
              <th className="px-5 py-3 font-medium">AQI</th>
              <th className="px-5 py-3 font-medium">PM2.5</th>
              <th className="px-5 py-3 font-medium">PM10</th>
              <th className="px-5 py-3 font-medium">Temp</th>
              <th className="px-5 py-3 font-medium">Humidity</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((station) => (
              <tr
                key={station.id}
                className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-5 py-3 text-zinc-200">{station.name}</td>
                <td className="px-5 py-3">
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: AQI_COLORS[station.category] }}
                  >
                    {station.aqi ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-400 tabular-nums">
                  {station.pm25 ?? "—"}
                </td>
                <td className="px-5 py-3 text-zinc-400 tabular-nums">
                  {station.pm10 ?? "—"}
                </td>
                <td className="px-5 py-3 text-zinc-400 tabular-nums">
                  {station.temperature != null ? `${station.temperature}°C` : "—"}
                </td>
                <td className="px-5 py-3 text-zinc-400 tabular-nums">
                  {station.humidity != null ? `${station.humidity}%` : "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: AQI_COLORS[station.category] + "20",
                      color: AQI_COLORS[station.category],
                    }}
                  >
                    {AQI_LABELS[station.category]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
