import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Lead, Property } from "@/data/crm";
import type { RegionSummary } from "@/lib/api/regions";
import {
  metricOrder,
  regionMetrics,
  regionMonthly,
  regionTotals,
  type RegionMetric,
} from "@/lib/region-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: 12,
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

type View = "compare" | "monthly";

/**
 * Owner/system-admin dashboard section: one metric, chosen from the switcher,
 * drives both charts — the pie for each region's share and the graph for the
 * absolute comparison or the monthly trend. A region keeps its colour across
 * every metric and view (see `regionSeries`).
 */
export function RegionCharts({
  regions,
  leads,
  properties,
  now,
}: {
  regions: RegionSummary[];
  leads: Lead[];
  properties: Property[];
  now: Date;
}) {
  const [metric, setMetric] = useState<RegionMetric>("leads");
  const [view, setView] = useState<View>("compare");
  const def = regionMetrics[metric];

  const totals = useMemo(
    () => regionTotals({ metric, regions, leads, properties }),
    [metric, regions, leads, properties],
  );
  const monthly = useMemo(
    () => regionMonthly({ metric, regions, leads, properties }, now),
    [metric, regions, leads, properties, now],
  );
  const whole = totals.reduce((sum, t) => sum + t.value, 0);
  const slices = totals.filter((t) => t.value > 0);

  return (
    <section className="mt-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium">Regions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick what to compare. Both charts follow the choice.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={metric}
          // Radix sends "" when the active item is clicked again; keep the choice.
          onValueChange={(v) => v && setMetric(v as RegionMetric)}
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
          aria-label="Data to chart by region"
        >
          {metricOrder.map((m) => (
            <ToggleGroupItem key={m} value={m} className="px-3 text-xs">
              {regionMetrics[m].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Share by region</CardTitle>
            <p className="text-xs text-muted-foreground">{def.describe}</p>
          </CardHeader>
          <CardContent>
            {whole === 0 ? (
              <Empty />
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
                <div className="relative mx-auto h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={92}
                        // A 2px surface ring separates the slices — none for a
                        // lone slice, where it would only draw a seam.
                        stroke="var(--card)"
                        strokeWidth={slices.length > 1 ? 2 : 0}
                        isAnimationActive={false}
                      >
                        {slices.map((s) => (
                          <Cell key={s.key} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => [
                          `${def.format(value)} · ${Math.round((value / whole) * 100)}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-lg font-semibold">{def.format(whole)}</p>
                      <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                        Total
                      </p>
                    </div>
                  </div>
                </div>
                {/* The legend doubles as the table view: every value is printed,
                    so no slice depends on colour alone. */}
                <table className="w-full text-xs">
                  <tbody>
                    {totals.map((t) => (
                      <tr key={t.key} className="border-b border-border last:border-0">
                        <td className="py-2 pr-2">
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: t.color }}
                            />
                            <span className="truncate text-muted-foreground">{t.name}</span>
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {def.format(t.value)}
                        </td>
                        <td className="w-12 py-2 text-right tabular-nums text-muted-foreground">
                          {t.share}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="font-display text-xl font-medium">
                {view === "compare" ? "Compare regions" : "Month by month"}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {view === "compare" ? def.describe : `${def.monthly} · last 6 months`}
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as View)}
              variant="outline"
              size="sm"
              aria-label="Graph view"
            >
              <ToggleGroupItem value="compare" className="px-3 text-xs">
                Compare
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" className="px-3 text-xs">
                Monthly
              </ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            {view === "compare" ? (
              whole === 0 ? (
                <Empty />
              ) : (
                <div style={{ height: Math.max(160, totals.length * 52 + 24) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={totals}
                      layout="vertical"
                      margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
                      barCategoryGap={10}
                    >
                      <CartesianGrid stroke="var(--border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={axisTick}
                        tickFormatter={(v: number) => def.format(v)}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                        tick={{ ...axisTick, fill: "var(--foreground)" }}
                        width={120}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [def.format(value), def.label]}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={28}
                        isAnimationActive={false}
                      >
                        {totals.map((t) => (
                          <Cell key={t.key} fill={t.color} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(v: number) => def.format(v)}
                          style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : monthly.series.length === 0 ? (
              <Empty text="Nothing in the last 6 months" />
            ) : (
              <>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthly.rows}
                      margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={axisTick}
                        allowDecimals={false}
                        width={56}
                        tickFormatter={(v: number) => def.format(v)}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                        formatter={(value: number, key: string) => [
                          def.format(value),
                          monthly.series.find((s) => s.key === key)?.name ?? key,
                        ]}
                      />
                      {monthly.series.map((s) => (
                        <Line
                          key={s.key}
                          dataKey={s.key}
                          name={s.name}
                          type="monotone"
                          stroke={s.color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
                          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {monthly.series.map((s) => (
                    <span
                      key={s.key}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Empty({ text = "Nothing to show for this yet" }: { text?: string }) {
  return (
    <p className="grid h-[200px] place-items-center text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
