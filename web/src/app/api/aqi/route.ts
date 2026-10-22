import { NextResponse } from "next/server";
import { fetchAllStations, getMockStations } from "@/lib/waqi";
import { getAQICategory } from "@/lib/types";
import type { DashboardData, Station } from "@/lib/types";

export async function GET() {
  let stations: Station[];

  if (process.env.WAQI_TOKEN) {
    stations = await fetchAllStations();
  } else {
    stations = getMockStations();
  }

  const validStations = stations.filter((s) => s.aqi !== null);
  const avgAqi =
    validStations.length > 0
      ? Math.round(
          validStations.reduce((sum, s) => sum + (s.aqi || 0), 0) /
            validStations.length
        )
      : 0;

  const sorted = [...validStations].sort(
    (a, b) => (a.aqi || 0) - (b.aqi || 0)
  );

  const data: DashboardData = {
    last_updated: new Date().toISOString(),
    stations,
    city_avg_aqi: avgAqi,
    worst_station: sorted[sorted.length - 1] || null,
    best_station: sorted[0] || null,
  };

  return NextResponse.json(data);
}
