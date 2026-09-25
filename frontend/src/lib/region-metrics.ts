import type { Lead, Property } from "@/data/crm";
import type { RegionSummary } from "@/lib/api/regions";
import { isOpen, money } from "@/lib/dashboard";

/**
 * The dashboard's region charts, as pure functions over data already loaded:
 * the owner's full lead and listing lists from context, plus `/regions` for the
 * region names. Only owners and system admins see this section — nobody else
 * holds more than one region's data.
 */

export type RegionMetric = "listings" | "portfolio" | "leads" | "pipeline" | "won" | "lost";

interface MetricDef {
  label: string;
  /** What the pie and bars measure, in one line. */
  describe: string;
  /** What the monthly view counts. */
  monthly: string;
  format: (value: number) => string;
}

const count = (n: number) => n.toLocaleString("en-US");

export const regionMetrics: Record<RegionMetric, MetricDef> = {
  listings: {
    label: "Listings live",
    describe: "Listings currently on the market",
    monthly: "Listings added each month",
    format: count,
  },
  portfolio: {
    label: "Portfolio value",
    describe: "Asking price of listings on the market",
    monthly: "Asking price of listings added each month",
    format: money,
  },
  leads: {
    label: "Leads",
    describe: "Every lead received",
    monthly: "Leads received each month",
    format: count,
  },
  pipeline: {
    label: "Open pipeline",
    describe: "Value of leads still in play",
    monthly: "Open value, by the month the lead arrived",
    format: money,
  },
  won: {
    label: "Won",
    describe: "Value of deals won",
    monthly: "Won value, by the month the lead arrived",
    format: money,
  },
  // A count, not a value: a lead only needs a value from Proposal on, so most
  // lost leads have none and a value total would mostly read $0.
  lost: {
    label: "Lost",
    describe: "Leads lost",
    monthly: "Leads lost, by the month the lead arrived",
    format: count,
  },
};

export const metricOrder: RegionMetric[] = [
  "listings",
  "portfolio",
  "leads",
  "pipeline",
  "won",
  "lost",
];

/** The eight validated categorical slots (see `--region-*` in styles.css). */
const SLOTS = 8;
export const NONE_KEY = "none";

export interface RegionSeries {
  key: string;
  name: string;
  color: string;
}

/**
 * One series per region, coloured by the region's place in name order — so a
 * region keeps its colour when a metric or filter changes what is shown, and
 * colour never follows rank. Past the eighth region the rest fold into "Other"
 * rather than inventing a ninth hue. Listings and leads outside any region get
 * a neutral gray, after the regions.
 */
export function regionSeries(regions: RegionSummary[]): {
  series: RegionSeries[];
  keyOf: (regionId: string | null | undefined) => string;
} {
  const sorted = [...regions].sort((a, b) => a.name.localeCompare(b.name));
  const fold = sorted.length > SLOTS;
  const named = fold ? sorted.slice(0, SLOTS - 1) : sorted;
  const namedIds = new Set(named.map((r) => r.id));
  const knownIds = new Set(sorted.map((r) => r.id));

  const series: RegionSeries[] = named.map((r, i) => ({
    key: r.id,
    name: r.name,
    color: `var(--region-${i + 1})`,
  }));
  if (fold) series.push({ key: "other", name: "Other regions", color: `var(--region-${SLOTS})` });
  series.push({ key: NONE_KEY, name: "Not in a region", color: "var(--region-none)" });

  const keyOf = (regionId: string | null | undefined) => {
    if (!regionId || !knownIds.has(regionId)) return NONE_KEY;
    return namedIds.has(regionId) ? regionId : "other";
  };
  return { series, keyOf };
}

interface Inputs {
  metric: RegionMetric;
  regions: RegionSummary[];
  leads: Lead[];
  properties: Property[];
}

/** The records a metric sums, and how much each contributes. */
function contributions({ metric, leads, properties }: Inputs) {
  const live = properties.filter((p) => p.status === "Available");
  switch (metric) {
    case "listings":
      return properties.map((p) => ({
        regionId: p.regionId,
        at: p.createdAt,
        value: p.status === "Available" ? 1 : 0,
        month: 1,
      }));
    case "portfolio":
      return live.map((p) => ({
        regionId: p.regionId,
        at: p.createdAt,
        value: p.price ?? 0,
        month: p.price ?? 0,
      }));
    case "leads":
      return leads.map((l) => ({ regionId: l.regionId, at: l.createdAt, value: 1, month: 1 }));
    case "pipeline":
      return leads.filter(isOpen).map((l) => ({
        regionId: l.regionId,
        at: l.createdAt,
        value: l.value ?? 0,
        month: l.value ?? 0,
      }));
    case "won":
      return leads
        .filter((l) => l.stage === "Won")
        .map((l) => ({
          regionId: l.regionId,
          at: l.createdAt,
          value: l.value ?? 0,
          month: l.value ?? 0,
        }));
    case "lost":
      return leads
        .filter((l) => l.stage === "Lost")
        .map((l) => ({ regionId: l.regionId, at: l.createdAt, value: 1, month: 1 }));
  }
}

export interface RegionTotal extends RegionSeries {
  value: number;
  /** Share of the whole, 0–100, rounded. */
  share: number;
}

/** One total per series, in series order — the pie and the Compare bars. */
export function regionTotals(input: Inputs): RegionTotal[] {
  const { series, keyOf } = regionSeries(input.regions);
  const totals = new Map(series.map((s) => [s.key, 0]));

  for (const c of contributions(input)) {
    const key = keyOf(c.regionId);
    totals.set(key, (totals.get(key) ?? 0) + c.value);
  }

  const whole = [...totals.values()].reduce((a, b) => a + b, 0);
  return (
    series
      .map((s) => {
        const value = totals.get(s.key) ?? 0;
        return { ...s, value, share: whole ? Math.round((value / whole) * 100) : 0 };
      })
      // An empty "Not in a region" or "Other" would only add a zero to the legend.
      .filter((t) => t.value > 0 || (t.key !== NONE_KEY && t.key !== "other"))
  );
}

/**
 * Month-by-month totals per series for the last `months` months, ending with
 * the current one. Rows are `{ month, [seriesKey]: value }` for recharts.
 */
export function regionMonthly(input: Inputs, now: Date, months = 6) {
  const { series, keyOf } = regionSeries(input.regions);
  const rows: Record<string, string | number>[] = [];
  const items = contributions(input);

  for (let back = months - 1; back >= 0; back -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1).getTime();
    const row: Record<string, string | number> = {
      month: new Date(start).toLocaleDateString("en-US", { month: "short" }),
    };
    for (const s of series) row[s.key] = 0;
    for (const c of items) {
      if (!c.at) continue;
      const at = new Date(c.at).getTime();
      if (at < start || at >= end) continue;
      const key = keyOf(c.regionId);
      row[key] = (row[key] as number) + c.month;
    }
    rows.push(row);
  }

  // Keep only series that have something to draw in the window.
  const active = series.filter((s) => rows.some((r) => (r[s.key] as number) > 0));
  return { rows, series: active };
}
