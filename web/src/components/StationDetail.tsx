"use client";

import { AQI_COLORS, AQI_INK, AQI_LABELS, SOURCE_TIER_LABELS, getAQICategory, type SourceTier } from "@/lib/types";

export interface StationSeries {
  station_id: string;
  station_name: string;
  attribution: string;
  tier: string;
  points: { time: string; aqi: number }[];
  samples: number;
  peak: number | null;
  low: number | null;
  mean: number | null;
  above_neqs: number;
  above_who: number;
}

const TIER_INK: Record<string, string> = {
  official: "var(--tier-official)",
  citizen: "var(--tier-citizen)",
  reference: "var(--tier-reference)",
};

/** Area sparkline over the station's recorded hours. */
function Sparkline({ points, color }: { points: { time: string; aqi: number }[]; color: string }) {
  const w = 240;
  const h = 48;

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px]"
        style={{ width: w, height: h, background: "var(--paper-sunk)", color: "var(--ink-3)" }}
      >
        {points.length === 1 ? "one reading on record" : "no readings yet"}
      </div>
    );
  }

  const vals = points.map((p) => p.aqi);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const stepX = w / (points.length - 1);
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 10);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${y(p.aqi).toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const last = points[points.length - 1];

  return (
    <svg width={w} height={h} role="img" aria-label={`Trend from ${points[0].time} to ${last.time}`}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={w} cy={y(last.aqi)} r={2.5} fill={color} stroke="var(--paper-raised)" strokeWidth={1} />
    </svg>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
        {label}
      </dt>
      <dd className="text-sm font-semibold tabular mt-0.5" style={{ color: tone || "var(--ink)" }}>
        {value}
      </dd>
    </div>
  );
}

export default function StationDetail({ stations }: { stations: StationSeries[] }) {
  if (stations.length === 0) {
    return (
      <section className="panel">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--rule)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Station records
          </h3>
        </div>
        <p className="text-sm px-5 py-10 text-center" style={{ color: "var(--ink-3)" }}>
          No readings are on record yet. Each station appears here once it has published at
          least one reading since recording began.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Station records, past 24 hours
        </h3>
        <span className="field-label">{stations.length} on record</span>
      </div>

      <div>
        {stations.map((s, i) => {
          const category = getAQICategory(s.mean ?? 0);
          const mark = AQI_COLORS[category];
          const ink = AQI_INK[category];

          return (
            <div
              key={s.station_id}
              className="px-5 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px_minmax(0,320px)] gap-5 items-center"
              style={i === 0 ? undefined : { borderTop: "1px solid var(--rule)" }}
            >
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {s.station_name.replace(/, Pakistan$/, "")}
                  </h4>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: TIER_INK[s.tier] || TIER_INK.reference }}
                  >
                    {SOURCE_TIER_LABELS[s.tier as SourceTier] || "Reference"}
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: "var(--ink-3)" }}>
                  {s.attribution}
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: ink }}>
                  Mean {s.mean ?? "—"} · {AQI_LABELS[category]}
                </p>
              </div>

              <Sparkline points={s.points} color={mark} />

              <dl className="grid grid-cols-4 gap-3">
                <Stat label="Peak" value={s.peak != null ? String(s.peak) : "—"} tone={ink} />
                <Stat label="Low" value={s.low != null ? String(s.low) : "—"} />
                <Stat
                  label="Over NEQS"
                  value={`${s.above_neqs}/${s.samples}`}
                  tone={s.above_neqs > 0 ? "var(--aqi-unhealthy-ink)" : undefined}
                />
                <Stat
                  label="Over WHO"
                  value={`${s.above_who}/${s.samples}`}
                  tone={s.above_who > 0 ? "var(--aqi-unhealthy-ink)" : undefined}
                />
              </dl>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Exceedance counts are hours on record above the PM2.5 limit, not hours elapsed. A
          station that stops reporting contributes no hours rather than being counted compliant.
          NEQS 24-hour limit 35 µg/m³; WHO 2021 24-hour guideline 15 µg/m³.
        </p>
      </div>
    </section>
  );
}
