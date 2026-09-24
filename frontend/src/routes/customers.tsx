import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, UsersRound } from "lucide-react";
import { useCrm } from "@/lib/crm-context";
import { deriveCustomers } from "@/lib/customers";
import { money } from "@/lib/dashboard";
import { EmptyState, PageHeader, SearchField, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Maison CRM" },
      { name: "description", content: "Everyone who has completed a purchase with Maison." },
      { property: "og:title", content: "Customers — Maison CRM" },
      {
        property: "og:description",
        content: "Everyone who has completed a purchase with Maison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function since(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function CustomersPage() {
  const { leads, leadsStatus, reloadLeads } = useCrm();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"value" | "recent">("value");

  // A customer is a lead that closed, so this stays in step with the pipeline
  // automatically — see lib/customers.ts.
  const customers = useMemo(() => deriveCustomers(leads), [leads]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    const matched = customers.filter((c) =>
      `${c.name} ${c.email} ${c.deals.map((d) => d.property?.name ?? "").join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
    // A customer always has at least one deal by construction, but the index
    // signature cannot know that — reduce instead of reading [0].
    const latest = (deals: { closedAt: number }[]) =>
      deals.reduce((newest, d) => Math.max(newest, d.closedAt), 0);
    return sort === "value"
      ? matched
      : [...matched].sort((a, b) => latest(b.deals) - latest(a.deals));
  }, [customers, query, sort]);

  const lifetime = customers.reduce((n, c) => n + c.lifetimeValue, 0);

  if (leadsStatus === "loading") {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Customers" description="Loading…" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="h-56 animate-pulse bg-secondary/50" />
          ))}
        </div>
      </>
    );
  }

  if (leadsStatus === "error") {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Customers" />
        <EmptyState
          icon={<UsersRound />}
          title="Could not load customers"
          description="Customers come from closed leads, and the pipeline did not load."
          action={
            <Button variant="secondary" onClick={reloadLeads}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description={
          customers.length
            ? `${customers.length} ${customers.length === 1 ? "customer" : "customers"} · ${money(lifetime)} in completed sales`
            : "Everyone whose lead has closed as Won appears here."
        }
      />

      {customers.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search customers or properties"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as "value" | "recent")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">Highest value</SelectItem>
              <SelectItem value="recent">Most recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to="/customers/$customerId" params={{ customerId: c.id }}>
              <Card className="reveal-card group h-full p-5 transition-transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div className="grid size-11 place-items-center rounded-full bg-secondary font-display">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <StatusPill tone="success">
                    {c.deals.length === 1 ? "Purchased" : `${c.deals.length} purchases`}
                  </StatusPill>
                </div>
                <h2 className="mt-6 font-display text-2xl">{c.name}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{c.email}</p>

                {/* What they actually bought — the reason they are a customer. */}
                <div className="mt-4 space-y-1.5">
                  {c.deals.slice(0, 2).map((deal) => (
                    <p
                      key={deal.leadId}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <Building2 className="mt-px size-3.5 shrink-0" />
                      <span className="truncate">
                        {deal.property?.name ?? "No listing recorded"}
                      </span>
                    </p>
                  ))}
                  {c.deals.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{c.deals.length - 2} more</p>
                  )}
                </div>

                <div className="mt-7 flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                      Lifetime value
                    </p>
                    <p className="mt-1 font-semibold">{money(c.lifetimeValue)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Since {since(c.sinceAt)}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersRound />}
          title={customers.length ? "No customers match" : "No customers yet"}
          description={
            customers.length
              ? "Try a different search."
              : "A lead becomes a customer the moment you move it to Won in the pipeline."
          }
          action={
            customers.length ? undefined : (
              <Button asChild variant="secondary">
                <Link to="/leads">Open the pipeline</Link>
              </Button>
            )
          }
        />
      )}
    </>
  );
}
