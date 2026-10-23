import postgres from "postgres";
import type { Station, TrendPoint } from "./types";

const DATABASE_URL = process.env.DATABASE_URL;

let sql: postgres.Sql | null = null;
let schemaReady: Promise<void> | null = null;

function client(): postgres.Sql | null {
  if (!DATABASE_URL) return null;
  if (!sql) {
    sql = postgres(DATABASE_URL, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      // The schema bootstrap is idempotent, so its "already exists" notices
      // would otherwise fill every scheduled run's log.
      onnotice: () => {},
    });
  }
  return sql;
}

async function ensureSchema(db: postgres.Sql): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS readings (
          station_id   TEXT        NOT NULL,
          station_name TEXT        NOT NULL,
          recorded_at  TIMESTAMPTZ NOT NULL,
          aqi          INTEGER,
          pm25         REAL,
          pm10         REAL,
          attribution  TEXT,
          tier         TEXT,
          PRIMARY KEY (station_id, recorded_at)
        )
      `;
      await db`
        CREATE INDEX IF NOT EXISTS readings_recorded_at_idx
        ON readings (recorded_at DESC)
      `;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/**
 * Persist the current fetch. The primary key is (station, reading timestamp), so
 * polling faster than stations publish re-writes the same row instead of
 * inflating history with duplicates.
 */
export async function recordReadings(stations: Station[]): Promise<void> {
  const db = client();
  if (!db || stations.length === 0) return;

  await ensureSchema(db);

  const rows = stations
    .filter((s) => !s.stale && s.aqi !== null)
    .map((s) => ({
      station_id: s.id,
      station_name: s.name,
      recorded_at: s.recorded_at,
      aqi: s.aqi,
      pm25: s.pm25,
      pm10: s.pm10,
      attribution: s.attribution,
      tier: s.tier,
    }));

  if (rows.length === 0) return;

  await db`
    INSERT INTO ${db("readings")} ${db(rows)}
    ON CONFLICT (station_id, recorded_at) DO UPDATE
      SET aqi = EXCLUDED.aqi, pm25 = EXCLUDED.pm25, pm10 = EXCLUDED.pm10
  `;
}

/**
 * Hourly network average over the trailing window, built only from stored
 * readings. Hours with no recorded data are absent rather than interpolated.
 */
export async function getTrend(hours = 24): Promise<TrendPoint[]> {
  const db = client();
  if (!db) return [];

  await ensureSchema(db);

  const rows = await db<{ bucket: Date; avg_aqi: number; samples: number }[]>`
    SELECT
      date_trunc('hour', recorded_at)      AS bucket,
      ROUND(AVG(aqi))::int                 AS avg_aqi,
      COUNT(DISTINCT station_id)::int      AS samples
    FROM readings
    WHERE recorded_at >= NOW() - (${hours} * INTERVAL '1 hour')
      AND aqi IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    time: new Date(r.bucket).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    }),
    aqi: r.avg_aqi,
    samples: r.samples,
  }));
}

export function historyEnabled(): boolean {
  return Boolean(DATABASE_URL);
}
