"use client";

import { AQI_COLORS, AQI_LABELS, type AQICategory } from "@/lib/types";

interface AQICardProps {
  label: string;
  value: number;
  category: AQICategory;
  subtitle?: string;
}

export default function AQICard({ label, value, category, subtitle }: AQICardProps) {
  const color = AQI_COLORS[category];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        <span
          className="text-sm font-medium mb-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + "20", color }}
        >
          {AQI_LABELS[category]}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
