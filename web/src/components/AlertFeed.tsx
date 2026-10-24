"use client";

export interface FeedAlert {
  id: number;
  raised_at: string;
  kind: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  station_id: string | null;
  value: number | null;
  delivered: boolean;
}

const INK: Record<string, string> = {
  critical: "var(--aqi-unhealthy-ink)",
  warning: "var(--aqi-unhealthy-sensitive-ink)",
  info: "var(--accent)",
};

function when(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function AlertFeed({ alerts }: { alerts: FeedAlert[] }) {
  return (
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--panel-border)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Alerts raised
        </h3>
        <span className="field-label">Past 48 hours</span>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm px-5 py-8 text-center" style={{ color: "var(--ink-3)" }}>
          Nothing has crossed an alert threshold in the last 48 hours. Alerts are evaluated
          every 15 minutes whether or not this page is open.
        </p>
      ) : (
        <ul>
          {alerts.map((a, i) => (
            <li
              key={a.id}
              className="px-5 py-3.5 flex items-start gap-3"
              style={i === 0 ? undefined : { borderTop: "1px solid var(--panel-border)" }}
            >
              <span
                className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mt-0.5"
                style={{
                  background: `color-mix(in srgb, ${INK[a.severity]} 16%, transparent)`,
                  color: INK[a.severity],
                }}
              >
                {a.severity}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {a.title}
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                  {a.detail}
                </p>
                <p className="text-[10px] mt-1.5" style={{ color: "var(--ink-3)" }}>
                  {when(a.raised_at)}
                  {a.delivered && " · delivered"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid var(--panel-border)", background: "var(--paper-sunk)" }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Each condition raises once and is then suppressed for six hours, so a network sitting
          above a threshold does not repeat the same alert every quarter of an hour. Available at{" "}
          <span className="font-mono">/api/alerts</span> for systems that would rather poll than
          receive a webhook.
        </p>
      </div>
    </section>
  );
}
