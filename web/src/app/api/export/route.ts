import { NextResponse, connection } from "next/server";
import { getStationSeries, historyEnabled } from "@/lib/history";
import { fetchAllStations } from "@/lib/waqi";

/**
 * Open data endpoint.
 *
 * The departments that share this bulletin each run their own systems, and the
 * official Punjab dashboard publishes no API, CSV or bulk download — so the
 * data can only be read by a person looking at a page. This exposes the same
 * readings in a form another system can consume.
 *
 *   /api/export                  current readings, JSON
 *   /api/export?format=csv       current readings, CSV
 *   /api/export?series=1         hourly history per station
 */
function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const wantSeries = url.searchParams.get("series") === "1";
  const retrievedAt = new Date().toISOString();

  if (wantSeries) {
    if (!historyEnabled()) {
      return NextResponse.json({ error: "History storage is not configured." }, { status: 503 });
    }
    const series = await getStationSeries(24);
    const rows = series.flatMap((s) =>
      s.points.map((p) => ({
        station_id: s.station_id,
        station_name: s.station_name,
        attribution: s.attribution,
        tier: s.tier,
        hour_pkt: p.time,
        aqi: p.aqi,
      }))
    );

    if (format === "csv") {
      return new NextResponse(toCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="lahore-aqi-series-${retrievedAt.slice(0, 10)}.csv"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    return NextResponse.json(
      { retrieved_at: retrievedAt, window_hours: 24, rows },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  if (!process.env.WAQI_TOKEN) {
    return NextResponse.json({ error: "Upstream token not configured." }, { status: 503 });
  }

  const stations = await fetchAllStations();
  const rows = stations.map((s) => ({
    station_id: s.id,
    station_name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    aqi: s.aqi,
    pm25_subindex: s.pm25,
    pm10_subindex: s.pm10,
    pm25_ug_m3: s.pm25_ugm3,
    pm10_ug_m3: s.pm10_ugm3,
    category: s.category,
    attribution: s.attribution,
    tier: s.tier,
    recorded_at: s.recorded_at,
    age_minutes: s.age_minutes,
    reporting: s.stale ? "no" : "yes",
  }));

  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lahore-aqi-${retrievedAt.slice(0, 10)}.csv"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return NextResponse.json(
    {
      retrieved_at: retrievedAt,
      source: "World Air Quality Index Project (waqi.info)",
      licence: "Readings belong to their operators; see attribution per station.",
      note: "Stations older than six hours are marked reporting=no and are excluded from any aggregate on the bulletin.",
      count: rows.length,
      stations: rows,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
