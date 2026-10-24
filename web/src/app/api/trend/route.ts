import { NextResponse, connection } from "next/server";
import { getTrend, getStationSeries, getDailyHistory, historyEnabled } from "@/lib/history";
import { buildOutlook } from "@/lib/outlook";

export async function GET() {
  // Trend reflects rows written since the last request, so it must never be
  // served from the prerendered shell.
  await connection();

  if (!historyEnabled()) {
    return NextResponse.json({ points: [], stations: [], outlook: null, days: [], enabled: false });
  }

  try {
    const [points, stations, days] = await Promise.all([
      getTrend(24),
      getStationSeries(24),
      getDailyHistory(30),
    ]);
    return NextResponse.json({
      points,
      stations,
      days,
      outlook: buildOutlook(stations),
      enabled: true,
    });
  } catch (e) {
    console.error("[trend] query failed:", e);
    return NextResponse.json(
      { points: [], stations: [], days: [], outlook: null, enabled: true, error: true },
      { status: 503 }
    );
  }
}
