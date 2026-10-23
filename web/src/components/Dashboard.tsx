"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AQICard from "./AQICard";
import StationTable from "./StationTable";
import AQITrend from "./AQITrend";
import PollutantBreakdown from "./PollutantBreakdown";
import StationDetail, { type StationSeries } from "./StationDetail";
import ReferenceSection from "./ReferenceSection";
import DepartmentAnalysis from "./DepartmentAnalysis";
import ThemeToggle from "./ThemeToggle";
import type { DashboardData, SourceTier, TrendPoint } from "@/lib/types";
import { getAQICategory, AQI_COLORS, AQI_INK, AQI_LABELS, SOURCE_TIER_LABELS } from "@/lib/types";

const AQIMap = dynamic(() => import("./AQIMap"), { ssr: false });

function getHealthAdvisory(aqi: number) {
  if (aqi > 300) return { level: "EMERGENCY", message: "Hazardous air quality. All outdoor activities must be suspended. Schools and offices should close. N95 masks mandatory outdoors.", action: "STAY INDOORS", color: "var(--aqi-hazardous)" };
  if (aqi > 200) return { level: "SEVERE", message: "Very unhealthy air. Sensitive groups must stay indoors. Outdoor exercise prohibited. Consider N95 masks for essential outdoor trips.", action: "LIMIT EXPOSURE", color: "var(--aqi-very-unhealthy)" };
  if (aqi > 150) return { level: "WARNING", message: "Unhealthy air quality for all groups. Reduce prolonged outdoor exertion. Children, elderly, and respiratory patients should stay indoors.", action: "REDUCE OUTDOOR ACTIVITY", color: "var(--aqi-unhealthy)" };
  if (aqi > 100) return { level: "CAUTION", message: "Air quality is unhealthy for sensitive groups. People with asthma, heart or lung disease should reduce prolonged outdoor exertion.", action: "SENSITIVE GROUPS CAUTION", color: "var(--aqi-unhealthy-sensitive)" };
  if (aqi > 50) return { level: "MODERATE", message: "Air quality is acceptable. Some pollutants may be a concern for a small number of sensitive individuals.", action: "GENERALLY SAFE", color: "var(--aqi-moderate)" };
  return { level: "GOOD", message: "Air quality is satisfactory. No health risk from air pollution.", action: "ALL CLEAR", color: "var(--aqi-good)" };
}

function getSmogAdvisories(data: DashboardData) {
  const advisories: { icon: string; title: string; detail: string; severity: "critical" | "warning" | "info" }[] = [];
  const avg = data.city_avg_aqi;
  const reporting = data.stations.filter(s => !s.stale);
  const worstPm25 = Math.max(...reporting.map(s => s.pm25 || 0), 0);
  const borderStation = reporting.find(s => s.name.toLowerCase().includes("wagha") || s.name.toLowerCase().includes("border"));

  if (avg > 300) {
    advisories.push({ icon: "SCHOOL", title: "School Closure Advisory", detail: "AQI exceeds 300. Punjab govt protocol requires closure of all primary schools.", severity: "critical" });
  }
  if (avg > 200) {
    advisories.push({ icon: "MASK", title: "N95 Mask Advisory", detail: `Peak PM2.5 at ${worstPm25} µg/m³ — ${Math.round(worstPm25 / 15)}× the WHO guideline. N95 masks recommended for all outdoor activity.`, severity: "critical" });
  }
  if (borderStation && (borderStation.aqi || 0) > 200) {
    advisories.push({ icon: "BORDER", title: "Elevated Reading at Border Station", detail: `Wagha Border AQI at ${borderStation.aqi}. Source attribution requires satellite fire data and wind modelling.`, severity: "warning" });
  }
  if (avg > 150) {
    advisories.push({ icon: "CAR", title: "Traffic Restriction Threshold", detail: "Network AQI above 150 — the band at which odd-even and construction curbs are typically considered.", severity: "warning" });
  }
  if (avg > 100) {
    advisories.push({ icon: "HEALTH", title: "Hospital Alert", detail: "Respiratory OPD cases expected to surge. Healthcare facilities should prepare additional capacity.", severity: "info" });
  }
  return advisories;
}

const TABS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "health", label: "Health", icon: "heart" },
  { id: "agriculture", label: "Agriculture", icon: "leaf" },
  { id: "environment", label: "Environment", icon: "globe" },
  { id: "safecity", label: "Safe City", icon: "shield" },
  { id: "reference", label: "Reference", icon: "book" },
] as const;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<{ points: TrendPoint[]; stations: StationSeries[]; enabled: boolean }>({
    points: [],
    stations: [],
    enabled: false,
  });
  const [time, setTime] = useState("");

  useEffect(() => {
    const loadAqi = async () => {
      try {
        const res = await fetch("/api/aqi");
        const body = await res.json();
        if (!res.ok) {
          setError(body.error || "Live data is unavailable.");
          setData(null);
        } else {
          setError(null);
          setData(body);
        }
      } catch {
        setError("Could not reach the monitoring service.");
      } finally {
        setLoading(false);
      }
    };

    const loadTrend = async () => {
      try {
        const res = await fetch("/api/trend");
        const body = await res.json();
        setTrend({
          points: body.points || [],
          stations: body.stations || [],
          enabled: Boolean(body.enabled),
        });
      } catch {
        setTrend({ points: [], stations: [], enabled: false });
      }
    };

    loadAqi();
    loadTrend();

    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Karachi",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();

    const interval = setInterval(() => { loadAqi(); loadTrend(); }, 5 * 60 * 1000);
    const clock = setInterval(tick, 1000);

    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--rule)", borderTopColor: "var(--ink-2)" }}
        />
        <div className="text-sm" style={{ color: "var(--ink-3)" }}>Retrieving station readings…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="panel max-w-md p-8 rule-top">
          <p className="field-label">Notice</p>
          <h1 className="text-xl font-semibold mt-2" style={{ color: "var(--ink)" }}>
            Live data unavailable
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {error || "No monitoring data could be retrieved."}
          </p>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--ink-3)" }}>
            No readings are displayed rather than values that cannot be verified against a
            source station.
          </p>
        </div>
      </div>
    );
  }

  const advisory = getHealthAdvisory(data.city_avg_aqi);
  const category = getAQICategory(data.city_avg_aqi);
  const accentColor = AQI_COLORS[category];
  const inkColor = AQI_INK[category];

  const issued = new Date(data.last_updated);
  const reference = `LAQ-${issued.getUTCFullYear()}${String(issued.getUTCMonth() + 1).padStart(2, "0")}${String(issued.getUTCDate()).padStart(2, "0")}-${String(issued.getUTCHours()).padStart(2, "0")}${String(issued.getUTCMinutes()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <div className="masthead-bar" style={{ background: "var(--masthead)" }}>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-4">
          <p
            className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--masthead-ink-2)" }}
          >
            Lahore Air Quality Monitoring
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <ThemeToggle />
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--masthead-ink-3)" }}>
              Ref {reference}
            </span>
            <span className="font-mono text-xs tabular" style={{ color: "var(--masthead-ink)" }}>
              {time} <span style={{ color: "var(--masthead-ink-3)" }}>PKT</span>
            </span>
          </div>
        </div>
      </div>

      {/* Title block */}
      <header style={{ background: "var(--paper-raised)", borderBottom: `1px solid var(--rule)` }}>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-7 pb-0">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1
                className="text-[26px] sm:text-[32px] leading-none font-bold tracking-tight"
                style={{ fontFamily: "var(--font-masthead), Georgia, serif", color: "var(--ink)" }}
              >
                Lahore Air Quality Bulletin
              </h1>
              <p className="text-sm mt-2.5 max-w-xl leading-relaxed" style={{ color: "var(--ink-2)" }}>
                Readings aggregated from the Punjab air quality network and independent
                monitoring stations across the Lahore district.
              </p>
            </div>
            <dl className="flex gap-7 pb-1">
              <div>
                <dt className="field-label">Issued</dt>
                <dd className="text-sm mt-1 tabular" style={{ color: "var(--ink)" }}>
                  {issued.toLocaleString("en-GB", {
                    timeZone: "Asia/Karachi",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </dd>
              </div>
              <div>
                <dt className="field-label">Stations</dt>
                <dd className="text-sm mt-1 tabular" style={{ color: "var(--ink)" }}>
                  {data.reporting_count} of {data.stations.length} reporting
                </dd>
              </div>
            </dl>
          </div>

          {/* Section tabs */}
          <nav className="flex gap-6 mt-6 overflow-x-auto no-print" aria-label="Bulletin sections">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className="pb-3 text-sm whitespace-nowrap transition-colors"
                  style={{
                    color: active ? "var(--ink)" : "var(--ink-3)",
                    fontWeight: active ? 600 : 450,
                    borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Standing advisory strip */}
      {data.city_avg_aqi > 150 && (
        <div
          style={{
            background: "var(--paper-sunk)",
            borderBottom: `1px solid var(--rule)`,
            borderLeft: `4px solid ${accentColor}`,
          }}
        >
          <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-2.5 flex items-baseline gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: inkColor }}>
              {advisory.level}
            </span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              {advisory.action} — network average AQI {data.city_avg_aqi}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7">
        {activeTab === "overview" && (
          <OverviewTab data={data} trend={trend} advisory={advisory} />
        )}
        {activeTab === "health" && <DepartmentTab type="health" data={data} />}
        {activeTab === "agriculture" && <DepartmentTab type="agriculture" data={data} />}
        {activeTab === "environment" && <DepartmentTab type="environment" data={data} />}
        {activeTab === "safecity" && <DepartmentTab type="safecity" data={data} />}
        {activeTab === "reference" && <ReferenceSection />}
      </main>

      {/* Footer — data provenance */}
      <footer style={{ borderTop: `1px solid var(--rule)`, background: "var(--paper-sunk)" }}>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-7">
            <div>
              <p className="field-label">Data sources</p>
              <ul className="mt-2.5 space-y-1.5">
                {data.sources.map((s) => (
                  <li key={s.attribution} className="text-xs flex items-start gap-2" style={{ color: "var(--ink-2)" }}>
                    <TierDot tier={s.tier} />
                    <span>
                      {s.attribution}
                      <span style={{ color: "var(--ink-3)" }}>
                        {" "}— {s.station_count} station{s.station_count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="field-label">Basis of this bulletin</p>
              <p className="text-xs mt-2.5 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                Readings are retrieved via the World Air Quality Index Project (waqi.info).
                Aggregates are computed from the {data.reporting_count} station
                {data.reporting_count === 1 ? "" : "s"} that reported within the preceding six hours
                {data.excluded_count > 0 && (
                  <>
                    ; {data.excluded_count} station{data.excluded_count === 1 ? " is" : "s are"}{" "}
                    excluded as not currently reporting
                  </>
                )}
                . Categories follow the US EPA AQI scale.
              </p>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--ink-3)" }}>
                This bulletin is produced independently and is not an official publication of any
                government department. Readings are indicative and are not a substitute for
                accredited regulatory monitoring.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AQIGauge({ value, size = 190 }: { value: number; size?: number }) {
  const category = getAQICategory(value);
  const color = AQI_COLORS[category];
  const ink = AQI_INK[category];
  const radius = (size - 24) / 2;
  const circumference = Math.PI * radius;
  // The EPA scale is open-ended above 500; clamp so the arc never overruns.
  const percent = Math.min(value / 500, 1);
  const offset = circumference * (1 - percent);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 42 }}>
      <svg
        width={size}
        height={size / 2 + 12}
        viewBox={`0 0 ${size} ${size / 2 + 12}`}
        role="img"
        aria-label={`Air quality index ${value}, ${AQI_LABELS[category]}`}
      >
        <path
          d={`M 12 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="10"
        />
        <path
          d={`M 12 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="aqi-ring"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <div className="text-[44px] leading-none font-bold tabular" style={{ color: ink }}>
          {value}
        </div>
        <div className="text-xs font-semibold mt-1.5" style={{ color: ink }}>
          {AQI_LABELS[category]}
        </div>
      </div>
    </div>
  );
}

export const TIER_COLORS: Record<SourceTier, string> = {
  official: "var(--tier-official)",
  citizen: "var(--tier-citizen)",
  reference: "var(--tier-reference)",
};

function TierDot({ tier }: { tier: SourceTier }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
      style={{ background: TIER_COLORS[tier] }}
      title={SOURCE_TIER_LABELS[tier]}
    />
  );
}

/** Mean over stations that actually report the field, not over all stations. */
function meanOf(stations: { pm25: number | null }[]): number | null {
  const vals = stations.map((s) => s.pm25).filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function OverviewTab({ data, trend, advisory }: {
  data: DashboardData;
  trend: { points: TrendPoint[]; stations: StationSeries[]; enabled: boolean };
  advisory: ReturnType<typeof getHealthAdvisory>;
}) {
  const reporting = data.stations.filter((s) => !s.stale);
  const smogAdvisories = getSmogAdvisories(data);
  const pm25Avg = meanOf(reporting);
  const whoMultiple = pm25Avg !== null ? Math.round(pm25Avg / 15) : null;

  const severityInk: Record<string, string> = {
    critical: "var(--aqi-unhealthy-ink)",
    warning: "var(--aqi-unhealthy-sensitive-ink)",
    info: "var(--accent)",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary: City AQI + Advisory */}
      <section className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <div className="panel rule-top p-6 flex flex-col items-center justify-center text-center">
          <p className="field-label">Network average AQI</p>
          <div className="mt-3">
            <AQIGauge value={data.city_avg_aqi} />
          </div>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            Mean of {data.reporting_count} reporting station{data.reporting_count === 1 ? "" : "s"}
          </p>
          {whoMultiple !== null && (
            <p className="text-xs mt-2 pt-2.5 w-full" style={{ color: "var(--ink-2)", borderTop: "1px solid var(--rule)" }}>
              PM2.5 at{" "}
              <span className="font-semibold" style={{ color: "var(--ink)" }}>{whoMultiple}×</span>{" "}
              the WHO 24-hour guideline
            </p>
          )}
        </div>

        <div className="panel rule-top p-6">
          <p className="field-label">Public health advisory</p>
          <h2 className="text-base font-semibold mt-2" style={{ color: "var(--ink)" }}>
            {advisory.action}
          </h2>
          <p className="text-sm mt-2 leading-relaxed max-w-2xl" style={{ color: "var(--ink-2)" }}>
            {advisory.message}
          </p>

          {smogAdvisories.length > 0 && (
            <dl className="mt-5 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
              {smogAdvisories.slice(0, 4).map((adv, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 py-2"
                  style={i > 0 ? { borderTop: "1px solid var(--rule)" } : undefined}
                >
                  <dt
                    className="text-[10px] font-bold uppercase tracking-wider pt-0.5"
                    style={{ color: severityInk[adv.severity] }}
                  >
                    {adv.icon}
                  </dt>
                  <dd>
                    <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      {adv.title}
                    </span>
                    <span className="text-xs ml-2 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      {adv.detail}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {data.worst_station && (
          <AQICard label="Worst Station" value={data.worst_station.aqi!} category={data.worst_station.category} subtitle={data.worst_station.name} />
        )}
        {data.best_station && (
          <AQICard label="Best Station" value={data.best_station.aqi!} category={data.best_station.category} subtitle={data.best_station.name} />
        )}
        <AQICard
          label="Reporting Stations"
          value={data.reporting_count}
          category="moderate"
          subtitle={data.excluded_count > 0 ? `${data.excluded_count} not reporting` : "All stations current"}
        />
        {pm25Avg !== null && (
          <AQICard
            label="PM2.5 Average"
            value={pm25Avg}
            category={getAQICategory(pm25Avg)}
            subtitle="µg/m³ · WHO guideline 15"
          />
        )}
      </div>

      {/* Map */}
      <section className="panel">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--rule)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Station locations
          </h3>
        </div>
        <div className="p-1.5">
          <AQIMap stations={reporting} />
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AQITrend data={trend.points} enabled={trend.enabled} />
        <PollutantBreakdown stations={reporting} measured={data.measured_pollutants} />
      </div>

      {/* Per-station records */}
      <StationDetail stations={trend.stations} />

      {/* Station Table */}
      <StationTable stations={data.stations} />
    </div>
  );
}

function DepartmentTab({ type, data }: { type: string; data: DashboardData }) {
  const reporting = data.stations.filter((s) => !s.stale);
  const pm25Avg = meanOf(reporting);
  const pm25Text = pm25Avg !== null ? `${pm25Avg}` : "—";

  const configs: Record<string, { title: string; subtitle: string; description: string; metrics: { label: string; value: string; detail: string; severity?: string; derived?: boolean }[] }> = {
    health: {
      title: "Health Impact Assessment",
      subtitle: "Department of Health & Population",
      description: "Real-time air quality impact on public health. Tracks respiratory risk, hospital preparedness, and vulnerable population exposure.",
      metrics: [
        { label: "Health Risk Level", value: data.city_avg_aqi > 200 ? "SEVERE" : data.city_avg_aqi > 150 ? "HIGH" : data.city_avg_aqi > 100 ? "MODERATE" : "LOW", detail: "US EPA AQI health category for the network mean", severity: data.city_avg_aqi > 200 ? "critical" : data.city_avg_aqi > 150 ? "warning" : "info", derived: true },
        { label: "Public Advisory", value: data.city_avg_aqi > 200 ? "Stay Indoors" : data.city_avg_aqi > 150 ? "Limit Outdoors" : "Normal", detail: "US EPA AQI guidance for sensitive groups", derived: true },
        { label: "PM2.5 Exposure", value: pm25Text, detail: pm25Avg !== null ? `µg/m³ — ${Math.round(pm25Avg / 15)}× the WHO 24-hour guideline of 15 µg/m³` : "Not reported by the network", severity: "warning" },
        { label: "Unhealthy Stations", value: `${reporting.filter(s => (s.aqi || 0) > 150).length} of ${reporting.length}`, detail: "Reporting stations above AQI 150" },
      ],
    },
    agriculture: {
      title: "Agricultural Impact Monitor",
      subtitle: "Department of Agriculture",
      description: "Particulate load across the network during the Rabi season. Crop-yield and burn-attribution conclusions require ground survey and satellite fire data, which this network does not provide.",
      metrics: [
        { label: "Particulate Load", value: data.city_avg_aqi > 200 ? "SEVERE" : data.city_avg_aqi > 150 ? "HIGH" : "MODERATE", detail: "Banded from network AQI. Yield impact requires ground survey to confirm.", severity: data.city_avg_aqi > 200 ? "critical" : "warning", derived: true },
        { label: "PM10 Average", value: (() => { const v = reporting.map(s => s.pm10).filter((x): x is number => typeof x === "number"); return v.length ? `${Math.round(v.reduce((a, b) => a + b, 0) / v.length)}` : "—"; })(), detail: "µg/m³ — coarse particulates, the dust and crop-burn fraction" },
        { label: "PM10 Spike Stations", value: `${reporting.filter(s => (s.pm10 || 0) > 200).length} of ${reporting.length}`, detail: "Stations above 200 µg/m³ PM10. Burn attribution needs satellite fire data.", severity: reporting.filter(s => (s.pm10 || 0) > 200).length > 1 ? "critical" : "info", derived: true },
        { label: "Wagha Border AQI", value: `${reporting.find(s => s.name.toLowerCase().includes("wagha") || s.name.toLowerCase().includes("border"))?.aqi ?? "—"}`, detail: "Easternmost station — proximity indicator only, not an attribution" },
      ],
    },
    environment: {
      title: "Environmental Compliance",
      subtitle: "Punjab EPA / Environment Department",
      description: "National Environmental Quality Standards (NEQS) compliance tracking, emission source analysis, and regulatory enforcement data.",
      metrics: [
        { label: "NEQS Status", value: pm25Avg !== null && pm25Avg > 35 ? "ABOVE LIMIT" : "WITHIN LIMIT", detail: "Indicative screening against NEQS PM2.5 24-hour limit of 35 µg/m³", severity: pm25Avg !== null && pm25Avg > 35 ? "critical" : "info", derived: true },
        { label: "Dominant Pollutant", value: "PM2.5", detail: "Reported by WAQI as the dominant pollutant at these stations" },
        { label: "Above NEQS PM2.5", value: `${reporting.filter(s => (s.pm25 || 0) > 35).length} of ${reporting.length}`, detail: "Reporting stations above 35 µg/m³", severity: "warning" },
        { label: "Avg PM2.5", value: pm25Avg !== null ? `${pm25Avg} µg/m³` : "—", detail: "Network mean against the NEQS limit of 35 µg/m³" },
      ],
    },
    safecity: {
      title: "Urban Safety & Enforcement",
      subtitle: "Punjab Safe City Authority",
      description: "Smog hotspot identification, traffic safety impact assessment, and enforcement priority mapping for anti-smog operations.",
      metrics: [
        { label: "Stations Above 200", value: `${reporting.filter(s => (s.aqi || 0) > 200).length}`, detail: "Reporting stations in the Very Unhealthy band or worse", severity: reporting.filter(s => (s.aqi || 0) > 200).length > 0 ? "critical" : "info" },
        { label: "Highest Reading", value: data.worst_station?.name.replace(/, Pakistan$/, "") || "—", detail: `AQI ${data.worst_station?.aqi ?? "—"} — single station, not a zone boundary`, severity: "critical" },
        { label: "Suggested Priority", value: data.city_avg_aqi > 300 ? "EMERGENCY" : data.city_avg_aqi > 200 ? "CRITICAL" : "ELEVATED", detail: "Banded from network AQI. Deployment decisions rest with the Authority.", severity: data.city_avg_aqi > 200 ? "critical" : "warning", derived: true },
        { label: "Network Spread", value: (() => { const v = reporting.map(s => s.aqi || 0); return v.length ? `${Math.min(...v)}–${Math.max(...v)}` : "—"; })(), detail: "AQI range across reporting stations — wide spread means localised sources" },
      ],
    },
  };

  const config = configs[type];
  if (!config) return null;

  const severityInk: Record<string, string> = {
    critical: "var(--aqi-unhealthy-ink)",
    warning: "var(--aqi-unhealthy-sensitive-ink)",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="panel rule-top p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="field-label">{config.subtitle}</p>
            <h2
              className="text-2xl font-bold mt-1.5 tracking-tight"
              style={{ fontFamily: "var(--font-masthead), Georgia, serif", color: "var(--ink)" }}
            >
              {config.title}
            </h2>
            <p className="text-sm mt-2.5 max-w-2xl leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {config.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="field-label">Network AQI</p>
            <div
              className="text-4xl font-bold tabular mt-1"
              style={{ color: AQI_INK[getAQICategory(data.city_avg_aqi)] }}
            >
              {data.city_avg_aqi}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {config.metrics.map((metric, i) => (
          <div key={i} className="panel p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="field-label">{metric.label}</p>
              {metric.derived && (
                <span
                  className="text-[8px] px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0"
                  style={{
                    background: "var(--paper-sunk)",
                    color: "var(--ink-3)",
                    border: "1px solid var(--rule)",
                  }}
                  title="Computed from AQI thresholds, not directly measured"
                >
                  Derived
                </span>
              )}
            </div>
            <p
              className="text-xl font-bold mt-2 tabular"
              style={{ color: severityInk[metric.severity ?? ""] ?? "var(--ink)" }}
            >
              {metric.value}
            </p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {metric.detail}
            </p>
          </div>
        ))}
      </div>

      <DepartmentAnalysis
        type={type as "health" | "agriculture" | "environment" | "safecity"}
        stations={data.stations}
        networkMean={data.city_avg_aqi}
      />

      <section className="panel">
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--rule)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Station locations
          </h3>
        </div>
        <div className="p-1.5">
          <AQIMap stations={reporting} />
        </div>
      </section>

      <StationTable stations={data.stations} />
    </div>
  );
}
