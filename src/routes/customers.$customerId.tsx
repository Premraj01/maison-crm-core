import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Mail, Phone } from "lucide-react";
import { customers } from "@/data/crm";
import { PageHeader, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer detail — Maison CRM" },
      { name: "description", content: "Customer profile, deals, activity, and files." },
      { property: "og:title", content: "Customer detail — Maison CRM" },
      { property: "og:description", content: "Customer profile, deals, activity, and files." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDetail,
});
function CustomerDetail() {
  const { customerId } = Route.useParams();
  const c = customers.find((x) => x.id === customerId);
  if (!c) return <div className="p-8">Customer not found.</div>;
  return (
    <>
      <Link
        to="/customers"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All customers
      </Link>
      <PageHeader
        eyebrow={c.segment}
        title={c.company}
        description={`Customer since ${c.since}`}
        actions={
          <>
            <Button variant="outline">
              <Mail />
              Email
            </Button>
            <Button>
              <Phone />
              Call contact
            </Button>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-6">
          <div className="grid size-16 place-items-center rounded-full bg-secondary font-display text-2xl">
            {c.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <h2 className="mt-5 font-display text-2xl">{c.name}</h2>
          <p className="text-sm text-muted-foreground">Primary contact</p>
          <StatusPill
            tone={c.health === "Strong" ? "success" : c.health === "Watch" ? "warning" : "danger"}
          >
            {c.health} health
          </StatusPill>
          <dl className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1">{c.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lifetime value</dt>
              <dd className="mt-1 font-semibold">${c.value.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Account owner</dt>
              <dd className="mt-1">Maya Chen</dd>
            </div>
          </dl>
        </Card>
        <Tabs defaultValue="profile">
          <TabsList className="mb-4 flex h-auto w-full justify-start overflow-x-auto border-b border-border bg-transparent p-0">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Account overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Info l="Sector" v="Hospitality & residential" />
                <Info l="Region" v="Europe" />
                <Info l="Renewal" v="14 March 2027" />
                <Info l="Engagement" v="Strategic partnership" />
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Relationship note</p>
                  <p className="mt-2 text-sm leading-6">
                    A long-standing Maison partner with an active expansion program across three
                    markets. Quarterly reviews are led by the founding team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="contacts">
            <Card className="p-5">
              <Person name={c.name} detail={`Founder · ${c.email}`} />
              <Person name="Marc Dubois" detail="Finance director · marc@example.com" />
            </Card>
          </TabsContent>
          <TabsContent value="deals">
            <Card className="overflow-hidden">
              <Row title="European portfolio expansion" detail="Won · $278,000" />
              <Row title="2027 advisory retainer" detail="Qualified · $96,000" />
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <Card className="overflow-hidden">
              <Row title="Quarterly review completed" detail="2 days ago · Maya Chen" />
              <Row title="Renewal brief shared" detail="12 Aug · Jon Bell" />
              <Row title="New contact added" detail="4 Aug · Sam Rivera" />
            </Card>
          </TabsContent>
          <TabsContent value="files">
            <Card className="overflow-hidden">
              {[
                "Maison Laurent — Agreement.pdf",
                "Q3 relationship review.pdf",
                "Expansion brief.pdf",
              ].map((x) => (
                <div
                  key={x}
                  className="flex items-center gap-3 border-b border-border p-4 last:border-0"
                >
                  <FileText className="size-4 text-primary" />
                  <span className="flex-1 text-sm">{x}</span>
                  <Button variant="ghost" size="icon">
                    <Download />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
function Info({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{l}</p>
      <p className="mt-1 text-sm font-medium">{v}</p>
    </div>
  );
}
function Person({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-4 last:border-0">
      <div className="grid size-9 place-items-center rounded-full bg-secondary text-xs">
        {name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
function Row({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-border p-5 last:border-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
