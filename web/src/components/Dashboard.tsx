"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AQICard from "./AQICard";
import StationTable from "./StationTable";
import AQITrend from "./AQITrend";
import PollutantBreakdown from "./PollutantBreakdown";
import type { DashboardData, Station } from "@/lib/types";
import { getAQICategory } from "@/lib/types";

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

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "health", label: "Health" },
  { id: "agriculture", label: "Agriculture" },
  { id: "environment", label: "Environment" },
  { id: "safecity", label: "Safe City" },
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [trendData] = useState(() => generateMockTrend());

  useEffect(() => {
    fetch("/api/aqi")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/aqi")
        .then((r) => r.json())
        .then(setData);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading air quality data...</div>
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                Lahore Smog Dashboard
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Centralized Air Quality Monitoring
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
              <span className="text-xs text-zinc-600">
                Updated{" "}
                {new Date(data.last_updated).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 mt-4 -mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-zinc-800 text-zinc-100 border-b-2 border-emerald-500"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "overview" && (
          <OverviewTab data={data} trendData={trendData} />
        )}
        {activeTab === "health" && <DepartmentTab type="health" data={data} />}
        {activeTab === "agriculture" && (
          <DepartmentTab type="agriculture" data={data} />
        )}
        {activeTab === "environment" && (
          <DepartmentTab type="environment" data={data} />
        )}
        {activeTab === "safecity" && (
          <DepartmentTab type="safecity" data={data} />
        )}
      </main>
    </div>
  );
}

function OverviewTab({
  data,
  trendData,
}: {
  data: DashboardData;
  trendData: { time: string; aqi: number }[];
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AQICard
          label="City Average AQI"
          value={data.city_avg_aqi}
          category={getAQICategory(data.city_avg_aqi)}
          subtitle="Across all monitoring stations"
        />
        {data.worst_station && (
          <AQICard
            label="Worst Station"
            value={data.worst_station.aqi!}
            category={data.worst_station.category}
            subtitle={data.worst_station.name}
          />
        )}
        {data.best_station && (
          <AQICard
            label="Best Station"
            value={data.best_station.aqi!}
            category={data.best_station.category}
            subtitle={data.best_station.name}
          />
        )}
        <AQICard
          label="Active Stations"
          value={data.stations.length}
          category="moderate"
          subtitle="Monitoring locations"
        />
      </div>

      {/* Map */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        <AQIMap stations={data.stations} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AQITrend data={trendData} />
        <PollutantBreakdown stations={data.stations} />
      </div>

      {/* Station Table */}
      <StationTable stations={data.stations} />
    </div>
  );
}

function DepartmentTab({
  type,
  data,
}: {
  type: string;
  data: DashboardData;
}) {
  const configs: Record<string, { title: string; description: string; metrics: { label: string; value: string; detail: string }[] }> = {
    health: {
      title: "Health Department View",
      description: "Air quality impact on public health — advisories, risk levels, and respiratory case correlations.",
      metrics: [
        { label: "Health Risk Level", value: data.city_avg_aqi > 200 ? "HIGH" : data.city_avg_aqi > 150 ? "MODERATE" : "LOW", detail: "Based on current AQI levels" },
        { label: "Advisory", value: data.city_avg_aqi > 200 ? "Stay Indoors" : data.city_avg_aqi > 150 ? "Limit Outdoor Activity" : "Normal Activity", detail: "Recommended for sensitive groups" },
        { label: "PM2.5 Exposure", value: `${Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length)} µg/m³`, detail: "WHO safe limit: 15 µg/m³ (24hr)" },
        { label: "Affected Stations", value: `${data.stations.filter(s => (s.aqi || 0) > 150).length} / ${data.stations.length}`, detail: "Stations above unhealthy threshold" },
      ],
    },
    agriculture: {
      title: "Agriculture Department View",
      description: "Smog impact on crops, visibility for crop burning monitoring, and seasonal patterns.",
      metrics: [
        { label: "Crop Risk Level", value: data.city_avg_aqi > 200 ? "SEVERE" : data.city_avg_aqi > 150 ? "HIGH" : "MODERATE", detail: "PM2.5 impact on plant growth" },
        { label: "Visibility", value: data.city_avg_aqi > 300 ? "< 500m" : data.city_avg_aqi > 200 ? "500m - 1km" : "> 1km", detail: "Estimated from AQI levels" },
        { label: "Crop Burn Indicator", value: data.stations.filter(s => (s.pm10 || 0) > 200).length > 2 ? "ACTIVE" : "LOW", detail: "Based on PM10 spikes near border" },
        { label: "Border Station AQI", value: `${data.stations.find(s => s.name.includes("Wagha"))?.aqi ?? "—"}`, detail: "Wagha Border monitoring" },
      ],
    },
    environment: {
      title: "Environment Department View",
      description: "EPA compliance, emission source tracking, and environmental quality indices.",
      metrics: [
        { label: "NEQS Compliance", value: data.city_avg_aqi > 150 ? "NON-COMPLIANT" : "COMPLIANT", detail: "National Environmental Quality Standards" },
        { label: "Primary Pollutant", value: "PM2.5", detail: "Dominant pollutant across all stations" },
        { label: "Stations Exceeding NEQS", value: `${data.stations.filter(s => (s.pm25 || 0) > 35).length}`, detail: "PM2.5 > 35 µg/m³" },
        { label: "Average PM2.5", value: `${Math.round(data.stations.reduce((s, st) => s + (st.pm25 || 0), 0) / data.stations.length)} µg/m³`, detail: "Across all monitoring stations" },
      ],
    },
    safecity: {
      title: "Safe City Authority View",
      description: "Smog hotspots, violation zones, and enforcement priority areas.",
      metrics: [
        { label: "Hotspot Zones", value: `${data.stations.filter(s => (s.aqi || 0) > 200).length}`, detail: "Stations with AQI > 200" },
        { label: "Highest AQI Zone", value: data.worst_station?.name || "—", detail: `AQI: ${data.worst_station?.aqi ?? "—"}` },
        { label: "Enforcement Priority", value: data.city_avg_aqi > 200 ? "CRITICAL" : "ELEVATED", detail: "Based on overall air quality" },
        { label: "Visibility Alert", value: data.city_avg_aqi > 300 ? "ACTIVE" : "STANDBY", detail: "Traffic safety impact level" },
      ],
    },
  };

  const config = configs[type];
  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-bold text-zinc-100">{config.title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{config.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {config.metrics.map((metric, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-xs text-zinc-500">{metric.label}</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">
              {metric.value}
            </p>
            <p className="text-xs text-zinc-600 mt-2">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        <AQIMap stations={data.stations} />
      </div>

      <StationTable stations={data.stations} />
    </div>
  );
}
