export type SourceTier = "official" | "citizen" | "reference";

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number | null;
  /** PM2.5 AQI sub-index as the feed reports it — an index, not a concentration. */
  pm25: number | null;
  /** PM10 AQI sub-index. */
  pm10: number | null;
  /** PM2.5 in µg/m³, derived by inverting the EPA AQI. */
  pm25_ugm3: number | null;
  /** PM10 in µg/m³, derived by inverting the EPA AQI. */
  pm10_ugm3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  category: AQICategory;
  recorded_at: string;
  source: string;
  attribution: string;
  tier: SourceTier;
  age_minutes: number;
  stale: boolean;
}

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  official: "Official",
  citizen: "Citizen",
  reference: "Reference",
};

// Readings older than this are excluded from aggregates — a station that stopped
// reporting must not silently dilute the city average.
export const STALE_AFTER_MINUTES = 360;

export type AQICategory =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous"
  | "unknown";

export interface DashboardData {
  last_updated: string;
  stations: Station[];
  city_avg_aqi: number;
  worst_station: Station | null;
  best_station: Station | null;
  /** Stations whose readings are current enough to count toward the average. */
  reporting_count: number;
  /** Stations fetched but excluded from aggregates because their data is stale. */
  excluded_count: number;
  /** Pollutant keys at least one station actually reports. */
  measured_pollutants: string[];
  sources: { attribution: string; tier: SourceTier; station_count: number }[];
}

export interface TrendPoint {
  time: string;
  aqi: number;
  /** How many stations contributed to this hourly average. */
  samples: number;
}

/**
 * EPA AQI category hues, resolved from CSS custom properties so the active
 * theme decides the actual steps. Each theme's palette is validated separately
 * against its own surface — a light-surface step is unreadable on a dark one.
 *
 * Marks are for fills, bars and dots; several of them cannot carry text.
 */
export const AQI_COLORS: Record<AQICategory, string> = {
  good: "var(--aqi-good)",
  moderate: "var(--aqi-moderate)",
  unhealthy_sensitive: "var(--aqi-unhealthy-sensitive)",
  unhealthy: "var(--aqi-unhealthy)",
  very_unhealthy: "var(--aqi-very-unhealthy)",
  hazardous: "var(--aqi-hazardous)",
  unknown: "var(--aqi-unknown)",
};

/** The same categories stepped to carry text against the active surface. */
export const AQI_INK: Record<AQICategory, string> = {
  good: "var(--aqi-good-ink)",
  moderate: "var(--aqi-moderate-ink)",
  unhealthy_sensitive: "var(--aqi-unhealthy-sensitive-ink)",
  unhealthy: "var(--aqi-unhealthy-ink)",
  very_unhealthy: "var(--aqi-very-unhealthy-ink)",
  hazardous: "var(--aqi-hazardous-ink)",
  unknown: "var(--aqi-unknown-ink)",
};

export const AQI_LABELS: Record<AQICategory, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy_sensitive: "Unhealthy for Sensitive",
  unhealthy: "Unhealthy",
  very_unhealthy: "Very Unhealthy",
  hazardous: "Hazardous",
  unknown: "Unknown",
};

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy_sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very_unhealthy";
  return "hazardous";
}
