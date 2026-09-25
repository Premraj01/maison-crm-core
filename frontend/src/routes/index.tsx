import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Building2,
  CircleDollarSign,
  Target,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isGlobalRole } from "@/data/crm";
import { fetchRegions, type RegionSummary } from "@/lib/api/regions";
import { useAuth } from "@/lib/auth/auth-context";
import { useCrm } from "@/lib/crm-context";
import {
  greeting,
  money,
  monthlySeries,
  recentActivity,
  relativeTime,
  sourceBreakdown,
  summarise,
} from "@/lib/dashboard";
import { AnimatedNumber, EmptyState, PageHeader, StatCard } from "@/components/crm/Primitives";
import { RegionCharts } from "@/components/crm/RegionCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Maison CRM" },
      { name: "description", content: "Pipeline, revenue, activity, and tasks in Maison CRM." },
      { property: "og:title", content: "Dashboard — Maison CRM" },
      {
        property: "og:description",
        content: "Pipeline, revenue, activity, and tasks in Maison CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
};

function Dashboard() {
  const { tasks, toggleTask, leads, leadsStatus, properties, propertiesStatus, role } = useCrm();
  const { user, token } = useAuth();

  // The region section is for owners and system admins, the only roles whose
  // leads and listings span regions. `/regions` supplies the team counts.
  const global = isGlobalRole(role);
  const [regions, setRegions] = useState<RegionSummary[] | null>(null);
  useEffect(() => {
    if (!token || !global) return;
    let cancelled = false;
    fetchRegions(token)
      .then((list) => {
        if (!cancelled) setRegions(list);
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, global]);

  // Read once on mount rather than during render: the server and the browser
  // can disagree about the time, and every figure below is dated.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const loading = leadsStatus === "loading" || propertiesStatus === "loading" || now === null;

  const stats = useMemo(
    () => (now ? summarise(leads, properties, now) : null),
    [leads, properties, now],
  );
  const series = useMemo(() => (now ? monthlySeries(leads, now) : []), [leads, now]);
  const sources = useMemo(() => sourceBreakdown(leads), [leads]);
  const activity = useMemo(() => recentActivity(leads), [leads]);

  const firstName = (user?.fullName ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={
          now
            ? now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })
            : ""
        }
        title={now ? `${greeting(now)}${firstName ? `, ${firstName}` : ""}` : "Welcome back"}
        description={stats ? headline(stats) : "Loading your workspace…"}
        actions={
          <Link
            to="/leads"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
          >
            View pipeline <ArrowUpRight className="size-4" />
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="h-[152px] animate-pulse bg-secondary/50" />
          ))
        ) : (
          <>
            <StatCard
              label="Active leads"
              value={<AnimatedNumber value={stats.activeLeads} />}
              trend={stats.newDelta}
              hint={`${stats.newThisMonth} new this month`}
              icon={<UsersRound className="size-4" />}
            />
            <StatCard
              label="Conversion"
              value={
                stats.conversion === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <AnimatedNumber value={stats.conversion} suffix="%" />
                )
              }
              hint={
                stats.conversion === null
                  ? "Nothing closed yet"
                  : `${stats.wonCount} won · ${stats.lostCount} lost`
              }
              icon={<Target className="size-4" />}
            />
            <StatCard
              label="Open pipeline"
              value={money(stats.openValue)}
              hint={
                stats.openUnvalued > 0
                  ? `${stats.openUnvalued} not yet valued`
                  : `across ${stats.activeLeads} ${stats.activeLeads === 1 ? "lead" : "leads"}`
              }
              icon={<CircleDollarSign className="size-4" />}
            />
            <StatCard
              label="Won"
              value={money(stats.wonValue)}
              hint={`${stats.wonCount} ${stats.wonCount === 1 ? "deal" : "deals"} closed`}
              icon={<Banknote className="size-4" />}
            />
          </>
        )}
      </section>

      {global &&
        (loading || regions === null ? (
          <Card className="mt-5 h-[340px] animate-pulse bg-secondary/50" />
        ) : regions.length > 0 && now ? (
          <RegionCharts regions={regions} leads={leads} properties={properties} now={now} />
        ) : null)}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl font-medium">Enquiry momentum</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Enquiries received each month, and how many have since been won
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </CardHeader>
          <CardContent>
            <div className="h-[290px]">
              {loading ? (
                <div className="size-full animate-pulse rounded-md bg-secondary/50" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="pipelineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      // Counts are whole numbers, so a fractional tick would be
                      // meaningless on a young dataset.
                      allowDecimals={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      name="Enquiries"
                      dataKey="enquiries"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#pipelineFill)"
                    />
                    <Area
                      type="monotone"
                      name="Won"
                      dataKey="won"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Lead sources</CardTitle>
            <p className="text-xs text-muted-foreground">How enquiries actually reached Maison</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-secondary/50" />
            ) : sources.length === 0 ? (
              <p className="grid h-[180px] place-items-center text-center text-sm text-muted-foreground">
                No enquiries yet
              </p>
            ) : (
              <div className="grid grid-cols-[150px_1fr] items-center">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sources}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={3}
                      >
                        {sources.map((slice, i) => (
                          <Cell key={slice.name} fill={colors[i % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {sources.map((slice, i) => (
                    <div key={slice.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: colors[i % colors.length] }}
                      />
                      <span className="flex-1 truncate text-muted-foreground">{slice.name}</span>
                      <b>{slice.value}%</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-display text-xl font-medium">Recent activity</CardTitle>
            <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground">
              All leads
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <div className="h-40 animate-pulse rounded-md bg-secondary/50" />
            ) : activity.length === 0 ? (
              <EmptyState
                icon={<Building2 />}
                title="Nothing yet"
                description="Enquiries from the website's viewing form appear here as they arrive."
              />
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.person}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {now ? relativeTime(item.at, now) : ""}
                  </time>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Tasks</CardTitle>
            {/* Tasks have no backend yet, so these stay local to this browser
                and reset on reload — unlike everything else on this page. */}
            <p className="text-xs text-muted-foreground">Local to this session</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-3 border-b border-border py-3 last:border-0"
              >
                <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id)} />
                <span
                  className={`min-w-0 flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {t.title}
                </span>
                <span className="text-[11px] text-muted-foreground">{t.due}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

/** One line about what actually needs doing, rather than a fixed sentence. */
function headline(stats: ReturnType<typeof summarise>): string {
  const parts: string[] = [];
  if (stats.unassigned > 0) {
    parts.push(
      `${stats.unassigned} ${stats.unassigned === 1 ? "enquiry needs" : "enquiries need"} an agent`,
    );
  }
  if (stats.openUnvalued > 0) {
    parts.push(`${stats.openUnvalued} still to be valued`);
  }
  parts.push(`${stats.listings} ${stats.listings === 1 ? "listing" : "listings"} live`);
  return `${parts.join(" · ")}.`;
}
