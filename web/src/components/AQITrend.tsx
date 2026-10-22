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

export default function AQITrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">
          24-Hour AQI Trend
        </h3>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">City Average</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#3f3f46"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#3f3f46"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0c0c10",
              border: "1px solid #27272a",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#f4f4f5",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#71717a", fontSize: "10px" }}
          />
          <ReferenceLine
            y={150}
            stroke="#f9731640"
            strokeDasharray="6 4"
            label={{ value: "Unhealthy", fill: "#f9731660", fontSize: 9, position: "right" }}
          />
          <ReferenceLine
            y={300}
            stroke="#ef444440"
            strokeDasharray="6 4"
            label={{ value: "Hazardous", fill: "#ef444460", fontSize: 9, position: "right" }}
          />
          <Area
            type="monotone"
            dataKey="aqi"
            stroke="#ef4444"
            fill="url(#aqiGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#ef4444", stroke: "#0c0c10", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
