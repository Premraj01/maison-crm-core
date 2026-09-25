import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  ExternalLink,
  KanbanSquare,
  List,
  Mail,
  Phone,
  Plus,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { can, stageNeedsValue, stages, type Lead, type LeadStage } from "@/data/crm";
import { useAuth } from "@/lib/auth/auth-context";
import { createLead, updateLead } from "@/lib/api/leads";
import { useCrm } from "@/lib/crm-context";
import { agentsForRegion, type ApiUser } from "@/lib/api/users";
import { EmptyState, PageHeader, SearchField, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** `?property=<id>` — set by the enquiry badge on a property card. */
interface LeadsSearch {
  property?: string;
}

export const Route = createFileRoute("/leads")({
  validateSearch: (search: Record<string, unknown>): LeadsSearch =>
    typeof search["property"] === "string" ? { property: search["property"] } : {},
  head: () => ({
    meta: [
      { title: "Leads — Maison CRM" },
      { name: "description", content: "Track and manage every Maison sales opportunity." },
      { property: "og:title", content: "Leads — Maison CRM" },
      { property: "og:description", content: "Track and manage every Maison sales opportunity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

function tone(stage: LeadStage) {
  return stage === "Won"
    ? "success"
    : stage === "Lost"
      ? "danger"
      : stage === "Proposal"
        ? "accent"
        : stage === "Qualified"
          ? "warning"
          : ("neutral" as const);
}

/** ISO timestamps from the API, shown the way an agent reads a date. */
function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sumValue(rows: Lead[]): number {
  return rows.reduce((total, lead) => total + (lead.value ?? 0), 0);
}

/**
 * Money at the scale it actually is. A fixed "M" reads as $0.00M for anything
 * under ten thousand, which looks like a bug rather than a small number.
 */
function money(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "http://localhost:8081").replace(/\/$/, "");

function LeadsPage() {
  const {
    leads,
    leadsStatus,
    leadsError,
    role,
    setLeadStage,
    upsertLead,
    reloadLeads,
    properties,
    agents,
  } = useCrm();
  const { token } = useAuth();
  const { property: propertyFilter } = Route.useSearch();
  const [view, setView] = useState<"table" | "kanban">("table"),
    [search, setSearch] = useState(""),
    [stage, setStage] = useState("All"),
    [selected, setSelected] = useState<Lead | null>(null),
    [editing, setEditing] = useState<Lead | null>(null),
    [sortAsc, setSortAsc] = useState(false),
    [needsValue, setNeedsValue] = useState<{ lead: Lead; stage: LeadStage } | null>(null);

  const focused = properties.find((p) => p.id === propertyFilter);

  const filtered = useMemo(
    () =>
      leads
        .filter(
          (l) =>
            (stage === "All" || l.stage === stage) &&
            (!propertyFilter || l.propertyId === propertyFilter) &&
            `${l.name} ${l.email} ${l.property?.name ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => (sortAsc ? 1 : -1) * ((a.value ?? 0) - (b.value ?? 0))),
    [leads, search, stage, sortAsc, propertyFilter],
  );

  const allowed = can(role, "lead:create");
  // Open and won are reported separately rather than as one "pipeline"
  // number: money still in play and money already banked answer different
  // questions, and folding them together hides both.
  const open = sumValue(leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost"));
  const won = sumValue(leads.filter((l) => l.stage === "Won"));
  const unassigned = leads.filter((l) => !l.ownerId).length;
  // Only the parts that say something are shown, so a figure is never printed
  // as a misleading $0.00M when nothing has been valued yet.
  const summary = [
    `${leads.length} ${leads.length === 1 ? "enquiry" : "enquiries"}`,
    open > 0 ? `${money(open)} open` : "",
    won > 0 ? `${money(won)} won` : "",
    unassigned > 0 ? `${unassigned} unassigned` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const save = async (draft: Partial<Lead>) => {
    if (!token) {
      toast.error("Your session has expired — sign in again");
      return;
    }
    try {
      const saved = editing?.id
        ? await updateLead(editing.id, draft, token)
        : await createLead(draft, token);
      upsertLead(saved);
      setEditing(null);
      toast.success(editing?.id ? "Lead updated" : "Lead added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the lead");
    }
  };

  const assign = async (lead: Lead, agentId: string) => {
    if (!token) {
      toast.error("Your session has expired — sign in again");
      return;
    }
    try {
      // "" is the unassign option, and the API needs an explicit null to clear
      // the column rather than a dropped key.
      const saved = await updateLead(lead.id, { ownerId: agentId || null }, token);
      upsertLead(saved);
      setSelected(saved);
      toast.success(saved.owner ? `Assigned to ${saved.owner.fullName}` : "Assignment cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign that lead");
    }
  };

  /**
   * Moving into Proposal or Won needs the value negotiated with the customer.
   * Rather than letting the save fail, the move pauses and asks for the
   * number, then sends both together as one change.
   */
  const move = async (lead: Lead, next: LeadStage, value?: number) => {
    if (stageNeedsValue(next) && !lead.value && value === undefined) {
      setNeedsValue({ lead, stage: next });
      return;
    }
    try {
      await setLeadStage(lead.id, next, value);
      setNeedsValue(null);
      toast.success(`Moved to ${next}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move that lead");
    }
  };

  if (leadsStatus === "error") {
    return (
      <>
        <PageHeader eyebrow="Sales workspace" title="Leads" />
        <EmptyState
          icon={<UserRound />}
          title="Could not load leads"
          description={leadsError ?? "The API did not respond."}
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
        eyebrow="Sales workspace"
        title="Leads"
        description={leadsStatus === "loading" ? "Loading the pipeline…" : summary}
        actions={
          <Button
            onClick={() => setEditing({ stage: "New", source: "Referral" } as Lead)}
            disabled={!allowed}
          >
            <Plus />
            Add lead
          </Button>
        }
      />

      {/* Set when arriving from a property card's enquiry badge. */}
      {propertyFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary/50 px-4 py-3">
          <Building2 className="size-4 text-primary" />
          <p className="text-sm">
            Showing enquiries for <b>{focused?.name ?? "one listing"}</b>
          </p>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link to="/leads" search={{}}>
              <X />
              Clear filter
            </Link>
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <SearchField value={search} onChange={setSearch} placeholder="Search leads or listings" />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border bg-card p-1">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
          >
            <List />
            Table
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <KanbanSquare />
            Pipeline
          </Button>
        </div>
      </div>

      {leadsStatus === "loading" ? (
        <Card className="h-72 animate-pulse bg-secondary/50" />
      ) : !leads.length ? (
        <EmptyState
          icon={<UserRound />}
          title="No leads yet"
          description="Enquiries from the website's viewing form land here automatically, attached to the listing they came from."
        />
      ) : view === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Lead</th>
                  <th>Property</th>
                  <th>Agent</th>
                  <th>Stage</th>
                  <th>Source</th>
                  <th>
                    <button
                      className="flex items-center gap-1"
                      onClick={() => setSortAsc(!sortAsc)}
                    >
                      Value <ArrowDownUp className="size-3" />
                    </button>
                  </th>
                  <th>Enquired</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40"
                    onClick={() => setSelected(l)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {l.property ? (
                        <>
                          <p className="text-sm">{l.property.name}</p>
                          {/* The property id, as the admin view is expected to show it. */}
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {l.propertyId}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">General enquiry</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {l.owner ? (
                        l.owner.fullName
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusPill tone={tone(l.stage)}>{l.stage}</StatusPill>
                    </td>
                    <td className="text-sm text-muted-foreground">{l.source}</td>
                    <td className="text-sm font-semibold tabular-nums">
                      {l.value ? `$${l.value.toLocaleString()}` : "—"}
                    </td>
                    <td className="text-xs text-muted-foreground">{when(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div
          className="grid gap-3 overflow-x-auto pb-4"
          style={{ gridTemplateColumns: "repeat(6,minmax(245px,1fr))" }}
        >
          {stages.map((s) => (
            <section
              key={s}
              className="rounded-md bg-secondary/55 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("lead");
                const dragged = leads.find((l) => l.id === id);
                if (dragged && can(role, "lead:move")) void move(dragged, s);
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[.12em]">{s}</h2>
                <span className="text-xs text-muted-foreground">
                  {filtered.filter((l) => l.stage === s).length}
                </span>
              </div>
              <div className="space-y-3">
                {filtered
                  .filter((l) => l.stage === s)
                  .map((l) => (
                    <Card
                      key={l.id}
                      draggable={can(role, "lead:move")}
                      onDragStart={(e) => e.dataTransfer.setData("lead", l.id)}
                      onClick={() => setSelected(l)}
                      className="cursor-pointer p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{l.email}</p>
                      {l.property && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-primary">
                          <Building2 className="size-3" />
                          {l.property.name}
                        </p>
                      )}
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <UserCheck className="size-3 shrink-0" />
                        {l.owner ? l.owner.fullName : "Unassigned"}
                      </p>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <LeadDrawer
          lead={selected}
          agents={agents}
          onAssign={assign}
          canEdit={can(role, "lead:edit")}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      <ValuePrompt
        pending={needsValue}
        onCancel={() => setNeedsValue(null)}
        onConfirm={(value) => {
          if (needsValue) void move(needsValue.lead, needsValue.stage, value);
        }}
      />

      <LeadDialog
        lead={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        properties={properties.map((p) => ({ id: p.id, name: p.name, regionId: p.regionId }))}
        agents={agents}
      />
    </>
  );
}

/**
 * Asks for the negotiated value when a lead is dragged into a stage that
 * cannot exist without one.
 */
function ValuePrompt({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: { lead: Lead; stage: LeadStage } | null;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get("value") ?? "").trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    onConfirm(value);
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Value for {pending?.stage.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              {pending?.lead.name} is moving to {pending?.stage}
              {pending?.lead.property ? ` on ${pending.lead.property.name}` : ""}. Record the value
              negotiated with the customer — a lead cannot sit at this stage without one.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6">
            <Field label="Negotiated value">
              <Input
                name="value"
                type="number"
                min="1"
                required
                autoFocus
                placeholder="What the customer has agreed to"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Moving…" : `Move to ${pending?.stage}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeadDrawer({
  lead,
  agents,
  onAssign,
  canEdit,
  onEdit,
  onClose,
}: {
  lead: Lead;
  agents: ApiUser[];
  onAssign: (lead: Lead, agentId: string) => Promise<void>;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const eligible = agentsForRegion(agents, lead.regionId ?? null);
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-overlay" aria-label="Close lead" onClick={onClose} />
      <aside className="page-enter absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <StatusPill tone={tone(lead.stage)}>{lead.stage}</StatusPill>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="mt-8 grid size-14 place-items-center rounded-full bg-secondary font-display text-xl">
          {lead.name
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </div>
        <h2 className="mt-4 font-display text-3xl">{lead.name}</h2>
        <p className="text-sm text-muted-foreground">{lead.email}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`mailto:${lead.email}`}>
              <Mail />
              Email
            </a>
          </Button>
          {lead.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${lead.phone}`}>
                <Phone />
                {lead.phone}
              </a>
            </Button>
          )}
          <Button variant="secondary" onClick={onEdit} disabled={!canEdit}>
            Edit lead
          </Button>
        </div>

        {/* Who will show them the property. The most common first action on a
            website enquiry, so it is here rather than behind the edit dialog. */}
        <div className="mt-8 rounded-md border border-border p-4">
          <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            Showing agent
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
              {lead.owner
                ? lead.owner.fullName
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                : "?"}
            </span>
            <div className="min-w-0 flex-1">
              <Select
                value={lead.ownerId ?? "unassigned"}
                onValueChange={(v) => void onAssign(lead, v === "unassigned" ? "" : v)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {eligible.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.fullName}
                    </SelectItem>
                  ))}
                  {/* An assignment made before the region rule still shows who
                      holds the lead, but cannot be picked again. */}
                  {lead.owner && !eligible.some((a) => a.id === lead.ownerId) && (
                    <SelectItem value={lead.owner.id} disabled>
                      {lead.owner.fullName} (outside this region)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {eligible.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {noAgentsHint(lead.regionId ?? null)}
            </p>
          )}
          {lead.owner && (
            <p className="mt-2 truncate text-xs text-muted-foreground">{lead.owner.email}</p>
          )}
        </div>

        {/* The listing this enquiry came from — the reason the lead exists. */}
        {lead.property ? (
          <div className="mt-8 rounded-md border border-border p-4">
            <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
              Enquired about
            </p>
            <p className="mt-2 font-display text-xl">{lead.property.name}</p>
            <p className="text-xs text-muted-foreground">{lead.property.address}</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">{lead.propertyId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/leads" search={lead.propertyId ? { property: lead.propertyId } : {}}>
                  <Building2 />
                  All enquiries here
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`${SITE_URL}/properties/${lead.property.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink />
                  View on site
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            A general enquiry — no listing was named.
          </p>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-border py-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Source</dt>
            <dd className="mt-1">{lead.source}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Interest</dt>
            <dd className="mt-1">{lead.interest ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Value</dt>
            <dd className="mt-1 font-semibold">
              {lead.value ? `$${lead.value.toLocaleString()}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Enquired</dt>
            <dd className="mt-1">{when(lead.createdAt)}</dd>
          </div>
        </dl>

        <h3 className="mt-7 font-display text-xl">Message</h3>
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm leading-6">
          {lead.message || "No message was left."}
        </p>
      </aside>
    </div>
  );
}

function LeadDialog({
  lead,
  onClose,
  onSave,
  properties,
  agents,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSave: (draft: Partial<Lead>) => Promise<void>;
  // `regionId` is required, not optional: without it every listing looks
  // unplaced and the agent picker empties.
  properties: { id: string; name: string; regionId: string | null | undefined }[];
  agents: ApiUser[];
}) {
  const [stage, setStage] = useState<LeadStage>("New");
  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-seed the controlled fields whenever a different lead opens the dialog.
  const key = lead?.id ?? "new";
  const [seeded, setSeeded] = useState(key);
  if (seeded !== key) {
    setSeeded(key);
    setStage(lead?.stage ?? "New");
    setPropertyId(lead?.propertyId ?? "");
    setOwnerId(lead?.ownerId ?? "");
  }

  // The lead's region follows its listing, so the agents on offer do too. With
  // no listing it keeps the lead's existing region, and a new lead lands in the
  // author's own region (none for an owner, who has to pick a listing first).
  const { user } = useAuth();
  const dialogRegion = propertyId
    ? (properties.find((p) => p.id === propertyId)?.regionId ?? null)
    : lead?.id
      ? (lead.regionId ?? null)
      : (user?.regionId ?? null);
  const eligible = agentsForRegion(agents, dialogRegion);
  // Switching to a listing in another region drops an agent who no longer fits,
  // rather than sending an assignment the API would refuse.
  const chosenOwner = eligible.some((a) => a.id === ownerId) ? ownerId : "";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const value = String(f.get("value") ?? "").trim();
    const phone = String(f.get("phone") ?? "").trim();
    setSaving(true);
    await onSave({
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim(),
      ...(phone ? { phone } : {}),
      message: String(f.get("message") ?? "").trim(),
      stage,
      source: lead?.source ?? "Referral",
      ...(value === "" ? {} : { value: Number(value) }),
      ...(propertyId ? { propertyId } : {}),
      // Explicit null clears the column; a dropped key would leave it as it was.
      ownerId: chosenOwner || null,
    });
    setSaving(false);
  };

  return (
    <Dialog open={lead !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {lead?.id ? "Edit lead" : "Add a new lead"}
            </DialogTitle>
            <DialogDescription>
              Enquiries from the website arrive here on their own; this is for the ones that come by
              phone or in person.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={lead?.name} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required defaultValue={lead?.email} />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" defaultValue={lead?.phone ?? ""} />
            </Field>
            {/* Required as soon as the chosen stage cannot exist without it,
                so the form says so rather than the save failing. */}
            <Field label={stageNeedsValue(stage) ? "Negotiated value" : "Value"}>
              <Input
                name="value"
                type="number"
                min={stageNeedsValue(stage) ? "1" : "0"}
                required={stageNeedsValue(stage)}
                defaultValue={lead?.value ?? ""}
                placeholder={stageNeedsValue(stage) ? "Agreed with the customer" : "Add once known"}
              />
            </Field>
            <Field label="Property">
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="No particular listing" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Showing agent">
              <Select
                value={chosenOwner || "unassigned"}
                onValueChange={(v) => setOwnerId(v === "unassigned" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {eligible.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligible.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">{noAgentsHint(dialogRegion)}</p>
              )}
            </Field>
            <Field label="Stage">
              <Select value={stage} onValueChange={(v) => setStage(v as LeadStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Message">
                <Textarea name="message" defaultValue={lead?.message} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Why the agent picker is empty: no region to pick from, or nobody in it. */
function noAgentsHint(regionId: string | null) {
  return regionId
    ? "Nobody in this region can take leads yet."
    : "This lead isn't in a region yet — link it to a listing to choose an agent.";
}
