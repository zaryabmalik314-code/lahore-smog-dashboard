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
}

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
}

export const AQI_COLORS: Record<AQICategory, string> = {
  good: "#10b981",
  moderate: "#f59e0b",
  unhealthy_sensitive: "#f97316",
  unhealthy: "#ef4444",
  very_unhealthy: "#8b5cf6",
  hazardous: "#991b1b",
  unknown: "#71717a",
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
