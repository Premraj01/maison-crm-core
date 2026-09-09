import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Target,
  UsersRound,
  Check,
  Circle,
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
import { activities, pipelineData, sourceData } from "@/data/crm";
import { useCrm } from "@/lib/crm-context";
import { AnimatedNumber, PageHeader, StatCard } from "@/components/crm/Primitives";
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
function Dashboard() {
  const { tasks, toggleTask } = useCrm();
  return (
    <>
      <PageHeader
        eyebrow="Sunday, 6 September"
        title="Good afternoon, Maya"
        description="The pipeline is moving well. Three opportunities need your attention today."
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
        <StatCard
          label="Active leads"
          value={<AnimatedNumber value={48} />}
          delta="+12%"
          icon={<UsersRound className="size-4" />}
        />
        <StatCard
          label="Conversion"
          value={<AnimatedNumber value={28} suffix="%" />}
          delta="+3.2%"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Pipeline value"
          value={<AnimatedNumber value={1280} prefix="$" suffix="k" />}
          delta="+18%"
          icon={<CircleDollarSign className="size-4" />}
        />
        <StatCard
          label="Revenue"
          value={<AnimatedNumber value={412} prefix="$" suffix="k" />}
          delta="+9.4%"
          icon={<Banknote className="size-4" />}
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl font-medium">Pipeline momentum</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Value by month, in thousands</p>
            </div>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </CardHeader>
          <CardContent>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineData}>
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
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pipeline"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#pipelineFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Lead sources</CardTitle>
            <p className="text-xs text-muted-foreground">How new opportunities find Maison</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[150px_1fr] items-center">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {sourceData.map((x, i) => (
                        <Cell key={x.name} fill={colors[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {sourceData.map((x, i) => (
                  <div key={x.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2 rounded-full" style={{ background: colors[i] }} />
                    <span className="flex-1 text-muted-foreground">{x.name}</span>
                    <b>{x.value}%</b>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.person}</p>
                </div>
                <time className="text-[11px] text-muted-foreground">{a.time}</time>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">Tasks</CardTitle>
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
