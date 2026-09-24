import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Building2, ExternalLink, Mail, Phone, UserCheck } from "lucide-react";
import { useCrm } from "@/lib/crm-context";
import { findCustomer } from "@/lib/customers";
import { money, relativeTime } from "@/lib/dashboard";
import { EmptyState, PageHeader, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer detail — Maison CRM" },
      { name: "description", content: "Customer profile, purchases, and the agents behind them." },
      { property: "og:title", content: "Customer detail — Maison CRM" },
      {
        property: "og:description",
        content: "Customer profile, purchases, and the agents behind them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDetail,
});

const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "http://localhost:8081").replace(/\/$/, "");

function fullDate(at: number): string {
  return new Date(at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { leads, leadsStatus } = useCrm();
  const customer = useMemo(() => findCustomer(leads, customerId), [leads, customerId]);

  const back = (
    <Link
      to="/customers"
      className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      All customers
    </Link>
  );

  if (leadsStatus === "loading") {
    return (
      <>
        {back}
        <Card className="h-64 animate-pulse bg-secondary/50" />
      </>
    );
  }

  if (!customer) {
    return (
      <>
        {back}
        <EmptyState
          icon={<Building2 />}
          title="Customer not found"
          description="They may no longer have a closed deal — a lead stops being a customer if it moves back into the pipeline."
        />
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        eyebrow={`Customer since ${fullDate(customer.sinceAt)}`}
        title={customer.name}
        description={`${customer.deals.length} completed ${customer.deals.length === 1 ? "purchase" : "purchases"} · ${money(customer.lifetimeValue)} lifetime value`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`mailto:${customer.email}`}>
                <Mail />
                Email
              </a>
            </Button>
            {customer.phone && (
              <Button asChild>
                <a href={`tel:${customer.phone}`}>
                  <Phone />
                  Call
                </a>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-6">
          <div className="grid size-16 place-items-center rounded-full bg-secondary font-display text-2xl">
            {customer.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h2 className="mt-5 font-display text-2xl">{customer.name}</h2>
          <div className="mt-2">
            <StatusPill tone="success">
              {customer.deals.length === 1 ? "Purchased" : `${customer.deals.length} purchases`}
            </StatusPill>
          </div>
          <dl className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 truncate">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="mt-1">{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lifetime value</dt>
              <dd className="mt-1 font-semibold">{money(customer.lifetimeValue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {customer.agents.length > 1 ? "Agents" : "Agent"}
              </dt>
              <dd className="mt-1">
                {customer.agents.length ? customer.agents.join(", ") : "Unassigned"}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Purchases</CardTitle>
              <p className="text-xs text-muted-foreground">Each one is a lead that closed as Won</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.deals.map((deal) => (
                <div
                  key={deal.leadId}
                  className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg">
                      {deal.property?.name ?? "No listing recorded"}
                    </p>
                    {deal.property && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {deal.property.address}
                      </p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{fullDate(deal.closedAt)}</span>
                      {deal.agent && (
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="size-3" />
                          {deal.agent.fullName}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <p className="font-semibold tabular-nums">{money(deal.value)}</p>
                    {deal.property && (
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={`${SITE_URL}/properties/${deal.property.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink />
                          View listing
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">History</CardTitle>
              <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground">
                Open pipeline
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {customer.deals.map((deal) => (
                <div
                  key={deal.leadId}
                  className="flex gap-3 border-b border-border py-3 last:border-0"
                >
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-success" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Closed {deal.property ? `· ${deal.property.name}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deal.agent ? `Closed by ${deal.agent.fullName}` : "No agent recorded"}
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(deal.closedAt, new Date())}
                  </time>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
