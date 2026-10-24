"use client";

import { AQI_INK, AQI_LABELS, getAQICategory, type Station } from "@/lib/types";

type Dept = "health" | "agriculture" | "environment" | "safecity";

interface Props {
  type: Dept;
  stations: Station[];
  networkMean: number;
}

const HEALTH_GUIDANCE: Record<string, string> = {
  good: "No restriction.",
  moderate: "Unusually sensitive individuals should limit prolonged exertion.",
  unhealthy_sensitive: "Children, elderly and respiratory patients to remain indoors.",
  unhealthy: "All outdoor exertion to be reduced; sensitive groups indoors.",
  very_unhealthy: "Outdoor exertion to be avoided by the whole population.",
  hazardous: "Outdoor activity to be suspended; emergency measures apply.",
  unknown: "Not assessable.",
};

const NEQS_PM25 = 35;
const NEQS_PM10 = 150;

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th scope="col" className={`field-label px-5 py-2.5 text-${align}`}>
      {children}
    </th>
  );
}

function headingFor(type: Dept) {
  switch (type) {
    case "health": return "Exposure by station";
    case "agriculture": return "Particulate composition by station";
    case "environment": return "NEQS compliance by station";
    case "safecity": return "Deviation from network mean";
  }
}

function noteFor(type: Dept) {
  switch (type) {
    case "health":
      return "Guidance is the published advice for each station's current index band. It describes conditions at the monitor, not a population-weighted exposure estimate.";
    case "agriculture":
      return "The PM10:PM2.5 ratio distinguishes coarse from fine particulate. A ratio above roughly 1.5 indicates dust or residue burning dominating; near 1.0 indicates combustion sources such as traffic and industry. Confirming a burning source requires satellite fire detection and wind data.";
    case "environment":
      return "Screened against the National Environmental Quality Standards 24-hour limits of 35 µg/m³ for PM2.5 and 150 µg/m³ for PM10. This is an indicative screening of instantaneous readings, not a compliance determination, which requires a full 24-hour average from an accredited instrument.";
    case "safecity":
      return "Deviation is each station's index minus the network mean. A wide spread indicates localised sources rather than a uniform airshed, and identifies where intervention would have the most effect.";
  }
}

export default function DepartmentAnalysis({ type, stations, networkMean }: Props) {
  const rows = stations.filter((s) => !s.stale && s.aqi !== null);

  if (rows.length === 0) return null;

  const sorted =
    type === "safecity"
      ? [...rows].sort((a, b) => (b.aqi || 0) - (a.aqi || 0))
      : [...rows].sort((a, b) => (b.aqi || 0) - (a.aqi || 0));

  return (
    <section className="panel">
      <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {headingFor(type)}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--paper-sunk)", borderBottom: "1px solid var(--rule)" }}>
              <Th>Station</Th>
              {type === "health" && (<><Th align="right">AQI</Th><Th>Band</Th><Th>Guidance</Th></>)}
              {type === "agriculture" && (<><Th align="right">PM2.5</Th><Th align="right">PM10</Th><Th align="right">Ratio</Th><Th>Indication</Th></>)}
              {type === "environment" && (<><Th align="right">PM2.5</Th><Th align="right">×NEQS</Th><Th align="right">PM10</Th><Th align="right">×NEQS</Th><Th>Screening</Th></>)}
              {type === "safecity" && (<><Th align="right">AQI</Th><Th align="right">Deviation</Th><Th>Band</Th></>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const cat = s.category;
              const ink = AQI_INK[cat];
              const border = i === 0 ? undefined : { borderTop: "1px solid var(--rule)" };
              const name = s.name.replace(/, Pakistan$/, "");

              const pm25 = s.pm25_ugm3;
              const pm10 = s.pm10_ugm3;
              const ratio = pm25 && pm10 ? pm10 / pm25 : null;
              const dev = (s.aqi || 0) - networkMean;

              return (
                <tr key={s.id} style={border}>
                  <th scope="row" className="px-5 py-3 text-left text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {name}
                  </th>

                  {type === "health" && (
                    <>
                      <td className="px-5 py-3 text-right text-sm font-bold tabular" style={{ color: ink }}>{s.aqi}</td>
                      <td className="px-5 py-3 text-xs font-semibold" style={{ color: ink }}>{AQI_LABELS[cat]}</td>
                      <td className="px-5 py-3 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
                        {HEALTH_GUIDANCE[cat]}
                      </td>
                    </>
                  )}

                  {type === "agriculture" && (
                    <>
                      <td className="px-5 py-3 text-right text-sm tabular" style={{ color: "var(--ink)" }}>{pm25 ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-sm tabular" style={{ color: "var(--ink)" }}>{pm10 ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-sm tabular font-semibold" style={{ color: "var(--ink)" }}>
                        {ratio ? ratio.toFixed(2) : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--ink-2)" }}>
                        {ratio == null
                          ? "Insufficient data"
                          : ratio >= 1.5
                            ? "Coarse fraction dominant — dust or residue burning"
                            : ratio >= 1.15
                              ? "Mixed sources"
                              : "Fine fraction dominant — combustion"}
                      </td>
                    </>
                  )}

                  {type === "environment" && (
                    <>
                      <td className="px-5 py-3 text-right text-sm tabular" style={{ color: "var(--ink)" }}>{pm25 ?? "—"}</td>
                      <td
                        className="px-5 py-3 text-right text-sm tabular font-semibold"
                        style={{ color: pm25 && pm25 > NEQS_PM25 ? "var(--aqi-unhealthy-ink)" : "var(--ink-2)" }}
                      >
                        {pm25 ? `${(pm25 / NEQS_PM25).toFixed(1)}×` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm tabular" style={{ color: "var(--ink)" }}>{pm10 ?? "—"}</td>
                      <td
                        className="px-5 py-3 text-right text-sm tabular font-semibold"
                        style={{ color: pm10 && pm10 > NEQS_PM10 ? "var(--aqi-unhealthy-ink)" : "var(--ink-2)" }}
                      >
                        {pm10 ? `${(pm10 / NEQS_PM10).toFixed(1)}×` : "—"}
                      </td>
                      <td
                        className="px-5 py-3 text-xs font-semibold"
                        style={{
                          color:
                            (pm25 && pm25 > NEQS_PM25) || (pm10 && pm10 > NEQS_PM10)
                              ? "var(--aqi-unhealthy-ink)"
                              : "var(--aqi-good-ink)",
                        }}
                      >
                        {(pm25 && pm25 > NEQS_PM25) || (pm10 && pm10 > NEQS_PM10) ? "Above limit" : "Within limit"}
                      </td>
                    </>
                  )}

                  {type === "safecity" && (
                    <>
                      <td className="px-5 py-3 text-right text-sm font-bold tabular" style={{ color: ink }}>{s.aqi}</td>
                      <td
                        className="px-5 py-3 text-right text-sm tabular font-semibold"
                        style={{ color: dev > 0 ? "var(--aqi-unhealthy-ink)" : "var(--ink-2)" }}
                      >
                        {dev > 0 ? "+" : ""}{dev}
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold" style={{ color: ink }}>
                        {AQI_LABELS[getAQICategory(s.aqi || 0)]}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {noteFor(type)}
        </p>
      </div>
    </section>
  );
}
