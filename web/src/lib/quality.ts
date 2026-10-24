import type { Station } from "./types";
import type { StationSeries } from "./history";

export type FlagKind = "outlier" | "flatlined" | "implausible" | "pm-inversion";

export interface QualityFlag {
  station_id: string;
  station_name: string;
  kind: FlagKind;
  detail: string;
  /** Whether the reading should be treated with suspicion, not excluded. */
  severity: "warning" | "info";
}

/**
 * Checks that catch a sensor misbehaving rather than the air being bad.
 *
 * Two of this network's stations are low-cost citizen sensors, which drift,
 * stick and occasionally report nonsense. Every figure on the bulletin rests
 * on the claim that the readings are defensible, and this is the way that
 * claim fails in public. Flagged readings are surfaced rather than dropped:
 * silently discarding data a department can see on another site is worse than
 * showing it with a caveat.
 */

/** A reading this far above the median of the others is suspect. */
const OUTLIER_FACTOR = 2.2;
/** Minimum absolute gap before the factor matters, so low values aren't flagged. */
const OUTLIER_FLOOR = 60;
/** Readings varying by less than this across the window look stuck. */
const FLAT_RANGE = 2;
/** Hours of record needed before a flatline means anything. */
const FLAT_MIN_HOURS = 5;
/** Above this, a PM2.5 reading is beyond what these instruments report credibly. */
const IMPLAUSIBLE_PM25 = 1000;

/** Stations arrive as plain JSON, so this is a function not a method. */
function cleanName(name: string): string {
  return name.replace(/, Pakistan$/, "");
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function checkQuality(
  stations: Station[],
  series: StationSeries[] = []
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const reporting = stations.filter((s) => !s.stale && typeof s.aqi === "number");

  for (const s of reporting) {
    const name = cleanName(s.name);

    // Spatial outlier: compared against the median of the others, so one bad
    // sensor cannot drag the baseline it is being judged against.
    const others = reporting.filter((o) => o.id !== s.id).map((o) => o.aqi as number);
    if (others.length >= 2) {
      const med = median(others);
      const value = s.aqi as number;
      if (value > med * OUTLIER_FACTOR && value - med >= OUTLIER_FLOOR) {
        flags.push({
          station_id: s.id,
          station_name: name,
          kind: "outlier",
          severity: "warning",
          detail:
            `Reading ${value} against a median of ${Math.round(med)} at the other stations. ` +
            "Either a genuine local source or a drifting sensor; the two cannot be separated from one reading.",
        });
      }
    }

    // A PM10 below PM2.5 is physically impossible — PM10 includes PM2.5.
    if (typeof s.pm25_ugm3 === "number" && typeof s.pm10_ugm3 === "number" && s.pm10_ugm3 < s.pm25_ugm3 * 0.9) {
      flags.push({
        station_id: s.id,
        station_name: name,
        kind: "pm-inversion",
        severity: "info",
        detail:
          `PM10 reads ${s.pm10_ugm3} µg/m³ against PM2.5 at ${s.pm25_ugm3}. PM10 includes the PM2.5 fraction, so it ` +
          "cannot be materially lower; this usually means the two are reported on different averaging periods.",
      });
    }

    if (typeof s.pm25_ugm3 === "number" && s.pm25_ugm3 > IMPLAUSIBLE_PM25) {
      flags.push({
        station_id: s.id,
        station_name: name,
        kind: "implausible",
        severity: "warning",
        detail: `PM2.5 of ${s.pm25_ugm3} µg/m³ is beyond what these instruments report credibly.`,
      });
    }
  }

  // A sensor reporting the same value hour after hour has stopped measuring.
  for (const s of series) {
    if (s.points.length < FLAT_MIN_HOURS) continue;
    const values = s.points.map((p) => p.aqi);
    const range = Math.max(...values) - Math.min(...values);
    if (range <= FLAT_RANGE) {
      flags.push({
        station_id: s.station_id,
        station_name: s.station_name.replace(/, Pakistan$/, ""),
        kind: "flatlined",
        severity: "warning",
        detail:
          `Varied by ${range} point${range === 1 ? "" : "s"} across ${s.points.length} hours. ` +
          "Air quality does not hold that steady; the sensor has most likely stuck.",
      });
    }
  }

  return flags;
}
