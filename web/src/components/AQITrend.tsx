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
import type { TrendPoint } from "@/lib/types";

interface AQITrendProps {
  data: TrendPoint[];
  enabled: boolean;
}

export default function AQITrend({ data, enabled }: AQITrendProps) {
  const hasEnough = data.length >= 2;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300">24-Hour AQI Trend</h3>
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
          {hasEnough ? `${data.length} hourly points` : "City Average"}
        </span>
      </div>

      {!hasEnough ? (
        <div className="h-[260px] flex flex-col items-center justify-center text-center px-6">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-zinc-600 animate-spin mb-4" />
          <p className="text-sm text-zinc-400">Building history</p>
          <p className="text-xs text-zinc-600 mt-1.5 max-w-xs leading-relaxed">
            {enabled
              ? `Readings are recorded as stations publish them. ${
                  data.length === 0
                    ? "No hours stored yet"
                    : "1 hour stored so far"
                } — the trend appears once at least two hours are on record.`
              : "History storage is not configured, so no trend can be shown."}
          </p>
        </div>
      ) : (
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
              formatter={(value, _name, item) => [
                `${value} AQI (${item?.payload?.samples ?? 0} stations)`,
                "Network average",
              ]}
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
      )}
    </div>
  );
}
