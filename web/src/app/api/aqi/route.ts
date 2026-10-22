import { NextResponse } from "next/server";
import { fetchAllStations, availablePollutants } from "@/lib/waqi";
import { recordReadings } from "@/lib/history";
import type { DashboardData, SourceTier, Station } from "@/lib/types";

function summarizeSources(stations: Station[]) {
  const counts = new Map<string, { attribution: string; tier: SourceTier; station_count: number }>();
  for (const s of stations) {
    const existing = counts.get(s.attribution);
    if (existing) {
      existing.station_count += 1;
    } else {
      counts.set(s.attribution, { attribution: s.attribution, tier: s.tier, station_count: 1 });
    }
  }
  const order: Record<SourceTier, number> = { official: 0, citizen: 1, reference: 2 };
  return [...counts.values()].sort((a, b) => order[a.tier] - order[b.tier]);
}

export async function GET() {
  if (!process.env.WAQI_TOKEN) {
    return NextResponse.json(
      { error: "WAQI_TOKEN is not configured. Live data unavailable." },
      { status: 503 }
    );
  }

  const stations = await fetchAllStations();

  if (stations.length === 0) {
    return NextResponse.json(
      { error: "No monitoring stations responded." },
      { status: 503 }
    );
  }

  // A stale station is kept in the list so the table can show it as not
  // reporting, but it must never contribute to an average or a ranking.
  const reporting = stations.filter((s) => !s.stale && s.aqi !== null);

  const avgAqi =
    reporting.length > 0
      ? Math.round(reporting.reduce((sum, s) => sum + (s.aqi || 0), 0) / reporting.length)
      : 0;

  const sorted = [...reporting].sort((a, b) => (a.aqi || 0) - (b.aqi || 0));

  recordReadings(stations).catch((e) =>
    console.error("[history] failed to record readings:", e)
  );

  const data: DashboardData = {
    last_updated: new Date().toISOString(),
    stations,
    city_avg_aqi: avgAqi,
    worst_station: sorted[sorted.length - 1] || null,
    best_station: sorted[0] || null,
    reporting_count: reporting.length,
    excluded_count: stations.length - reporting.length,
    measured_pollutants: [...availablePollutants(reporting)] as string[],
    sources: summarizeSources(stations),
  };

  return NextResponse.json(data);
}
