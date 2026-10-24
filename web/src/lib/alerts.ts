import postgres from "postgres";
import type { Station } from "./types";

export type AlertSeverity = "critical" | "warning" | "info";

export interface RaisedAlert {
  kind: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  station_id?: string | null;
  value?: number | null;
}

export interface StoredAlert extends RaisedAlert {
  id: number;
  raised_at: string;
  delivered: boolean;
}

/** AQI thresholds that warrant telling someone, in descending order. */
const THRESHOLDS = [
  { at: 300, severity: "critical" as const, label: "hazardous" },
  { at: 200, severity: "critical" as const, label: "very unhealthy" },
  { at: 150, severity: "warning" as const, label: "unhealthy" },
];

/** A reading older than this means the station has gone quiet. */
const SILENT_AFTER_MINUTES = 360;
/** Rise over the trailing hour that counts as a rapid deterioration. */
const RAPID_RISE = 25;

/**
 * How long the same alert stays suppressed after firing.
 *
 * Without this, a network sitting above a threshold would raise the same alert
 * every fifteen minutes and train every recipient to ignore it. One alert per
 * condition per window, and it can only fire again once the condition has
 * cleared or the window has passed.
 */
const COOLDOWN_HOURS = 6;

/**
 * Evaluates the current readings against the rules.
 *
 * Pure: it decides what is worth raising and nothing else. Storage, dedup and
 * delivery are separate so each can be tested and reasoned about on its own.
 */
export function evaluate(
  stations: Station[],
  previousNetworkMean: number | null
): RaisedAlert[] {
  const raised: RaisedAlert[] = [];
  const reporting = stations.filter((s) => !s.stale && typeof s.aqi === "number");

  if (reporting.length === 0) {
    raised.push({
      kind: "network-down",
      severity: "critical",
      title: "No station is reporting",
      detail:
        "Every monitor in the network has gone quiet. No figure can be published until at least one resumes.",
    });
    return raised;
  }

  const mean = Math.round(
    reporting.reduce((a, s) => a + (s.aqi as number), 0) / reporting.length
  );

  // Network crossing a band that carries published guidance.
  const crossed = THRESHOLDS.find((t) => mean >= t.at);
  if (crossed) {
    raised.push({
      kind: `network-above-${crossed.at}`,
      severity: crossed.severity,
      title: `Network AQI ${mean} — ${crossed.label}`,
      detail:
        `The mean across ${reporting.length} reporting station${reporting.length === 1 ? "" : "s"} has reached ${mean}, ` +
        `at or above the ${crossed.at} threshold. Published guidance for the ${crossed.label} band applies.`,
      value: mean,
    });
  }

  // A single station well above the network tells you where to act.
  const worst = [...reporting].sort((a, b) => (b.aqi as number) - (a.aqi as number))[0];
  if (worst && (worst.aqi as number) >= 200 && (worst.aqi as number) - mean >= 50) {
    raised.push({
      kind: `station-hotspot-${worst.id}`,
      severity: "warning",
      title: `${worst.name.replace(/, Pakistan$/, "")} at ${worst.aqi}, well above the network`,
      detail:
        `${worst.name.replace(/, Pakistan$/, "")} reads ${worst.aqi} against a network mean of ${mean}. ` +
        "A gap this size points at a local source rather than general conditions.",
      station_id: worst.id,
      value: worst.aqi,
    });
  }

  // Rapid deterioration, which matters before the threshold is crossed.
  if (previousNetworkMean !== null && mean - previousNetworkMean >= RAPID_RISE) {
    raised.push({
      kind: "rapid-rise",
      severity: "warning",
      title: `Network AQI up ${mean - previousNetworkMean} points in the last hour`,
      detail:
        `The mean has moved from ${previousNetworkMean} to ${mean}. A rise this fast usually means an inversion ` +
        "settling or a nearby source starting, and it tends to continue before it reverses.",
      value: mean,
    });
  }

  // A monitor that has stopped reporting, which nobody notices otherwise.
  for (const s of stations) {
    if (s.stale && s.age_minutes >= SILENT_AFTER_MINUTES) {
      const hours = Math.round(s.age_minutes / 60);
      raised.push({
        kind: `station-silent-${s.id}`,
        severity: hours > 48 ? "warning" : "info",
        title: `${s.name.replace(/, Pakistan$/, "")} has not reported for ${hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} hours`}`,
        detail:
          `Last reading was ${s.recorded_at}. It is excluded from every figure until it resumes, ` +
          "so coverage is narrower than the station count suggests.",
        station_id: s.id,
      });
    }
  }

  return raised;
}

/**
 * Stores the alerts that are not already live, and returns only those newly
 * recorded so a caller can deliver exactly once.
 */
export async function record(
  db: postgres.Sql,
  alerts: RaisedAlert[]
): Promise<StoredAlert[]> {
  if (alerts.length === 0) return [];

  const kinds = alerts.map((a) => a.kind);
  const recent = await db<{ kind: string }[]>`
    SELECT DISTINCT kind FROM alerts
    WHERE kind IN ${db(kinds)}
      AND raised_at >= NOW() - (${COOLDOWN_HOURS} * INTERVAL '1 hour')
  `;
  const suppressed = new Set(recent.map((r) => r.kind));

  const fresh = alerts.filter((a) => !suppressed.has(a.kind));
  if (fresh.length === 0) return [];

  const rows = await db<StoredAlert[]>`
    INSERT INTO ${db("alerts")} ${db(
      fresh.map((a) => ({
        kind: a.kind,
        severity: a.severity,
        title: a.title,
        detail: a.detail,
        station_id: a.station_id ?? null,
        value: a.value ?? null,
      }))
    )}
    RETURNING *
  `;
  return rows;
}

/**
 * Posts alerts to a configured endpoint.
 *
 * A webhook rather than email because it needs no third-party account to work
 * — a department with any system that accepts a POST can consume it today.
 * Email is a second adapter to add when a provider is available; the alerts
 * are stored either way, so nothing is lost while there is no destination.
 */
export async function deliver(alerts: StoredAlert[]): Promise<number> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url || alerts.length === 0) return 0;

  let sent = 0;
  for (const a of alerts) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Lahore Air Quality Bulletin",
          raised_at: a.raised_at,
          severity: a.severity,
          kind: a.kind,
          title: a.title,
          detail: a.detail,
          station_id: a.station_id,
          value: a.value,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sent += 1;
      else console.error(`[alerts] webhook rejected ${a.kind}: ${res.status}`);
    } catch (e) {
      console.error(`[alerts] webhook failed for ${a.kind}:`, e);
    }
  }
  return sent;
}

export async function markDelivered(db: postgres.Sql, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db`UPDATE alerts SET delivered = TRUE WHERE id IN ${db(ids)}`;
}

/** Recent alerts, newest first, for the feed and the API. */
export async function recentAlerts(
  db: postgres.Sql,
  hours = 48,
  limit = 40
): Promise<StoredAlert[]> {
  return db<StoredAlert[]>`
    SELECT * FROM alerts
    WHERE raised_at >= NOW() - (${hours} * INTERVAL '1 hour')
    ORDER BY raised_at DESC
    LIMIT ${limit}
  `;
}

/** Network mean one hour back, used to detect a rapid rise. */
export async function previousHourMean(db: postgres.Sql): Promise<number | null> {
  const rows = await db<{ mean: number | null }[]>`
    SELECT ROUND(AVG(aqi))::int AS mean
    FROM readings
    WHERE recorded_at >= NOW() - INTERVAL '90 minutes'
      AND recorded_at <  NOW() - INTERVAL '45 minutes'
      AND aqi IS NOT NULL
  `;
  return rows[0]?.mean ?? null;
}
