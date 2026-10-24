import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { fetchAllStations } from "@/lib/waqi";
import { getAQICategory, AQI_LABELS, type AQICategory } from "@/lib/types";

/**
 * A forwardable snapshot of the current reading.
 *
 * The bulletin is a URL, and a URL is not how this spreads here — a picture
 * pasted into a WhatsApp group is. This renders the headline figure as a PNG
 * so it survives being forwarded, while still carrying the station count and
 * the timestamp so it cannot be mistaken for a reading it is not.
 *
 * Satori supports flexbox and a subset of CSS only; no grid, no CSS variables.
 */

/** Mark colours, repeated here because satori cannot resolve CSS variables. */
const FILL: Record<AQICategory, string> = {
  good: "#1a7f37",
  moderate: "#e0a800",
  unhealthy_sensitive: "#d1500a",
  unhealthy: "#9e1414",
  very_unhealthy: "#6b21a8",
  hazardous: "#8c2240",
  unknown: "#5c5c56",
};

/** Label colour that sits on each fill. */
const ON_FILL: Record<AQICategory, string> = {
  good: "#ffffff",
  moderate: "#2a1f00",
  unhealthy_sensitive: "#ffffff",
  unhealthy: "#ffffff",
  very_unhealthy: "#ffffff",
  hazardous: "#ffffff",
  unknown: "#ffffff",
};

export async function GET() {
  await connection();

  const stations = process.env.WAQI_TOKEN ? await fetchAllStations() : [];
  const reporting = stations.filter((s) => !s.stale && typeof s.aqi === "number");

  const mean = reporting.length
    ? Math.round(reporting.reduce((a, s) => a + (s.aqi as number), 0) / reporting.length)
    : null;

  const category: AQICategory = mean === null ? "unknown" : getAQICategory(mean);
  const fill = FILL[category];
  const ink = ON_FILL[category];

  const pm25 = reporting
    .map((s) => s.pm25_ugm3)
    .filter((v): v is number => typeof v === "number");
  const pm25Mean = pm25.length
    ? Math.round(pm25.reduce((a, b) => a + b, 0) / pm25.length)
    : null;

  const worst = [...reporting].sort((a, b) => (b.aqi as number) - (a.aqi as number))[0];

  const issued = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0d1117",
          fontFamily: "sans-serif",
        }}
      >
        {/* Masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 48px",
            backgroundColor: "#070a0e",
          }}
        >
          <div style={{ display: "flex", color: "#c3cad6", fontSize: 22, letterSpacing: 2 }}>
            LAHORE AIR QUALITY
          </div>
          <div style={{ display: "flex", color: "#6f7d8e", fontSize: 20 }}>{issued} PKT</div>
        </div>

        <div style={{ display: "flex", flex: 1 }}>
          {/* The figure, filled with its own category colour */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: 470,
              padding: "0 48px",
              backgroundColor: fill,
            }}
          >
            <div style={{ display: "flex", color: ink, fontSize: 22, opacity: 0.85 }}>
              NETWORK INDEX
            </div>
            <div style={{ display: "flex", color: ink, fontSize: 190, fontWeight: 700, lineHeight: 1 }}>
              {mean ?? "—"}
            </div>
            <div style={{ display: "flex", color: ink, fontSize: 38, fontWeight: 600 }}>
              {mean === null ? "No data" : AQI_LABELS[category]}
            </div>
          </div>

          {/* Supporting figures */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              padding: "0 52px",
            }}
          >
            {pm25Mean !== null && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 34 }}>
                <div style={{ display: "flex", color: "#7a8798", fontSize: 20, letterSpacing: 1 }}>
                  PM2.5
                </div>
                <div style={{ display: "flex", color: "#e8edf4", fontSize: 44, fontWeight: 600 }}>
                  {pm25Mean} µg/m³ · {Math.round(pm25Mean / 15)}× WHO
                </div>
              </div>
            )}

            {worst && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 34 }}>
                <div style={{ display: "flex", color: "#7a8798", fontSize: 20, letterSpacing: 1 }}>
                  WORST STATION
                </div>
                <div style={{ display: "flex", color: "#e8edf4", fontSize: 38, fontWeight: 600 }}>
                  {worst.name.replace(/, Pakistan$/, "")} · {worst.aqi}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", color: "#7a8798", fontSize: 20, letterSpacing: 1 }}>
                COVERAGE
              </div>
              <div style={{ display: "flex", color: "#e8edf4", fontSize: 38, fontWeight: 600 }}>
                {reporting.length} of {stations.length} stations reporting
              </div>
            </div>
          </div>
        </div>

        {/* Provenance — travels with the picture, so a forwarded copy still
            says where it came from and what it is not. */}
        <div
          style={{
            display: "flex",
            padding: "20px 48px",
            backgroundColor: "#161b22",
            color: "#7a8798",
            fontSize: 19,
          }}
        >
          Punjab network and independent sensors via waqi.info · indicative, not accredited
          regulatory monitoring
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Short cache: forwarded often, but must not show a stale hour.
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
