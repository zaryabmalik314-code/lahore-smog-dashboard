/**
 * Daily digest, run once each morning.
 *
 * The dashboard answers questions from someone who already opened it. This
 * reaches the people who will not — which, for a bulletin shared across
 * fourteen departments, is most of them.
 *
 * Delivery is the same webhook the alerts use, so it needs no third-party
 * account. The digest is composed and logged either way, so running without a
 * destination still produces the text and proves the job works.
 */
import { fetchAllStations } from "../src/lib/waqi";
import { db, getTrend, getStationSeries, getDailyHistory, historyEnabled } from "../src/lib/history";
import { buildOutlook } from "../src/lib/outlook";
import { assess } from "../src/lib/assessment";
import { recentAlerts } from "../src/lib/alerts";
import { getAQICategory, AQI_LABELS } from "../src/lib/types";
import type { DashboardData, Station } from "../src/lib/types";

function band(aqi: number): string {
  return AQI_LABELS[getAQICategory(aqi)];
}

function buildDashboardData(stations: Station[]): DashboardData {
  const reporting = stations.filter((s) => !s.stale && s.aqi !== null);
  const mean = reporting.length
    ? Math.round(reporting.reduce((a, s) => a + (s.aqi || 0), 0) / reporting.length)
    : 0;
  const sorted = [...reporting].sort((a, b) => (a.aqi || 0) - (b.aqi || 0));
  return {
    last_updated: new Date().toISOString(),
    stations,
    city_avg_aqi: mean,
    worst_station: sorted[sorted.length - 1] || null,
    best_station: sorted[0] || null,
    reporting_count: reporting.length,
    excluded_count: stations.length - reporting.length,
    measured_pollutants: ["pm25", "pm10"],
    sources: [],
  };
}

async function main() {
  if (!process.env.WAQI_TOKEN) {
    console.error("[bulletin] WAQI_TOKEN is not set.");
    process.exit(1);
  }
  if (!historyEnabled()) {
    console.error("[bulletin] DATABASE_URL is not set.");
    process.exit(1);
  }

  const conn = await db();
  if (!conn) {
    console.error("[bulletin] no database connection.");
    process.exit(1);
  }

  const stations = await fetchAllStations();
  const data = buildDashboardData(stations);
  const [trend, series, daily, alerts] = await Promise.all([
    getTrend(24),
    getStationSeries(24),
    getDailyHistory(7),
    recentAlerts(conn, 24, 20),
  ]);

  const outlook = buildOutlook(series);
  const assessment = assess(data, outlook, trend);

  const today = new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const yesterday = daily.length >= 2 ? daily[daily.length - 2] : null;
  const peakToday = trend.length ? Math.max(...trend.map((t) => t.aqi)) : null;

  const lines: string[] = [];
  lines.push(`LAHORE AIR QUALITY — MORNING BULLETIN, ${today}`);
  lines.push("");
  lines.push(
    `Network AQI ${data.city_avg_aqi} (${band(data.city_avg_aqi)}), ` +
      `from ${data.reporting_count} of ${stations.length} stations reporting.`
  );
  if (peakToday !== null) lines.push(`Peak on record today: ${peakToday}.`);
  if (yesterday) {
    const delta = data.city_avg_aqi - yesterday.mean;
    lines.push(
      `Yesterday averaged ${yesterday.mean} (peak ${yesterday.peak}) — ` +
        `today is ${delta === 0 ? "level with it" : `${Math.abs(delta)} points ${delta > 0 ? "worse" : "better"}`}.`
    );
  }
  lines.push("");

  lines.push("ASSESSMENT");
  lines.push(assessment.summary);
  for (const f of assessment.findings.slice(0, 5)) {
    lines.push(`  [${f.severity.toUpperCase()}] ${f.headline}`);
  }
  lines.push("");

  if (outlook.stations.length > 0 && !outlook.insufficient) {
    lines.push(`OUTLOOK — NEXT ${outlook.horizon_hours} HOURS`);
    for (const s of outlook.stations.slice(0, 5)) {
      lines.push(
        `  ${s.station_name}: ${s.current} → ${s.projected ?? "—"} (${s.direction})`
      );
    }
    lines.push("");
  }

  if (alerts.length > 0) {
    lines.push(`ALERTS RAISED IN THE LAST 24 HOURS (${alerts.length})`);
    for (const a of alerts.slice(0, 8)) lines.push(`  [${a.severity}] ${a.title}`);
    lines.push("");
  }

  lines.push(
    "Readings are indicative and are not a substitute for accredited regulatory monitoring."
  );

  const text = lines.join("\n");
  console.log("\n" + text + "\n");

  const url = process.env.ALERT_WEBHOOK_URL;
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Lahore Air Quality Bulletin",
          kind: "daily-bulletin",
          date: today,
          network_aqi: data.city_avg_aqi,
          reporting: data.reporting_count,
          text,
        }),
        signal: AbortSignal.timeout(10000),
      });
      console.log(`[bulletin] delivered: ${res.status}`);
    } catch (e) {
      console.error("[bulletin] delivery failed:", e);
    }
  } else {
    console.log("[bulletin] ALERT_WEBHOOK_URL not set — composed but not delivered.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[bulletin] failed:", err);
  process.exit(1);
});
