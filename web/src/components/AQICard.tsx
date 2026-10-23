"use client";

import { AQI_INK, AQI_LABELS, type AQICategory } from "@/lib/types";

interface AQICardProps {
  label: string;
  value: number;
  category: AQICategory;
  subtitle?: string;
}

export default function AQICard({ label, value, category, subtitle }: AQICardProps) {
  const ink = AQI_INK[category];

  return (
    <div className="panel p-5">
      <p className="field-label">{label}</p>
      <div className="flex items-baseline gap-2.5 mt-2">
        <span className="text-3xl font-bold tabular leading-none" style={{ color: ink }}>
          {value}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: ink }}>
          {AQI_LABELS[category]}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs mt-2.5" style={{ color: "var(--ink-3)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
