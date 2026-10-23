"use client";

import { AQI_COLORS, AQI_INK, AQI_LABELS, getAQICategory } from "@/lib/types";
import type { Outlook, StationOutlook } from "@/lib/outlook";

const DIRECTION_LABEL: Record<string, string> = {
  worsening: "Rising",
  improving: "Falling",
  steady: "Steady",
};

function directionInk(d: string): string {
  if (d === "worsening") return "var(--aqi-unhealthy-ink)";
  if (d === "improving") return "var(--aqi-good-ink)";
  return "var(--ink-2)";
}

/** Horizontal bar from current to projected, so the change reads at a glance. */
function Projection({ s, max }: { s: StationOutlook; max: number }) {
  const current = (s.current / max) * 100;
  const projected = s.projected === null ? current : (s.projected / max) * 100;
  const rising = s.projected !== null && s.projected > s.current;
  const lo = Math.min(current, projected);
  const hi = Math.max(current, projected);

  return (
    <div className="relative h-3 w-full" style={{ background: "var(--paper-sunk)" }}>
      <div
        className="absolute inset-y-0"
        style={{ left: 0, width: `${lo}%`, background: AQI_COLORS[getAQICategory(s.current)] }}
      />
      {s.projected !== null && hi > lo && (
        <div
          className="absolute inset-y-0"
          style={{
            left: `${lo}%`,
            width: `${hi - lo}%`,
            background: rising
              ? `repeating-linear-gradient(45deg, ${AQI_COLORS[getAQICategory(s.projected)]}, ${AQI_COLORS[getAQICategory(s.projected)]} 3px, transparent 3px, transparent 6px)`
              : "transparent",
            borderLeft: rising ? "none" : `2px solid ${AQI_COLORS[getAQICategory(s.projected)]}`,
            opacity: rising ? 0.85 : 1,
          }}
        />
      )}
    </div>
  );
}

export default function OutlookPanel({ outlook }: { outlook: Outlook | null }) {
  if (!outlook) return null;

  const max = Math.max(
    ...outlook.stations.map((s) => Math.max(s.current, s.projected ?? 0)),
    100
  );

  return (
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Where smog is heading — next {outlook.horizon_hours} hours
        </h3>
        {outlook.city_direction && outlook.city_rate !== null && (
          <span className="text-xs font-semibold" style={{ color: directionInk(outlook.city_direction) }}>
            Network {DIRECTION_LABEL[outlook.city_direction].toLowerCase()}
            {outlook.city_direction !== "steady" && ` ${outlook.city_rate > 0 ? "+" : ""}${outlook.city_rate}/hr`}
          </span>
        )}
      </div>

      {outlook.insufficient ? (
        <p className="text-sm px-5 py-10 text-center" style={{ color: "var(--ink-3)" }}>
          Not enough record yet to project. A direction needs at least four hourly readings per
          station; recording runs every 15 minutes, so this fills in through the day.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--paper-sunk)", borderBottom: "1px solid var(--rule)" }}>
                <th scope="col" className="field-label text-left px-5 py-2.5">Station</th>
                <th scope="col" className="field-label text-right px-5 py-2.5">Now</th>
                <th scope="col" className="field-label text-right px-5 py-2.5">+{outlook.horizon_hours}h</th>
                <th scope="col" className="field-label text-right px-5 py-2.5">Rate</th>
                <th scope="col" className="field-label text-left px-5 py-2.5 w-40 hidden md:table-cell">Change</th>
                <th scope="col" className="field-label text-left px-5 py-2.5">Basis</th>
              </tr>
            </thead>
            <tbody>
              {outlook.stations.map((s, i) => (
                <tr key={s.station_id} style={i === 0 ? undefined : { borderTop: "1px solid var(--rule)" }}>
                  <th scope="row" className="px-5 py-3 text-left text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {s.station_name}
                  </th>
                  <td className="px-5 py-3 text-right text-sm font-bold tabular" style={{ color: AQI_INK[getAQICategory(s.current)] }}>
                    {s.current}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.projected === null ? (
                      <span className="text-xs" style={{ color: "var(--ink-3)" }}>—</span>
                    ) : (
                      <span className="text-sm font-bold tabular" style={{ color: AQI_INK[getAQICategory(s.projected)] }}>
                        {s.projected}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-sm tabular font-semibold" style={{ color: directionInk(s.direction) }}>
                    {s.projected === null ? "—" : `${s.rate > 0 ? "+" : ""}${s.rate}`}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <Projection s={s} max={max} />
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                      {s.basis_hours}h
                      {s.projected !== null && (
                        <> · fit {s.fit < 0.4 ? "weak" : s.fit < 0.7 ? "fair" : "strong"}</>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {outlook.spread && (
        <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)" }}>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            <span className="font-semibold" style={{ color: AQI_INK[getAQICategory(outlook.spread.high.current)] }}>
              Worst now: {outlook.spread.high.station_name} at {outlook.spread.high.current}
            </span>
            <span style={{ color: "var(--ink-3)" }}> · </span>
            <span style={{ color: AQI_INK[getAQICategory(outlook.spread.low.current)] }}>
              Best: {outlook.spread.low.station_name} at {outlook.spread.low.current}
            </span>
            <span style={{ color: "var(--ink-3)" }}>
              {" "}— a {outlook.spread.high.current - outlook.spread.low.current} point spread
              {" "}({AQI_LABELS[getAQICategory(outlook.spread.high.current)]} against{" "}
              {AQI_LABELS[getAQICategory(outlook.spread.low.current)]})
            </span>
          </p>
        </div>
      )}

      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Projection extrapolates each station&apos;s own recent hours and assumes they continue. It
          is not a meteorological forecast: a wind shift, rainfall or an inversion breaking can
          reverse it within the hour. Fit states how well a straight line described the hours
          behind each projection — treat a weak fit as direction only, not a number.
        </p>
      </div>
    </section>
  );
}
