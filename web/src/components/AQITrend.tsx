"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TrendPoint {
  time: string;
  aqi: number;
}

interface AQITrendProps {
  data: TrendPoint[];
}

export default function AQITrend({ data }: AQITrendProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">
        24-Hour AQI Trend (City Average)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="time"
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="#52525b"
            fontSize={11}
            tickLine={false}
            domain={[0, "auto"]}
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
          <ReferenceLine
            y={150}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{
              value: "Unhealthy",
              fill: "#f97316",
              fontSize: 10,
              position: "right",
            }}
          />
          <ReferenceLine
            y={300}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{
              value: "Hazardous",
              fill: "#ef4444",
              fontSize: 10,
              position: "right",
            }}
          />
          <Area
            type="monotone"
            dataKey="aqi"
            stroke="#ef4444"
            fill="url(#aqiGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
