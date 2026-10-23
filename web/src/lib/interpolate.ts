/**
 * Inverse-distance weighting over the station readings.
 *
 * This produces a continuous surface from a handful of points. With five
 * stations across a district it is a rough visual interpolation, not a
 * measurement: it says what the readings imply between the monitors, and the
 * confidence falls away sharply with distance from one. Everything drawn from
 * it is labelled as interpolated for that reason.
 */
export interface SamplePoint {
  x: number;
  y: number;
  value: number;
}

/** Power of 2 makes influence fall with the square of distance. */
const POWER = 2;

/**
 * Value at (px, py) weighted by inverse squared distance to each sample.
 * Returns the exact sample value when the point sits on one.
 */
export function idw(px: number, py: number, samples: SamplePoint[]): number {
  let numerator = 0;
  let denominator = 0;

  for (const s of samples) {
    const dx = px - s.x;
    const dy = py - s.y;
    const d2 = dx * dx + dy * dy;

    if (d2 < 1) return s.value;

    const w = 1 / Math.pow(d2, POWER / 2);
    numerator += w * s.value;
    denominator += w;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Distance in pixels from (px, py) to the nearest sample. Used to fade the
 * surface out where there is no station near enough to support it.
 */
export function distanceToNearest(px: number, py: number, samples: SamplePoint[]): number {
  let best = Infinity;
  for (const s of samples) {
    const dx = px - s.x;
    const dy = py - s.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

/** AQI category colour as rgb triplets, for painting into a canvas. */
export const AQI_RGB: [number, number, number][] = [
  [34, 197, 94], // good
  [252, 211, 77], // moderate
  [251, 146, 60], // unhealthy for sensitive
  [225, 29, 72], // unhealthy
  [167, 139, 250], // very unhealthy
  [219, 39, 119], // hazardous
];

const BREAKS = [50, 100, 150, 200, 300, 500];

/** Colour for an AQI value, interpolated across the band boundary. */
export function aqiRgb(aqi: number): [number, number, number] {
  const v = Math.max(0, Math.min(aqi, 500));

  let band = BREAKS.findIndex((b) => v <= b);
  if (band === -1) band = BREAKS.length - 1;

  const lower = band === 0 ? 0 : BREAKS[band - 1];
  const upper = BREAKS[band];
  const t = upper === lower ? 0 : (v - lower) / (upper - lower);

  const from = AQI_RGB[band];
  const to = AQI_RGB[Math.min(band + 1, AQI_RGB.length - 1)];

  // Blend only in the top fifth of a band, so each band keeps its identity
  // while the surface still reads as continuous.
  const blend = t < 0.8 ? 0 : (t - 0.8) / 0.2;

  return [
    Math.round(from[0] + (to[0] - from[0]) * blend),
    Math.round(from[1] + (to[1] - from[1]) * blend),
    Math.round(from[2] + (to[2] - from[2]) * blend),
  ];
}
