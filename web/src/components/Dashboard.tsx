"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AQICard from "./AQICard";
import StationTable from "./StationTable";
import AQITrend from "./AQITrend";
import PollutantBreakdown from "./PollutantBreakdown";
import type { DashboardData } from "@/lib/types";
import { getAQICategory, AQI_COLORS, AQI_LABELS } from "@/lib/types";

const AQIMap = dynamic(() => import("./AQIMap"), { ssr: false });

function generateMockTrend(): { time: string; aqi: number }[] {
  const points = [];
  for (let i = 23; i >= 0; i--) {
    const base = 160 + Math.sin(i / 3) * 40;
    const noise = (i * 7 + 13) % 30 - 15;
    points.push({
      time: `${(24 - i) % 24}:00`,
      aqi: Math.round(base + noise),
    });
  }
  return points;
}

function getHealthAdvisory(aqi: number) {
  if (aqi > 300) return { level: "EMERGENCY", message: "Hazardous air quality. All outdoor activities must be suspended. Schools and offices should close. N95 masks mandatory outdoors.", action: "STAY INDOORS", color: "#dc2626" };
  if (aqi > 200) return { level: "SEVERE", message: "Very unhealthy air. Sensitive groups must stay indoors. Outdoor exercise prohibited. Consider N95 masks for essential outdoor trips.", action: "LIMIT EXPOSURE", color: "#a855f7" };
  if (aqi > 150) return { level: "WARNING", message: "Unhealthy air quality for all groups. Reduce prolonged outdoor exertion. Children, elderly, and respiratory patients should stay indoors.", action: "REDUCE OUTDOOR ACTIVITY", color: "#ef4444" };
  if (aqi > 100) return { level: "CAUTION", message: "Air quality is unhealthy for sensitive groups. People with asthma, heart or lung disease should reduce prolonged outdoor exertion.", action: "SENSITIVE GROUPS CAUTION", color: "#f97316" };
  if (aqi > 50) return { level: "MODERATE", message: "Air quality is acceptable. Some pollutants may be a concern for a small number of sensitive individuals.", action: "GENERALLY SAFE", color: "#eab308" };
  return { level: "GOOD", message: "Air quality is satisfactory. No health risk from air pollution.", action: "ALL CLEAR", color: "#22c55e" };
}

function getSmogAdvisories(data: DashboardData) {
  const advisories: { icon: string; title: string; detail: string; severity: "critical" | "warning" | "info" }[] = [];
  const avg = data.city_avg_aqi;
  const worstPm25 = Math.max(...data.stations.map(s => s.pm25 || 0));
  const borderStation = data.stations.find(s => s.name.toLowerCase().includes("wagha") || s.name.toLowerCase().includes("border"));

  if (avg > 300) {
    advisories.push({ icon: "SCHOOL", title: "School Closure Advisory", detail: "AQI exceeds 300. Punjab govt protocol requires closure of all primary schools.", severity: "critical" });
  }
  if (avg > 200) {
    advisories.push({ icon: "MASK", title: "N95 Mask Advisory", detail: `PM2.5 at ${worstPm25} ug/m3 — ${Math.round(worstPm25 / 15)}x WHO safe limit. N95 masks recommended for all outdoor activity.`, severity: "critical" });
  }
  if (borderStation && (borderStation.aqi || 0) > 200) {
    advisories.push({ icon: "FIRE", title: "Cross-Border Pollution Detected", detail: `Wagha Border AQI at ${borderStation.aqi}. Likely crop burning contribution from across the border.`, severity: "warning" });
  }
  if (avg > 150) {
    advisories.push({ icon: "CAR", title: "Traffic Restriction Zone", detail: "AQI above 150. Odd-even vehicle policy and construction ban should be enforced in high-AQI zones.", severity: "warning" });
    advisories.push({ icon: "CROP", title: "Agricultural Impact", detail: `Prolonged exposure above AQI 150 reduces crop yield by 10-30%. Current streak affecting wheat sowing season.`, severity: "warning" });
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
] as const;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [trendData] = useState(() => generateMockTrend());
  const [time, setTime] = useState("");

  useEffect(() => {
    fetch("/api/aqi")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/aqi").then((r) => r.json()).then(setData);
    }, 5 * 60 * 1000);

    const clock = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);

    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        <div className="text-zinc-500 text-sm">Loading air quality data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Failed to load data</div>
      </div>
    );
  }

  const advisory = getHealthAdvisory(data.city_avg_aqi);
  const category = getAQICategory(data.city_avg_aqi);
  const accentColor = AQI_COLORS[category];

  return (
    <div className="min-h-screen">
      {/* Emergency Banner */}
      {data.city_avg_aqi > 200 && (
        <div
          className="px-4 py-2.5 text-center text-sm font-medium"
          style={{ background: `linear-gradient(90deg, ${advisory.color}15, ${advisory.color}25, ${advisory.color}15)`, borderBottom: `1px solid ${advisory.color}30` }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: advisory.color }} />
            <span style={{ color: advisory.color }}>{advisory.level} ALERT</span>
            <span className="text-zinc-400 hidden sm:inline">— {advisory.action}</span>
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                LH
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
                  Lahore Smog Dashboard
                </h1>
                <p className="text-xs text-zinc-500">
                  Punjab Environmental Monitoring Network
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulse-glow 2s infinite" }} />
                <span className="text-xs text-zinc-400">LIVE</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-zinc-300 tabular-nums">{time}</div>
                <div className="text-[10px] text-zinc-600">PKT (UTC+5)</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-0.5 mt-4 -mb-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-zinc-900 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                }`}
                style={activeTab === tab.id ? { borderBottom: `2px solid ${accentColor}` } : {}}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {activeTab === "overview" && <OverviewTab data={data} trendData={trendData} advisory={advisory} />}
        {activeTab === "health" && <DepartmentTab type="health" data={data} />}
        {activeTab === "agriculture" && <DepartmentTab type="agriculture" data={data} />}
        {activeTab === "environment" && <DepartmentTab type="environment" data={data} />}
        {activeTab === "safecity" && <DepartmentTab type="safecity" data={data} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-4 px-6 text-center">
        <p className="text-[11px] text-zinc-600">
          Data sourced from WAQI (World Air Quality Index) network. Readings update every 5 minutes.
          Not for regulatory or emergency decision-making without verification.
        </p>
      </footer>
    </div>
  );
}

function AQIGauge({ value, size = 160 }: { value: number; size?: number }) {
  const category = getAQICategory(value);
  const color = AQI_COLORS[category];
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const percent = Math.min(value / 500, 1);
  const offset = circumference * (1 - percent);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 30 }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke="#1a1a22"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="aqi-ring"
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <div className="text-4xl font-bold tabular-nums" style={{ color }}>{value}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color: color + "cc" }}>{AQI_LABELS[category]}</div>
      </div>
    </div>
  );
}

function OverviewTab({ data, trendData, advisory }: {
  data: DashboardData;
  trendData: { time: string; aqi: number }[];
  advisory: ReturnType<typeof getHealthAdvisory>;
}) {
  const smogAdvisories = getSmogAdvisories(data);
  const whoMultiple = Math.round(
    data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length / 15
  );

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Hero: City AQI + Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-bright rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">City Average AQI</p>
          <AQIGauge value={data.city_avg_aqi} />
          <p className="text-xs text-zinc-600 mt-2">
            WHO PM2.5 exposure: <span className="text-zinc-300 font-semibold">{whoMultiple}x</span> safe limit
          </p>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold" style={{ background: advisory.color + "20", color: advisory.color }}>
              !
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">{advisory.level} — {advisory.action}</h3>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{advisory.message}</p>
            </div>
          </div>

          {smogAdvisories.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/50">
              {smogAdvisories.slice(0, 4).map((adv, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    adv.severity === "critical" ? "bg-red-500/10 text-red-400" :
                    adv.severity === "warning" ? "bg-amber-500/10 text-amber-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {adv.icon}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-zinc-300">{adv.title}</span>
                    <span className="text-xs text-zinc-500 ml-2">{adv.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.worst_station && (
          <AQICard label="Worst Station" value={data.worst_station.aqi!} category={data.worst_station.category} subtitle={data.worst_station.name} />
        )}
        {data.best_station && (
          <AQICard label="Best Station" value={data.best_station.aqi!} category={data.best_station.category} subtitle={data.best_station.name} />
        )}
        <AQICard label="Active Stations" value={data.stations.length} category="moderate" subtitle="Monitoring points" />
        <AQICard
          label="PM2.5 Average"
          value={Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length)}
          category={getAQICategory(Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length))}
          subtitle="ug/m3 (WHO limit: 15)"
        />
      </div>

      {/* Map */}
      <div className="glass rounded-2xl p-1.5">
        <AQIMap stations={data.stations} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AQITrend data={trendData} />
        <PollutantBreakdown stations={data.stations} />
      </div>

      {/* Station Table */}
      <StationTable stations={data.stations} />
    </div>
  );
}

function DepartmentTab({ type, data }: { type: string; data: DashboardData }) {
  const configs: Record<string, { title: string; subtitle: string; description: string; metrics: { label: string; value: string; detail: string; severity?: string }[] }> = {
    health: {
      title: "Health Impact Assessment",
      subtitle: "Department of Health & Population",
      description: "Real-time air quality impact on public health. Tracks respiratory risk, hospital preparedness, and vulnerable population exposure.",
      metrics: [
        { label: "Health Risk Level", value: data.city_avg_aqi > 200 ? "SEVERE" : data.city_avg_aqi > 150 ? "HIGH" : data.city_avg_aqi > 100 ? "MODERATE" : "LOW", detail: "Population exposure risk", severity: data.city_avg_aqi > 200 ? "critical" : data.city_avg_aqi > 150 ? "warning" : "info" },
        { label: "Public Advisory", value: data.city_avg_aqi > 200 ? "Stay Indoors" : data.city_avg_aqi > 150 ? "Limit Outdoors" : "Normal", detail: "For sensitive groups: children, elderly, respiratory patients" },
        { label: "PM2.5 Exposure", value: `${Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length)}`, detail: `ug/m3 — ${Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length / 15)}x WHO 24hr limit (15 ug/m3)`, severity: "warning" },
        { label: "Unhealthy Stations", value: `${data.stations.filter(s => (s.aqi || 0) > 150).length} of ${data.stations.length}`, detail: "Stations exceeding AQI 150 threshold" },
      ],
    },
    agriculture: {
      title: "Agricultural Impact Monitor",
      subtitle: "Department of Agriculture",
      description: "Smog impact on crop health, visibility for crop burning detection, and seasonal pollution patterns affecting the Rabi season.",
      metrics: [
        { label: "Crop Damage Risk", value: data.city_avg_aqi > 200 ? "SEVERE" : data.city_avg_aqi > 150 ? "HIGH" : "MODERATE", detail: "PM2.5/O3 impact on photosynthesis and yield", severity: data.city_avg_aqi > 200 ? "critical" : "warning" },
        { label: "Visibility", value: data.city_avg_aqi > 300 ? "< 500m" : data.city_avg_aqi > 200 ? "500m-1km" : data.city_avg_aqi > 150 ? "1-2km" : "> 3km", detail: "Estimated from particulate density" },
        { label: "Crop Burn Signal", value: data.stations.filter(s => (s.pm10 || 0) > 200).length > 1 ? "DETECTED" : "LOW", detail: "PM10 spike pattern near India border", severity: data.stations.filter(s => (s.pm10 || 0) > 200).length > 1 ? "critical" : "info" },
        { label: "Wagha Border AQI", value: `${data.stations.find(s => s.name.toLowerCase().includes("wagha") || s.name.toLowerCase().includes("border"))?.aqi ?? "—"}`, detail: "Cross-border pollution indicator" },
      ],
    },
    environment: {
      title: "Environmental Compliance",
      subtitle: "Punjab EPA / Environment Department",
      description: "National Environmental Quality Standards (NEQS) compliance tracking, emission source analysis, and regulatory enforcement data.",
      metrics: [
        { label: "NEQS Status", value: data.city_avg_aqi > 150 ? "NON-COMPLIANT" : "COMPLIANT", detail: "National Environmental Quality Standards", severity: data.city_avg_aqi > 150 ? "critical" : "info" },
        { label: "Primary Pollutant", value: "PM2.5", detail: "Dominant pollutant across all stations year-round" },
        { label: "Exceeding NEQS", value: `${data.stations.filter(s => (s.pm25 || 0) > 35).length} stations`, detail: "PM2.5 above 35 ug/m3 (NEQS 24hr limit)", severity: "warning" },
        { label: "Avg PM2.5", value: `${Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length)} ug/m3`, detail: "Network average vs NEQS limit of 35 ug/m3" },
      ],
    },
    safecity: {
      title: "Urban Safety & Enforcement",
      subtitle: "Punjab Safe City Authority",
      description: "Smog hotspot identification, traffic safety impact assessment, and enforcement priority mapping for anti-smog operations.",
      metrics: [
        { label: "Hotspot Zones", value: `${data.stations.filter(s => (s.aqi || 0) > 200).length}`, detail: "Areas with AQI > 200 requiring intervention", severity: data.stations.filter(s => (s.aqi || 0) > 200).length > 0 ? "critical" : "info" },
        { label: "Worst Zone", value: data.worst_station?.name.replace(/, Pakistan$/, "") || "—", detail: `AQI: ${data.worst_station?.aqi ?? "—"}`, severity: "critical" },
        { label: "Enforcement Level", value: data.city_avg_aqi > 300 ? "EMERGENCY" : data.city_avg_aqi > 200 ? "CRITICAL" : "ELEVATED", detail: "Anti-smog squad deployment priority", severity: data.city_avg_aqi > 200 ? "critical" : "warning" },
        { label: "Visibility Alert", value: data.city_avg_aqi > 300 ? "ACTIVE" : data.city_avg_aqi > 200 ? "WATCH" : "CLEAR", detail: "Motorway and GT Road traffic safety" },
      ],
    },
  };

  const config = configs[type];
  if (!config) return null;

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="glass-bright rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">{config.subtitle}</p>
            <h2 className="text-xl font-semibold text-zinc-100">{config.title}</h2>
            <p className="text-sm text-zinc-500 mt-2 max-w-2xl leading-relaxed">{config.description}</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-3xl font-bold tabular-nums" style={{ color: AQI_COLORS[getAQICategory(data.city_avg_aqi)] }}>{data.city_avg_aqi}</div>
            <div className="text-[10px] text-zinc-500 uppercase">City AQI</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {config.metrics.map((metric, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{metric.label}</p>
            <p className={`text-xl font-bold mt-1.5 tabular-nums ${
              metric.severity === "critical" ? "text-red-400" :
              metric.severity === "warning" ? "text-amber-400" :
              "text-zinc-100"
            }`}>
              {metric.value}
            </p>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-1.5">
        <AQIMap stations={data.stations} />
      </div>

      <StationTable stations={data.stations} />
    </div>
  );
}
