import type { Lead, Property } from "@/data/crm";

/**
 * Everything the dashboard shows, derived from the leads and listings already
 * in context. Pure functions over the real data — nothing here is seeded, and
 * nothing invents a comparison the data cannot support.
 *
 * `now` is passed in rather than read from the clock so the caller can supply
 * a single timestamp for the whole render, and so these stay testable.
 */

/** A lead still in play: neither won nor lost. */
export function isOpen(lead: Lead): boolean {
  return lead.stage !== "Won" && lead.stage !== "Lost";
}

function sumValue(leads: Lead[]): number {
  return leads.reduce((total, lead) => total + (lead.value ?? 0), 0);
}

function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export interface Summary {
  activeLeads: number;
  newThisMonth: number;
  /** Change in new enquiries against last month, or null with no prior month. */
  newDelta: number | null;
  /** Won as a share of closed deals, or null while nothing has closed. */
  conversion: number | null;
  wonCount: number;
  lostCount: number;
  openValue: number;
  /** Open leads that still have no value against them. */
  openUnvalued: number;
  wonValue: number;
  unassigned: number;
  listings: number;
}

export function summarise(leads: Lead[], properties: Property[], now: Date): Summary {
  const open = leads.filter(isOpen);
  const won = leads.filter((l) => l.stage === "Won");
  const lost = leads.filter((l) => l.stage === "Lost");
  const closed = won.length + lost.length;

  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const createdIn = (from: number, to: number) =>
    leads.filter((l) => {
      const at = new Date(l.createdAt).getTime();
      return at >= from && at < to;
    }).length;

  const newThisMonth = createdIn(thisMonth, Number.POSITIVE_INFINITY);
  const newLastMonth = createdIn(lastMonth, thisMonth);

  return {
    activeLeads: open.length,
    newThisMonth,
    // Only a real comparison: with no enquiries last month there is no
    // percentage to quote, so it reports nothing rather than "+100%".
    newDelta:
      newLastMonth === 0 ? null : Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100),
    conversion: closed === 0 ? null : Math.round((won.length / closed) * 100),
    wonCount: won.length,
    lostCount: lost.length,
    openValue: sumValue(open),
    openUnvalued: open.filter((l) => !l.value).length,
    wonValue: sumValue(won),
    unassigned: leads.filter((l) => !l.ownerId).length,
    listings: properties.length,
  };
}

export interface MonthPoint {
  month: string;
  enquiries: number;
  won: number;
}

/**
 * Enquiries per calendar month, ending with the current one. Counts rather
 * than values: most enquiries arrive with no value against them, so a value
 * chart would read as a flat zero and say nothing.
 */
export function monthlySeries(leads: Lead[], now: Date, months = 6): MonthPoint[] {
  const points: MonthPoint[] = [];

  for (let back = months - 1; back >= 0; back -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
    const inMonth = leads.filter((l) => {
      const at = new Date(l.createdAt).getTime();
      return at >= start.getTime() && at < end.getTime();
    });

    points.push({
      month: start.toLocaleDateString("en-US", { month: "short" }),
      enquiries: inMonth.length,
      won: inMonth.filter((l) => l.stage === "Won").length,
    });
  }

  return points;
}

export interface SourceSlice {
  name: string;
  count: number;
  value: number;
}

/** Where enquiries actually came from, largest first. `value` is a percentage. */
export function sourceBreakdown(leads: Lead[]): SourceSlice[] {
  if (leads.length === 0) return [];

  const counts = new Map<string, number>();
  for (const lead of leads) {
    counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      value: Math.round((count / leads.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface ActivityItem {
  id: string;
  text: string;
  person: string;
  at: number;
}

/**
 * The most recent thing known about each lead. There is no event log yet, so
 * this reads the two timestamps a lead carries: it was touched after it came
 * in, or it has only ever come in.
 */
export function recentActivity(leads: Lead[], limit = 6): ActivityItem[] {
  return leads
    .map((lead) => {
      const created = new Date(lead.createdAt).getTime();
      const touched = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0;
      const moved = touched > created;

      return {
        id: lead.id,
        text: moved
          ? `Moved to ${lead.stage}${lead.property ? ` · ${lead.property.name}` : ""}`
          : lead.property
            ? `Enquired about ${lead.property.name}`
            : "General enquiry received",
        person: lead.name,
        at: moved ? touched : created,
      };
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** "just now", "3 hours ago", "12 Sep" — short enough for a feed row. */
export function relativeTime(at: number, now: Date): string {
  const seconds = Math.round((now.getTime() - at) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Money at the scale it actually is, matching the leads page. */
export function money(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
