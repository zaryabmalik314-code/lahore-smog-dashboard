import { Station, SourceTier, getAQICategory, STALE_AFTER_MINUTES } from "./types";

const WAQI_TOKEN = process.env.WAQI_TOKEN || "";

// WAQI returns an attributions array per station. The first entry is the operator;
// which operator it is decides how much weight a reading can carry.
function classifySource(attributions: { name?: string }[]): {
  attribution: string;
  tier: SourceTier;
} {
  const operator =
    attributions.map((a) => a.name || "").find((n) => !/World Air Quality Index/i.test(n)) || "Unknown source";

  if (/punjab|pakistan environmental|pepa|epa punjab/i.test(operator)) {
    return { attribution: operator, tier: "official" };
  }
  if (/sensor\.community|citizen|purpleair/i.test(operator)) {
    return { attribution: operator, tier: "citizen" };
  }
  return { attribution: operator, tier: "reference" };
}

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

  const recordedAt = data.time?.iso || new Date(Date.now()).toISOString();
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000)
  );
  const { attribution, tier } = classifySource(data.attributions || []);

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
    recorded_at: recordedAt,
    source: "waqi",
    attribution,
    tier,
    age_minutes: ageMinutes,
    stale: ageMinutes > STALE_AFTER_MINUTES,
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

// Which pollutants any station in the network actually reports right now.
// Used to decide what the UI is allowed to chart — a pollutant nobody measures
// must not render as a zero bar.
export function availablePollutants(stations: Station[]): Set<keyof Station> {
  const keys: (keyof Station)[] = ["pm25", "pm10", "no2", "so2", "co", "o3"];
  return new Set(keys.filter((k) => stations.some((s) => s[k] != null)));
}
