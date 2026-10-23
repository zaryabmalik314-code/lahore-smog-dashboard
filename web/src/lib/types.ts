export type SourceTier = "official" | "citizen" | "reference";

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
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
 * EPA AQI category hues re-stepped for a light surface. Validated for CVD
 * separation and normal-vision separation of adjacent categories.
 * Fills, bars and dots only — several of these cannot carry text.
 */
export const AQI_COLORS: Record<AQICategory, string> = {
  good: "#1a7f37",
  moderate: "#e0a800",
  unhealthy_sensitive: "#d1500a",
  unhealthy: "#9e1414",
  very_unhealthy: "#6b21a8",
  hazardous: "#8c2240",
  unknown: "#8b8b84",
};

/**
 * The same categories at >=4.5:1 against paper, for numerals and labels.
 * Moderate differs most: its mark colour sits at 2.09:1 and fails as text.
 */
export const AQI_INK: Record<AQICategory, string> = {
  good: "#166534",
  moderate: "#8a6500",
  unhealthy_sensitive: "#b8470b",
  unhealthy: "#9e1414",
  very_unhealthy: "#6b21a8",
  hazardous: "#8c2240",
  unknown: "#5c5c56",
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
