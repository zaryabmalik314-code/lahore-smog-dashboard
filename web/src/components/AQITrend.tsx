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
    <section className="panel">
      <div
        className="px-5 py-3.5 flex items-baseline justify-between gap-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Network average, past 24 hours
        </h3>
        {hasEnough && <span className="field-label">{data.length} hourly points</span>}
      </div>

      <div className="p-5">
      {!hasEnough ? (
        <div className="h-[260px] flex flex-col items-center justify-center text-center px-6">
          <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
            Insufficient history
          </p>
          <p className="text-xs mt-2 max-w-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
            {enabled
              ? `Readings are recorded as stations publish them. ${
                  data.length === 0 ? "No hours are stored yet" : "One hour is stored so far"
                } — this chart is drawn once at least two hours are on record.`
              : "History storage is not configured, so no trend can be shown."}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9e1414" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#9e1414" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="var(--ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--rule-strong)" }}
              interval="preserveStartEnd"
              dy={4}
            />
            <YAxis
              stroke="var(--ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              width={38}
            />
            <Tooltip
              cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: "var(--paper-raised)",
                border: "1px solid var(--rule-strong)",
                borderRadius: "2px",
                fontSize: "12px",
                color: "var(--ink)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
              }}
              labelStyle={{ color: "var(--ink-3)", fontSize: "11px", marginBottom: 2 }}
              formatter={(value, _name, item) => [
                `${value} AQI · ${item?.payload?.samples ?? 0} station${item?.payload?.samples === 1 ? "" : "s"}`,
                "Network average",
              ]}
            />
            <ReferenceLine
              y={150}
              stroke="var(--aqi-unhealthy-sensitive)"
              strokeDasharray="4 4"
              label={{ value: "Unhealthy 150", fill: "var(--aqi-unhealthy-sensitive-ink)", fontSize: 10, position: "insideTopRight" }}
            />
            <ReferenceLine
              y={300}
              stroke="var(--aqi-very-unhealthy)"
              strokeDasharray="4 4"
              label={{ value: "Hazardous 300", fill: "var(--aqi-very-unhealthy-ink)", fontSize: 10, position: "insideTopRight" }}
            />
            <Area
              type="monotone"
              dataKey="aqi"
              stroke="#9e1414"
              fill="url(#aqiGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#9e1414", stroke: "var(--paper-raised)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      </div>
    </section>
  );
}
