/**
 * One-shot reading capture, run on a schedule.
 *
 * The web app records readings as a side effect of serving /api/aqi, which
 * means history only accrues while someone has the page open. This job closes
 * that gap: it fetches every station and writes to the same table, then exits.
 *
 * Writes are keyed on (station_id, recorded_at), so running this alongside
 * live page traffic re-writes the same rows rather than duplicating them.
 */
import { fetchAllStations } from "../src/lib/waqi";
import { recordReadings, historyEnabled, db } from "../src/lib/history";
import {
  evaluate,
  record as recordAlerts,
  deliver,
  markDelivered,
  previousHourMean,
} from "../src/lib/alerts";

async function main() {
  const startedAt = Date.now();

  if (!process.env.WAQI_TOKEN) {
    console.error("[record] WAQI_TOKEN is not set — cannot fetch readings.");
    process.exit(1);
  }
  if (!historyEnabled()) {
    console.error("[record] DATABASE_URL is not set — nowhere to write.");
    process.exit(1);
  }

  const stations = await fetchAllStations();
  if (stations.length === 0) {
    console.error("[record] No station responded; nothing written.");
    process.exit(1);
  }

  const fresh = stations.filter((s) => !s.stale && s.aqi !== null);
  await recordReadings(stations);

  const elapsed = Date.now() - startedAt;
  console.log(
    `[record] ${fresh.length} of ${stations.length} stations written in ${elapsed}ms: ` +
      fresh.map((s) => `${s.name.replace(/, Pakistan$/, "")}=${s.aqi}`).join(", ")
  );

  // Alerts are evaluated here rather than on page load so they fire whether or
  // not anyone is looking, which is the entire point of an alert.
  const conn = await db();
  if (conn) {
    const previous = await previousHourMean(conn);
    const candidates = evaluate(stations, previous);
    const stored = await recordAlerts(conn, candidates);

    if (stored.length > 0) {
      const sent = await deliver(stored);
      if (sent > 0) await markDelivered(conn, stored.map((a) => a.id));
      console.log(
        `[alerts] raised ${stored.length}, delivered ${sent}: ` +
          stored.map((a) => `${a.severity}/${a.kind}`).join(", ")
      );
    } else if (candidates.length > 0) {
      console.log(`[alerts] ${candidates.length} condition(s) still within cooldown`);
    }
  }

  // postgres.js keeps the pool open; nothing else should hold the process here.
  process.exit(0);
}

main().catch((err) => {
  console.error("[record] failed:", err);
  process.exit(1);
});
