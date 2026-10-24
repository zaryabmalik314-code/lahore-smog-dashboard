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
      await db`
        CREATE TABLE IF NOT EXISTS alerts (
          id          BIGSERIAL   PRIMARY KEY,
          raised_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          kind        TEXT        NOT NULL,
          severity    TEXT        NOT NULL,
          title       TEXT        NOT NULL,
          detail      TEXT        NOT NULL,
          station_id  TEXT,
          value       REAL,
          delivered   BOOLEAN     NOT NULL DEFAULT FALSE
        )
      `;
      await db`
        CREATE INDEX IF NOT EXISTS alerts_raised_at_idx
        ON alerts (raised_at DESC)
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

export interface StationSeries {
  station_id: string;
  station_name: string;
  attribution: string;
  tier: string;
  points: { time: string; aqi: number }[];
  /** Readings on record for this station in the window. */
  samples: number;
  peak: number | null;
  low: number | null;
  mean: number | null;
  /** Readings above the NEQS 24-hour PM2.5 limit of 35 ug/m3. */
  above_neqs: number;
  /** Readings above the WHO 24-hour PM2.5 guideline of 15 ug/m3. */
  above_who: number;
}

/**
 * Per-station history over the trailing window, with the exceedance counts a
 * compliance reader asks for. Counts are over recorded readings, not clock
 * hours — a station that stopped reporting contributes nothing rather than
 * being assumed compliant.
 */
export async function getStationSeries(hours = 24): Promise<StationSeries[]> {
  const db = client();
  if (!db) return [];

  await ensureSchema(db);

  const rows = await db<
    {
      station_id: string;
      station_name: string;
      attribution: string | null;
      tier: string | null;
      bucket: Date;
      avg_aqi: number;
      avg_pm25: number | null;
    }[]
  >`
    SELECT
      station_id,
      MAX(station_name)              AS station_name,
      MAX(attribution)               AS attribution,
      MAX(tier)                      AS tier,
      date_trunc('hour', recorded_at) AS bucket,
      ROUND(AVG(aqi))::int           AS avg_aqi,
      AVG(pm25)                      AS avg_pm25
    FROM readings
    WHERE recorded_at >= NOW() - (${hours} * INTERVAL '1 hour')
      AND aqi IS NOT NULL
    GROUP BY station_id, bucket
    ORDER BY station_id, bucket ASC
  `;

  const byStation = new Map<string, StationSeries>();

  for (const r of rows) {
    let s = byStation.get(r.station_id);
    if (!s) {
      s = {
        station_id: r.station_id,
        station_name: r.station_name,
        attribution: r.attribution || "Unknown source",
        tier: r.tier || "reference",
        points: [],
        samples: 0,
        peak: null,
        low: null,
        mean: null,
        above_neqs: 0,
        above_who: 0,
      };
      byStation.set(r.station_id, s);
    }

    s.points.push({
      time: new Date(r.bucket).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Karachi",
      }),
      aqi: r.avg_aqi,
    });

    s.samples += 1;
    s.peak = s.peak === null ? r.avg_aqi : Math.max(s.peak, r.avg_aqi);
    s.low = s.low === null ? r.avg_aqi : Math.min(s.low, r.avg_aqi);

    const pm25 = r.avg_pm25 === null ? null : Number(r.avg_pm25);
    if (pm25 !== null) {
      if (pm25 > 35) s.above_neqs += 1;
      if (pm25 > 15) s.above_who += 1;
    }
  }

  for (const s of byStation.values()) {
    s.mean = s.points.length
      ? Math.round(s.points.reduce((a, p) => a + p.aqi, 0) / s.points.length)
      : null;
  }

  return [...byStation.values()].sort((a, b) => (b.peak || 0) - (a.peak || 0));
}

export interface DayPoint {
  day: string;
  mean: number;
  peak: number;
  low: number;
  /** Stations that contributed to the day. */
  samples: number;
}

/**
 * Daily aggregates over a longer window.
 *
 * The hourly series answers "what is happening today"; this answers "is this
 * worse than last week", which is the question a policy reader asks. Days with
 * no stored reading are absent rather than interpolated, so a gap in recording
 * stays visible as a gap.
 */
export async function getDailyHistory(days = 30): Promise<DayPoint[]> {
  const db = client();
  if (!db) return [];
  await ensureSchema(db);

  const rows = await db<
    { day: Date; mean: number; peak: number; low: number; samples: number }[]
  >`
    SELECT
      date_trunc('day', recorded_at AT TIME ZONE 'Asia/Karachi') AS day,
      ROUND(AVG(aqi))::int                                       AS mean,
      MAX(aqi)::int                                              AS peak,
      MIN(aqi)::int                                              AS low,
      COUNT(DISTINCT station_id)::int                            AS samples
    FROM readings
    WHERE recorded_at >= NOW() - (${days} * INTERVAL '1 day')
      AND aqi IS NOT NULL
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    day: new Date(r.day).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Karachi",
    }),
    mean: r.mean,
    peak: r.peak,
    low: r.low,
    samples: r.samples,
  }));
}

/**
 * The pooled client with the schema guaranteed, for callers that run their own
 * queries — the alert engine does, so it does not duplicate the bootstrap.
 */
export async function db(): Promise<postgres.Sql | null> {
  const c = client();
  if (!c) return null;
  await ensureSchema(c);
  return c;
}

export function historyEnabled(): boolean {
  return Boolean(DATABASE_URL);
}
