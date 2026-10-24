/**
 * Conversion between the US EPA AQI and the concentrations behind it.
 *
 * WAQI's `iaqi` fields are Individual AQI sub-indices, not µg/m³ — the feed's
 * headline `aqi` is exactly `iaqi[dominentpol]`. Treating them as
 * concentrations and comparing them to the WHO guideline or the NEQS limit
 * compares an index to a mass-per-volume figure, which means nothing.
 *
 * The AQI is piecewise linear over published breakpoints, so it inverts
 * exactly. Converting back gives real concentrations, which makes the
 * guideline comparisons meaningful again.
 *
 * Breakpoints are the US EPA tables that WAQI reports against. The PM2.5
 * table was revised in 2024; this uses the earlier one, which is what the
 * feed's values are consistent with. Stated because the choice changes the
 * number and a reader is entitled to know which table produced it.
 */

interface Breakpoint {
  aqiLow: number;
  aqiHigh: number;
  concLow: number;
  concHigh: number;
}

const PM25: Breakpoint[] = [
  { aqiLow: 0, aqiHigh: 50, concLow: 0.0, concHigh: 12.0 },
  { aqiLow: 51, aqiHigh: 100, concLow: 12.1, concHigh: 35.4 },
  { aqiLow: 101, aqiHigh: 150, concLow: 35.5, concHigh: 55.4 },
  { aqiLow: 151, aqiHigh: 200, concLow: 55.5, concHigh: 150.4 },
  { aqiLow: 201, aqiHigh: 300, concLow: 150.5, concHigh: 250.4 },
  { aqiLow: 301, aqiHigh: 400, concLow: 250.5, concHigh: 350.4 },
  { aqiLow: 401, aqiHigh: 500, concLow: 350.5, concHigh: 500.4 },
];

const PM10: Breakpoint[] = [
  { aqiLow: 0, aqiHigh: 50, concLow: 0, concHigh: 54 },
  { aqiLow: 51, aqiHigh: 100, concLow: 55, concHigh: 154 },
  { aqiLow: 101, aqiHigh: 150, concLow: 155, concHigh: 254 },
  { aqiLow: 151, aqiHigh: 200, concLow: 255, concHigh: 354 },
  { aqiLow: 201, aqiHigh: 300, concLow: 355, concHigh: 424 },
  { aqiLow: 301, aqiHigh: 400, concLow: 425, concHigh: 504 },
  { aqiLow: 401, aqiHigh: 500, concLow: 505, concHigh: 604 },
];

function invert(aqi: number, table: Breakpoint[]): number | null {
  if (!Number.isFinite(aqi) || aqi < 0) return null;

  // Above the top of the table the relationship is undefined, so say so
  // rather than extrapolating a number that looks authoritative.
  const top = table[table.length - 1];
  if (aqi > top.aqiHigh) return null;

  const bp = table.find((b) => aqi >= b.aqiLow && aqi <= b.aqiHigh) ?? table[0];
  const span = bp.aqiHigh - bp.aqiLow;
  const ratio = span === 0 ? 0 : (aqi - bp.aqiLow) / span;
  return bp.concLow + ratio * (bp.concHigh - bp.concLow);
}

/** PM2.5 concentration in µg/m³ for a PM2.5 sub-index. */
export function pm25Concentration(subIndex: number | null): number | null {
  if (subIndex === null) return null;
  const v = invert(subIndex, PM25);
  return v === null ? null : Math.round(v * 10) / 10;
}

/** PM10 concentration in µg/m³ for a PM10 sub-index. */
export function pm10Concentration(subIndex: number | null): number | null {
  if (subIndex === null) return null;
  const v = invert(subIndex, PM10);
  return v === null ? null : Math.round(v);
}
