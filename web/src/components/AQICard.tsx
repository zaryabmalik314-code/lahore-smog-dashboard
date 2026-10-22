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
    <div className="glass rounded-2xl p-5 relative overflow-hidden group">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8 transition-opacity group-hover:opacity-[0.08]"
        style={{ background: color }}
      />
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2.5 mt-2">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span
          className="text-[10px] font-semibold mb-0.5 px-2 py-0.5 rounded-md uppercase tracking-wide"
          style={{ backgroundColor: color + "15", color, border: `1px solid ${color}25` }}
        >
          {AQI_LABELS[category]}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-zinc-600 mt-2.5">{subtitle}</p>
      )}
    </div>
  );
}
