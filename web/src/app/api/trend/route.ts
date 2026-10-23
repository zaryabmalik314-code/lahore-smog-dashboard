import { NextResponse, connection } from "next/server";
import { getTrend, getStationSeries, historyEnabled } from "@/lib/history";

export async function GET() {
  // Trend reflects rows written since the last request, so it must never be
  // served from the prerendered shell.
  await connection();

  if (!historyEnabled()) {
    return NextResponse.json({ points: [], stations: [], enabled: false });
  }

  try {
    const [points, stations] = await Promise.all([getTrend(24), getStationSeries(24)]);
    return NextResponse.json({ points, stations, enabled: true });
  } catch (e) {
    console.error("[trend] query failed:", e);
    return NextResponse.json(
      { points: [], stations: [], enabled: true, error: true },
      { status: 503 }
    );
  }
}
