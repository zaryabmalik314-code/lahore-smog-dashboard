"use client";

import {
  AQI_COLORS,
  AQI_INK,
  AQI_LABELS,
  SOURCE_TIER_LABELS,
  type SourceTier,
  type Station,
} from "@/lib/types";

interface StationTableProps {
  stations: Station[];
}

const TIER_INK: Record<SourceTier, string> = {
  official: "var(--tier-official)",
  citizen: "var(--tier-citizen)",
  reference: "var(--tier-reference)",
};

function formatAge(minutes: number): string {
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  const months = Math.floor(days / 30);
  return `${months} mo`;
}

function Value({ v }: { v: number | null }) {
  if (v == null) {
    return (
      <span className="text-xs" style={{ color: "var(--ink-3)" }} title="Not measured at this station">
        no sensor
      </span>
    );
  }
  return <span className="tabular text-sm" style={{ color: "var(--ink)" }}>{v}</span>;
}

export default function StationTable({ stations }: StationTableProps) {
  const sorted = [...stations].sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? 1 : -1;
    return (b.aqi || 0) - (a.aqi || 0);
  });
  const maxAqi = Math.max(...sorted.filter((s) => !s.stale).map((s) => s.aqi || 0), 1);
  const reporting = sorted.filter((s) => !s.stale).length;

  return (
    <section className="panel overflow-hidden">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Station readings
        </h3>
        <span className="field-label">
          {reporting} of {sorted.length} reporting
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">
            Air quality readings by monitoring station, with source and reading age
          </caption>
          <thead>
            <tr style={{ background: "var(--paper-sunk)", borderBottom: "1px solid var(--rule)" }}>
              <th scope="col" className="field-label text-left px-5 py-2.5">Station</th>
              <th scope="col" className="field-label text-left px-5 py-2.5">Source</th>
              <th scope="col" className="field-label text-right px-5 py-2.5">AQI</th>
              <th scope="col" className="field-label text-left px-5 py-2.5 w-28 hidden lg:table-cell">
                Relative
              </th>
              <th scope="col" className="field-label text-right px-5 py-2.5">PM2.5</th>
              <th scope="col" className="field-label text-right px-5 py-2.5 hidden sm:table-cell">PM10</th>
              <th scope="col" className="field-label text-right px-5 py-2.5">Age</th>
              <th scope="col" className="field-label text-left px-5 py-2.5">Category</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((station, i) => {
              const ink = station.stale ? "var(--ink-3)" : AQI_INK[station.category];
              const mark = station.stale ? "var(--rule-strong)" : AQI_COLORS[station.category];
              const pct = station.stale ? 0 : ((station.aqi || 0) / maxAqi) * 100;

              return (
                <tr
                  key={station.id}
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid var(--rule)",
                    background: station.stale ? "var(--paper-sunk)" : undefined,
                  }}
                >
                  <th scope="row" className="px-5 py-3 text-left font-medium text-sm" style={{ color: "var(--ink)" }}>
                    {station.name.replace(/, Pakistan$/, "")}
                  </th>
                  <td className="px-5 py-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: TIER_INK[station.tier] }}
                      title={station.attribution}
                    >
                      {SOURCE_TIER_LABELS[station.tier]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-lg font-bold tabular" style={{ color: ink }}>
                      {station.stale ? "—" : station.aqi ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <div className="h-2 w-full" style={{ background: "var(--paper-sunk)" }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: mark }} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right"><Value v={station.stale ? null : station.pm25_ugm3} /></td>
                  <td className="px-5 py-3 text-right hidden sm:table-cell">
                    <Value v={station.stale ? null : station.pm10_ugm3} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className="text-xs tabular"
                      style={{ color: station.stale ? "var(--aqi-unhealthy-ink)" : "var(--ink-2)" }}
                    >
                      {formatAge(station.age_minutes)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold" style={{ color: ink }}>
                      {station.stale ? "Not reporting" : AQI_LABELS[station.category]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Concentrations in µg/m³. Age is the time since the station last published a reading;
          stations older than six hours are excluded from all aggregates on this page.
        </p>
      </div>
    </section>
  );
}
