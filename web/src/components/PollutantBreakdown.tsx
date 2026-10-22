"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Station } from "@/lib/types";

interface PollutantBreakdownProps {
  stations: Station[];
}

export default function PollutantBreakdown({ stations }: PollutantBreakdownProps) {
  const avgPollutants = [
    {
      name: "PM2.5",
      value: Math.round(
        stations.reduce((s, st) => s + (st.pm25 || 0), 0) / stations.length
      ),
      color: "#ef4444",
      safe: 35,
    },
    {
      name: "PM10",
      value: Math.round(
        stations.reduce((s, st) => s + (st.pm10 || 0), 0) / stations.length
      ),
      color: "#f97316",
      safe: 150,
    },
    {
      name: "NO2",
      value: Math.round(
        stations.reduce((s, st) => s + (st.no2 || 0), 0) / stations.length
      ),
      color: "#f59e0b",
      safe: 53,
    },
    {
      name: "SO2",
      value: Math.round(
        stations.reduce((s, st) => s + (st.so2 || 0), 0) / stations.length
      ),
      color: "#8b5cf6",
      safe: 75,
    },
    {
      name: "CO",
      value: Math.round(
        stations.reduce((s, st) => s + (st.co || 0), 0) / stations.length
      ),
      color: "#06b6d4",
      safe: 50,
    },
    {
      name: "O3",
      value: Math.round(
        stations.reduce((s, st) => s + (st.o3 || 0), 0) / stations.length
      ),
      color: "#10b981",
      safe: 100,
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">
        Average Pollutant Levels
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={avgPollutants} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis type="number" stroke="#52525b" fontSize={11} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#f4f4f5",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {avgPollutants.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
