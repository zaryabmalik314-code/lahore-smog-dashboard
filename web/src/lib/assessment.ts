import type { DashboardData, Station } from "./types";
import type { Outlook } from "./outlook";

export type Severity = "critical" | "warning" | "info";

export interface Action {
  /** Department tab id this is addressed to. */
  department: string;
  /** The body that would carry it out, in its own name. */
  owner: string;
  text: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  headline: string;
  /** The reasoning, stating the figures it rests on. */
  detail: string;
  /** Departments this bears on, by tab id. */
  departments: string[];
  /** What this network cannot establish about the finding. */
  caveat?: string;
  /**
   * Suggested next steps. These are prompts for the responsible body, framed
   * as the threshold at which a measure is normally considered — not an
   * instruction, and not a claim about what policy requires.
   */
  actions?: Action[];
}

export interface Assessment {
  summary: string;
  findings: Finding[];
  /** Inputs the conclusions rest on, so a reader can check them. */
  basis: string[];
}

const NEQS_PM25 = 35;
const WHO_PM25 = 15;

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function band(aqi: number): string {
  if (aqi > 300) return "hazardous";
  if (aqi > 200) return "very unhealthy";
  if (aqi > 150) return "unhealthy";
  if (aqi > 100) return "unhealthy for sensitive groups";
  if (aqi > 50) return "moderate";
  return "good";
}

/**
 * Derives the written assessment from the readings on record.
 *
 * Every sentence here is computed from figures on this page — there is no
 * language model in this path. That is deliberate: a briefing that a
 * department may act on should not be able to invent a number, and each
 * finding states the values it rests on so a reader can check it.
 */
export function assess(data: DashboardData, outlook: Outlook): Assessment {
  const reporting = data.stations.filter((s) => !s.stale && s.aqi !== null);
  const findings: Finding[] = [];
  const basis: string[] = [];

  const avg = data.city_avg_aqi;
  const pm25Values = reporting.map((s) => s.pm25).filter((v): v is number => typeof v === "number");
  const pm10Values = reporting.map((s) => s.pm10).filter((v): v is number => typeof v === "number");
  const pm25Avg = mean(pm25Values);
  const pm10Avg = mean(pm10Values);

  basis.push(`Network mean AQI ${avg} from ${reporting.length} reporting station${reporting.length === 1 ? "" : "s"}.`);
  if (pm25Avg !== null) basis.push(`Mean PM2.5 ${pm25Avg} µg/m³ against NEQS ${NEQS_PM25} and WHO ${WHO_PM25}.`);

  // ── Direction of travel ────────────────────────────────────────────────
  if (outlook.city_direction && outlook.city_rate !== null) {
    const worsening = outlook.stations.filter((s) => s.direction === "worsening");
    const improving = outlook.stations.filter((s) => s.direction === "improving");

    if (outlook.city_direction === "worsening") {
      const top = worsening[0];
      findings.push({
        id: "trend-up",
        severity: avg > 200 ? "critical" : "warning",
        headline: `Conditions deteriorating at ${outlook.city_rate > 0 ? "+" : ""}${outlook.city_rate} AQI per hour`,
        detail:
          `${worsening.length} of ${outlook.stations.length} stations are rising.` +
          (top?.projected != null
            ? ` ${top.station_name} is rising fastest and projects to about ${top.projected} within ${outlook.horizon_hours} hours, from ${top.current} now.`
            : ""),
        departments: ["health", "safecity", "environment"],
        caveat:
          "Projection assumes the last few hours continue. It does not account for wind shift, rainfall or an inversion breaking, any of which can reverse it within the hour.",
        actions: [
          { department: "health", owner: "Health & Population",
            text: `Alert respiratory OPDs near ${top?.station_name ?? "the rising stations"} ahead of the projected peak rather than after it, and confirm nebuliser and oxygen stock.` },
          { department: "safecity", owner: "Punjab Safe City Authority",
            text: `Prioritise enforcement patrols toward ${top?.station_name ?? "the fastest-rising station"} while the trend holds; a rising station is where a measure changes the most.` },
          { department: "environment", owner: "Punjab EPA",
            text: "Verify the rise against an accredited instrument before it is cited publicly, since two of the network's stations are low-cost sensors." },
        ],
      });
      basis.push(`Trend fitted over ${Math.max(...outlook.stations.map((s) => s.basis_hours))} hourly points.`);
    } else if (outlook.city_direction === "improving") {
      findings.push({
        id: "trend-down",
        severity: "info",
        headline: `Conditions easing at ${outlook.city_rate} AQI per hour`,
        detail: `${improving.length} of ${outlook.stations.length} stations are falling. Current mean is ${avg}, in the ${band(avg)} band.`,
        departments: ["health", "environment"],
        caveat: "An easing trend does not mean the air is safe; it means it is getting less bad.",
      });
    }
  } else if (outlook.insufficient) {
    findings.push({
      id: "trend-none",
      severity: "info",
      headline: "Not enough record yet to state a direction",
      detail:
        "A direction needs at least four hourly readings per station. Recording runs every 15 minutes, so this fills in as the day progresses.",
      departments: [],
    });
  }

  // ── Spatial spread: where it is worse, and by how much ─────────────────
  if (outlook.spread) {
    const { high, low } = outlook.spread;
    const gap = high.current - low.current;
    if (gap >= 40) {
      findings.push({
        id: "spread",
        severity: gap >= 100 ? "warning" : "info",
        headline: `${gap} AQI points between the worst and best station`,
        detail:
          `${high.station_name} reads ${high.current} while ${low.station_name} reads ${low.current}. ` +
          `A spread this wide points to local sources rather than a uniform airshed, which means intervention near ${high.station_name} would have more effect than a city-wide measure.`,
        departments: ["safecity", "environment"],
        caveat:
          "With this few stations the gradient between them is unmeasured; the spread describes the monitored points only.",
        actions: [
          { department: "safecity", owner: "Punjab Safe City Authority",
            text: `Target the area around ${high.station_name} rather than issuing a city-wide measure; the ${gap}-point gap says the problem is local.` },
          { department: "environment", owner: "Punjab EPA / Urban Unit",
            text: `Site an additional monitor between ${high.station_name} and ${low.station_name}. The gradient across that gap is currently unmeasured and is where the source sits.` },
        ],
      });
    } else {
      findings.push({
        id: "uniform",
        severity: "info",
        headline: "Readings are uniform across the network",
        detail: `Only ${gap} AQI points separate ${high.station_name} and ${low.station_name}, which is consistent with a single airshed rather than local hotspots.`,
        departments: ["environment"],
      });
    }
  }

  // ── Source fingerprint from the particulate ratio ──────────────────────
  if (pm25Avg && pm10Avg && pm25Avg > 0) {
    const ratio = pm10Avg / pm25Avg;
    const coarse = ratio >= 1.5;
    findings.push({
      id: "composition",
      severity: "info",
      headline: coarse
        ? "Coarse particulate dominant — dust or residue burning"
        : "Fine particulate dominant — combustion sources",
      detail:
        `PM10 averages ${pm10Avg} µg/m³ against PM2.5 at ${pm25Avg}, a ratio of ${ratio.toFixed(2)}. ` +
        (coarse
          ? "A ratio above about 1.5 indicates the coarse fraction is leading, which is typical of road dust, construction or crop residue burning."
          : "A ratio near or below 1 indicates the fine fraction is leading, which is typical of vehicle exhaust and industrial combustion rather than dust."),
      departments: coarse ? ["agriculture", "environment", "safecity"] : ["environment", "safecity"],
      caveat:
        "The ratio narrows the likely source class. It cannot attribute a reading to a specific source without satellite fire detection, wind modelling and an emissions inventory.",
      actions: coarse
        ? [
            { department: "agriculture", owner: "Agriculture Department",
              text: "Cross-check against NASA FIRMS fire detections for the district before attributing this to crop residue; the ratio alone cannot separate burning from road and construction dust." },
            { department: "safecity", owner: "Punjab Safe City Authority",
              text: "Check construction and unpaved-road activity near the leading stations, which produce the same coarse signature as burning." },
            { department: "environment", owner: "Punjab EPA",
              text: "A coarse-dominant episode responds to dust suppression and site controls, which a vehicle measure will not address." },
          ]
        : [
            { department: "environment", owner: "Punjab EPA",
              text: "A fine-dominant episode points at combustion, so vehicle and industrial controls are the levers that bite; dust suppression will not move it." },
            { department: "safecity", owner: "Punjab Safe City Authority",
              text: "Traffic measures are the applicable lever in this composition. Weigh them against the odd-even threshold below." },
          ],
    });
  }

  // ── Regulatory exceedance ──────────────────────────────────────────────
  if (pm25Avg !== null) {
    const overNeqs = reporting.filter((s) => (s.pm25 ?? 0) > NEQS_PM25).length;
    if (overNeqs > 0) {
      findings.push({
        id: "neqs",
        severity: pm25Avg > NEQS_PM25 * 3 ? "critical" : "warning",
        headline: `${overNeqs} of ${reporting.length} stations above the NEQS PM2.5 limit`,
        detail: `Mean PM2.5 is ${pm25Avg} µg/m³, ${(pm25Avg / NEQS_PM25).toFixed(1)}× the NEQS 24-hour limit of ${NEQS_PM25} and ${(pm25Avg / WHO_PM25).toFixed(1)}× the WHO guideline of ${WHO_PM25}.`,
        departments: ["environment", "health"],
        caveat:
          "These are instantaneous readings screened against a 24-hour standard. A compliance finding requires a full 24-hour average from an accredited instrument.",
        actions: [
          { department: "environment", owner: "Punjab EPA",
            text: "Begin a 24-hour accredited average at the exceeding stations if an enforcement case is intended; screening readings will not support one." },
          { department: "health", owner: "Health & Population",
            text: `At ${pm25Avg} µg/m³ the exposure guidance for children, the elderly and respiratory patients applies continuously, not only at peak hours.` },
        ],
      });
    }
  }

  // ── Network integrity ──────────────────────────────────────────────────
  if (data.excluded_count > 0) {
    findings.push({
      id: "coverage",
      severity: "warning",
      headline: `${data.excluded_count} station${data.excluded_count === 1 ? "" : "s"} not reporting`,
      detail:
        `Every figure here is computed from the ${data.reporting_count} station${data.reporting_count === 1 ? "" : "s"} that published within the last six hours. ` +
        "A station that has stopped reporting is excluded rather than carried forward, so coverage is narrower than the station list suggests.",
      departments: ["environment"],
      actions: [
        {
          department: "environment",
          owner: "Punjab EPA / Urban Unit",
          text: "Restore or formally decommission the silent station. A monitor that is listed but not reporting narrows coverage invisibly to anyone reading only the station count.",
        },
      ],
    });
  }

  const official = reporting.filter((s) => s.tier === "official").length;
  basis.push(`${official} of ${reporting.length} reporting stations are on the official Punjab network.`);

  const summary =
    reporting.length === 0
      ? "No station is currently reporting, so no assessment can be made."
      : `Air quality across the monitored network is ${band(avg)} at a mean AQI of ${avg}` +
        (outlook.city_direction && outlook.city_direction !== "steady"
          ? `, and ${outlook.city_direction} at ${Math.abs(outlook.city_rate ?? 0)} points per hour`
          : "") +
        `. ${findings.filter((f) => f.severity === "critical").length} finding${findings.filter((f) => f.severity === "critical").length === 1 ? "" : "s"} require immediate attention.`;

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return { summary, findings, basis };
}

/** Findings that bear on one department's tab. */
export function findingsFor(assessment: Assessment, department: string): Finding[] {
  return assessment.findings.filter((f) => f.departments.includes(department));
}

export type { Station };
