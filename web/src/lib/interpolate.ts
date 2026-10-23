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

/**
 * Heat ramp keyed to the index breakpoints.
 *
 * Continuous rather than banded: a heat surface is read for where it is hot,
 * and hard band edges across open ground imply a boundary the data cannot
 * support. The band colours remain the anchors, so a point still lands on the
 * colour its category would give it.
 */
const STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [16, 150, 90] },
  { at: 50, rgb: [34, 197, 94] },
  { at: 100, rgb: [250, 204, 21] },
  { at: 150, rgb: [249, 115, 22] },
  { at: 200, rgb: [225, 29, 72] },
  { at: 300, rgb: [190, 18, 60] },
  { at: 500, rgb: [136, 19, 55] },
];

export function aqiRgb(aqi: number): [number, number, number] {
  const v = Math.max(0, Math.min(aqi, 500));

  let i = STOPS.findIndex((s) => v <= s.at);
  if (i <= 0) i = v <= 0 ? 1 : STOPS.length - 1;

  const lo = STOPS[i - 1];
  const hi = STOPS[i];
  const t = hi.at === lo.at ? 0 : (v - lo.at) / (hi.at - lo.at);

  return [
    Math.round(lo.rgb[0] + (hi.rgb[0] - lo.rgb[0]) * t),
    Math.round(lo.rgb[1] + (hi.rgb[1] - lo.rgb[1]) * t),
    Math.round(lo.rgb[2] + (hi.rgb[2] - lo.rgb[2]) * t),
  ];
}

/**
 * How strongly to paint a value.
 *
 * Clean air is nearly transparent and bad air is close to opaque, so the
 * surface reads as heat rather than as a flat choropleth — the eye goes to
 * the worst areas without having to decode the colour.
 */
export function aqiIntensity(aqi: number): number {
  const v = Math.max(0, Math.min(aqi, 400));
  // Ramps from almost nothing at 40 to full weight by 250.
  const t = Math.max(0, Math.min((v - 40) / 210, 1));
  // Eased so the mid range still shows rather than climbing linearly.
  return 0.14 + 0.72 * Math.pow(t, 0.75);
}
