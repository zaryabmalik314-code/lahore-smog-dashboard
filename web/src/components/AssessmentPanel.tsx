"use client";

import { useState } from "react";
import type { Assessment, Severity } from "@/lib/assessment";

const SEVERITY_INK: Record<Severity, string> = {
  critical: "var(--aqi-unhealthy-ink)",
  warning: "var(--aqi-unhealthy-sensitive-ink)",
  info: "var(--accent)",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Act now",
  warning: "Watch",
  info: "Note",
};

export default function AssessmentPanel({ assessment }: { assessment: Assessment | null }) {
  const [showBasis, setShowBasis] = useState(false);

  if (!assessment) return null;

  return (
    <section className="panel rule-top">
      <div className="px-5 py-3.5 flex items-baseline justify-between gap-4" style={{ borderBottom: "1px solid var(--rule)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Assessment
        </h3>
        <span className="field-label">
          {assessment.findings.length} finding{assessment.findings.length === 1 ? "" : "s"}
        </span>
      </div>

      <p className="px-5 pt-4 pb-1 text-sm leading-relaxed max-w-3xl" style={{ color: "var(--ink)" }}>
        {assessment.summary}
      </p>

      <dl className="px-5 pb-2">
        {assessment.findings.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 py-3.5"
            style={i === 0 ? { borderTop: "1px solid var(--rule)", marginTop: "0.75rem" } : { borderTop: "1px solid var(--rule)" }}
          >
            <dt
              className="text-[10px] font-bold uppercase tracking-wider pt-0.5"
              style={{ color: SEVERITY_INK[f.severity] }}
            >
              {SEVERITY_LABEL[f.severity]}
            </dt>
            <dd>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {f.headline}
              </p>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {f.detail}
              </p>
              {f.caveat && (
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--ink-3)" }}>
                  Limit: {f.caveat}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
        <button
          onClick={() => setShowBasis((v) => !v)}
          className="text-[11px] font-semibold uppercase tracking-wider no-print"
          style={{ color: "var(--ink-2)" }}
          aria-expanded={showBasis}
        >
          {showBasis ? "Hide" : "Show"} what this rests on
        </button>
        {showBasis && (
          <ul className="mt-2.5 space-y-1">
            {assessment.basis.map((b) => (
              <li key={b} className="text-[11px]" style={{ color: "var(--ink-2)" }}>
                {b}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Derived from the readings on this page by fixed rules, not by a language model, so no
          figure in it can be invented. Each finding states the values behind it.
        </p>
      </div>
    </section>
  );
}
