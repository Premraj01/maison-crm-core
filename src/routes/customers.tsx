import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, UsersRound } from "lucide-react";
import { useState } from "react";
import { customers, type Health } from "@/data/crm";
import { EmptyState, PageHeader, SearchField, StatusPill } from "@/components/crm/Primitives";
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
      { name: "description", content: "Customer relationships, segments, and account health." },
      { property: "og:title", content: "Customers — Maison CRM" },
      {
        property: "og:description",
        content: "Customer relationships, segments, and account health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});
function healthTone(h: Health) {
  return h === "Strong" ? "success" : h === "Watch" ? "warning" : ("danger" as const);
}
function CustomersPage() {
  const [query, setQuery] = useState(""),
    [segment, setSegment] = useState("All");
  const filtered = customers.filter(
    (c) =>
      (segment === "All" || c.segment === segment) &&
      `${c.name} ${c.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="A considered view of every active account and the health of each relationship."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchField value={query} onChange={setQuery} placeholder="Search customers" />
        </div>
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Enterprise", "Growth", "Private"].map((x) => (
              <SelectItem key={x} value={x}>
                {x === "All" ? "All segments" : x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
                      .join("")}
                  </div>
                  <StatusPill tone={healthTone(c.health)}>{c.health}</StatusPill>
                </div>
                <h2 className="mt-6 font-display text-2xl">{c.company}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.name} · {c.segment}
                </p>
                <div className="mt-7 flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                      Lifetime value
                    </p>
                    <p className="mt-1 font-semibold">${c.value.toLocaleString()}</p>
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
          title="No customers found"
          description="Try changing your search or segment filter."
        />
      )}
    </>
  );
}
