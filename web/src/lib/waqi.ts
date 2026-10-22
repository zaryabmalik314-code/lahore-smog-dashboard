import { Station, getAQICategory } from "./types";

const WAQI_TOKEN = process.env.WAQI_TOKEN || "";

const LAHORE_STATIONS = [
  { id: "@11765", name: "US Embassy Lahore" },
  { id: "@-74005", name: "Lahore Cantonment" },
  { id: "@-538468", name: "Naila Road" },
  { id: "@-576577", name: "Egerton Road" },
  { id: "@-582631", name: "Wagha Border" },
  { id: "@-577588", name: "Lathepur" },
];

async function fetchStation(stationId: string): Promise<Station | null> {
  const url = `https://api.waqi.info/feed/${stationId}/?token=${WAQI_TOKEN}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const json = await res.json();

  if (json.status !== "ok") return null;

  const data = json.data;
  const iaqi = data.iaqi || {};
  const aqi = typeof data.aqi === "number" ? data.aqi : null;

  return {
    id: stationId,
    name: data.city?.name || "Unknown",
    latitude: data.city?.geo?.[0] || 31.5,
    longitude: data.city?.geo?.[1] || 74.3,
    aqi,
    pm25: iaqi.pm25?.v ?? null,
    pm10: iaqi.pm10?.v ?? null,
    no2: iaqi.no2?.v ?? null,
    so2: iaqi.so2?.v ?? null,
    co: iaqi.co?.v ?? null,
    o3: iaqi.o3?.v ?? null,
    temperature: iaqi.t?.v ?? null,
    humidity: iaqi.h?.v ?? null,
    wind_speed: iaqi.w?.v ?? null,
    category: aqi !== null ? getAQICategory(aqi) : "unknown",
    recorded_at: data.time?.iso || new Date(Date.now()).toISOString(),
    source: "waqi",
  };
}

export async function fetchAllStations(): Promise<Station[]> {
  const results = await Promise.allSettled(
    LAHORE_STATIONS.map((s) => fetchStation(s.id))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Station> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

export function getMockStations(): Station[] {
  const now = Date.now();
  const ts = new Date(now).toISOString();
  return [
    { id: "@11765", name: "US Embassy Lahore", latitude: 31.5601, longitude: 74.3359, aqi: 178, pm25: 178, pm10: 95, no2: 22, so2: 8, co: 12, o3: 5, temperature: 24, humidity: 65, wind_speed: 3.2, category: "unhealthy", recorded_at: ts, source: "waqi" },
    { id: "@-74005", name: "Lahore Cantonment", latitude: 31.524, longitude: 74.366, aqi: 162, pm25: 162, pm10: 88, no2: 20, so2: 6, co: 10, o3: 4, temperature: 23, humidity: 68, wind_speed: 3.5, category: "unhealthy", recorded_at: ts, source: "waqi" },
    { id: "@-538468", name: "Naila Road", latitude: 31.536, longitude: 74.33, aqi: 210, pm25: 210, pm10: 120, no2: 32, so2: 14, co: 18, o3: 9, temperature: 26, humidity: 58, wind_speed: 2.1, category: "very_unhealthy", recorded_at: ts, source: "waqi" },
    { id: "@-576577", name: "Egerton Road", latitude: 31.5609, longitude: 74.3308, aqi: 195, pm25: 195, pm10: 110, no2: 28, so2: 12, co: 15, o3: 7, temperature: 25, humidity: 62, wind_speed: 2.8, category: "unhealthy", recorded_at: ts, source: "waqi" },
    { id: "@-582631", name: "Wagha Border", latitude: 31.6022, longitude: 74.5449, aqi: 230, pm25: 230, pm10: 140, no2: 35, so2: 18, co: 22, o3: 11, temperature: 27, humidity: 55, wind_speed: 1.8, category: "very_unhealthy", recorded_at: ts, source: "waqi" },
    { id: "@-577588", name: "Lathepur", latitude: 31.7176, longitude: 74.3895, aqi: 145, pm25: 145, pm10: 78, no2: 18, so2: 5, co: 9, o3: 3, temperature: 23, humidity: 70, wind_speed: 3.8, category: "unhealthy_sensitive", recorded_at: ts, source: "waqi" },
  ];
}
