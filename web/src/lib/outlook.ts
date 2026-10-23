import type { StationSeries } from "./history";

export type Direction = "worsening" | "improving" | "steady";

export interface StationOutlook {
  station_id: string;
  station_name: string;
  tier: string;
  current: number;
  /** AQI points per hour, from a least-squares fit over the window. */
  rate: number;
  direction: Direction;
  /** Projected AQI at +3h, or null when the record is too short to project. */
  projected: number | null;
  /** Hours of record the fit is based on. */
  basis_hours: number;
  /** 0–1. How well a straight line describes the window; low means noisy. */
  fit: number;
}

export interface Outlook {
  horizon_hours: number;
  /** Stations with enough record to project, worst projected first. */
  stations: StationOutlook[];
  city_rate: number | null;
  city_direction: Direction | null;
  /** Highest and lowest current readings, for the spatial spread. */
  spread: { high: StationOutlook; low: StationOutlook } | null;
  /** True when no station has enough record yet. */
  insufficient: boolean;
}

/** Points per hour below which a change is not worth calling a direction. */
const STEADY_BAND = 3;
/** A straight line needs at least this many hourly points to mean anything. */
const MIN_POINTS = 4;
const HORIZON_HOURS = 3;

/**
 * Least-squares slope and coefficient of determination over evenly spaced
 * hourly points. Returns the slope in AQI points per hour.
 */
function fitLine(values: number[]): { slope: number; r2: number } {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - meanX) * (values[i] - meanY);
    sxx += (i - meanX) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = meanY + slope * (i - meanX);
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, r2 };
}

function classify(rate: number): Direction {
  if (rate > STEADY_BAND) return "worsening";
  if (rate < -STEADY_BAND) return "improving";
  return "steady";
}

/**
 * Short-horizon outlook built only from this network's own stored readings.
 *
 * This is trend extrapolation, not a meteorological forecast: it assumes the
 * last few hours continue, which holds over a few hours in a stable airshed
 * and fails at inversion break-up, rainfall or a wind shift. It is deliberately
 * capped at a few hours for that reason, and every projection carries the
 * number of hours behind it and how well a line actually fit them.
 */
export function buildOutlook(series: StationSeries[]): Outlook {
  const stations: StationOutlook[] = [];

  for (const s of series) {
    const values = s.points.map((p) => p.aqi);
    if (values.length < MIN_POINTS) {
      const current = values.length ? values[values.length - 1] : 0;
      stations.push({
        station_id: s.station_id,
        station_name: s.station_name.replace(/, Pakistan$/, ""),
        tier: s.tier,
        current,
        rate: 0,
        direction: "steady",
        projected: null,
        basis_hours: values.length,
        fit: 0,
      });
      continue;
    }

    const { slope, r2 } = fitLine(values);
    const current = values[values.length - 1];
    // The EPA scale is open-ended upward but cannot go below zero.
    const projected = Math.max(0, Math.round(current + slope * HORIZON_HOURS));

    stations.push({
      station_id: s.station_id,
      station_name: s.station_name.replace(/, Pakistan$/, ""),
      tier: s.tier,
      current,
      rate: Math.round(slope * 10) / 10,
      direction: classify(slope),
      projected,
      basis_hours: values.length,
      fit: Math.round(r2 * 100) / 100,
    });
  }

  const projectable = stations.filter((s) => s.projected !== null);

  const cityRate = projectable.length
    ? Math.round((projectable.reduce((a, s) => a + s.rate, 0) / projectable.length) * 10) / 10
    : null;

  const ranked = [...stations].sort((a, b) => (b.projected ?? b.current) - (a.projected ?? a.current));
  const byCurrent = [...stations].sort((a, b) => b.current - a.current);

  return {
    horizon_hours: HORIZON_HOURS,
    stations: ranked,
    city_rate: cityRate,
    city_direction: cityRate === null ? null : classify(cityRate),
    spread:
      byCurrent.length >= 2
        ? { high: byCurrent[0], low: byCurrent[byCurrent.length - 1] }
        : null,
    insufficient: projectable.length === 0,
  };
}
