"use client";

import { AQI_COLORS, AQI_INK, type AQICategory } from "@/lib/types";

const BANDS: {
  range: string;
  category: AQICategory;
  label: string;
  guidance: string;
}[] = [
  { range: "0 – 50", category: "good", label: "Good", guidance: "No health risk from air pollution." },
  { range: "51 – 100", category: "moderate", label: "Moderate", guidance: "Acceptable. Unusually sensitive individuals should consider limiting prolonged exertion outdoors." },
  { range: "101 – 150", category: "unhealthy_sensitive", label: "Unhealthy for Sensitive Groups", guidance: "Children, the elderly, and people with asthma, heart or lung disease should reduce prolonged outdoor exertion." },
  { range: "151 – 200", category: "unhealthy", label: "Unhealthy", guidance: "Everyone may begin to experience health effects. Sensitive groups should avoid outdoor exertion." },
  { range: "201 – 300", category: "very_unhealthy", label: "Very Unhealthy", guidance: "Health alert. Everyone should avoid outdoor exertion; sensitive groups should remain indoors." },
  { range: "301 +", category: "hazardous", label: "Hazardous", guidance: "Emergency conditions. The entire population is likely to be affected. Outdoor activity should be suspended." },
];

const LIMITS = [
  { pollutant: "PM2.5", period: "24-hour", neqs: "35", who: "15", unit: "µg/m³" },
  { pollutant: "PM2.5", period: "Annual", neqs: "15", who: "5", unit: "µg/m³" },
  { pollutant: "PM10", period: "24-hour", neqs: "150", who: "45", unit: "µg/m³" },
  { pollutant: "PM10", period: "Annual", neqs: "120", who: "15", unit: "µg/m³" },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ReferenceSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="panel rule-top p-6">
        <p className="field-label">Reference</p>
        <h2
          className="text-2xl font-bold mt-1.5 tracking-tight"
          style={{ fontFamily: "var(--font-masthead), Georgia, serif", color: "var(--ink)" }}
        >
          Scales, Limits and Method
        </h2>
        <p className="text-sm mt-2.5 max-w-2xl leading-relaxed" style={{ color: "var(--ink-2)" }}>
          The standards this bulletin reports against, and how each figure on it is derived.
        </p>
      </section>

      <Panel title="Air Quality Index — category reference">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--paper-sunk)", borderBottom: "1px solid var(--rule)" }}>
                <th scope="col" className="field-label text-left px-5 py-2.5 w-28">Index</th>
                <th scope="col" className="field-label text-left px-5 py-2.5 w-56">Category</th>
                <th scope="col" className="field-label text-left px-5 py-2.5">Health guidance</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b, i) => (
                <tr key={b.range} style={i === 0 ? undefined : { borderTop: "1px solid var(--rule)" }}>
                  <td className="px-5 py-3 tabular text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {b.range}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 shrink-0"
                        style={{ background: AQI_COLORS[b.category], border: "1px solid rgba(0,0,0,0.12)" }}
                      />
                      <span className="text-sm font-semibold" style={{ color: AQI_INK[b.category] }}>
                        {b.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
                    {b.guidance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Categories follow the US EPA Air Quality Index. Category colours are the EPA hues
            re-stepped for legibility on a light background and checked for colour-vision
            deficiency; every value on this bulletin is labelled in text as well as colour.
          </p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Limits compared">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--paper-sunk)", borderBottom: "1px solid var(--rule)" }}>
                  <th scope="col" className="field-label text-left px-5 py-2.5">Pollutant</th>
                  <th scope="col" className="field-label text-left px-5 py-2.5">Period</th>
                  <th scope="col" className="field-label text-right px-5 py-2.5">NEQS</th>
                  <th scope="col" className="field-label text-right px-5 py-2.5">WHO 2021</th>
                </tr>
              </thead>
              <tbody>
                {LIMITS.map((l, i) => (
                  <tr key={`${l.pollutant}-${l.period}`} style={i === 0 ? undefined : { borderTop: "1px solid var(--rule)" }}>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{l.pollutant}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--ink-2)" }}>{l.period}</td>
                    <td className="px-5 py-3 text-sm tabular text-right" style={{ color: "var(--ink)" }}>{l.neqs}</td>
                    <td className="px-5 py-3 text-sm tabular text-right font-semibold" style={{ color: "var(--ink)" }}>{l.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-sunk)" }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
              All values µg/m³. NEQS are Pakistan&apos;s National Environmental Quality Standards;
              WHO figures are the 2021 global air quality guidelines. NEQS is the enforceable
              standard; the WHO guideline is the health-based target and is stricter at every
              averaging period.
            </p>
          </div>
        </Panel>

        <Panel title="What is measured">
          <dl className="px-5 py-4 space-y-4">
            <div>
              <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>PM2.5</dt>
              <dd className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                Particles under 2.5 micrometres. Small enough to reach the deep lung and enter the
                bloodstream, so it drives most of the health burden attributed to smog. It is the
                dominant pollutant at every station in this network and the basis of the index
                value reported here.
              </dd>
            </div>
            <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
              <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>PM10</dt>
              <dd className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                Particles under 10 micrometres — road dust, construction, soil and the coarse
                fraction of combustion and crop residue burning. Deposits in the upper airway.
                A PM10 rise that outpaces PM2.5 usually points to dust or burning rather than
                traffic and industry.
              </dd>
            </div>
            <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
              <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Not measured here</dt>
              <dd className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
                No station in this network reports NO₂, SO₂, CO or O₃. Those pollutants are absent
                from this bulletin rather than shown as zero, because an absent sensor and a
                reading of zero are not the same thing.
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title="How these figures are produced">
        <dl className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {[
            ["Network average", "The mean index across stations that published a reading within the preceding six hours. Stations are not weighted by population or area, so the figure describes the monitored points rather than the city as a whole."],
            ["Reporting and excluded", "A station older than six hours is excluded from every aggregate and ranking on this bulletin, and shown as not reporting. It is still listed, so a monitor that has gone dark is visible rather than silently dropped."],
            ["Source tiers", "Official denotes the Pakistan Punjab Air Quality Network. Citizen denotes independent low-cost sensors, which are useful for spatial coverage but are not reference-grade instruments. Reference denotes diplomatic-mission monitors."],
            ["History", "Readings are captured on a schedule, independently of page traffic, and stored against the time the station published them rather than the time they were retrieved. Hours with no stored reading are left empty rather than interpolated."],
            ["Derived values", "Any figure computed from index thresholds rather than measured directly is labelled Derived, with a note on what evidence a firm conclusion would require."],
            ["Limitations", "This network cannot attribute a reading to a source. Crop-residue burning, industrial emission and traffic contributions cannot be separated without satellite fire data, wind modelling and emissions inventory work that is outside the scope of this bulletin."],
          ].map(([term, def]) => (
            <div key={term}>
              <dt className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{term}</dt>
              <dd className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>{def}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
